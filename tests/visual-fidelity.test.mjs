import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { compareDesign, toMarkdownReport } from '../scripts/lib/fidelity.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

async function loadFixture(name) {
  const raw = await readFile(path.join(here, 'fixtures', 'visual-fidelity', name), 'utf8');
  return JSON.parse(raw);
}

async function basePair() {
  const memory = await loadFixture('memory.json');
  const implementation = await loadFixture('implementation.json');
  return { memory, implementation };
}

function codes(result) {
  return result.issues.map((issue) => issue.code);
}

test('a faithful implementation passes with no discrepancies', async () => {
  const { memory, implementation } = await basePair();
  const result = compareDesign(memory, implementation);
  assert.deepEqual(result.issues, []);
  assert.equal(result.summary.verdict, 'pass');
  assert.equal(result.summary.comparedSections, 3);
  assert.equal(result.summary.comparedImages, 1);
});

test('a missing component is detected as high severity', async () => {
  const { memory, implementation } = await basePair();
  implementation.components = implementation.components.filter((component) => component.id !== 'hero-heading');
  const result = compareDesign(memory, implementation);
  assert.ok(codes(result).includes('MISSING_COMPONENT'));
  const finding = result.issues.find((issue) => issue.code === 'MISSING_COMPONENT');
  assert.equal(finding.severity, 'high');
  assert.match(finding.message, /hero-heading/);
  assert.equal(result.summary.verdict, 'fail');
});

test('an incorrect component variant is detected', async () => {
  const { memory, implementation } = await basePair();
  const heading = implementation.components.find((component) => component.id === 'hero-heading');
  heading.variant = 'muted';
  const result = compareDesign(memory, implementation);
  assert.ok(codes(result).includes('VARIANT_MISMATCH'));
  const finding = result.issues.find((issue) => issue.code === 'VARIANT_MISMATCH');
  assert.match(finding.message, /display/);
  assert.equal(finding.severity, 'high');
});

test('a component style drift is detected without failing the whole variant', async () => {
  const { memory, implementation } = await basePair();
  const heading = implementation.components.find((component) => component.id === 'hero-heading');
  heading.fontSize = 48;
  const result = compareDesign(memory, implementation);
  const finding = result.issues.find((issue) => issue.code === 'COMPONENT_STYLE_MISMATCH');
  assert.ok(finding, 'expected COMPONENT_STYLE_MISMATCH');
  assert.equal(finding.region, 'component:hero-heading');
});

test('an image focal-point mismatch is detected', async () => {
  const { memory, implementation } = await basePair();
  implementation.sections[0].images[0].focalPoint = { x: 0.38, y: 0.55 };
  const result = compareDesign(memory, implementation);
  const finding = result.issues.find((issue) => issue.code === 'FOCAL_POINT_MISMATCH');
  assert.ok(finding);
  assert.equal(finding.severity, 'high');
  assert.match(finding.message, /primary subject/);
});

test('a missing gradient treatment is detected', async () => {
  const { memory, implementation } = await basePair();
  implementation.sections[0].images[0].overlays = [];
  const result = compareDesign(memory, implementation);
  assert.ok(codes(result).includes('MISSING_OVERLAY'));
  const finding = result.issues.find((issue) => issue.code === 'MISSING_OVERLAY');
  assert.equal(finding.severity, 'high');
});

test('an embedded gradient instead of an independent overlay is detected', async () => {
  const { memory, implementation } = await basePair();
  implementation.sections[0].images[0].overlays[0].layer = 'embedded';
  const result = compareDesign(memory, implementation);
  assert.ok(codes(result).includes('OVERLAY_MISMATCH'));
});

test('incorrect section ordering is detected', async () => {
  const { memory, implementation } = await basePair();
  implementation.sections = [implementation.sections[1], implementation.sections[0], implementation.sections[2]];
  const result = compareDesign(memory, implementation);
  const finding = result.issues.find((issue) => issue.code === 'SECTION_ORDER');
  assert.ok(finding);
  assert.equal(finding.severity, 'high');
  assert.match(finding.message, /position 1/);
});

test('a missing section is detected', async () => {
  const { memory, implementation } = await basePair();
  implementation.sections = implementation.sections.filter((section) => section.id !== 'intro');
  const result = compareDesign(memory, implementation);
  assert.ok(codes(result).includes('MISSING_SECTION'));
  assert.equal(result.issues.find((issue) => issue.code === 'MISSING_SECTION').severity, 'high');
});

test('an extra unsupported section is detected', async () => {
  const { memory, implementation } = await basePair();
  implementation.sections.push({ id: 'testimonials', order: 4, background: '#ffffff', components: [] });
  const result = compareDesign(memory, implementation);
  assert.ok(codes(result).includes('EXTRA_SECTION'));
});

test('a responsive crop mismatch is detected', async () => {
  const { memory, implementation } = await basePair();
  implementation.sections[0].images[0].responsive[0].objectPosition = '50% 50%';
  const result = compareDesign(memory, implementation);
  const finding = result.issues.find((issue) => issue.code === 'RESPONSIVE_MISMATCH');
  assert.ok(finding);
  assert.match(finding.message, /mobile/);
});

test('a missing responsive record is detected', async () => {
  const { memory, implementation } = await basePair();
  implementation.sections[0].images[0].responsive = [];
  const result = compareDesign(memory, implementation);
  assert.ok(codes(result).includes('RESPONSIVE_MISMATCH'));
});

test('object-fit drift is detected', async () => {
  const { memory, implementation } = await basePair();
  implementation.sections[0].images[0].objectFit = 'contain';
  const result = compareDesign(memory, implementation);
  assert.ok(codes(result).includes('OBJECT_FIT_MISMATCH'));
});

test('gradient strength and direction drift is detected', async () => {
  const { memory, implementation } = await basePair();
  implementation.sections[0].images[0].overlays[0].strength = 0.2;
  implementation.sections[0].images[0].overlays[0].direction = 'to bottom';
  const result = compareDesign(memory, implementation);
  assert.equal(codes(result).filter((code) => code === 'GRADIENT_MISMATCH').length, 2);
});

test('a missing image is detected', async () => {
  const { memory, implementation } = await basePair();
  delete implementation.sections[0].images;
  const result = compareDesign(memory, implementation);
  assert.ok(codes(result).includes('MISSING_IMAGE'));
});

test('the discrepancy report has the required columns and escapes pipes', async () => {
  const { memory, implementation } = await basePair();
  implementation.components = implementation.components.filter((component) => component.id !== 'hero-heading');
  const result = compareDesign(memory, implementation);
  result.issues[0].message += ' | needs review';
  const report = toMarkdownReport(result, { subject: 'Fixture' });
  assert.match(report, /\| Region \| Difference \| Severity \| Evidence \| Required correction \|/);
  assert.match(report, /MISSING_COMPONENT|hero-heading/);
  assert.match(report, /needs review/);
  assert.match(report, /Pixel differences are not used/);
  assert.ok(report.includes('\\|'), 'pipes in cell text must be escaped');
  assert.match(report, /Verdict: \*\*FAIL\*\*/);
});

test('colour comparison accepts equivalent hex and rgb notation', async () => {
  const { memory, implementation } = await basePair();
  implementation.components.find((component) => component.id === 'hero-heading').foreground = 'rgb(255, 255, 255)';
  const result = compareDesign(memory, implementation);
  assert.ok(!codes(result).includes('COMPONENT_STYLE_MISMATCH'));
});
