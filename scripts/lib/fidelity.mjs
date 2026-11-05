/**
 * Region-based visual fidelity comparison for Kumite.
 *
 * Compares a Design Memory Map (reference evidence) against an implementation
 * manifest (what was actually built). The goal is to catch structural and
 * composition drift that build, lint and accessibility checks cannot see:
 * missing components, collapsed variants, wrong section order, lost focal
 * points and dropped gradient treatments.
 *
 * Pixel-difference scores are deliberately not computed here. Anti-aliasing,
 * font rasterisation, dynamic content and image substitutions make them noisy.
 * This module compares recorded, human-readable properties; screenshots remain
 * the evidence used to interpret the result.
 */

const DEFAULT_OPTIONS = {
  focalPointTolerance: 0.04,
  positionTolerance: 3,
  safeAreaTolerance: 0.03,
  colourTolerance: 0,
};

/** @typedef {'high'|'medium'|'low'} Severity */

function issue(code, severity, region, message, extra = {}) {
  return { code, severity, region, message, ...extra };
}

function tracedValue(value) {
  if (value && typeof value === 'object' && 'value' in value && 'confidence' in value) {
    return value.value;
  }
  return value;
}

function normaliseColour(value) {
  if (typeof value !== 'string') return value;
  const colour = value.trim().toLowerCase();
  if (colour === 'transparent') return 'transparent';
  const shortHex = colour.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/);
  if (shortHex) {
    return `#${shortHex[1]}${shortHex[1]}${shortHex[2]}${shortHex[2]}${shortHex[3]}${shortHex[3]}`;
  }
  if (/^#[0-9a-f]{6}$/.test(colour)) return colour;
  const rgb = colour.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+))?\s*\)$/);
  if (rgb) {
    const [, r, g, b] = rgb;
    return `#${[r, g, b].map((part) => Number(part).toString(16).padStart(2, '0')).join('')}`;
  }
  return colour;
}

function coloursEqual(a, b) {
  return normaliseColour(a) === normaliseColour(b);
}

function toNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const match = value.match(/-?\d+(?:\.\d+)?/);
    if (match) return Number(match[0]);
  }
  return null;
}

function parseObjectPosition(value) {
  if (typeof value !== 'string') return null;
  const parts = value.trim().split(/\s+/);
  if (parts.length === 1) {
    return { x: toNumber(parts[0]), y: 50 };
  }
  if (parts.length >= 2) {
    return { x: toNumber(parts[0]), y: toNumber(parts[1]) };
  }
  return null;
}

function positionsEqual(a, b, tolerance) {
  const pa = parseObjectPosition(a);
  const pb = parseObjectPosition(b);
  if (!pa || !pb) return a === b;
  if (pa.x === null || pa.y === null || pb.x === null || pb.y === null) return a === b;
  return Math.abs(pa.x - pb.x) <= tolerance && Math.abs(pa.y - pb.y) <= tolerance;
}

function focalPointsEqual(a, b, tolerance) {
  if (!a || !b || typeof a.x !== 'number' || typeof b.x !== 'number') return false;
  return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance;
}

function safeAreasEqual(a, b, tolerance) {
  if (!a || !b) return false;
  const keys = ['x', 'y', 'width', 'height'];
  return keys.every((key) => Math.abs(Number(a[key]) - Number(b[key])) <= tolerance);
}

function maxGradientStrength(overlay) {
  if (typeof overlay.strength === 'number') return overlay.strength;
  if (Array.isArray(overlay.stops) && overlay.stops.length > 0) {
    return Math.max(...overlay.stops.map((stop) => alphaOf(stop.colour)));
  }
  return null;
}

function alphaOf(colour) {
  if (typeof colour !== 'string') return 0;
  const rgba = colour.match(/rgba?\([^)]*?,\s*([\d.]+)\s*\)/);
  if (rgba) return Number(rgba[1]);
  if (colour === 'transparent') return 0;
  return 1;
}

function overlaySignature(overlay) {
  return [overlay.kind, overlay.layer].join('|');
}

function findResponsive(entries, breakpoint) {
  return (entries ?? []).find((entry) => entry.breakpoint === breakpoint) ?? null;
}

function compareComponent(memoryComponent, implementationComponent, options, issues) {
  const region = `component:${memoryComponent.id}`;
  const variantName = implementationComponent.variant;
  const variant = (memoryComponent.variants ?? []).find((item) => item.name === variantName);
  if (!variant) {
    issues.push(
      issue(
        'VARIANT_MISMATCH',
        'high',
        region,
        `Implementation uses variant "${variantName}", which the reference does not define. Reference variants: ${(memoryComponent.variants ?? []).map((item) => item.name).join(', ')}.`,
        { memoryPath: `components.${memoryComponent.id}.variants`, implementationPath: `components.${memoryComponent.id}.variant` }
      )
    );
    return;
  }

  const properties = variant.properties ?? {};
  const checks = [
    ['background', 'background', 'colour'],
    ['foreground', 'foreground', 'colour'],
    ['radius', 'radius', 'number'],
    ['height', 'height', 'number'],
    ['fontSize', 'fontSize', 'number'],
    ['padding', 'padding', 'number'],
  ];

  for (const [memoryKey, implementationKey, kind] of checks) {
    const expected = tracedValue(properties[memoryKey]);
    const actual = implementationComponent[implementationKey];
    if (expected === undefined || actual === undefined) continue;
    const expectedValue = kind === 'number' ? toNumber(expected) : expected;
    const actualValue = kind === 'number' ? toNumber(actual) : actual;
    if (expectedValue === null || actualValue === null) continue;
    if (kind === 'colour') {
      if (!coloursEqual(expectedValue, actualValue)) {
        issues.push(
          issue('COMPONENT_STYLE_MISMATCH', 'medium', region, `${implementationKey} is ${actual}, reference is ${expected}.`, {
            memoryPath: `components.${memoryComponent.id}.variants.${variantName}.properties.${memoryKey}`,
            implementationPath: `components.${memoryComponent.id}.${implementationKey}`,
          })
        );
      }
      continue;
    }
    const tolerance = memoryKey === 'height' || memoryKey === 'radius' ? 1 : options.positionTolerance;
    if (Math.abs(expectedValue - actualValue) > tolerance) {
      issues.push(
        issue('COMPONENT_STYLE_MISMATCH', 'medium', region, `${implementationKey} is ${actual}, reference is ${expected}.`, {
          memoryPath: `components.${memoryComponent.id}.variants.${variantName}.properties.${memoryKey}`,
          implementationPath: `components.${memoryComponent.id}.${implementationKey}`,
        })
      );
    }
  }
}

function compareImage(memoryImage, implementationImage, options, issues) {
  const region = `image:${memoryImage.id}`;
  if (!implementationImage) {
    issues.push(
      issue('MISSING_IMAGE', 'high', region, `Reference image "${memoryImage.id}" is not present in the implementation manifest.`, {
        memoryPath: `images.${memoryImage.id}`,
      })
    );
    return;
  }

  if ((memoryImage.css?.objectFit ?? 'cover') !== (implementationImage.objectFit ?? 'cover')) {
    issues.push(
      issue(
        'OBJECT_FIT_MISMATCH',
        'high',
        region,
        `object-fit is ${implementationImage.objectFit ?? 'unset'}, reference uses ${memoryImage.css?.objectFit ?? 'cover'}.`,
        { memoryPath: `images.${memoryImage.id}.css.objectFit`, implementationPath: `images.${memoryImage.id}.objectFit` }
      )
    );
  }

  const expectedPosition = tracedValue(memoryImage.css?.objectPosition);
  const actualPosition = implementationImage.objectPosition;
  if (expectedPosition && actualPosition && !positionsEqual(expectedPosition, actualPosition, options.positionTolerance)) {
    issues.push(
      issue('OBJECT_POSITION_MISMATCH', 'medium', region, `object-position is ${actualPosition}, reference is ${expectedPosition}.`, {
        memoryPath: `images.${memoryImage.id}.css.objectPosition`,
        implementationPath: `images.${memoryImage.id}.objectPosition`,
      })
    );
  }

  const expectedFocal = memoryImage.composition?.primaryFocalPoint;
  const actualFocal = implementationImage.focalPoint;
  if (expectedFocal && !focalPointsEqual(expectedFocal, actualFocal, options.focalPointTolerance)) {
    const actualText = actualFocal ? `${actualFocal.x.toFixed(2)}, ${actualFocal.y.toFixed(2)}` : 'missing';
    issues.push(
      issue(
        'FOCAL_POINT_MISMATCH',
        'high',
        region,
        `Focal point is ${actualText}; reference is ${expectedFocal.x.toFixed(2)}, ${expectedFocal.y.toFixed(2)}. The crop may cut the primary subject.`,
        { memoryPath: `images.${memoryImage.id}.composition.primaryFocalPoint`, implementationPath: `images.${memoryImage.id}.focalPoint` }
      )
    );
  }

  const expectedSafeArea = memoryImage.composition?.textSafeArea;
  const actualSafeArea = implementationImage.textSafeArea;
  if (expectedSafeArea && actualSafeArea && !safeAreasEqual(expectedSafeArea, actualSafeArea, options.safeAreaTolerance)) {
    issues.push(
      issue('TEXT_SAFE_AREA_MISMATCH', 'medium', region, 'The text-safe area moved relative to the reference; verify contrast and focal-point separation.', {
        memoryPath: `images.${memoryImage.id}.composition.textSafeArea`,
        implementationPath: `images.${memoryImage.id}.textSafeArea`,
      })
    );
  }

  const expectedOverlays = (memoryImage.overlays ?? []).filter((overlay) => overlay.kind !== 'none');
  const actualOverlays = (implementationImage.overlays ?? []).filter((overlay) => overlay.kind !== 'none');
  if (expectedOverlays.length > 0 && actualOverlays.length === 0) {
    issues.push(
      issue('MISSING_OVERLAY', 'high', region, 'The reference uses a gradient/overlay treatment for text contrast; the implementation has none.', {
        memoryPath: `images.${memoryImage.id}.overlays`,
        implementationPath: `images.${memoryImage.id}.overlays`,
      })
    );
  }

  for (const expected of expectedOverlays) {
    const match = actualOverlays.find((overlay) => overlaySignature(overlay) === overlaySignature(expected));
    if (!match) {
      issues.push(
        issue(
          'OVERLAY_MISMATCH',
          'high',
          region,
          `Expected ${expected.kind} on an ${expected.layer} layer${expected.direction ? ` (${expected.direction})` : ''}; implementation differs.`,
          { memoryPath: `images.${memoryImage.id}.overlays`, implementationPath: `images.${memoryImage.id}.overlays` }
        )
      );
      continue;
    }
    if (match.preservesImage === false) {
      issues.push(
        issue('IMAGE_DETAIL_NOT_PRESERVED', 'high', region, 'The overlay is marked as not preserving photographic detail.', {
          implementationPath: `images.${memoryImage.id}.overlays`,
        })
      );
    }
    const expectedStrength = maxGradientStrength(expected);
    const actualStrength = maxGradientStrength(match);
    if (expectedStrength !== null && actualStrength !== null && Math.abs(expectedStrength - actualStrength) > 0.15) {
      issues.push(
        issue(
          'GRADIENT_MISMATCH',
          'medium',
          region,
          `Overlay strength is ${actualStrength}, reference is approximately ${expectedStrength}.`,
          { memoryPath: `images.${memoryImage.id}.overlays`, implementationPath: `images.${memoryImage.id}.overlays` }
        )
      );
    }
    if (expected.direction && match.direction && expected.direction !== match.direction) {
      issues.push(
        issue('GRADIENT_MISMATCH', 'medium', region, `Overlay direction is "${match.direction}", reference is "${expected.direction}".`, {
          memoryPath: `images.${memoryImage.id}.overlays`,
          implementationPath: `images.${memoryImage.id}.overlays`,
        })
      );
    }
  }

  for (const responsive of memoryImage.responsive ?? []) {
    const actual = findResponsive(implementationImage.responsive, responsive.breakpoint);
    if (!actual) {
      issues.push(
        issue('RESPONSIVE_MISMATCH', 'medium', region, `No implementation record for the "${responsive.breakpoint}" crop.`, {
          memoryPath: `images.${memoryImage.id}.responsive.${responsive.breakpoint}`,
        })
      );
      continue;
    }
    const expectedPosition = tracedValue(responsive.objectPosition);
    if (expectedPosition && actual.objectPosition && !positionsEqual(expectedPosition, actual.objectPosition, options.positionTolerance)) {
      issues.push(
        issue(
          'RESPONSIVE_MISMATCH',
          'medium',
          region,
          `At "${responsive.breakpoint}", object-position is ${actual.objectPosition}; reference is ${expectedPosition}.`,
          { memoryPath: `images.${memoryImage.id}.responsive.${responsive.breakpoint}`, implementationPath: `images.${memoryImage.id}.responsive.${responsive.breakpoint}` }
        )
      );
    }
    if (responsive.textSafeArea && actual.textSafeArea && !safeAreasEqual(responsive.textSafeArea, actual.textSafeArea, options.safeAreaTolerance)) {
      issues.push(
        issue('RESPONSIVE_MISMATCH', 'medium', region, `At "${responsive.breakpoint}", the text-safe area differs from the reference.`, {
          memoryPath: `images.${memoryImage.id}.responsive.${responsive.breakpoint}`,
        })
      );
    }
  }
}

/**
 * Compare a Design Memory Map with an implementation manifest.
 *
 * @param {object} memory Design Memory Map (see references/design-memory-schema.json)
 * @param {object} implementation Implementation manifest
 * @param {object} [options]
 * @returns {{issues: Array<object>, summary: object}}
 */
export function compareDesign(memory, implementation, options = {}) {
  const settings = { ...DEFAULT_OPTIONS, ...options };
  const issues = [];

  if (!memory || !Array.isArray(memory.sections) || memory.sections.length === 0) {
    throw new Error('Design Memory Map must contain at least one section.');
  }
  if (!implementation || !Array.isArray(implementation.sections)) {
    throw new Error('Implementation manifest must contain a sections array.');
  }

  const memorySections = [...memory.sections].sort((a, b) => a.order - b.order);
  const implementationSections = implementation.sections;
  const expectedOrder = memorySections.map((section) => section.id);
  const actualOrder = implementationSections.map((section) => section.id);

  for (const section of memorySections) {
    if (!actualOrder.includes(section.id)) {
      issues.push(
        issue('MISSING_SECTION', 'high', `section:${section.id}`, `Reference section "${section.id}" is missing from the implementation.`, {
          memoryPath: `sections.${section.id}`,
        })
      );
    }
  }
  for (const id of actualOrder) {
    if (!expectedOrder.includes(id)) {
      issues.push(issue('EXTRA_SECTION', 'medium', `section:${id}`, `Implementation adds section "${id}" with no reference evidence.`));
    }
  }

  const comparableExpected = expectedOrder.filter((id) => actualOrder.includes(id));
  const comparableActual = actualOrder.filter((id) => expectedOrder.includes(id));
  if (comparableExpected.join('|') !== comparableActual.join('|')) {
    const firstDifference = comparableExpected.findIndex((id, index) => id !== comparableActual[index]);
    issues.push(
      issue(
        'SECTION_ORDER',
        'high',
        'page:sections',
        `Section order differs at position ${firstDifference + 1}: expected "${comparableExpected[firstDifference]}", found "${comparableActual[firstDifference]}".`,
        { memoryPath: 'sections[].order', implementationPath: 'sections[].order' }
      )
    );
  }

  const implementationComponents = new Map((implementation.components ?? []).map((component) => [component.id, component]));
  const memoryComponents = new Map((memory.components ?? []).map((component) => [component.id, component]));

  for (const section of memorySections) {
    const implementationSection = implementationSections.find((item) => item.id === section.id);
    if (!implementationSection) continue;

    const expectedBackground = tracedValue(section.background);
    if (expectedBackground && implementationSection.background && !coloursEqual(expectedBackground, implementationSection.background)) {
      issues.push(
        issue('SECTION_BACKGROUND_MISMATCH', 'medium', `section:${section.id}`, `Background is ${implementationSection.background}; reference is ${expectedBackground}.`, {
          memoryPath: `sections.${section.id}.background`,
          implementationPath: `sections.${section.id}.background`,
        })
      );
    }

    for (const componentId of section.components ?? []) {
      const memoryComponent = memoryComponents.get(componentId);
      if (!memoryComponent) continue;
      const implementationComponent = implementationComponents.get(componentId);
      if (!implementationComponent) {
        issues.push(
          issue('MISSING_COMPONENT', 'high', `component:${componentId}`, `Component "${componentId}" from section "${section.id}" is missing.`, {
            memoryPath: `components.${componentId}`,
          })
        );
        continue;
      }
      compareComponent(memoryComponent, implementationComponent, settings, issues);
    }
  }

  for (const component of implementationComponents.values()) {
    if (!memoryComponents.has(component.id)) {
      issues.push(issue('EXTRA_COMPONENT', 'medium', `component:${component.id}`, `Component "${component.id}" is not in the Design Memory Map.`));
    }
  }

  const implementationImages = new Map();
  for (const section of implementationSections) {
    for (const image of section.images ?? []) {
      implementationImages.set(image.imageId, { ...image, sectionId: section.id });
    }
  }
  for (const image of implementation.images ?? []) {
    implementationImages.set(image.imageId ?? image.id, image);
  }

  for (const memoryImage of memory.images ?? []) {
    compareImage(memoryImage, implementationImages.get(memoryImage.id), settings, issues);
  }

  for (const [imageId, image] of implementationImages) {
    if (!(memory.images ?? []).some((candidate) => candidate.id === imageId)) {
      issues.push(issue('EXTRA_IMAGE', 'medium', `image:${imageId}`, `Image "${imageId}" has no reference record.`));
    }
    for (const responsive of image.responsive ?? []) {
      if (!responsive.viewport && !responsive.breakpoint) {
        issues.push(issue('RESPONSIVE_MISMATCH', 'low', `image:${imageId}`, 'A responsive crop record has no viewport or breakpoint.'));
      }
    }
  }

  const counts = issues.reduce(
    (accumulator, item) => {
      accumulator[item.severity] += 1;
      return accumulator;
    },
    { high: 0, medium: 0, low: 0 }
  );

  return {
    issues,
    summary: {
      ...counts,
      total: issues.length,
      verdict: counts.high + counts.medium === 0 ? 'pass' : 'fail',
      comparedSections: memorySections.length,
      comparedComponents: memoryComponents.size,
      comparedImages: (memory.images ?? []).length,
    },
  };
}

function escapeCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/** Render a discrepancy report in the format required by the quality policy. */
export function toMarkdownReport(result, { subject = 'Implementation' } = {}) {
  const lines = [
    `# Visual fidelity discrepancy report — ${subject}`,
    '',
    `Verdict: **${result.summary.verdict.toUpperCase()}**`,
    '',
    `Compared ${result.summary.comparedSections} sections, ${result.summary.comparedComponents} components and ${result.summary.comparedImages} images.`,
    `${result.summary.high} high, ${result.summary.medium} medium, ${result.summary.low} low.`,
    '',
    '| Region | Difference | Severity | Evidence | Required correction |',
    '|---|---|---|---|---|',
  ];
  if (result.issues.length === 0) {
    lines.push('| — | No recorded discrepancies | — | Memory map and implementation manifest agree | None |');
  } else {
    for (const item of result.issues) {
      const evidence = item.memoryPath ? `${item.memoryPath}${item.implementationPath ? ` vs ${item.implementationPath}` : ''}` : item.implementationPath ?? 'manifest';
      const correction =
        {
          MISSING_SECTION: 'Implement the reference section or record an approved omission.',
          MISSING_COMPONENT: 'Implement the component with the reference variant.',
          MISSING_IMAGE: 'Add the reference image composition, or record why it is absent.',
          VARIANT_MISMATCH: 'Use the reference variant, not a collapsed default.',
          FOCAL_POINT_MISMATCH: 'Change object-position/crop so the primary focal point remains visible.',
          MISSING_OVERLAY: 'Add the reference gradient as an independent overlay layer.',
          OVERLAY_MISMATCH: 'Restore the reference overlay kind, layer and direction.',
          IMAGE_DETAIL_NOT_PRESERVED: 'Remove whole-image fading/blurring; darken only the text-safe region.',
          GRADIENT_MISMATCH: 'Match the reference gradient direction and strength.',
          OBJECT_FIT_MISMATCH: 'Use the reference object-fit behaviour.',
          OBJECT_POSITION_MISMATCH: 'Match the reference object-position.',
          TEXT_SAFE_AREA_MISMATCH: 'Restore the text-safe area and re-check contrast.',
          SECTION_ORDER: 'Restore the reference section order.',
          SECTION_BACKGROUND_MISMATCH: 'Use the reference background token.',
          COMPONENT_STYLE_MISMATCH: 'Use the reference variant properties, not an approximation.',
          RESPONSIVE_MISMATCH: 'Restore the reference responsive crop/state.',
          EXTRA_SECTION: 'Remove the unsupported section or add source evidence.',
          EXTRA_COMPONENT: 'Remove the unsupported component or add source evidence.',
          EXTRA_IMAGE: 'Remove the unsupported image or add source evidence.',
        }[item.code] ?? 'Review against the reference region.';
      lines.push(`| ${escapeCell(item.region)} | ${escapeCell(item.message)} | ${item.severity} | ${escapeCell(evidence)} | ${correction} |`);
    }
  }
  lines.push('', 'Pixel differences are not used as a pass/fail signal: rendering, anti-aliasing and dynamic content produce false positives. Every finding above must be confirmed against screenshots of the reference and implementation at equivalent viewports.', '');
  return lines.join('\n');
}
