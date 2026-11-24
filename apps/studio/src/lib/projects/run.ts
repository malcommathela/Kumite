import { DefaultSettings, MainChannels } from '@kumite/models/constants';
import type { Project } from '@kumite/models/projects';
import { RunState } from '@kumite/models/run';
import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '../editor/engine';
import { invokeMainChannel } from '../utils';
import { PortManager } from './port';

export type TerminalMessage = {
    id: string;
    data: string;
};

export class RunManager {
    private project: Project;
    private portManager: PortManager;
    private _state: RunState = RunState.STOPPED;
    message: string | null = null;
    isLoading: boolean = false;
    private previousState: RunState = RunState.STOPPED;
    private cleanupLoadingTimer?: () => void;

    constructor(
        private editorEngine: EditorEngine,
        project: Project,
    ) {
        makeAutoObservable(this);
        this.project = project;
        this.portManager = new PortManager(this, project);
        this.restoreState();
        this.listenForStateChanges();
    }

    updateProject(project: Project) {
        this.project = project;
        this.portManager.updateProject(project);
    }

    get isRunning() {
        return this.state === RunState.RUNNING;
    }

    get isStopped() {
        return this.state === RunState.STOPPED;
    }

    get isStarting() {
        return this.state === RunState.SETTING_UP || this.isLoading;
    }

    get isError() {
        return this.state === RunState.ERROR;
    }

    get port() {
        return this.portManager;
    }

    get state() {
        return this._state;
    }

    set state(state: RunState) {
        if (this.previousState === state) {
            return;
        }
        this.previousState = this._state;
        this._state = state;
    }

    async startIfPortAvailable() {
        // Development servers choose their own free port; a busy preferred port
        // is not a reason to block startup.
        return this.start();
    }

    async start() {
        this.state = RunState.SETTING_UP;
        this.startLoadingTimer();
        return await invokeMainChannel(MainChannels.RUN_START, {
            id: this.project.id,
            folderPath: this.project.folderPath,
            command: this.project.commands?.run || DefaultSettings.COMMANDS.run,
        });
    }

    private startLoadingTimer() {
        // Cleanup any existing timer
        if (this.cleanupLoadingTimer) {
            this.cleanupLoadingTimer();
        }

        this.isLoading = true;

        // The editor canvas is usable as soon as its shell and terminal are
        // created. Do not hold it behind the old 5s minimum + 3s grace period
        // while the dev server installs packages in the background.
        const minLoadingDuration = 0;
        const maxLoadingDuration = 15000;
        const gracePeriod = 250;

        const startTime = Date.now();
        let consecutiveReadyChecks = 0;
        let graceTimeout: ReturnType<typeof setTimeout>;

        const checkInterval = setInterval(() => {
            const elapsedTime = Date.now() - startTime;
            const isRunnerReady = this.state === RunState.RUNNING || this.state === RunState.ERROR;

            if (isRunnerReady) {
                consecutiveReadyChecks++;
            } else {
                consecutiveReadyChecks = 0;
            }

            if (consecutiveReadyChecks >= 2 && elapsedTime >= minLoadingDuration) {
                graceTimeout = setTimeout(() => {
                    this.isLoading = false;
                }, gracePeriod);
                clearInterval(checkInterval);
                return;
            }

            if (elapsedTime >= maxLoadingDuration) {
                this.isLoading = false;
                clearInterval(checkInterval);
            }
        }, 100);

        this.cleanupLoadingTimer = () => {
            clearInterval(checkInterval);
            if (graceTimeout) {
                clearTimeout(graceTimeout);
            }
        };
    }

    async stop() {
        return await invokeMainChannel(MainChannels.RUN_STOP, {
            id: this.project.id,
            folderPath: this.project.folderPath,
        });
    }

    async restart() {
        return await invokeMainChannel(MainChannels.RUN_RESTART, {
            id: this.project.id,
            folderPath: this.project.folderPath,
            command: this.project.commands?.run || DefaultSettings.COMMANDS.run,
        });
    }

    async restoreState() {
        const state = await invokeMainChannel(MainChannels.GET_RUN_STATE, {
            id: this.project.id,
        });
        this.state = state as RunState;
    }

    async listenForStateChanges() {
        window.api.on(MainChannels.RUN_STATE_CHANGED, async (args) => {
            const { state, message } = args as { state: RunState; message: string };
            this.state = state;
            this.message = message;
            if (state === RunState.ERROR) {
                this.editorEngine.errors.addTerminalError(message);
            }
        });

        window.api.on(MainChannels.RUN_URL_CHANGED, (args) => {
            const { id, url } = args as { id: string; url: string };
            if (id === this.project.id) {
                this.applyRunUrl(url);
            }
        });

        reaction(
            () => this.editorEngine.errors.errors,
            (errors) => {
                if (errors.length > 0) {
                    this.state = RunState.ERROR;
                } else {
                    this.state = this.previousState;
                }
            },
        );
    }

    /**
     * The dev server reports the port it actually bound. Frames keep their
     * paths but follow that origin instead of a hardcoded localhost port.
     */
    private applyRunUrl(url: string) {
        let origin: string;
        try {
            origin = new URL(url).origin;
        } catch {
            return;
        }
        const frames = this.editorEngine.canvas.frames;
        const next = frames.map((frame) => {
            try {
                const current = new URL(frame.url);
                return { ...frame, url: `${origin}${current.pathname}${current.search}` };
            } catch {
                return frame;
            }
        });
        this.editorEngine.canvas.saveFrames(next);
    }

    handleTerminalInput(data: string) {
        return invokeMainChannel(MainChannels.TERMINAL_INPUT, {
            id: this.project.id,
            data,
        });
    }

    resizeTerminal(cols: number, rows: number) {
        return invokeMainChannel(MainChannels.TERMINAL_RESIZE, {
            id: this.project.id,
            cols,
            rows,
        });
    }

    getHistory(): Promise<string> {
        return invokeMainChannel(MainChannels.TERMINAL_GET_HISTORY, {
            id: this.project.id,
        });
    }

    async dispose() {
        if (this.cleanupLoadingTimer) {
            this.cleanupLoadingTimer();
        }
        await this.stop();
        this.portManager.dispose();
    }
}
