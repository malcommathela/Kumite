import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import {
  COMPOSITION_ROLES,
  classifyImageUse,
  suggestRole,
  validateImageRecord,
  requiresIndependentOverlay,
  checkAssetSuitability,
  summariseComposition,
} from '../_shared/scripts/lib/image-composition.mjs';

const FIXTURES = new URL('./fixtures/image-composition/', import.meta.url);
const ROLES = COMPOSITION_ROLES.map((entry) => entry.id);

function load(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, FIXTURES), 'utf8'));
}

function codes(issues) {
  return issues.map((entry) => entry.code);
}

function hasCode(issues, code) {
  return codes(issues).includes(code);
}

// ---------------------------------------------------------------------------
// Roles and classification
// ---------------------------------------------------------------------------

test('COMPOSITION_ROLES declares the seven canonical roles with descriptions', () => {
  assert.equal(COMPOSITION_ROLES.length, 7);
  assert.deepEqual(ROLES.sort(), [
    'blended-photographic-background',
    'decorative-photography',
    'floating-photography',
    'full-bleed-background',
    'inline-editorial-photography',
    'product-photography',
    'split-composition',
  ]);
  for (const role of COMPOSITION_ROLES) {
    assert.ok(role.description.length > 20, `${role.id} needs a useful description`);
  }
});

test('classifyImageUse returns a declared role and null for an unknown role', () => {
  assert.equal(classifyImageUse({ role: 'full-bleed-background' }), 'full-bleed-background');
  assert.equal(classifyImageUse({ role: 'background' }), null);
  assert.equal(classifyImageUse({}), null);
});

test('suggestRole classifies a section-filling photograph as full-bleed', () => {
  const suggestion = suggestRole({
    occupiesSection: true,
    hasTextOverlay: true,
    independentElement: false,
    subjectCount: 1,
    isProduct: false,
  });
  assert.equal(suggestion.role, 'full-bleed-background');
  assert.match(suggestion.rationale, /fills the section/i);
});

test('suggestRole classifies a side-by-side image as a split composition', () => {
  const suggestion = suggestRole({
    occupiesSection: false,
    hasTextOverlay: false,
    independentElement: true,
    subjectCount: 1,
    isProduct: false,
  });
  assert.equal(suggestion.role, 'split-composition');
  assert.match(suggestion.rationale, /peer of the copy|distinct element/i);
});

test('suggestRole prefers product photography when the subject is the product', () => {
  assert.equal(
    suggestRole({
      occupiesSection: true,
      hasTextOverlay: true,
      independentElement: true,
      subjectCount: 1,
      isProduct: true,
    }).role,
    'product-photography',
  );
});

// ---------------------------------------------------------------------------
// Valid records
// ---------------------------------------------------------------------------

test('a realistic full-bleed hero passes with no issues', () => {
  const result = validateImageRecord(load('valid/hero-full-bleed.json'));
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
});

test('every valid fixture passes validation', () => {
  const directory = new URL('valid/', FIXTURES);
  const files = readdirSync(directory).filter((file) => file.endsWith('.json'));
  assert.ok(files.length >= 5);
  for (const file of files) {
    const result = validateImageRecord(JSON.parse(readFileSync(new URL(file, directory), 'utf8')));
    assert.equal(result.valid, true, `${file}: ${JSON.stringify(result.errors)}`);
  }
});

test('a split composition passes with its reserved text-safe area', () => {
  const record = load('valid/split-composition.json');
  assert.ok(record.composition.textSafeArea);
  const result = validateImageRecord(record);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.equal(hasCode(result.warnings, 'TEXT_SAFE_AREA_MISSING'), false);
});

// ---------------------------------------------------------------------------
// Focal point and text-safe area
// ---------------------------------------------------------------------------

test('a focal point outside the 0..1 bounds is rejected', () => {
  const result = validateImageRecord(load('invalid/focal-point-out-of-range.json'));
  assert.equal(result.valid, false);
  assert.ok(hasCode(result.errors, 'FOCAL_POINT_OUT_OF_RANGE'));
});

test('a record without composition is rejected', () => {
  const result = validateImageRecord(load('invalid/missing-composition.json'));
  assert.equal(result.valid, false);
  assert.ok(hasCode(result.errors, 'COMPOSITION_MISSING'));
});

test('a record without a focal point is rejected', () => {
  const record = structuredClone(load('valid/hero-full-bleed.json'));
  delete record.composition.primaryFocalPoint;
  const result = validateImageRecord(record);
  assert.equal(result.valid, false);
  assert.ok(hasCode(result.errors, 'FOCAL_POINT_MISSING'));
});

test('a background without a text-safe area warns', () => {
  const record = structuredClone(load('valid/hero-full-bleed.json'));
  delete record.composition.textSafeArea;
  const result = validateImageRecord(record);
  assert.equal(result.valid, true);
  assert.ok(hasCode(result.warnings, 'TEXT_SAFE_AREA_MISSING'));
});

test('a zero-area text-safe region is rejected', () => {
  const result = validateImageRecord(load('invalid/text-safe-area-zero.json'));
  assert.equal(result.valid, false);
  assert.ok(hasCode(result.errors, 'TEXT_SAFE_AREA_EMPTY'));
});

test('text covering the focal point produces a warning', () => {
  const result = validateImageRecord(load('invalid/text-overlaps-focal.json'));
  assert.equal(result.valid, true);
  assert.ok(hasCode(result.warnings, 'TEXT_OVERLAPS_FOCAL_POINT'));
});

test('an unknown focal point warns instead of silently passing as centred', () => {
  const result = validateImageRecord(load('uncertain/unknown-focal.json'));
  assert.equal(result.valid, true);
  assert.ok(hasCode(result.warnings, 'UNKNOWN_FOCAL_POINT_UNRESOLVED'));
  assert.ok(result.warnings.length > 0);
});

// ---------------------------------------------------------------------------
// Overlays and image preservation
// ---------------------------------------------------------------------------

test('requiresIndependentOverlay is true for a background with a text-safe area', () => {
  assert.equal(requiresIndependentOverlay(load('valid/hero-full-bleed.json')), true);
  assert.equal(requiresIndependentOverlay(load('valid/split-composition.json')), false);
});

test('an embedded gradient on a full-bleed background is rejected', () => {
  const result = validateImageRecord(load('invalid/embedded-gradient.json'));
  assert.equal(result.valid, false);
  assert.ok(hasCode(result.errors, 'OVERLAY_EMBEDDED'));
});

test('an independent gradient overlay preserving image detail is accepted', () => {
  const record = load('valid/hero-full-bleed.json');
  const overlay = record.overlays[0];
  assert.equal(overlay.kind, 'linear-gradient');
  assert.equal(overlay.layer, 'independent');
  assert.equal(overlay.preservesImage, true);
  assert.equal(validateImageRecord(record).valid, true);
});

test('an overlay that does not preserve image detail is rejected', () => {
  const result = validateImageRecord(load('invalid/image-detail-not-preserved.json'));
  assert.equal(result.valid, false);
  assert.ok(hasCode(result.errors, 'IMAGE_DETAIL_NOT_PRESERVED'));
});

test('whole-image opacity reduction is rejected', () => {
  const result = validateImageRecord(load('invalid/whole-image-opacity.json'));
  assert.equal(result.valid, false);
  assert.ok(hasCode(result.errors, 'WHOLE_IMAGE_OPACITY_REDUCTION'));
});

test('a whole-image blur without source evidence is rejected', () => {
  const result = validateImageRecord(load('invalid/filter-blur-no-evidence.json'));
  assert.equal(result.valid, false);
  assert.ok(hasCode(result.errors, 'FILTER_WITHOUT_EVIDENCE'));
});

test('a whole-image blur with measured source evidence is accepted', () => {
  const record = structuredClone(load('invalid/filter-blur-no-evidence.json'));
  record.css.filterJustification = {
    value: 'The reference hero blurs the workshop photograph behind its pull quote.',
    confidence: 'measured',
    evidence: ['ev-shot'],
  };
  const result = validateImageRecord(record);
  assert.equal(hasCode(result.errors, 'FILTER_WITHOUT_EVIDENCE'), false, JSON.stringify(result.errors));
  assert.equal(result.valid, true);
});

test('an independent overlay with kind none is rejected', () => {
  const record = structuredClone(load('valid/hero-full-bleed.json'));
  record.overlays[0] = {
    kind: 'none',
    layer: 'independent',
    purpose: { value: 'Contradictory layer declaration.', confidence: 'exact', evidence: ['ev-design-spec'] },
    preservesImage: true,
  };
  const result = validateImageRecord(record);
  assert.equal(result.valid, false);
  assert.ok(hasCode(result.errors, 'INDEPENDENT_OVERLAY_WITHOUT_KIND'));
});

// ---------------------------------------------------------------------------
// Gradients
// ---------------------------------------------------------------------------

test('a text-contrast gradient that is too weak produces warnings', () => {
  const result = validateImageRecord(load('invalid/gradient-too-weak.json'));
  assert.equal(result.valid, true);
  assert.ok(hasCode(result.warnings, 'GRADIENT_TOO_WEAK'));
});

test('gradient stops must be ordered from 0 to 1', () => {
  const result = validateImageRecord(load('invalid/gradient-unordered-stops.json'));
  assert.equal(result.valid, false);
  assert.ok(hasCode(result.errors, 'GRADIENT_STOP_ORDER'));
});

test('an unrecognised gradient colour is rejected', () => {
  const result = validateImageRecord(load('invalid/gradient-invalid-colour.json'));
  assert.equal(result.valid, false);
  assert.ok(hasCode(result.errors, 'GRADIENT_COLOUR_INVALID'));
});

test('a radial gradient without justification warns', () => {
  const record = structuredClone(load('valid/hero-blended.json'));
  delete record.overlays[0].justification;
  const result = validateImageRecord(record);
  assert.equal(result.valid, true);
  assert.ok(hasCode(result.warnings, 'RADIAL_UNJUSTIFIED'));
});

// ---------------------------------------------------------------------------
// Responsive behaviour
// ---------------------------------------------------------------------------

test('a full-bleed background without responsive crop metadata is rejected', () => {
  const result = validateImageRecord(load('invalid/responsive-missing.json'));
  assert.equal(result.valid, false);
  assert.ok(hasCode(result.errors, 'RESPONSIVE_CROP_MISSING'));
});

test('a split image without per-breakpoint object position warns', () => {
  const result = validateImageRecord(load('invalid/split-no-object-position.json'));
  assert.equal(result.valid, true);
  assert.ok(hasCode(result.warnings, 'RESPONSIVE_OBJECT_POSITION_MISSING'));
});

test('full-bleed must use object-fit cover', () => {
  const result = validateImageRecord(load('invalid/full-bleed-contain.json'));
  assert.equal(result.valid, false);
  assert.ok(hasCode(result.errors, 'FULL_BLEED_OBJECT_FIT'));
});

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

test('evidence identifiers must exist in the reference evidence set', () => {
  const result = validateImageRecord(load('valid/hero-full-bleed.json'), {
    evidenceIds: new Set(['ev-hero-screenshot']),
  });
  assert.equal(result.valid, false);
  assert.ok(hasCode(result.errors, 'UNKNOWN_EVIDENCE'));
});

// ---------------------------------------------------------------------------
// Asset suitability
// ---------------------------------------------------------------------------

test('a compatible asset is accepted', () => {
  const result = checkAssetSuitability(load('assets/compatible-architecture-hero.json'));
  assert.equal(result.suitable, true, JSON.stringify(result.issues));
  assert.equal(result.issues.filter((entry) => entry.severity === 'error').length, 0);
});

test('an asset below the container resolution is rejected', () => {
  const result = checkAssetSuitability(load('assets/too-small-lobby.json'));
  assert.equal(result.suitable, false);
  assert.ok(hasCode(result.issues, 'ASSET_TOO_SMALL'));
});

test('a crop that excludes the focal point is rejected', () => {
  const result = checkAssetSuitability(load('assets/crop-excludes-focal.json'));
  assert.equal(result.suitable, false);
  assert.ok(hasCode(result.issues, 'CROP_EXCLUDES_FOCAL_POINT'));
});

test('a text-safe area clipped by the crop is rejected', () => {
  const result = checkAssetSuitability(load('assets/text-safe-area-cropped.json'));
  assert.equal(result.suitable, false);
  assert.ok(hasCode(result.issues, 'TEXT_SAFE_AREA_UNSAFE'));
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

test('summariseComposition reports role, focal point, safe area and overlay', () => {
  const summary = summariseComposition(load('valid/hero-full-bleed.json'));
  assert.match(summary, /^full-bleed-background/);
  assert.match(summary, /focal point \(0\.31, 0\.46\)/);
  assert.match(summary, /text-safe area \(0\.52, 0\.48, 0\.4 x 0\.38\)/);
  assert.match(summary, /linear-gradient on independent layer preserving image detail/);
});

test('summariseComposition handles an unclassified record without throwing', () => {
  assert.equal(summariseComposition(null), 'No image composition record.');
  assert.match(summariseComposition({}), /unclassified/);
});
