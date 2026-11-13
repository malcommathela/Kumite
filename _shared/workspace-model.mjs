export const VIEWPORT_PRESETS = ['desktop', 'laptop', 'tablet', 'mobile'];

export function createWorkspace(input) {
  return {
    id: input.id,
    projectRef: input.projectRef,
    pan: input.pan ?? { x: 0, y: 0 },
    zoom: input.zoom ?? 1,
    frames: Array.isArray(input.frames) ? [...input.frames] : [],
    activeFrameId: input.activeFrameId ?? null,
  };
}

export function createFrame(input) {
  return {
    id: input.id,
    route: input.route ?? '/',
    position: input.position ?? { x: 0, y: 0 },
    width: input.width ?? 1536,
    height: input.height ?? 960,
    viewportPreset: input.viewportPreset ?? 'desktop',
    displayName: input.displayName ?? 'Frame',
    metadata: input.metadata ?? null,
  };
}

export function validateWorkspace(workspace) {
  const errors = [];
  if (!workspace || typeof workspace !== 'object') return { valid: false, errors: ['workspace must be object'] };
  if (!workspace.id) errors.push('id required');
  if (!workspace.projectRef) errors.push('projectRef required');
  if (typeof workspace.zoom !== 'number' || workspace.zoom < 0.1 || workspace.zoom > 3) errors.push('zoom out of range');
  if (!Array.isArray(workspace.frames)) errors.push('frames must be array');
  return { valid: errors.length === 0, errors };
}

export function validateFrame(frame) {
  const errors = [];
  if (!frame || typeof frame !== 'object') return { valid: false, errors: ['frame must be object'] };
  if (!frame.id) errors.push('id required');
  if (typeof frame.width !== 'number' || frame.width < 280) errors.push('width invalid');
  if (typeof frame.height !== 'number' || frame.height < 360) errors.push('height invalid');
  if (!VIEWPORT_PRESETS.includes(frame.viewportPreset)) errors.push('viewportPreset invalid');
  return { valid: errors.length === 0, errors };
}