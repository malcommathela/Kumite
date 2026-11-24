import { extractCodeBlocks } from '@kumite/ai/src/coder';
import { PAGE_SYSTEM_PROMPT, PromptProvider } from '@kumite/ai/src/prompt';
import { CreateStage, type CreateCallback, type CreateProjectResponse } from '@kumite/models';
import {
    StreamRequestType,
    type ErrorStreamResponse,
    type ImageMessageContext,
    type PartialStreamResponse,
    type RateLimitedStreamResponse,
} from '@kumite/models/chat';
import { MainChannels } from '@kumite/models/constants';
import type { CoreMessage, CoreSystemMessage } from 'ai';
import fs from 'fs';
import path from 'path';
import { mainWindow } from '..';
import Chat from '../chat';
import { getCreateProjectPath } from './helpers';
import { createProject } from './install';

export class ProjectCreator {
    private static instance: ProjectCreator;
    private abortController: AbortController | null = null;

    public static getInstance(): ProjectCreator {
        if (!ProjectCreator.instance) {
            ProjectCreator.instance = new ProjectCreator();
        }
        return ProjectCreator.instance;
    }

    private async executeProjectCreation<T>(action: () => Promise<T>): Promise<{
        success: boolean;
        error?: string;
        response?: T;
        cancelled?: boolean;
    }> {
        this.cancel();
        this.abortController = new AbortController();

        try {
            const result = await action();
            return { success: true, response: result };
        } catch (error) {
            if ((error as Error).name === 'AbortError') {
                return { success: false, cancelled: true };
            }
            console.error('Failed to create project:', error);
            return { success: false, error: (error as Error).message };
        } finally {
            this.abortController = null;
        }
    }

    public async createProject(
        prompt: string,
        images: ImageMessageContext[],
    ): Promise<CreateProjectResponse> {
        return this.executeProjectCreation(async () => {
            const [generatedPage, projectPath] = await Promise.all([
                this.generatePage(prompt, images),
                this.runCreate(),
            ]);

            if (this.abortController?.signal.aborted) {
                throw new Error('AbortError');
            }

            await this.applyGeneratedPage(projectPath, generatedPage);
            return { projectPath, content: generatedPage.content };
        });
    }

    public async createBlankProject(): Promise<CreateProjectResponse> {
        return this.executeProjectCreation(async () => {
            const projectsPath = getCreateProjectPath();
            await fs.promises.mkdir(projectsPath, { recursive: true });

            const projectName = `project-${Date.now()}`;
            const projectPath = path.join(projectsPath, projectName);

            // Keep blank creation local and synchronous with respect to the
            // editor: no template download or dependency installation here.
            await fs.promises.mkdir(projectPath, { recursive: false });

            const files: Record<string, string> = {
                'package.json': JSON.stringify(
                    {
                        name: projectName,
                        private: true,
                        version: '1.0.0',
                        type: 'module',
                        scripts: {
                            // Install in the project terminal, after the editor
                            // has opened. Bun is the app's default npm runtime.
                            dev: 'npm install --no-audit --no-fund && vite --host 0.0.0.0 --port 3000',
                            build: 'vite build',
                            preview: 'vite preview',
                        },
                        dependencies: {
                            react: '^18.3.1',
                            'react-dom': '^18.3.1',
                        },
                        devDependencies: {
                            '@vitejs/plugin-react': '^4.2.1',
                            '@types/react': '^18.2.64',
                            '@types/react-dom': '^18.2.21',
                            typescript: '^5.5.4',
                            vite: '^6.0.11',
                        },
                    },
                    null,
                    4,
                ),
                'index.html': `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
                'vite.config.ts': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 3000,
    },
});
`,
                'tsconfig.json': JSON.stringify(
                    {
                        compilerOptions: {
                            target: 'ES2020',
                            useDefineForClassFields: true,
                            lib: ['ES2020', 'DOM', 'DOM.Iterable'],
                            module: 'ESNext',
                            skipLibCheck: true,
                            moduleResolution: 'Bundler',
                            allowImportingTsExtensions: true,
                            resolveJsonModule: true,
                            isolatedModules: true,
                            noEmit: true,
                            jsx: 'react-jsx',
                            strict: true,
                        },
                        include: ['src'],
                    },
                    null,
                    4,
                ),
                'src/main.tsx': `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
`,
                'src/App.tsx': `export default function App() {
    return <main className="min-h-screen" aria-label="Blank project canvas" />;
}
`,
                'src/index.css': `* {
    box-sizing: border-box;
}

html,
body,
#root {
    min-width: 100%;
    min-height: 100%;
    margin: 0;
}

body {
    min-height: 100vh;
    background: #ffffff;
    color: #111827;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

main {
    min-height: 100vh;
}
`,
            };

            await Promise.all(
                Object.entries(files).map(async ([relativePath, content]) => {
                    const filePath = path.join(projectPath, relativePath);
                    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
                    await fs.promises.writeFile(filePath, content, 'utf8');
                }),
            );

            return { projectPath, content: '' };
        });
    }

    public cancel(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }

    private async generatePage(
        prompt: string,
        images: ImageMessageContext[],
    ): Promise<{ path: string; content: string }> {
        if (!this.abortController) {
            throw new Error('No active creation process');
        }

        const messages = this.getMessages(prompt, images);
        this.emitPromptProgress('Generating page...', 10);
        const systemPrompt = new PromptProvider().getCreatePageSystemPrompt();
        const systemMessage: CoreSystemMessage = {
            role: 'system',
            content: systemPrompt,
            experimental_providerMetadata: {
                anthropic: { cacheControl: { type: 'ephemeral' } },
            },
        };

        const response = await Chat.stream([systemMessage, ...messages], StreamRequestType.CREATE, {
            abortController: this.abortController,
            skipSystemPrompt: true,
        });

        if (response.type !== 'full') {
            throw new Error('Failed to generate page. ' + this.getStreamErrorMessage(response));
        }

        const content = extractCodeBlocks(response.text);

        return {
            path: PAGE_SYSTEM_PROMPT.defaultPath,
            content,
        };
    }

    private async runCreate(): Promise<string> {
        if (!this.abortController) {
            throw new Error('No active creation process');
        }

        if (this.abortController.signal.aborted) {
            throw new Error('AbortError');
        }

        const projectsPath = getCreateProjectPath();
        await fs.promises.mkdir(projectsPath, { recursive: true });
        const projectName = `project-${Date.now()}`;

        await createProject(projectName, projectsPath, this.createCallback.bind(this));
        return path.join(projectsPath, projectName);
    }

    private createCallback: CreateCallback = (stage: CreateStage, message: string) => {
        let progress = 0;
        switch (stage) {
            case CreateStage.CLONING:
                progress = 20;
                break;
            case CreateStage.GIT_INIT:
                progress = 30;
                break;
            case CreateStage.INSTALLING:
                progress = 40;
                break;
            case CreateStage.COMPLETE:
                progress = 50;
                this.emitPromptProgress('Project created! Generating page...', progress);
                return;
        }
        this.emitPromptProgress(message, progress);
    };

    private emitPromptProgress = (message: string, progress: number) => {
        mainWindow?.webContents.send(MainChannels.CREATE_NEW_PROJECT_PROMPT_CALLBACK, {
            message,
            progress,
        });
    };

    private getMessages(prompt: string, images: ImageMessageContext[]): CoreMessage[] {
        const promptContent = `${images.length > 0 ? 'Refer to the images above. ' : ''}Create a landing page that matches this description: ${prompt}
Use this as the starting template:
${PAGE_SYSTEM_PROMPT.defaultContent}`;

        if (images.length === 0) {
            return [
                {
                    role: 'user',
                    content: promptContent,
                },
            ];
        }

        return [
            {
                role: 'user',
                content: [
                    ...images.map((image) => ({
                        type: 'image' as const,
                        image: image.content,
                        mimeType: image.mimeType,
                    })),
                    {
                        type: 'text' as const,
                        text: promptContent,
                    },
                ],
            },
        ];
    }

    private async applyGeneratedPage(
        projectPath: string,
        generatedPage: { path: string; content: string },
    ): Promise<void> {
        const pagePath = path.join(projectPath, generatedPage.path);
        await fs.promises.mkdir(path.dirname(pagePath), { recursive: true });
        await fs.promises.writeFile(pagePath, generatedPage.content);
    }

    private getStreamErrorMessage(
        streamResult: PartialStreamResponse | ErrorStreamResponse | RateLimitedStreamResponse,
    ): string {
        if (streamResult.type === 'error') {
            return streamResult.message;
        }

        if (streamResult.type === 'rate-limited') {
            if (streamResult.rateLimitResult) {
                const requestLimit =
                    streamResult.rateLimitResult.reason === 'daily'
                        ? streamResult.rateLimitResult.daily_requests_limit
                        : streamResult.rateLimitResult.monthly_requests_limit;

                return `You reached your ${streamResult.rateLimitResult.reason} ${requestLimit} message limit.`;
            }
            return 'Rate limit exceeded. Please try again later.';
        }

        if (streamResult.type === 'partial') {
            return 'Returned partial response';
        }

        return 'Unknown error';
    }
}

export default ProjectCreator.getInstance();
