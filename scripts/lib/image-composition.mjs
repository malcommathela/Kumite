/**
 * Image Composition Intelligence.
 *
 * Deterministic, offline validators for the `image` record shape defined in
 * `references/design-memory-schema.json`. There is no filesystem, network or
 * clock access: the same record always produces the same issues.
 *
 * The visual-assets handoff calls `checkAssetSuitability` before accepting a
 * candidate photograph. The design-quality workflow calls
 * `validateImageRecord` on every composition record before it is published to
 * the Design Memory Map.
 */

/** The seven canonical roles, with the recognition cue that separates them. */
export const COMPOSITION_ROLES = Object.freeze([
  {
    id: 'full-bleed-background',
    description:
      'Photograph covers the whole section edge to edge; headings and controls overlay it.',
    overlaysText: true,
  },
  {
    id: 'blended-photographic-background',
    description:
      'Photograph covers the section and merges into the page colour, usually through a gradient or an edge crop.',
    overlaysText: true,
  },
  {
    id: 'split-composition',
    description:
      'Photograph and copy occupy separate columns; the image is a peer of the text, not a backdrop.',
    overlaysText: false,
  },
  {
    id: 'floating-photography',
    description:
      'A cropped photograph sits as an offset object on the page surface, with copy beside or overlapping it.',
    overlaysText: false,
  },
  {
    id: 'product-photography',
    description:
      'The photograph is the product itself, shown on a clean field or controlled set with material and colour fidelity.',
    overlaysText: false,
  },
  {
    id: 'decorative-photography',
    description:
      'An atmospheric photograph used for rhythm or mood; it carries no information the copy depends on.',
    overlaysText: false,
  },
  {
    id: 'inline-editorial-photography',
    description:
      'A photograph embedded in running editorial content, sized to the measure and captioned in flow.',
    overlaysText: false,
  },
]);

const ROLE_IDS = new Set(COMPOSITION_ROLES.map((role) => role.id));
const BACKGROUND_ROLES = new Set([
  'full-bleed-background',
  'blended-photographic-background',
]);
const TEXT_OVERLAY_ROLES = BACKGROUND_ROLES;
const CROP_AWARE_ROLES = new Set([
  'split-composition',
  'floating-photography',
  'product-photography',
  'inline-editorial-photography',
]);
const OBJECT_FIT_VALUES = new Set(['cover', 'contain', 'fill', 'none', 'scale-down']);
const OVERLAY_KINDS = new Set([
  'none',
  'linear-gradient',
  'radial-gradient',
  'solid',
]);
const OVERLAY_LAYERS = new Set(['none', 'independent', 'embedded']);
const CONFIDENCE_VALUES = new Set(['exact', 'measured', 'estimated', 'unknown']);
const QA_KEYS = [
  'coverage',
  'focalPointPreserved',
  'gradientDirection',
  'gradientStrength',
  'subjectVisibility',
  'textContrast',
];
const DESKTOP_BREAKPOINTS = new Set(['desktop', 'lg', 'xl', '2xl', 'wide']);

/**
 * Classify a record by its declared role.
 *
 * Classification is deliberately not inferred from pixels: a role is a design
 * decision recorded during discovery, not a guess made later from a
 * screenshot. Returns the role string when it is one of the seven canonical
 * roles, otherwise null.
 */
export function classifyImageUse(record) {
  const role = record?.role;
  return ROLE_IDS.has(role) ? role : null;
}

/**
 * Heuristic role suggestion for early discovery, before the role is recorded.
 *
 * `hasTextOverlay` means text sits on top of the photograph itself; text in a
 * neighbouring column does not count. `independentElement` means the image is
 * a content element in its own right rather than a section background.
 */
export function suggestRole({
  occupiesSection = false,
  hasTextOverlay = false,
  independentElement = false,
  subjectCount = 1,
  isProduct = false,
} = {}) {
  if (isProduct) {
    return {
      role: 'product-photography',
      rationale:
        'The subject is the product; fidelity to material, colour and form matters more than atmosphere.',
    };
  }
  if (occupiesSection) {
    return {
      role: 'full-bleed-background',
      rationale:
        'The photograph fills the section, so copy must either sit in a protected region or live in a sibling overlay layer.',
    };
  }
  if (independentElement && subjectCount > 1) {
    return {
      role: 'split-composition',
      rationale:
        'The image is a distinct element carrying several subjects, so it needs its own column instead of becoming a backdrop.',
    };
  }
  if (independentElement && !hasTextOverlay) {
    return {
      role: 'split-composition',
      rationale:
        'The image is a peer of the copy: neither element sits on top of the other, so a split composition is the honest reading.',
    };
  }
  if (independentElement && hasTextOverlay) {
    return {
      role: 'floating-photography',
      rationale:
        'The image is a distinct object but text overlaps it, so it needs offset placement and a protected text region.',
    };
  }
  return {
    role: 'decorative-photography',
    rationale:
      'Nothing in the copy depends on the image and it does not fill the section, so treat it as atmosphere rather than evidence.',
  };
}

/**
 * True when a background photograph carries a treatment or a protected text
 * region, meaning that treatment must exist as an independent sibling layer.
 *
 * This is why a gradient must never be baked into the same `background-image`
 * declaration as the photograph: an embedded gradient scales and crops with
 * the image, cannot be tuned per breakpoint and silently modifies the
 * photograph's pixels. Returning true does not demand a gradient where the
 * photograph already offers a dark, quiet region; it says that any treatment
 * which does exist must be separable, inspectable and removable.
 */
export function requiresIndependentOverlay(record) {
  if (!BACKGROUND_ROLES.has(classifyImageUse(record))) return false;
  const overlays = Array.isArray(record.overlays) ? record.overlays : [];
  const hasTreatment = overlays.some(
    (overlay) => isPlainObject(overlay) && OVERLAY_KINDS.has(overlay.kind) && overlay.kind !== 'none',
  );
  const area = record.composition?.textSafeArea;
  const hasTextArea =
    isPlainObject(area) &&
    Number.isFinite(area.width) &&
    Number.isFinite(area.height) &&
    area.width > 0 &&
    area.height > 0;
  return hasTreatment || hasTextArea;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isTraced(value) {
  return (
    isPlainObject(value) &&
    Object.hasOwn(value, 'value') &&
    CONFIDENCE_VALUES.has(value.confidence)
  );
}

function isValidRect(rect, { allowZeroArea = false } = {}) {
  if (!isPlainObject(rect)) return false;
  const { x, y, width, height } = rect;
  if (![x, y, width, height].every((n) => Number.isFinite(n))) return false;
  if (x < 0 || y < 0 || x > 1 || y > 1) return false;
  if (width < 0 || height < 0) return false;
  if (!allowZeroArea && (width === 0 || height === 0)) return false;
  return x + width <= 1 + 1e-9 && y + height <= 1 + 1e-9;
}

function pointInRect(point, rect) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function issue(severity, code, path, message) {
  return { severity, code, path, message };
}

function createCollector() {
  const errors = [];
  const warnings = [];
  const seen = new Set();
  const add = (severity, code, path, message) => {
    const key = `${severity}:${code}:${path}`;
    if (seen.has(key)) return;
    seen.add(key);
    (severity === 'error' ? errors : warnings).push({ code, path, message });
  };
  return {
    errors,
    warnings,
    add,
    push(next) {
      add(next.severity, next.code, next.path, next.message);
    },
  };
}

function collectTraced(value, path, add) {
  if (!isTraced(value)) {
    add(
      'error',
      'TRACED_VALUE_INVALID',
      path,
      'Expected a traced value: { value, confidence: exact | measured | estimated | unknown }.',
    );
    return false;
  }
  if (value.evidence !== undefined) {
    if (
      !Array.isArray(value.evidence) ||
      value.evidence.some((entry) => !isNonEmptyString(entry))
    ) {
      add(
        'error',
        'TRACED_EVIDENCE_INVALID',
        `${path}.evidence`,
        'Traced evidence must be an array of non-empty evidence identifiers.',
      );
    }
  }
  return true;
}

function tracedIssue(value, path) {
  if (!isTraced(value)) {
    return issue(
      'error',
      'TRACED_VALUE_INVALID',
      path,
      'Expected a traced value: { value, confidence: exact | measured | estimated | unknown }.',
    );
  }
  return null;
}

function resolveQaValue(value) {
  return isPlainObject(value) && Object.hasOwn(value, 'value') ? value.value : value;
}

function normaliseBreakpoint(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

const CSS_NAMED_COLOURS = new Set(
  `aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond
  blue blueviolet brown burlywood cadetblue chartreuse chocolate coral
  cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray
  darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid
  darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey
  darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue
  firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod
  gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki
  lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan
  lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon
  lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue
  lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue
  mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen
  mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin
  navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod
  palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum
  powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon
  sandybrown seagreen seashell sienna silver skyblue slateblue slategray
  slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet
  wheat white whitesmoke yellow yellowgreen`.split(/\s+/),
);

function parseAlpha(token) {
  if (typeof token !== 'string') return null;
  const text = token.trim();
  if (text.endsWith('%')) {
    const percent = Number(text.slice(0, -1));
    return Number.isFinite(percent) ? Math.min(Math.max(percent / 100, 0), 1) : null;
  }
  const number = Number(text);
  return Number.isFinite(number) ? Math.min(Math.max(number, 0), 1) : null;
}

/**
 * Parse a CSS colour string and return its alpha, or null when the string is
 * not a colour this library recognises. Named colours are checked against the
 * standard CSS set; custom properties are deliberately rejected because their
 * resolved value cannot be verified offline.
 */
function parseCssColour(input) {
  if (typeof input !== 'string') return null;
  const colour = input.trim().toLowerCase();
  if (!colour) return null;
  if (colour === 'transparent') return { alpha: 0 };
  if (CSS_NAMED_COLOURS.has(colour) || colour === 'currentcolor') return { alpha: 1 };
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(colour)) {
    if (colour.length === 5) return { alpha: parseInt(colour[4], 16) / 15 };
    if (colour.length === 9) return { alpha: parseInt(colour.slice(7, 9), 16) / 255 };
    return { alpha: 1 };
  }
  const match = colour.match(/^(rgba?|hsla?)\((.*)\)$/);
  if (!match) return null;
  const model = match[1];
  let body = match[2].trim();
  let alphaToken = null;
  if (body.includes('/')) {
    const parts = body.split('/');
    if (parts.length !== 2) return null;
    alphaToken = parts[1].trim();
    body = parts[0].trim();
  }
  let parts = body.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 4 && alphaToken === null) {
    alphaToken = parts.pop();
  } else if (parts.length !== 3) {
    parts = body.split(/\s+/).filter(Boolean);
  }
  if (parts.length !== 3) return null;
  const numberToken = /^-?\d*\.?\d+%?$/;
  if (model.startsWith('rgb')) {
    if (!parts.every((part) => numberToken.test(part))) return null;
  } else {
    if (!/^-?\d*\.?\d+(deg|rad|grad|turn)?$/.test(parts[0])) return null;
    if (!parts.slice(1).every((part) => numberToken.test(part))) return null;
  }
  const alpha = alphaToken === null ? 1 : parseAlpha(alphaToken);
  return alpha === null ? null : { alpha };
}

// ---------------------------------------------------------------------------
// Focal point and text-safe area
// ---------------------------------------------------------------------------

/**
 * Focal-point and text-safe-area checks, including the rule that an `unknown`
 * focal point is allowed but must leave text placement explicitly unresolved.
 */
export function checkFocalPoint(record) {
  const issues = [];
  const composition = record?.composition;
  if (!isPlainObject(composition)) {
    issues.push(
      issue(
        'error',
        'COMPOSITION_MISSING',
        'composition',
        'A tagged image record needs a composition object before focal point or text placement can be verified.',
      ),
    );
    return issues;
  }

  const role = classifyImageUse(record);
  const focal = composition.primaryFocalPoint;
  let hasFocalPoint = false;

  if (!isPlainObject(focal)) {
    issues.push(
      issue(
        'error',
        'FOCAL_POINT_MISSING',
        'composition.primaryFocalPoint',
        'Record the primary focal point; without it crops and text placement cannot be judged.',
      ),
    );
  } else {
    const { x, y } = focal;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      issues.push(
        issue(
          'error',
          'FOCAL_POINT_INVALID',
          'composition.primaryFocalPoint',
          'Focal point x and y must both be finite numbers.',
        ),
      );
    } else if (x < 0 || x > 1 || y < 0 || y > 1) {
      issues.push(
        issue(
          'error',
          'FOCAL_POINT_OUT_OF_RANGE',
          'composition.primaryFocalPoint',
          `Focal point (${x}, ${y}) falls outside the normalised 0..1 image bounds.`,
        ),
      );
    } else {
      hasFocalPoint = true;
    }

    if (focal.description !== undefined) {
      const descriptionIssue = tracedIssue(
        focal.description,
        'composition.primaryFocalPoint.description',
      );
      if (descriptionIssue) issues.push(descriptionIssue);
    }

    const focalConfidence = focal.confidence ?? focal.description?.confidence;
    if (focalConfidence === 'unknown') {
      issues.push(
        issue(
          'warning',
          'UNKNOWN_FOCAL_POINT_UNRESOLVED',
          'composition.primaryFocalPoint',
          'Focal point confidence is unknown. Do not silently treat it as centred; mark text placement unresolved and keep it out of production until the asset is inspected.',
        ),
      );
    }
  }

  const area = composition.textSafeArea;
  if (area === undefined || area === null) {
    if (TEXT_OVERLAY_ROLES.has(role)) {
      issues.push(
        issue(
          'warning',
          'TEXT_SAFE_AREA_MISSING',
          'composition.textSafeArea',
          'Text overlays this photograph, so a text-safe area should be recorded (or the record must state that the copy does not sit on the image).',
        ),
      );
    }
  } else if (!isPlainObject(area)) {
    issues.push(
      issue(
        'error',
        'TEXT_SAFE_AREA_INVALID',
        'composition.textSafeArea',
        'Text-safe area must be a normalised rectangle { x, y, width, height }.',
      ),
    );
  } else if (![area.x, area.y, area.width, area.height].every((n) => Number.isFinite(n))) {
    issues.push(
      issue(
        'error',
        'TEXT_SAFE_AREA_INVALID',
        'composition.textSafeArea',
        'Text-safe area x, y, width and height must all be finite numbers.',
      ),
    );
  } else if (area.width <= 0 || area.height <= 0) {
    issues.push(
      issue(
        'error',
        'TEXT_SAFE_AREA_EMPTY',
        'composition.textSafeArea',
        'Text-safe area has zero area; text cannot be placed in it.',
      ),
    );
  } else {
    if (area.x < 0 || area.y < 0 || area.x + area.width > 1 + 1e-9 || area.y + area.height > 1 + 1e-9) {
      issues.push(
        issue(
          'error',
          'TEXT_SAFE_AREA_OUT_OF_BOUNDS',
          'composition.textSafeArea',
          'Text-safe area extends beyond the normalised image bounds.',
        ),
      );
    }
    if (hasFocalPoint && pointInRect(focal, area)) {
      issues.push(
        issue(
          'warning',
          'TEXT_OVERLAPS_FOCAL_POINT',
          'composition.textSafeArea',
          'The text-safe area covers the primary focal point; copy will obscure the subject unless the crop or text position changes.',
        ),
      );
    }
  }

  if (area !== undefined && area !== null && isPlainObject(area) && area.description !== undefined) {
    const descriptionIssue = tracedIssue(area.description, 'composition.textSafeArea.description');
    if (descriptionIssue) issues.push(descriptionIssue);
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Overlays and gradients
// ---------------------------------------------------------------------------

function isTextContrastOverlay(overlay) {
  const purpose = overlay?.purpose;
  const text = isPlainObject(purpose) ? purpose.value : purpose;
  return typeof text === 'string' && /text|contrast|legib|readab|scrim/i.test(text);
}

function hasExplainedTreatment(overlay) {
  if (isTraced(overlay?.justification) && overlay.justification.confidence !== 'unknown') {
    return true;
  }
  return isNonEmptyString(overlay?.note);
}

function checkGradientStops(overlay, path, issues) {
  const stops = overlay.stops;
  if (!Array.isArray(stops) || stops.length < 2) {
    issues.push(
      issue(
        'error',
        'GRADIENT_MISSING_STOPS',
        `${path}.stops`,
        'A gradient needs at least two colour stops so its direction and strength are inspectable.',
      ),
    );
    return { alphas: [], positions: [] };
  }
  const alphas = [];
  const positions = [];
  let previous = -Infinity;
  stops.forEach((stop, index) => {
    const stopPath = `${path}.stops[${index}]`;
    if (!isPlainObject(stop)) {
      issues.push(issue('error', 'GRADIENT_STOP_INVALID', stopPath, 'Each stop must be an object.'));
      return;
    }
    if (!Number.isFinite(stop.position) || stop.position < 0 || stop.position > 1) {
      issues.push(
        issue(
          'error',
          'GRADIENT_STOP_INVALID',
          `${stopPath}.position`,
          'Stop position must be a number between 0 and 1.',
        ),
      );
    } else {
      if (stop.position < previous) {
        issues.push(
          issue(
            'error',
            'GRADIENT_STOP_ORDER',
            `${stopPath}.position`,
            'Gradient stops must be ordered from 0 to 1; a later stop cannot sit before an earlier one.',
          ),
        );
      }
      previous = stop.position;
      positions.push(stop.position);
    }
    const parsed = parseCssColour(stop.colour);
    if (!parsed) {
      issues.push(
        issue(
          'error',
          'GRADIENT_COLOUR_INVALID',
          `${stopPath}.colour`,
          `"${String(stop.colour)}" is not a recognised CSS colour (hex, rgb/rgba, hsl/hsla, named or transparent).`,
        ),
      );
    } else {
      alphas.push(parsed.alpha);
    }
  });
  return { alphas, positions };
}

/**
 * Overlay checks: independent layer, detail preservation, gradient structure
 * and text-contrast strength. Returns issues with `severity` so the caller can
 * partition them into errors and warnings.
 */
export function checkGradientOverlay(record) {
  const issues = [];
  const role = classifyImageUse(record);
  const overlays = record?.overlays;

  const cssOpacity = record?.css?.imageOpacity ?? record?.imageOpacity;
  if (Number.isFinite(cssOpacity) && cssOpacity < 1) {
    issues.push(
      issue(
        'error',
        'WHOLE_IMAGE_OPACITY_REDUCTION',
        'css.imageOpacity',
        'Do not lower the opacity of the whole photograph. Darken only the region that needs it with an independent overlay layer.',
      ),
    );
  }

  if (!Array.isArray(overlays)) {
    issues.push(
      issue(
        'error',
        'OVERLAYS_MISSING',
        'overlays',
        'Record overlays as an array, even when the only entry is { kind: "none" }.',
      ),
    );
    return issues;
  }

  overlays.forEach((overlay, index) => {
    const path = `overlays[${index}]`;
    if (!isPlainObject(overlay)) {
      issues.push(issue('error', 'OVERLAY_INVALID', path, 'Each overlay must be an object.'));
      return;
    }
    if (!OVERLAY_KINDS.has(overlay.kind)) {
      issues.push(
        issue(
          'error',
          'OVERLAY_KIND_INVALID',
          `${path}.kind`,
          `Overlay kind must be one of: ${[...OVERLAY_KINDS].join(', ')}.`,
        ),
      );
      return;
    }
    if (!OVERLAY_LAYERS.has(overlay.layer)) {
      issues.push(
        issue(
          'error',
          'OVERLAY_LAYER_INVALID',
          `${path}.layer`,
          `Overlay layer must be one of: ${[...OVERLAY_LAYERS].join(', ')}.`,
        ),
      );
    }

    if (Number.isFinite(overlay.imageOpacity) && overlay.imageOpacity < 1) {
      issues.push(
        issue(
          'error',
          'WHOLE_IMAGE_OPACITY_REDUCTION',
          `${path}.imageOpacity`,
          'An overlay must not reduce image opacity; use a gradient that preserves photographic detail.',
        ),
      );
    }

    if (overlay.layer === 'independent' && overlay.kind === 'none') {
      issues.push(
        issue(
          'error',
          'INDEPENDENT_OVERLAY_WITHOUT_KIND',
          `${path}.kind`,
          'An independent overlay layer must declare a treatment; use kind "none" only with layer "none".',
        ),
      );
    }

    if (overlay.kind === 'none') return;

    if (overlay.layer === 'none') {
      issues.push(
        issue(
          'error',
          'OVERLAY_LAYER_MISSING',
          `${path}.layer`,
          'A non-none overlay must declare whether it is an independent or embedded layer.',
        ),
      );
    }

    if (BACKGROUND_ROLES.has(role) && overlay.layer === 'embedded') {
      issues.push(
        issue(
          'error',
          'OVERLAY_EMBEDDED',
          `${path}.layer`,
          'The gradient is embedded in the image layer. On a full-bleed or blended background it must be a separate overlay layer so the photograph is not modified and the treatment can adapt per breakpoint.',
        ),
      );
    }

    if (overlay.preservesImage !== true) {
      issues.push(
        issue(
          'error',
          'IMAGE_DETAIL_NOT_PRESERVED',
          `${path}.preservesImage`,
          'The overlay must preserve photographic detail (preservesImage: true). A treatment that flattens or replaces the photograph is a substitute, not a composition.',
        ),
      );
    }

    if (overlay.purpose === undefined) {
      issues.push(
        issue(
          'error',
          'OVERLAY_PURPOSE_MISSING',
          `${path}.purpose`,
          'State the purpose of the overlay as a traced value; "looks better" is not a purpose.',
        ),
      );
    } else {
      const purposeIssue = tracedIssue(overlay.purpose, `${path}.purpose`);
      if (purposeIssue) issues.push(purposeIssue);
    }

    if (overlay.kind === 'linear-gradient') {
      if (
        !isTraced(overlay.direction) ||
        !isNonEmptyString(overlay.direction.value)
      ) {
        issues.push(
          issue(
            'error',
            'GRADIENT_MISSING_DIRECTION',
            `${path}.direction`,
            'A linear gradient needs a traced direction (for example "to right" or "160deg").',
          ),
        );
      }
    }

    if (
      overlay.kind === 'radial-gradient' &&
      (!isTraced(overlay.justification) || overlay.justification.confidence === 'unknown')
    ) {
      issues.push(
        issue(
          'warning',
          'RADIAL_UNJUSTIFIED',
          `${path}.justification`,
          'Radial gradients are rarely justified for text protection. Record a traced justification or use a linear gradient aligned with the text.',
        ),
      );
    }

    if (overlay.kind === 'linear-gradient' || overlay.kind === 'radial-gradient') {
      const { alphas, positions } = checkGradientStops(overlay, path, issues);
      if (isTextContrastOverlay(overlay) && !hasExplainedTreatment(overlay)) {
        if (!positions.some((position) => position === 0 || position === 1)) {
          issues.push(
            issue(
              'warning',
              'GRADIENT_TOO_WEAK',
              `${path}.stops`,
              'A text-contrast gradient should anchor at an edge (a stop at 0 or 1) so the copy sits in the darkest part instead of mid-fade.',
            ),
          );
        }
        if (alphas.length > 0 && Math.max(...alphas) < 0.25) {
          issues.push(
            issue(
              'warning',
              'GRADIENT_TOO_WEAK',
              `${path}.stops`,
              'Peak gradient alpha is below 0.25, which is unlikely to protect text. Add a justification if the photograph already supplies the contrast.',
            ),
          );
        }
      }
    }
  });

  return issues;
}

// ---------------------------------------------------------------------------
// Responsive behaviour
// ---------------------------------------------------------------------------

function hasCropControl(entry) {
  return (
    isPlainObject(entry) &&
    (entry.objectPosition !== undefined ||
      entry.crop !== undefined ||
      entry.textSafeArea !== undefined)
  );
}

/**
 * Per-breakpoint behaviour. Background photographs must record at least one
 * non-desktop entry that changes position, crop or text-safe area; otherwise
 * the desktop crop is silently forced on every viewport. Crop-aware content
 * roles should record an object position per breakpoint, because their
 * container aspect ratio usually differs from the source.
 */
export function checkResponsiveCrop(record) {
  const issues = [];
  const role = classifyImageUse(record);
  const entries = record?.responsive;

  if (!Array.isArray(entries)) {
    if (BACKGROUND_ROLES.has(role)) {
      issues.push(
        issue(
          'error',
          'RESPONSIVE_CROP_MISSING',
          'responsive',
          'A full-bleed or blended background must record per-breakpoint object position, crop or text-safe area.',
        ),
      );
    } else if (CROP_AWARE_ROLES.has(role)) {
      issues.push(
        issue(
          'warning',
          'RESPONSIVE_OBJECT_POSITION_MISSING',
          'responsive',
          'Record object position per breakpoint; cropping is otherwise uncontrolled when the container aspect ratio changes.',
        ),
      );
    }
    return issues;
  }

  const seenBreakpoints = new Set();
  entries.forEach((entry, index) => {
    const path = `responsive[${index}]`;
    if (!isPlainObject(entry)) {
      issues.push(issue('error', 'RESPONSIVE_ENTRY_INVALID', path, 'Each responsive entry must be an object.'));
      return;
    }
    const breakpoint = normaliseBreakpoint(entry.breakpoint);
    if (!breakpoint) {
      issues.push(
        issue(
          'error',
          'RESPONSIVE_BREAKPOINT_MISSING',
          `${path}.breakpoint`,
          'Each responsive entry needs a named breakpoint (for example "tablet").',
        ),
      );
    } else if (seenBreakpoints.has(breakpoint)) {
      issues.push(
        issue(
          'warning',
          'RESPONSIVE_BREAKPOINT_DUPLICATE',
          `${path}.breakpoint`,
          `Breakpoint "${entry.breakpoint}" is recorded more than once.`,
        ),
      );
    } else {
      seenBreakpoints.add(breakpoint);
    }

    if (!hasCropControl(entry)) {
      issues.push(
        issue(
          'warning',
          'RESPONSIVE_ENTRY_UNSPECIFIED',
          path,
          'The entry names a breakpoint but does not change object position, crop or text-safe area.',
        ),
      );
    }
    if (entry.objectPosition !== undefined) {
      const positionIssue = tracedIssue(entry.objectPosition, `${path}.objectPosition`);
      if (positionIssue) issues.push(positionIssue);
    }
    if (entry.crop !== undefined) {
      if (!isValidRect(entry.crop)) {
        issues.push(
          issue(
            'error',
            'RESPONSIVE_CROP_INVALID',
            `${path}.crop`,
            'Responsive crop must be a normalised rectangle with positive width and height inside 0..1.',
          ),
        );
      }
    }
    if (entry.textSafeArea !== undefined) {
      if (!isValidRect(entry.textSafeArea)) {
        issues.push(
          issue(
            'error',
            'RESPONSIVE_TEXT_SAFE_AREA_INVALID',
            `${path}.textSafeArea`,
            'Responsive text-safe area must be a normalised rectangle with positive width and height inside 0..1.',
          ),
        );
      }
    }
  });

  if (BACKGROUND_ROLES.has(role)) {
    const hasNonDesktop = entries.some((entry) => {
      if (!isPlainObject(entry) || !hasCropControl(entry)) return false;
      const breakpoint = normaliseBreakpoint(entry.breakpoint);
      return breakpoint.length > 0 && !DESKTOP_BREAKPOINTS.has(breakpoint);
    });
    if (!hasNonDesktop) {
      issues.push(
        issue(
          'error',
          'RESPONSIVE_CROP_MISSING',
          'responsive',
          'A background photograph needs at least one non-desktop breakpoint that changes object position, crop or text-safe area.',
        ),
      );
    }
  } else if (CROP_AWARE_ROLES.has(role) && entries.length > 0) {
    if (!entries.some((entry) => isPlainObject(entry) && entry.objectPosition !== undefined)) {
      issues.push(
        issue(
          'warning',
          'RESPONSIVE_OBJECT_POSITION_MISSING',
          'responsive',
          'Record an object position per breakpoint so a changing aspect ratio does not force an accidental crop.',
        ),
      );
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Asset suitability (visual-assets handoff)
// ---------------------------------------------------------------------------

function alignmentFraction(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : 0.5;
}

/**
 * Verify that a candidate asset can fill a container without upscaling beyond
 * the stated tolerance, losing the focal point, or pushing the text-safe area
 * outside the visible crop.
 *
 * Inputs:
 * - `asset`: { width, height } in source pixels.
 * - `container`: { width, height } in CSS pixels, optionally
 *   `devicePixelRatio` (default 1), `upscaleTolerance` (0..0.5, default 0) and
 *   `objectPosition` as normalised { x, y } (default centred).
 * - `focalPoint`: normalised { x, y } against the source image.
 * - `textSafeArea`: normalised { x, y, width, height } against the source.
 *
 * Returns { suitable, issues } where every issue carries a code and severity.
 * `suitable` is false when any issue is an error.
 */
export function checkAssetSuitability({ asset, container, focalPoint, textSafeArea } = {}) {
  const issues = [];
  const aw = Number(asset?.width);
  const ah = Number(asset?.height);
  const cw = Number(container?.width);
  const ch = Number(container?.height);
  const assetKnown = Number.isFinite(aw) && aw > 0 && Number.isFinite(ah) && ah > 0;
  const containerKnown = Number.isFinite(cw) && cw > 0 && Number.isFinite(ch) && ch > 0;

  if (!assetKnown) {
    issues.push(
      issue(
        'error',
        'ASSET_TOO_SMALL',
        'asset',
        'The asset has no verified pixel dimensions, so its resolution cannot be accepted.',
      ),
    );
  }
  if (!containerKnown) {
    issues.push(
      issue(
        'error',
        'ASPECT_MISMATCH',
        'container',
        'The container has no usable dimensions, so crop viability cannot be verified.',
      ),
    );
  }
  if (!assetKnown || !containerKnown) {
    return { suitable: false, issues };
  }

  const density = Number(container.devicePixelRatio ?? 1);
  const dpr = Number.isFinite(density) && density > 0 ? density : 1;
  const rawTolerance = Number(container.upscaleTolerance ?? 0);
  const tolerance = Number.isFinite(rawTolerance)
    ? Math.min(Math.max(rawTolerance, 0), 0.5)
    : 0;
  const requiredWidth = Math.ceil(cw * dpr * (1 - tolerance));
  const requiredHeight = Math.ceil(ch * dpr * (1 - tolerance));

  if (aw < requiredWidth || ah < requiredHeight) {
    issues.push(
      issue(
        'error',
        'ASSET_TOO_SMALL',
        'asset',
        `Asset is ${aw}x${ah}; the container needs at least ${requiredWidth}x${requiredHeight} source pixels at ${dpr}x density (${Math.round(tolerance * 100)}% upscale tolerance).`,
      ),
    );
  }

  const aspectRatio = aw / ah / (cw / ch);
  if (aspectRatio > 1.25 || aspectRatio < 0.8) {
    issues.push(
      issue(
        'warning',
        'ASPECT_MISMATCH',
        'asset',
        `Source aspect ratio ${aw}:${ah} differs substantially from the container ${cw}:${ch}; a cover crop will discard much of the frame. Prefer an asset shot closer to the container shape.`,
      ),
    );
  }

  const scale = Math.max(cw / aw, ch / ah);
  const visibleWidth = cw / scale;
  const visibleHeight = ch / scale;
  const position = isPlainObject(container.objectPosition) ? container.objectPosition : {};
  const offsetX = (aw - visibleWidth) * alignmentFraction(position.x);
  const offsetY = (ah - visibleHeight) * alignmentFraction(position.y);
  const epsilon = 1e-6;

  const fx = Number(focalPoint?.x);
  const fy = Number(focalPoint?.y);
  const focalKnown =
    Number.isFinite(fx) && fx >= 0 && fx <= 1 && Number.isFinite(fy) && fy >= 0 && fy <= 1;
  if (!focalKnown) {
    issues.push(
      issue(
        'warning',
        'CROP_EXCLUDES_FOCAL_POINT',
        'focalPoint',
        'No usable focal point was supplied, so subject visibility after cropping cannot be verified.',
      ),
    );
  } else {
    const focalX = fx * aw;
    const focalY = fy * ah;
    const retained =
      focalX >= offsetX - epsilon &&
      focalX <= offsetX + visibleWidth + epsilon &&
      focalY >= offsetY - epsilon &&
      focalY <= offsetY + visibleHeight + epsilon;
    if (!retained) {
      issues.push(
        issue(
          'error',
          'CROP_EXCLUDES_FOCAL_POINT',
          'focalPoint',
          `The cover crop keeps x ${Math.round((offsetX / aw) * 100)}–${Math.round(((offsetX + visibleWidth) / aw) * 100)}% and y ${Math.round((offsetY / ah) * 100)}–${Math.round(((offsetY + visibleHeight) / ah) * 100)}% of the source; the focal point at (${fx}, ${fy}) falls outside it.`,
        ),
      );
    }
  }

  if (textSafeArea !== undefined && textSafeArea !== null) {
    if (!isValidRect(textSafeArea)) {
      issues.push(
        issue(
          'error',
          'TEXT_SAFE_AREA_UNSAFE',
          'textSafeArea',
          'The text-safe area is not a valid normalised rectangle, so safe text placement cannot be verified.',
        ),
      );
    } else {
      const left = textSafeArea.x;
      const right = textSafeArea.x + textSafeArea.width;
      const top = textSafeArea.y;
      const bottom = textSafeArea.y + textSafeArea.height;
      const visibleLeft = offsetX / aw;
      const visibleRight = (offsetX + visibleWidth) / aw;
      const visibleTop = offsetY / ah;
      const visibleBottom = (offsetY + visibleHeight) / ah;
      if (
        left < visibleLeft - epsilon ||
        right > visibleRight + epsilon ||
        top < visibleTop - epsilon ||
        bottom > visibleBottom + epsilon
      ) {
        issues.push(
          issue(
            'error',
            'TEXT_SAFE_AREA_UNSAFE',
            'textSafeArea',
            'Part of the text-safe area is cropped out of the visible frame, so copy placed there would sit on the wrong part of the photograph or off the image.',
          ),
        );
      }
    }
  }

  return { suitable: !issues.some((entry) => entry.severity === 'error'), issues };
}

// ---------------------------------------------------------------------------
// Full record validation
// ---------------------------------------------------------------------------

/**
 * Validate one image record.
 *
 * Returns `{ valid, errors, warnings }`. `valid` means no error was raised;
 * warnings still allow a record to be stored, but they identify claims that
 * must be resolved before implementation. Pass `{ evidenceIds }` as a Set to
 * reject references to evidence the Design Memory Map does not contain.
 */
export function validateImageRecord(record, { evidenceIds } = {}) {
  const collector = createCollector();

  if (!isPlainObject(record)) {
    collector.add('error', 'RECORD_INVALID', '$', 'An image record must be an object.');
    return {
      valid: false,
      errors: collector.errors,
      warnings: collector.warnings,
    };
  }

  const role = classifyImageUse(record);
  for (const next of checkFocalPoint(record)) collector.push(next);
  for (const next of checkGradientOverlay(record)) collector.push(next);
  for (const next of checkResponsiveCrop(record)) collector.push(next);

  if (!isNonEmptyString(record.id)) {
    collector.add('error', 'RECORD_FIELD_MISSING', 'id', 'Every image record needs a stable id.');
  }
  if (!isNonEmptyString(record.sectionId)) {
    collector.add(
      'error',
      'RECORD_FIELD_MISSING',
      'sectionId',
      'Every image record must declare the section it belongs to.',
    );
  }
  if (!role) {
    collector.add(
      'error',
      'UNKNOWN_ROLE',
      'role',
      `Role "${String(record.role)}" is not one of the seven composition roles.`,
    );
  }
  if (record.assetRef !== undefined && !isNonEmptyString(record.assetRef)) {
    collector.add(
      'error',
      'ASSET_REF_INVALID',
      'assetRef',
      'assetRef must be a non-empty string when present.',
    );
  }
  if (record.referenceDescription !== undefined) {
    collectTraced(record.referenceDescription, 'referenceDescription', collector.add);
  }

  const composition = record.composition;
  if (isPlainObject(composition)) {
    if (composition.negativeSpace === undefined) {
      collector.add(
        'error',
        'COMPOSITION_FIELD_MISSING',
        'composition.negativeSpace',
        'Record where the photograph has usable negative space.',
      );
    } else {
      collectTraced(composition.negativeSpace, 'composition.negativeSpace', collector.add);
    }
    if (composition.aspectRatio === undefined) {
      collector.add(
        'error',
        'COMPOSITION_FIELD_MISSING',
        'composition.aspectRatio',
        'Record the source aspect ratio.',
      );
    } else {
      collectTraced(composition.aspectRatio, 'composition.aspectRatio', collector.add);
    }
    if (composition.imageToContainer === undefined) {
      collector.add(
        'error',
        'COMPOSITION_FIELD_MISSING',
        'composition.imageToContainer',
        'Record how the source is mapped into the container (cover, crop and retained region).',
      );
    } else {
      collectTraced(composition.imageToContainer, 'composition.imageToContainer', collector.add);
    }

    const dimensions = composition.originalDimensions;
    if (
      !isPlainObject(dimensions) ||
      !Number.isInteger(dimensions.width) ||
      !Number.isInteger(dimensions.height) ||
      dimensions.width <= 0 ||
      dimensions.height <= 0
    ) {
      collector.add(
        'error',
        'DIMENSIONS_INVALID',
        'composition.originalDimensions',
        'Original dimensions must be positive integers in pixels.',
      );
    }

    if (composition.crop !== undefined && !isValidRect(composition.crop)) {
      collector.add(
        'error',
        'CROP_INVALID',
        'composition.crop',
        'Crop must be a normalised rectangle with positive width and height inside 0..1.',
      );
    }
  } else {
    collector.add(
      'error',
      'COMPOSITION_MISSING',
      'composition',
      'A tagged image record needs a composition object.',
    );
  }

  const css = record.css;
  if (!isPlainObject(css)) {
    collector.add('error', 'CSS_MISSING', 'css', 'Record the CSS layer model for the image.');
  } else {
    if (!OBJECT_FIT_VALUES.has(css.objectFit)) {
      collector.add(
        'error',
        'OBJECT_FIT_INVALID',
        'css.objectFit',
        `object-fit must be one of: ${[...OBJECT_FIT_VALUES].join(', ')}.`,
      );
    } else if (BACKGROUND_ROLES.has(role) && css.objectFit !== 'cover') {
      collector.add(
        'error',
        'FULL_BLEED_OBJECT_FIT',
        'css.objectFit',
        `A ${role} must use object-fit: cover; "${css.objectFit}" leaves gaps or distorts the photograph.`,
      );
    }

    if (css.objectPosition === undefined) {
      collector.add(
        'error',
        'OBJECT_POSITION_MISSING',
        'css.objectPosition',
        'Record object-position as a traced value; the default centre is a decision, not a neutral one.',
      );
    } else {
      collectTraced(css.objectPosition, 'css.objectPosition', collector.add);
    }

    for (const key of ['containerLayer', 'textLayer']) {
      const fieldPath = `css.${key}`;
      if (css[key] === undefined) {
        collector.add(
          'error',
          'CSS_LAYER_MISSING',
          fieldPath,
          `Record the ${key} so the image, overlay and copy layers can be verified separately.`,
        );
      } else {
        collectTraced(css[key], fieldPath, collector.add);
      }
    }

    if (typeof css.filter === 'string' && /blur\(|grayscale\(|saturate\(\s*0/i.test(css.filter)) {
      const justification = css.filterJustification ?? record.filterJustification;
      const evidenced =
        isTraced(justification) &&
        (justification.confidence === 'exact' || justification.confidence === 'measured') &&
        Array.isArray(justification.evidence) &&
        justification.evidence.length > 0;
      if (!evidenced) {
        collector.add(
          'error',
          'FILTER_WITHOUT_EVIDENCE',
          'css.filter',
          'Whole-image blur, grayscale or desaturation is refused unless a traced justification with exact or measured source evidence shows the reference does the same.',
        );
      }
    }
  }

  if (!Array.isArray(record.overlays)) {
    collector.add(
      'error',
      'OVERLAYS_MISSING',
      'overlays',
      'Record overlays as an array, even when the only entry is { kind: "none" }.',
    );
  }

  if (!isPlainObject(record.qa)) {
    collector.add('error', 'QA_MISSING', 'qa', 'Record the six image QA results before publishing.');
  } else {
    for (const key of QA_KEYS) {
      if (!Object.hasOwn(record.qa, key)) {
        collector.add(
          'error',
          'QA_FIELD_MISSING',
          `qa.${key}`,
          `Image QA is incomplete: "${key}" has not been recorded.`,
        );
        continue;
      }
      const value = record.qa[key];
      if (!isTraced(value)) {
        collector.add(
          'error',
          'QA_VALUE_INVALID',
          `qa.${key}`,
          'QA values must be traced values: { value, confidence } with optional evidence.',
        );
      } else {
        collectTraced(value, `qa.${key}`, collector.add);
      }
    }
    if (resolveQaValue(record.qa.focalPointPreserved) === false) {
      collector.add(
        'error',
        'QA_FOCAL_POINT_NOT_PRESERVED',
        'qa.focalPointPreserved',
        'The QA record says the focal point is not preserved, so this composition cannot ship.',
      );
    }
  }

  const confidence = record.confidence;
  if (confidence === undefined) {
    collector.add(
      'error',
      'CONFIDENCE_MISSING',
      'confidence',
      'Record the confidence of the image record.',
    );
  } else if (typeof confidence !== 'string' || !CONFIDENCE_VALUES.has(confidence)) {
    collector.add(
      'error',
      'CONFIDENCE_INVALID',
      'confidence',
      `Confidence must be one of: ${[...CONFIDENCE_VALUES].join(', ')}.`,
    );
  }

  const allowedEvidence =
    evidenceIds instanceof Set
      ? evidenceIds
      : Array.isArray(evidenceIds)
        ? new Set(evidenceIds)
        : null;

  if (!Array.isArray(record.evidence)) {
    collector.add(
      'error',
      'EVIDENCE_MISSING',
      'evidence',
      'Every image record must cite the evidence that supports its composition claims.',
    );
  } else {
    if (record.evidence.length === 0) {
      collector.add(
        'warning',
        'EVIDENCE_EMPTY',
        'evidence',
        'No evidence is cited; composition claims cannot be audited.',
      );
    }
    record.evidence.forEach((entry, index) => {
      const entryPath = `evidence[${index}]`;
      const evidenceId =
        typeof entry === 'string'
          ? entry
          : isPlainObject(entry) && typeof entry.id === 'string'
            ? entry.id
            : null;
      if (!isNonEmptyString(evidenceId)) {
        collector.add(
          'error',
          'EVIDENCE_INVALID',
          entryPath,
          'Evidence entries must be non-empty identifiers or objects with an id.',
        );
      } else if (allowedEvidence && !allowedEvidence.has(evidenceId)) {
        collector.add(
          'error',
          'UNKNOWN_EVIDENCE',
          entryPath,
          `Evidence "${evidenceId}" is not present in the Design Memory Map evidence set.`,
        );
      }
    });
  }

  return {
    valid: collector.errors.length === 0,
    errors: collector.errors,
    warnings: collector.warnings,
  };
}

// ---------------------------------------------------------------------------
// Human-readable summary
// ---------------------------------------------------------------------------

function formatNumber(value) {
  return Number.isFinite(value) ? String(Math.round(value * 100) / 100) : '?';
}

/**
 * Short, deterministic summary for specs and review reports. Example:
 * `full-bleed-background · focal point (0.31, 0.46) · text-safe area ...`.
 */
export function summariseComposition(record) {
  if (!isPlainObject(record)) return 'No image composition record.';
  const role = classifyImageUse(record) ?? String(record.role ?? 'unclassified');
  const composition = isPlainObject(record.composition) ? record.composition : {};
  const focal = composition.primaryFocalPoint;
  const focalText =
    Number.isFinite(focal?.x) && Number.isFinite(focal?.y)
      ? `focal point (${formatNumber(focal.x)}, ${formatNumber(focal.y)})`
      : 'focal point unrecorded';

  const area = composition.textSafeArea;
  const areaText =
    Number.isFinite(area?.width) && Number.isFinite(area?.height)
      ? `text-safe area (${formatNumber(area.x)}, ${formatNumber(area.y)}, ${formatNumber(area.width)} x ${formatNumber(area.height)})`
      : 'no text-safe area';

  const overlays = Array.isArray(record.overlays) ? record.overlays : [];
  const active = overlays.filter(
    (overlay) => isPlainObject(overlay) && OVERLAY_KINDS.has(overlay.kind) && overlay.kind !== 'none',
  );
  const overlayText =
    active.length === 0
      ? 'no overlay'
      : active
          .map(
            (overlay) =>
              `${overlay.kind} on ${overlay.layer} layer ${
                overlay.preservesImage === true ? 'preserving image detail' : 'with unverified image detail'
              }`,
          )
          .join('; ');

  return `${role} · ${focalText} · ${areaText} · ${overlayText}`;
}
