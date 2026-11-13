import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspace, createFrame, validateWorkspace, validateFrame } from '../_shared/workspace-model.mjs';

test('workspace defaults', () => {
  const ws = createWorkspace({ id: 'w1', projectRef: 'p1' });
  assert.equal(ws.zoom, 1);
  assert.deepEqual(ws.frames, []);
});

test('frame validation', () => {
  const frame = createFrame({ id: 'f1', width: 100, height: 200, viewportPreset: 'desktop' });
  const result = validateFrame(frame);
  assert.equal(result.valid, false);
});

test('frames keep independent route, viewport and position state', () => {
  const home = createFrame({ id: 'f-home', route: '/', viewportPreset: 'desktop' });
  const about = createFrame({
    id: 'f-about',
    route: '/about',
    viewportPreset: 'mobile',
    position: { x: 1540, y: 0 },
    width: 320,
    height: 568,
  });
  const ws = createWorkspace({ id: 'w1', projectRef: 'p1', frames: [home, about] });

  assert.equal(new Set(ws.frames.map((f) => f.id)).size, 2);
  assert.equal(ws.frames[0].route, '/');
  assert.equal(ws.frames[1].route, '/about');
  assert.equal(ws.frames[0].viewportPreset, 'desktop');
  assert.equal(ws.frames[1].viewportPreset, 'mobile');
  assert.notDeepEqual(ws.frames[0].position, ws.frames[1].position);
  // Defaults must not be shared between separately created frames.
  assert.notEqual(home.position, about.position);
});

test('workspace zoom bounds', () => {
  const base = { id: 'w1', projectRef: 'p1' };
  assert.equal(validateWorkspace(createWorkspace({ ...base, zoom: 0.05 })).valid, false);
  assert.equal(validateWorkspace(createWorkspace({ ...base, zoom: 3.5 })).valid, false);
  assert.equal(validateWorkspace(createWorkspace({ ...base, zoom: 1.5 })).valid, true);
});