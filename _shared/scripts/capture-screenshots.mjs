#!/usr/bin/env node
/**
 * Deterministic screenshot capture without project dependencies.
 *
 * Uses an installed Chromium browser (Edge or Chrome) over the DevTools
 * Protocol. This exists because visual fidelity work needs screenshots at exact
 * viewport sizes, including full-page captures, and the agent environment may
 * not expose a visible desktop window.
 *
 * Usage:
 *   node scripts/capture-screenshots.mjs --url http://127.0.0.1:8123/ \
 *     --out examples/demo/capture/desktop.png --width 1440 --height 900 --full-page
 *
 * Notes:
 * - `--full-page` captures the document height while keeping the viewport width
 *   and height at the values supplied, so responsive layout is not distorted.
 * - The script waits for fonts and images, not for a fixed sleep.
 * - GPU stays enabled. On Edge headless, `--disable-gpu` can suppress the image
 *   layer in viewport-only captures while full-page captures still paint it.
 * - It never uploads or stores credentials.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DEFAULT_BROWSERS = [
  process.env.KUMITE_BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/microsoft-edge',
].filter(Boolean);

function parseArgs(argv) {
  const options = {
    url: null,
    out: 'screenshot.png',
    width: 1440,
    height: 900,
    fullPage: false,
    mobile: false,
    dpr: 1,
    browser: null,
    timeout: 45000,
    scroll: false,
    reducedMotion: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`Missing value for ${argument}`);
      return argv[index];
    };
    switch (argument) {
      case '--url':
        options.url = next();
        break;
      case '--out':
        options.out = next();
        break;
      case '--width':
        options.width = Number(next());
        break;
      case '--height':
        options.height = Number(next());
        break;
      case '--dpr':
        options.dpr = Number(next());
        break;
      case '--browser':
        options.browser = next();
        break;
      case '--timeout':
        options.timeout = Number(next());
        break;
      case '--full-page':
        options.fullPage = true;
        break;
      case '--mobile':
        options.mobile = true;
        break;
      case '--scroll':
        options.scroll = true;
        break;
      case '--reduced-motion':
        options.reducedMotion = true;
        break;
      case '--help':
        console.log('Usage: node scripts/capture-screenshots.mjs --url <url> --out <file.png> [--width 1440] [--height 900] [--full-page] [--scroll] [--reduced-motion] [--mobile] [--dpr 1] [--browser <path>]');
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (!options.url) throw new Error('--url is required');
  if (!Number.isFinite(options.width) || options.width < 100) throw new Error('--width must be at least 100');
  if (!Number.isFinite(options.height) || options.height < 100) throw new Error('--height must be at least 100');
  return options;
}

function findBrowser(explicit) {
  if (explicit) {
    if (!existsSync(explicit)) throw new Error(`Browser not found: ${explicit}`);
    return explicit;
  }
  const found = DEFAULT_BROWSERS.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error('No Chromium browser found. Set KUMITE_BROWSER_PATH or pass --browser.');
  }
  return found;
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(`${message.error.message} (${message.error.code})`));
        else pending.resolve(message.result);
        return;
      }
      if (message.method) {
        for (const listener of this.listeners.get(message.method) ?? []) {
          listener(message.params);
        }
      }
    });
  }

  send(method, params = {}, timeout = 30000) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`CDP timeout: ${method}`));
      }, timeout);
    });
  }

  once(method, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const listeners = this.listeners.get(method) ?? [];
      const timer = setTimeout(() => {
        this.listeners.set(method, (this.listeners.get(method) ?? []).filter((listener) => listener !== handler));
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeout);
      const handler = (params) => {
        clearTimeout(timer);
        this.listeners.set(method, (this.listeners.get(method) ?? []).filter((listener) => listener !== handler));
        resolve(params);
      };
      listeners.push(handler);
      this.listeners.set(method, listeners);
    });
  }

  on(method, handler) {
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(handler);
    this.listeners.set(method, listeners);
  }

  close() {
    this.socket.close();
  }
}

async function waitForJson(url, timeout) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch {
      // Browser is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Browser debugging endpoint did not start: ${url}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const browserPath = findBrowser(options.browser);
  const profile = await mkdtemp(path.join(os.tmpdir(), 'kumite-capture-'));
  const port = 9300 + Math.floor(Math.random() * 500);
  const browser = spawn(
    browserPath,
    [
      '--headless=new',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--force-device-scale-factor=1',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let client;
  try {
    const targets = await waitForJson(`http://127.0.0.1:${port}/json/list`, options.timeout);
    const target = targets.find((item) => item.type === 'page');
    if (!target) throw new Error('No page target found');

    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    client = new CdpClient(socket);
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: options.width,
      height: options.height,
      deviceScaleFactor: options.dpr,
      mobile: options.mobile,
      screenWidth: options.width,
      screenHeight: options.height,
    });

    if (options.reducedMotion) {
      await client.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      });
    }

    const loaded = client.once('Page.loadEventFired', options.timeout);
    await client.send('Page.navigate', { url: options.url });
    await loaded;

    const readiness = await client.send(
      'Runtime.evaluate',
      {
        awaitPromise: true,
        returnByValue: true,
        expression: `
        (async () => {
          // Lazy images never load while off-screen, so ask for them eagerly
          // before waiting. Each image is awaited with a bound so one slow or
          // broken request cannot stall the whole capture.
          const images = [...document.images];
          for (const image of images) {
            image.loading = 'eager';
            image.decoding = 'sync';
          }
          const settle = () => Promise.all(images.map((image) => {
            if (image.complete) return Promise.resolve();
            return new Promise((resolve) => {
              const done = () => {
                image.removeEventListener('load', done);
                image.removeEventListener('error', done);
                resolve();
              };
              image.addEventListener('load', done, { once: true });
              image.addEventListener('error', done, { once: true });
              setTimeout(done, 15000);
            });
          }));
          const fonts = document.fonts?.ready ?? Promise.resolve();
          await Promise.race([
            Promise.all([fonts, settle()]),
            new Promise((resolve) => setTimeout(resolve, 20000)),
          ]);
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          return { images: images.length, failed: images.filter((image) => !image.complete || image.naturalWidth === 0).length };
        })()
      `,
      },
      options.timeout
    );

    if (options.scroll) {
      // Scroll the full document so scroll-triggered reveals run and every
      // lazy image enters the viewport, then return to the top for capture.
      await client.send(
        'Runtime.evaluate',
        {
          awaitPromise: true,
          returnByValue: true,
          expression: `
          (async () => {
            const step = Math.max(200, Math.round(window.innerHeight * 0.8));
            const height = document.documentElement.scrollHeight;
            const previous = document.documentElement.style.scrollBehavior;
            document.documentElement.style.scrollBehavior = 'auto';
            for (let y = 0; y <= height; y += step) {
              window.scrollTo(0, y);
              await new Promise((resolve) => setTimeout(resolve, 60));
            }
            window.scrollTo(0, 0);
            document.documentElement.style.scrollBehavior = previous;
            await new Promise((resolve) => setTimeout(resolve, 500));
            return { scrolled: height, step };
          })()
        `,
        },
        options.timeout
      );
    }

    const metrics = await client.send('Page.getLayoutMetrics');
    const content = metrics.cssContentSize ?? metrics.contentSize;
    const clip = options.fullPage
      ? { x: 0, y: 0, width: Math.ceil(content.width), height: Math.ceil(content.height), scale: 1 }
      : undefined;
    const screenshot = await client.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: options.fullPage,
      ...(clip ? { clip } : {}),
    });
    const output = path.resolve(options.out);
    await writeFile(output, Buffer.from(screenshot.data, 'base64'));
    console.log(JSON.stringify({ out: output, width: clip?.width ?? options.width, height: clip?.height ?? options.height, fullPage: options.fullPage, media: readiness.result?.value ?? null }, null, 2));
  } finally {
    client?.close();
    browser.kill();
    await new Promise((resolve) => setTimeout(resolve, 300));
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((error) => {
  console.error(`Capture failed: ${error.message}`);
  process.exit(1);
});
