import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
    _electron as electron,
    expect,
    test,
    type ElectronApplication,
    type Page,
} from '@playwright/test';

/**
 * Canvas drag regression: a component dropped anywhere on the canvas stays at
 * the release point instead of snapping into a layout slot.
 *
 * The studio drives a real project through its own Play button, so this spec
 * needs the local Kumite project the app opens. It skips itself when that
 * project is missing, and restores every source file it touches.
 */

const STUDIO_DIR = path.resolve(import.meta.dirname, '..');
const PROJECTS_FILE = path.join(process.env.APPDATA ?? '', 'Kumite', 'projects.json');
const profile = path.join(
    process.env.LOCALAPPDATA ?? process.env.TEMP ?? '.',
    'Temp',
    'kumite-e2e-profile',
);

test.describe.configure({ mode: 'serial' });
test.describe('canvas drag', () => {
    test.skip(!fs.existsSync(PROJECTS_FILE), 'needs a local Kumite project to drive');
    test.setTimeout(240_000);

    let app: ElectronApplication;
    let page: Page;
    const restore: Array<{ file: string; contents: string }> = [];

    test.beforeAll(async () => {
        const projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf8'));
        const project = projects.projects[0];
        project.settings.scale = 1;
        project.settings.position = { x: 200, y: 100 };
        project.settings.frames = [project.settings.frames[0]];
        project.settings.frames[0].url = 'http://localhost:3000/';
        project.settings.frames[0].position = { x: 0, y: 0 };
        project.settings.activeFrameId = project.settings.frames[0].id;
        fs.mkdirSync(profile, { recursive: true });
        fs.writeFileSync(path.join(profile, 'projects.json'), JSON.stringify(projects));

        for (const relative of ['app/page.tsx', 'components/ui/button.tsx']) {
            const file = path.join(project.folderPath, relative);
            if (fs.existsSync(file)) {
                restore.push({ file, contents: fs.readFileSync(file, 'utf8') });
            }
        }

        app = await electron.launch({
            args: ['.', `--user-data-dir=${profile}`],
            cwd: STUDIO_DIR,
            env: { ...process.env, NODE_ENV: 'production' },
            timeout: 120_000,
        });
        page = await app.firstWindow();
        await page.waitForTimeout(8_000);
    });

    test.afterAll(async () => {
        for (const { file, contents } of restore) {
            try {
                fs.writeFileSync(file, contents);
            } catch {
                // Best effort restore.
            }
        }
        const pid = app?.process()?.pid;
        if (pid) {
            await new Promise<void>((resolve) => {
                const killer = spawn('taskkill', ['/pid', String(pid), '/T', '/F'], {
                    stdio: 'ignore',
                });
                killer.on('exit', () => resolve());
                killer.on('error', () => resolve());
            });
        }
    });

    test('drops a component where the pointer was released', async () => {
        // The project server only starts from the app's own Play button.
        await page.locator('button:has-text("Play")').first().click();

        await expect
            .poll(
                async () => {
                    try {
                        const state = (await guest(
                            page,
                            app!,
                            'location.href + "|" + document.body.innerText.trim().slice(0, 20)',
                        )) as string | null;
                        return (
                            typeof state === 'string' &&
                            state.startsWith('http://localhost:3000') &&
                            state.length > 30
                        );
                    } catch {
                        return false;
                    }
                },
                { timeout: 120_000 },
            )
            .toBe(true);
        await page.waitForTimeout(2_000);

        const webview = await page.evaluate(() => {
            const element = document.querySelector('webview')!;
            const rect = element.getBoundingClientRect();
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        });
        const guestSize = (await guest(page, app!, '[innerWidth, innerHeight]')) as [
            number,
            number,
        ];
        const scale = { x: webview.width / guestSize[0], y: webview.height / guestSize[1] };

        const button = (await guest(
            page,
            app!,
            `(() => {
                const el = document.querySelector('button');
                const rect = el.getBoundingClientRect();
                return { x: rect.x, y: rect.y, width: rect.width, height: rect.height,
                    parent: el.parentElement ? el.parentElement.tagName : null };
            })()`,
        )) as { x: number; y: number; width: number; height: number; parent: string };

        const from = {
            x: webview.x + (button.x + button.width / 2) * scale.x,
            y: webview.y + (button.y + button.height / 2) * scale.y,
        };
        const to = { x: from.x - 160, y: from.y + 140 };

        // Select first so the drag starts on a known element.
        await page.mouse.move(from.x, from.y);
        await page.mouse.down();
        await page.mouse.up();
        await page.waitForTimeout(1_000);

        await page.mouse.move(from.x, from.y);
        await page.mouse.down();
        for (let step = 1; step <= 16; step++) {
            await page.mouse.move(
                from.x + ((to.x - from.x) * step) / 16,
                from.y + ((to.y - from.y) * step) / 16,
            );
            await page.waitForTimeout(60);
        }
        await page.mouse.up();
        await page.waitForTimeout(2_000);

        const dropped = (await guest(
            page,
            app!,
            `(() => {
                const el = document.querySelector('button');
                const rect = el.getBoundingClientRect();
                const styles = getComputedStyle(el);
                return { x: rect.x, y: rect.y,
                    parent: el.parentElement ? el.parentElement.tagName : null,
                    position: styles.position, left: styles.left, top: styles.top };
            })()`,
        )) as {
            x: number;
            y: number;
            parent: string;
            position: string;
            left: string;
            top: string;
        };

        // The grabbed point of the element is the pointer, so the element keeps
        // the same offset from the pointer it had when the drag started.
        const expected = {
            x: button.x + (to.x - from.x) / scale.x,
            y: button.y + (to.y - from.y) / scale.y,
        };

        expect(dropped.parent).toBe(button.parent);
        expect(dropped.position).toBe('relative');
        expect(Math.abs(dropped.x - expected.x)).toBeLessThanOrEqual(2);
        expect(Math.abs(dropped.y - expected.y)).toBeLessThanOrEqual(2);
    });
});

async function webContentsId(page: Page): Promise<number | null> {
    return page.evaluate(() => {
        const element = document.querySelector('webview') as
            (HTMLElement & { getWebContentsId?: () => number }) | null;
        const id = element?.getWebContentsId?.();
        return typeof id === 'number' ? id : null;
    });
}

async function guest(page: Page, app: ElectronApplication, source: string) {
    const id = await webContentsId(page);
    if (id === null) {
        throw new Error('no canvas');
    }
    return app.evaluate(
        async ({ webContents }, [webContentsId, code]) => {
            const target = webContents.fromId(webContentsId as number);
            return target ? target.executeJavaScript(code as string) : null;
        },
        [id, source] as [number, string],
    );
}
