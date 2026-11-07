// Semantic validation for Kumite Design Memory Maps.
// Schema validation is delegated to ./schema.mjs; this module adds the rules
// that cannot be expressed in JSON Schema: evidence resolution, confidence
// consistency, identifier separation, referential integrity and image/overlay
// composition rules.

import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { validateSchema } from "./schema.mjs";

const CONFIDENCES = ["exact", "measured", "estimated", "unknown"];
const FULL_BLEED_ROLES = new Set([
  "full-bleed-background",
  "blended-photographic-background",
]);
const SCHEMA_URL = new URL(
  "../../references/design-memory-schema.json",
  import.meta.url,
);

let cachedSchema;

/** Load the Design Memory Map JSON Schema from references/. */
export function loadDesignMemorySchema() {
  if (!cachedSchema) {
    const schemaPath = fileURLToPath(SCHEMA_URL);
    cachedSchema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  }
  return cachedSchema;
}

/**
 * Validate a Design Memory Map against both the JSON Schema and Kumite's
 * semantic rules.
 * @param {unknown} map
 * @returns {{valid: boolean, errors: Array<{code: string, path: string, message: string}>, warnings: Array<{code: string, path: string, message: string}>}}
 */
export function validateDesignMemory(map) {
  const schemaResult = validateSchema(map, loadDesignMemorySchema());
  const errors = schemaResult.errors.map((error) => ({
    code: "SCHEMA_INVALID",
    path: error.path,
    message: error.message,
  }));
  const warnings = [];
  const pushError = (code, path, message) => errors.push({ code, path, message });
  const pushWarning = (code, path, message) =>
    warnings.push({ code, path, message });

  if (!isPlainObject(map)) {
    return { valid: false, errors, warnings };
  }

  const components = arrayOf(map.components);
  const sections = arrayOf(map.sections);
  const images = arrayOf(map.images);
  const evidence = arrayOf(map.evidence);

  checkSourceIdentity(map.source?.identity, pushError);
  checkEvidence(evidence, map, pushError, pushWarning);
  checkConfidence(map, pushError);
  checkEntityEvidence(components, "components", pushError);
  checkEntityEvidence(sections, "sections", pushError);
  checkEntityEvidence(images, "images", pushError);
  checkUniqueIds(components, "components", "DUPLICATE_COMPONENT_ID", pushError);
  checkUniqueIds(sections, "sections", "DUPLICATE_SECTION_ID", pushError);
  checkUniqueIds(images, "images", "DUPLICATE_IMAGE_ID", pushError);
  checkSectionOrder(sections, pushError);
  checkReferences(components, sections, images, pushError);
  checkImages(images, pushError);

  return { valid: errors.length === 0, errors, warnings };
}

function checkSourceIdentity(identity, pushError) {
  if (!isPlainObject(identity)) return;
  const path = "$.source.identity";
  const { communityId, communityUrl, fileKey, designUrl } = identity;

  if (
    typeof communityId === "string" &&
    typeof fileKey === "string" &&
    communityId === fileKey
  ) {
    pushError(
      "IDENTITY_COMMUNITY_ID_USED_AS_FILE_KEY",
      `${path}.fileKey`,
      "communityId and fileKey must be different identifiers; a Community ID is not a Design File Key",
    );
  }

  if (typeof fileKey === "string" && /^[0-9]{15,25}$/.test(fileKey)) {
    pushError(
      "IDENTITY_FILE_KEY_LOOKS_LIKE_COMMUNITY_ID",
      `${path}.fileKey`,
      "fileKey looks like a numeric Community ID; resolve the 22-character Design File Key instead",
    );
  }

  if (typeof designUrl === "string") {
    if (/figma\.com\/community\//i.test(designUrl)) {
      pushError(
        "IDENTITY_DESIGN_URL_IS_COMMUNITY_URL",
        `${path}.designUrl`,
        "designUrl points at a Community page; it must be a Figma Design file URL",
      );
    }
    if (typeof fileKey !== "string" || fileKey.length === 0) {
      pushError(
        "IDENTITY_DESIGN_URL_WITHOUT_FILE_KEY",
        `${path}.designUrl`,
        "designUrl is present but fileKey is missing; record the Design File Key alongside the URL",
      );
    } else if (!designUrl.includes(fileKey)) {
      pushError(
        "IDENTITY_DESIGN_URL_MISSING_FILE_KEY",
        `${path}.designUrl`,
        "designUrl does not contain the recorded fileKey",
      );
    }
  }

  if (typeof communityUrl === "string") {
    if (typeof communityId !== "string" || communityId.length === 0) {
      pushError(
        "IDENTITY_COMMUNITY_URL_WITHOUT_ID",
        `${path}.communityUrl`,
        "communityUrl is present but communityId is missing",
      );
    } else if (!communityUrl.includes(communityId)) {
      pushError(
        "IDENTITY_COMMUNITY_URL_MISSING_ID",
        `${path}.communityUrl`,
        "communityUrl does not contain the recorded communityId",
      );
    }
  }
}

function checkEvidence(evidence, map, pushError, pushWarning) {
  const ids = new Set();
  evidence.forEach((entry, index) => {
    if (!isPlainObject(entry)) return;
    const path = `$.evidence[${index}]`;

    if (typeof entry.id === "string") {
      if (ids.has(entry.id)) {
        pushError(
          "DUPLICATE_EVIDENCE_ID",
          `${path}.id`,
          `evidence id "${entry.id}" is already defined`,
        );
      } else {
        ids.add(entry.id);
      }
    }

    if (
      entry.kind === "figma-node" &&
      typeof entry.ref === "string" &&
      !/^\d+[:-]\d+$/.test(entry.ref)
    ) {
      pushError(
        "EVIDENCE_INVALID_FIGMA_NODE_REF",
        `${path}.ref`,
        'a figma-node ref must be a node id such as "124:450" or "124-450"',
      );
    }

    if (
      (entry.kind === "screenshot-region" || entry.kind === "crop") &&
      entry.coordinates === undefined
    ) {
      pushWarning(
        "EVIDENCE_MISSING_COORDINATES",
        `${path}.coordinates`,
        "screenshot-region and crop evidence should record pixel coordinates; add a note if coordinates genuinely cannot be recovered",
      );
    }
  });

  walk(map, "$", (node, path) => {
    if (
      !Object.prototype.hasOwnProperty.call(node, "confidence") ||
      !Array.isArray(node.evidence)
    ) {
      return;
    }
    node.evidence.forEach((id, index) => {
      if (typeof id === "string" && !ids.has(id)) {
        pushError(
          "EVIDENCE_REF_UNRESOLVED",
          `${path}.evidence[${index}]`,
          `evidence id "${id}" is not defined in the top-level evidence array`,
        );
      }
    });
  });
}

function checkConfidence(map, pushError) {
  walk(map, "$", (node, path) => {
    if (!isTracedValue(node)) return;
    const hasEvidence =
      Array.isArray(node.evidence) && node.evidence.length > 0;
    const hasNote =
      typeof node.note === "string" && node.note.trim().length > 0;

    if (node.value === null && node.confidence !== "unknown") {
      pushError(
        "CONFIDENCE_NULL_VALUE_NOT_UNKNOWN",
        path,
        'a traced value with a null value must use confidence "unknown"',
      );
    }

    if (node.confidence === "exact" && !hasEvidence) {
      pushError(
        "CONFIDENCE_EXACT_WITHOUT_EVIDENCE",
        path,
        'confidence "exact" requires at least one evidence id',
      );
    }

    if (node.confidence === "measured" && !hasEvidence && !hasNote) {
      pushError(
        "CONFIDENCE_MEASURED_WITHOUT_EVIDENCE",
        path,
        'confidence "measured" requires evidence or a note describing the direct measurement',
      );
    }
  });
}

function checkEntityEvidence(entities, collection, pushError) {
  entities.forEach((entity, index) => {
    if (!isPlainObject(entity)) return;
    if (entity.confidence !== "exact" && entity.confidence !== "measured") {
      return;
    }
    if (!Array.isArray(entity.evidence) || entity.evidence.length === 0) {
      pushError(
        "ENTITY_CONFIDENCE_WITHOUT_EVIDENCE",
        `$.${collection}[${index}].evidence`,
        `a ${collection.slice(0, -1)} with confidence "${entity.confidence}" must cite at least one evidence id`,
      );
    }
  });
}

function checkUniqueIds(items, collection, code, pushError) {
  const seen = new Set();
  items.forEach((item, index) => {
    if (!isPlainObject(item) || typeof item.id !== "string") return;
    const path = `$.${collection}[${index}].id`;
    if (seen.has(item.id)) {
      pushError(code, path, `duplicate ${collection} id "${item.id}"`);
    } else {
      seen.add(item.id);
    }
  });
}

function checkSectionOrder(sections, pushError) {
  const seen = new Map();
  sections.forEach((section, index) => {
    if (!isPlainObject(section) || !Number.isInteger(section.order)) return;
    if (seen.has(section.order)) {
      pushError(
        "SECTION_ORDER_DUPLICATE",
        `$.sections[${index}].order`,
        `section order ${section.order} is already used by sections[${seen.get(section.order)}]`,
      );
    } else {
      seen.set(section.order, index);
    }
  });
}

function checkReferences(components, sections, images, pushError) {
  const componentIds = new Set(
    components
      .filter((component) => typeof component?.id === "string")
      .map((component) => component.id),
  );
  const sectionIds = new Set(
    sections
      .filter((section) => typeof section?.id === "string")
      .map((section) => section.id),
  );

  sections.forEach((section, sectionIndex) => {
    if (!Array.isArray(section?.components)) return;
    section.components.forEach((id, componentIndex) => {
      if (typeof id === "string" && !componentIds.has(id)) {
        pushError(
          "SECTION_COMPONENT_REF_UNRESOLVED",
          `$.sections[${sectionIndex}].components[${componentIndex}]`,
          `section references component "${id}", which is not defined`,
        );
      }
    });
  });

  images.forEach((image, imageIndex) => {
    if (
      typeof image?.sectionId === "string" &&
      !sectionIds.has(image.sectionId)
    ) {
      pushError(
        "IMAGE_SECTION_REF_UNRESOLVED",
        `$.images[${imageIndex}].sectionId`,
        `image references section "${image.sectionId}", which is not defined`,
      );
    }
  });
}

function checkImages(images, pushError) {
  images.forEach((image, imageIndex) => {
    if (!isPlainObject(image)) return;
    const base = `$.images[${imageIndex}]`;
    const composition = isPlainObject(image.composition)
      ? image.composition
      : {};
    const focalPoint = composition.primaryFocalPoint;
    const textSafeArea = composition.textSafeArea;
    const crop = composition.crop;

    if (isPlainObject(focalPoint)) {
      for (const axis of ["x", "y"]) {
        if (isNumberOutsideUnitRange(focalPoint[axis])) {
          pushError(
            "IMAGE_FOCAL_POINT_OUT_OF_BOUNDS",
            `${base}.composition.primaryFocalPoint.${axis}`,
            "focal point coordinates must be normalised to 0..1",
          );
        }
      }
    }

    if (isPlainObject(textSafeArea)) {
      for (const key of ["x", "y", "width", "height"]) {
        if (isNumberOutsideUnitRange(textSafeArea[key])) {
          pushError(
            "IMAGE_TEXT_SAFE_AREA_OUT_OF_BOUNDS",
            `${base}.composition.textSafeArea.${key}`,
            "text-safe-area coordinates must be normalised to 0..1",
          );
        }
      }
      if (textSafeArea.width === 0 || textSafeArea.height === 0) {
        pushError(
          "IMAGE_TEXT_SAFE_AREA_ZERO_SIZE",
          `${base}.composition.textSafeArea`,
          "text-safe-area width and height must be greater than zero",
        );
      }
      if (
        exceedsUnitRange(textSafeArea.x, textSafeArea.width) ||
        exceedsUnitRange(textSafeArea.y, textSafeArea.height)
      ) {
        pushError(
          "IMAGE_TEXT_SAFE_AREA_OUT_OF_BOUNDS",
          `${base}.composition.textSafeArea`,
          "text-safe-area extends beyond the image bounds (x + width and y + height must be <= 1)",
        );
      }
    }

    if (isPlainObject(crop)) {
      if (
        exceedsUnitRange(crop.x, crop.width) ||
        exceedsUnitRange(crop.y, crop.height)
      ) {
        pushError(
          "IMAGE_CROP_OUT_OF_BOUNDS",
          `${base}.composition.crop`,
          "crop extends beyond the image bounds (x + width and y + height must be <= 1)",
        );
      }
      if (crop.width === 0 || crop.height === 0) {
        pushError(
          "IMAGE_CROP_ZERO_SIZE",
          `${base}.composition.crop`,
          "crop width and height must be greater than zero",
        );
      }
    }

    if (!Array.isArray(image.overlays)) return;
    const requiresIndependentLayer = FULL_BLEED_ROLES.has(image.role);

    image.overlays.forEach((overlay, overlayIndex) => {
      if (!isPlainObject(overlay)) return;
      const overlayPath = `${base}.overlays[${overlayIndex}]`;

      if (overlay.kind === "none") {
        if (overlay.layer !== "none") {
          pushError(
            "OVERLAY_NONE_LAYER_MISMATCH",
            `${overlayPath}.layer`,
            'an overlay of kind "none" must use layer "none"',
          );
        }
        return;
      }

      if (!requiresIndependentLayer) return;

      if (overlay.layer !== "independent") {
        pushError(
          "OVERLAY_LAYER_MUST_BE_INDEPENDENT",
          `${overlayPath}.layer`,
          `a ${image.role} image must apply its overlay as an independent layer, not "${overlay.layer}"`,
        );
      }
      if (overlay.preservesImage !== true) {
        pushError(
          "OVERLAY_MUST_PRESERVE_IMAGE",
          `${overlayPath}.preservesImage`,
          `a ${image.role} image must set preservesImage to true`,
        );
      }
    });
  });
}

function walk(value, path, visitNode) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${path}[${index}]`, visitNode));
    return;
  }
  if (!isPlainObject(value)) return;
  visitNode(value, path);
  for (const [key, child] of Object.entries(value)) {
    walk(child, joinPath(path, key), visitNode);
  }
}

function isTracedValue(node) {
  return (
    Object.prototype.hasOwnProperty.call(node, "value") &&
    typeof node.confidence === "string" &&
    CONFIDENCES.includes(node.confidence)
  );
}

function isNumberOutsideUnitRange(value) {
  return typeof value === "number" && (value < 0 || value > 1);
}

function exceedsUnitRange(origin, size) {
  return (
    typeof origin === "number" &&
    typeof size === "number" &&
    origin + size > 1 + Number.EPSILON * 64
  );
}

function arrayOf(value) {
  return Array.isArray(value) ? value : [];
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function joinPath(path, key) {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return `${path}.${key}`;
  return `${path}[${JSON.stringify(key)}]`;
}
