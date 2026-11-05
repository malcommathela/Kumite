import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateSchema } from "../scripts/lib/schema.mjs";
import { validateDesignMemory } from "../scripts/lib/design-memory.mjs";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(testDirectory, "..");
const fixtureDirectory = path.join(testDirectory, "fixtures", "design-memory");
const cliPath = path.join(root, "scripts", "validate-memory.mjs");
const examplePath = path.join(root, "references", "design-memory-example.json");

function fixture(name) {
  return JSON.parse(
    fs.readFileSync(path.join(fixtureDirectory, name), "utf8"),
  );
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function codes(result) {
  return result.errors.map((error) => error.code);
}

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

test("valid complete map passes schema and semantic validation", () => {
  const result = validateDesignMemory(fixture("valid-complete.json"));
  assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.errors.length, 0);
  assert.equal(result.warnings.length, 0);
});

test("minimal map with optional properties omitted passes", () => {
  const result = validateDesignMemory(fixture("missing-optional.json"));
  assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
});

test("unknown and estimated values with notes are accepted", () => {
  const map = fixture("unknown-estimated.json");
  const result = validateDesignMemory(map);
  assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(map.source.identity.licence.confidence, "unknown");
  assert.equal(map.source.identity.licence.value, null);
});

test("exact confidence without evidence is rejected", () => {
  const result = validateDesignMemory(fixture("invalid-confidence.json"));
  assert.equal(result.valid, false);
  assert.ok(codes(result).includes("CONFIDENCE_EXACT_WITHOUT_EVIDENCE"));
  assert.ok(
    result.errors.some((error) =>
      error.path.endsWith("colours.palette[0]"),
    ),
  );
});

test("a null value with a non-unknown confidence is rejected", () => {
  const map = clone(fixture("missing-optional.json"));
  map.foundations.spacing.sectionRhythm = {
    value: null,
    confidence: "estimated",
    note: "A note does not make a null value measurable.",
  };
  const result = validateDesignMemory(map);
  assert.equal(result.valid, false);
  assert.ok(codes(result).includes("CONFIDENCE_NULL_VALUE_NOT_UNKNOWN"));
});

test("measured confidence needs evidence or a measurement note", () => {
  const map = clone(fixture("missing-optional.json"));
  map.source.identity.title = {
    value: "Untraceable title",
    confidence: "measured",
  };
  const result = validateDesignMemory(map);
  assert.equal(result.valid, false);
  assert.ok(codes(result).includes("CONFIDENCE_MEASURED_WITHOUT_EVIDENCE"));
});

test("dangling evidence references are rejected", () => {
  const result = validateDesignMemory(fixture("invalid-evidence-ref.json"));
  assert.equal(result.valid, false);
  assert.ok(codes(result).includes("EVIDENCE_REF_UNRESOLVED"));
});

test("every evidence reference in the complete map resolves", () => {
  const map = fixture("valid-complete.json");
  const ids = new Set(map.evidence.map((entry) => entry.id));
  assert.ok(ids.size > 0);
  const result = validateDesignMemory(map);
  assert.equal(result.valid, true);
  assert.ok(!codes(result).includes("EVIDENCE_REF_UNRESOLVED"));
});

test("components with multiple variants pass and zero variants is rejected", () => {
  const validMap = fixture("component-variants.json");
  const validResult = validateDesignMemory(validMap);
  assert.equal(validResult.valid, true, JSON.stringify(validResult.errors, null, 2));
  assert.ok(validMap.components[0].variants.length >= 3);

  const invalidMap = clone(validMap);
  invalidMap.components[0].variants = [];
  const invalidResult = validateDesignMemory(invalidMap);
  assert.equal(invalidResult.valid, false);
  assert.ok(
    invalidResult.errors.some(
      (error) =>
        error.code === "SCHEMA_INVALID" &&
        error.path.endsWith(".variants") &&
        /at least 1 item/.test(error.message),
    ),
  );
});

test("responsive breakpoints must be named strings", () => {
  const map = clone(fixture("valid-complete.json"));
  map.sections[0].responsive[0].breakpoint = 480;
  const result = validateDesignMemory(map);
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) =>
        error.path.endsWith(".responsive[0].breakpoint") &&
        /must be of type string/.test(error.message),
    ),
  );
});

test("responsive changes must contain traced values", () => {
  const map = clone(fixture("component-variants.json"));
  map.components[0].variants[0].properties.responsive[0].changes.padding =
    "16px";
  const result = validateDesignMemory(map);
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) =>
        error.path.endsWith(".properties.responsive[0].changes.padding") &&
        /must be of type object/.test(error.message),
    ),
  );
});

test("a design URL that does not contain the file key is rejected", () => {
  const result = validateDesignMemory(fixture("invalid-identity-mismatch.json"));
  assert.equal(result.valid, false);
  assert.ok(codes(result).includes("IDENTITY_DESIGN_URL_MISSING_FILE_KEY"));
});

test("a Community URL cannot be used as a design URL", () => {
  const map = clone(fixture("source-identity.json"));
  map.source.identity.designUrl = map.source.identity.communityUrl;
  const result = validateDesignMemory(map);
  assert.equal(result.valid, false);
  assert.ok(codes(result).includes("IDENTITY_DESIGN_URL_IS_COMMUNITY_URL"));
});

test("a numeric file key that looks like a Community ID is rejected", () => {
  const map = clone(fixture("source-identity.json"));
  map.source.identity.fileKey = map.source.identity.communityId;
  const result = validateDesignMemory(map);
  assert.equal(result.valid, false);
  assert.ok(codes(result).includes("IDENTITY_FILE_KEY_LOOKS_LIKE_COMMUNITY_ID"));
});

test("section component references must resolve", () => {
  const map = clone(fixture("valid-complete.json"));
  map.sections[0].components = ["cmp-missing"];
  const result = validateDesignMemory(map);
  assert.equal(result.valid, false);
  assert.ok(codes(result).includes("SECTION_COMPONENT_REF_UNRESOLVED"));
});

test("image section references must resolve", () => {
  const map = clone(fixture("valid-complete.json"));
  map.images[0].sectionId = "sec-missing";
  const result = validateDesignMemory(map);
  assert.equal(result.valid, false);
  assert.ok(codes(result).includes("IMAGE_SECTION_REF_UNRESOLVED"));
});

test("duplicate section order and duplicate ids are rejected", () => {
  const map = clone(fixture("valid-complete.json"));
  map.sections[1].order = map.sections[0].order;
  map.components[1].id = map.components[0].id;
  const result = validateDesignMemory(map);
  assert.equal(result.valid, false);
  assert.ok(codes(result).includes("SECTION_ORDER_DUPLICATE"));
  assert.ok(codes(result).includes("DUPLICATE_COMPONENT_ID"));
});

test("a full-bleed image cannot embed its gradient overlay", () => {
  const result = validateDesignMemory(fixture("invalid-overlay-embedded.json"));
  assert.equal(result.valid, false);
  assert.ok(codes(result).includes("OVERLAY_LAYER_MUST_BE_INDEPENDENT"));
});

test("an overlay of kind none must use the none layer", () => {
  const map = clone(fixture("valid-complete.json"));
  map.images[0].overlays[0].kind = "none";
  const result = validateDesignMemory(map);
  assert.equal(result.valid, false);
  assert.ok(codes(result).includes("OVERLAY_NONE_LAYER_MISMATCH"));
});

test("text-safe areas cannot have zero width or height", () => {
  const map = clone(fixture("valid-complete.json"));
  map.images[0].composition.textSafeArea.width = 0;
  const result = validateDesignMemory(map);
  assert.equal(result.valid, false);
  assert.ok(codes(result).includes("IMAGE_TEXT_SAFE_AREA_ZERO_SIZE"));
});

test("invalid schema data is rejected for the right reason", () => {
  const result = validateDesignMemory(fixture("invalid-schema.json"));
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) =>
        error.path === "$.sections" &&
        /required property is missing/.test(error.message),
    ),
  );
  assert.ok(
    result.errors.some(
      (error) =>
        error.path === "$.components" &&
        /must be of type array/.test(error.message),
    ),
  );
});

test("schema validator self-test reports precise nested paths", () => {
  const schema = {
    type: "object",
    required: ["items"],
    properties: {
      items: {
        type: "array",
        minItems: 2,
        items: {
          type: "object",
          required: ["name"],
          properties: { name: { type: "string" } },
          additionalProperties: { type: "number" },
        },
      },
    },
  };

  assert.equal(
    validateSchema({ items: [{ name: "a" }, { name: "b" }] }, schema).valid,
    true,
  );

  const result = validateSchema(
    { items: [{ name: 7, extra: "not-a-number" }] },
    schema,
  );
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some(
      (error) =>
        error.path === "$.items" && /at least 2 item/.test(error.message),
    ),
  );
  assert.ok(
    result.errors.some(
      (error) =>
        error.path === "$.items[0].name" &&
        /must be of type string/.test(error.message),
    ),
  );
  assert.ok(
    result.errors.some(
      (error) =>
        error.path === "$.items[0].extra" &&
        /must be of type number/.test(error.message),
    ),
  );
});

test("the worked example validates", () => {
  const map = JSON.parse(fs.readFileSync(examplePath, "utf8"));
  const result = validateDesignMemory(map);
  assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(result.warnings.length, 0);
});

test("CLI exits 0 and emits JSON for the valid example", () => {
  const run = runCli([examplePath, "--json"]);
  assert.equal(run.status, 0, run.stderr);
  const output = JSON.parse(run.stdout);
  assert.equal(output.valid, true);
  assert.equal(output.errors.length, 0);
});

test("CLI exits 1 for an invalid map", () => {
  const run = runCli([
    path.join(fixtureDirectory, "invalid-confidence.json"),
  ]);
  assert.equal(run.status, 1);
  assert.match(run.stdout, /INVALID/);
  assert.match(run.stdout, /CONFIDENCE_EXACT_WITHOUT_EVIDENCE/);
});
