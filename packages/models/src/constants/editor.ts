import { DEFAULT_IDE } from '../ide/index.ts';

export const APP_NAME = 'Kumite';
export const APP_SCHEMA = 'kumite';
export const HOSTING_DOMAIN = 'onlook.live';
export const CUSTOM_OUTPUT_DIR = '.next-prod';
export const MAX_NAME_LENGTH = 50;

export enum EditorAttributes {
    // DOM attributes
    KUMITE_TOOLBAR = 'kumite-toolbar',
    KUMITE_RECT_ID = 'kumite-rect',
    KUMITE_STYLESHEET_ID = 'kumite-stylesheet',
    KUMITE_STUB_ID = 'kumite-drag-stub',
    KUMITE_MOVE_KEY_PREFIX = 'kmk-',
    OVERLAY_CONTAINER_ID = 'overlay-container',
    CANVAS_CONTAINER_ID = 'canvas-container',

    // IDs
    DATA_KUMITE_ID = 'data-oid',
    DATA_KUMITE_INSTANCE_ID = 'data-oiid',
    DATA_KUMITE_DOM_ID = 'data-odid',
    DATA_KUMITE_COMPONENT_NAME = 'data-ocname',

    // Data attributes
    DATA_KUMITE_IGNORE = 'data-kumite-ignore',
    DATA_KUMITE_INSERTED = 'data-kumite-inserted',
    DATA_KUMITE_DRAG_SAVED_STYLE = 'data-kumite-drag-saved-style',
    DATA_KUMITE_DRAGGING = 'data-kumite-dragging',
    DATA_KUMITE_DRAG_DIRECTION = 'data-kumite-drag-direction',
    DATA_KUMITE_DRAG_START_POSITION = 'data-kumite-drag-start-position',
    DATA_KUMITE_NEW_INDEX = 'data-kumite-new-index',
    DATA_KUMITE_EDITING_TEXT = 'data-kumite-editing-text',
    DATA_KUMITE_DYNAMIC_TYPE = 'data-kumite-dynamic-type',
    DATA_KUMITE_CORE_ELEMENT_TYPE = 'data-kumite-core-element-type',
    KUMITE_DEFAULT_STYLESHEET_ID = 'kumite-default-stylesheet',
}

/**
 * Move-key prefix written into project source by builds released as Onlook
 * (`key="olk-xxxx"`). Cleanup still recognises it so projects edited before the
 * rebrand are cleaned like current ones.
 */
export const LEGACY_MOVE_KEY_PREFIX = 'olk-';

export enum Links {
    // TODO(kumite): placeholder destinations. Kumite has no community invite,
    // marketing site or support mailbox yet, so these point at the repository
    // until real Kumite addresses are supplied. See KUMITE_REBRAND_AUDIT.md.
    DISCORD = 'https://github.com/malcommathela/Kumite',
    GITHUB = 'https://github.com/malcommathela/Kumite',
    USAGE_DOCS = 'https://github.com/malcommathela/Kumite#readme',
    WIKI = 'https://github.com/malcommathela/Kumite#readme',
    OPEN_ISSUE = 'https://github.com/malcommathela/Kumite/issues',
}

export enum Orientation {
    Portrait = 'Portrait',
    Landscape = 'Landscape',
}

export enum Theme {
    Light = 'light',
    Dark = 'dark',
    System = 'system',
}

export const DefaultSettings = {
    SCALE: 0.7,
    PAN_POSITION: { x: 175, y: 100 },
    URL: 'http://localhost:3000/',
    FRAME_POSITION: { x: 0, y: 0 },
    FRAME_DIMENSION: { width: 1536, height: 960 },
    ASPECT_RATIO_LOCKED: false,
    DEVICE: 'Custom:Custom',
    THEME: Theme.System,
    ORIENTATION: Orientation.Portrait,
    MIN_DIMENSIONS: { width: '280px', height: '360px' },
    COMMANDS: {
        run: 'npm run dev',
        build: 'npm run build',
        install: 'npm install',
    },
    IMAGE_FOLDER: 'public/images',
    IMAGE_DIMENSION: { width: '100px', height: '100px' },
    FONT_FOLDER: 'public/fonts',
    FONT_CONFIG: 'app/fonts.ts',
    CHAT_SETTINGS: {
        showSuggestions: true,
        autoApplyCode: true,
        expandCodeBlocks: false,
        showMiniChat: true,
    },
    EDITOR_SETTINGS: {
        shouldWarnDelete: true,
        ideType: DEFAULT_IDE,
        enableBunReplace: true,
        buildFlags: '--no-lint',
    },
};

export const DEFAULT_COLOR_NAME = 'DEFAULT';
