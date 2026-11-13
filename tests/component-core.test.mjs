import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createComponentRecord, validateComponentRecord, isInstallable } from '../_shared/component-core.mjs';

test('creates a component record with defaults', () => {
  const record = createComponentRecord({ id: 'button', name: 'Button', source: 'shadcn-ui', license: 'MIT', attribution: 'shadcn' });
  assert.equal(record.id, 'button');
  assert.equal(record.framework, 'react');
  assert.deepEqual(record.files, []);
});

test('rejects unknown license', () => {
  const record = createComponentRecord({ id: 'x', name: 'X', source: 'custom', license: 'Unknown', attribution: 'me' });
  const result = validateComponentRecord(record);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('license must be known'));
});

test('installable only when valid and available', () => {
  const record = createComponentRecord({ id: 'x', name: 'X', source: 'custom', license: 'MIT', attribution: 'me' });
  assert.equal(isInstallable(record), true);
  record.installationStatus = 'installed';
  assert.equal(isInstallable(record), false);
});