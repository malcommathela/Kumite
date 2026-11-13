import { Configuration, TargetConfiguration } from 'electron-builder';

/**
 * @see https://www.electron.build/#documentation
 */
const config: Configuration = {
    appId: 'dev.kumite.studio',
    asar: true,
    /**
     * Native dependencies are not rebuilt against Electron.
     *
     * `@parcel/watcher` ships a N-API prebuild (ABI-stable across Node and
     * Electron) and `node-pty` loads its own binary, so rebuilding is not
     * required for packaging. Rebuilding needs a C++ toolchain that the build
     * host does not have; `electron-builder` fails with "Could not find any
     * Visual Studio installation" before it reaches the packaging step.
     */
    npmRebuild: false,
    directories: {
        output: 'release/${version}',
    },
    files: ['dist-electron', 'dist'],
    extraResources: [
        {
            from: 'resources/bun',
            to: 'bun',
            filter: ['**/*'],
        },
    ],
    mac: {
        artifactName: '${productName}-${arch}.${ext}',
        category: 'public.app-category.developer-tools',
        hardenedRuntime: true,
        gatekeeperAssess: false,
        target: [
            {
                target: 'dmg',
                arch: ['x64', 'arm64'],
            } as TargetConfiguration,
            {
                target: 'zip',
                arch: ['x64', 'arm64'],
            } as TargetConfiguration,
        ],
    },
    win: {
        target: [
            {
                target: 'nsis',
                arch: ['x64'],
            } as TargetConfiguration,
        ],
        artifactName: '${productName}-setup.${ext}',
    },
    linux: {
        target: [
            {
                target: 'AppImage',
                arch: ['x64', 'arm64'],
            } as TargetConfiguration,
            {
                target: 'deb',
                arch: ['x64', 'arm64'],
            } as TargetConfiguration,
        ],
        artifactName: '${productName}-${arch}.${ext}',
        category: 'Utility',
        executableName: 'Kumite',
        icon: 'build/icon.png',
        protocols: [
            {
                name: 'kumite',
                schemes: ['kumite'],
            },
        ],
    },
    nsis: {
        // Kumite-branded installer. Icons resolve against `build/`, the default
        // buildResources directory, so they are given without a prefix.
        shortcutName: 'Kumite',
        installerIcon: 'icon.ico',
        uninstallerIcon: 'icon.ico',
        installerHeaderIcon: 'icon.ico',
        // User projects, settings and conversations live in the app's userData
        // directory. Uninstalling must never remove them.
        deleteAppDataOnUninstall: false,
    },
    publish: {
        provider: 'github',
        owner: 'malcommathela',
        repo: 'Kumite',
    },
};

export default config;
