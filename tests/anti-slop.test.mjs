import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  evaluateReview,
  loadRules,
  summariseReview,
} from "../_shared/scripts/lib/anti-slop.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = path.join(ROOT, "tests", "fixtures", "anti-slop");
const CLI = path.join(ROOT, "_shared", "scripts", "anti-slop-check.mjs");

const rules = loadRules();

const EXPECTED_NAMES = [
  "Tags and pills",
  "Excessive italics",
  "Instrument Serif or unjustified fashionable typography choices",
  "Negative kerning",
  "Over-the-top detailed UI",
  "Excessive dividers",
  "Unnecessary colour shades and opacity variations",
  "Unnecessary bordered containers",
  "Overly detailed diagrams",
  "Verbose and redundant text",
  "Unnecessary code breadcrumbs",
  "Arbitrary section numbering",
  "Unrequested eyebrows",
  "Dithering",
  "ASCII images",
  "Unnecessary squircles",
  "Excessive monospace typography",
  "Unnecessary ALL-CAPS subtitles",
  "Unrequested gradient backgrounds",
  "Unnecessary periods in titles",
];

function readFixture(name) {
  return JSON.parse(readFileSync(path.join(FIXTURES, name), "utf8"));
}

function blankReview() {
  const review = readFixture("valid-review.json");
  for (const entry of review.indicators) {
    Object.assign(entry, {
      detected: false,
      pattern: "",
      classification: "unsupported",
      justification: "",
      referenceEvidence: [],
      justified: false,
      action: "keep",
      note: "Not detected.",
    });
    delete entry.designSystemReference;
    delete entry.requirementReference;
  }
  review.referenceEvidenceAvailable = true;
  review.verdict = "pass";
  return review;
}

function mark(review, id, patch) {
  const entry = review.indicators.find((candidate) => candidate.id === id);
  assert.ok(entry, `Fixture must declare ${id}.`);
  Object.assign(entry, patch);
  return review;
}

function hasIssue(result, code, indicatorId) {
  return result.issues.some(
    (issue) =>
      issue.code === code &&
      (indicatorId === undefined || issue.indicatorId === indicatorId),
  );
}

function assertPass(result) {
  assert.equal(result.verdict, "pass");
  assert.deepEqual(result.issues, []);
  assert.equal(result.summary.violations, 0);
}

test("rules declare exactly the 20 indicators, in order, with the expected names", () => {
  assert.equal(rules.schemaVersion, "1.0.0");
  assert.equal(rules.indicators.length, 20);

  const expectedIds = Array.from(
    { length: 20 },
    (_, index) => `AS-${String(index + 1).padStart(2, "0")}`,
  );
  assert.deepEqual(rules.indicators.map((rule) => rule.id), expectedIds);
  assert.deepEqual(rules.indicators.map((rule) => rule.name), EXPECTED_NAMES);

  for (const rule of rules.indicators) {
    assert.ok(rule.summary.length > 0, `${rule.id} needs a summary`);
    assert.ok(Array.isArray(rule.signals) && rule.signals.length > 0, `${rule.id} needs signals`);
    assert.ok(["remove", "replace", "justify", "keep"].includes(rule.defaultAction));
    assert.ok(["high", "medium", "low"].includes(rule.severity));
    assert.ok(Array.isArray(rule.acceptableWhen) && rule.acceptableWhen.length > 0);
    assert.ok(rule.notes.length > 0, `${rule.id} needs notes`);
  }
});

test("a fully evidenced review passes", () => {
  const result = evaluateReview(readFixture("valid-review.json"), rules);
  assertPass(result);
  assert.equal(result.summary.detected, 6);
  assert.equal(result.summary.indicatorsReviewed, 20);
});

test("the violations fixture fails with the expected unsupported additions", () => {
  const result = evaluateReview(readFixture("violations-review.json"), rules);
  assert.equal(result.verdict, "fail");

  for (const id of ["AS-01", "AS-08", "AS-12", "AS-18", "AS-19"]) {
    assert.ok(
      hasIssue(result, "UNSUPPORTED_ADDITION", id),
      `Expected UNSUPPORTED_ADDITION for ${id}`,
    );
  }
  assert.equal(result.summary.violations, result.issues.length);
});

test("an unsupported decorative gradient is flagged", () => {
  const review = mark(blankReview(), "AS-19", {
    detected: true,
    pattern: "radial gradient glow behind hero",
    classification: "unsupported",
    justified: false,
    action: "remove",
    note: "No gradient in the reference.",
  });

  const result = evaluateReview(review, rules);
  assert.equal(result.verdict, "fail");
  assert.ok(hasIssue(result, "UNSUPPORTED_ADDITION", "AS-19"));
  assert.equal(
    result.issues.find((issue) => issue.indicatorId === "AS-19").severity,
    "high",
  );
});

test("a source-supported gradient with a measured scrim passes", () => {
  const review = mark(blankReview(), "AS-19", {
    detected: true,
    pattern: "hero text-protection scrim",
    classification: "source-supported",
    justification: "The reference places a scrim behind the hero copy for contrast.",
    referenceEvidence: [
      "hero capture (1440px) - hero: rgb(0 0 0 / 0.55) fading to transparent behind the headline",
    ],
    justified: true,
    action: "keep",
    note: "Measured from the reference.",
  });

  assertPass(evaluateReview(review, rules));
});

test("source-supported uppercase headings are accepted", () => {
  const review = mark(blankReview(), "AS-18", {
    detected: true,
    pattern: "uppercase pricing subheads",
    classification: "source-supported",
    justification: "The reference sets pricing subheads in uppercase with tracking.",
    referenceEvidence: [
      "hero capture (1440px) - pricing groups: uppercase 12px, 0.08em tracking",
    ],
    justified: true,
    action: "keep",
    note: "Copied from the reference.",
  });

  assertPass(evaluateReview(review, rules));
});

test("unrequested ALL-CAPS subtitles are flagged", () => {
  const review = mark(blankReview(), "AS-18", {
    detected: true,
    pattern: "ALL-CAPS subtitle under every heading",
    classification: "unsupported",
    justified: false,
    action: "replace",
    note: "The reference uses sentence case.",
  });

  const result = evaluateReview(review, rules);
  assert.equal(result.verdict, "fail");
  assert.ok(hasIssue(result, "UNSUPPORTED_ADDITION", "AS-18"));
});

test("unjustified component borders are flagged", () => {
  const review = mark(blankReview(), "AS-08", {
    detected: true,
    pattern: "bordered box around every paragraph",
    classification: "unsupported",
    justified: false,
    action: "remove",
    note: "The reference uses spacing, not outlines.",
  });

  const result = evaluateReview(review, rules);
  assert.equal(result.verdict, "fail");
  assert.ok(hasIssue(result, "UNSUPPORTED_ADDITION", "AS-08"));
});

test("design-system borders are accepted with a token reference", () => {
  const review = mark(blankReview(), "AS-08", {
    detected: true,
    pattern: "bordered pricing cards",
    classification: "design-system-supported",
    justification: "The card component's default variant supplies the border.",
    designSystemReference: "shadcn/ui Card: default variant, --border token",
    justified: true,
    action: "keep",
    note: "One container level.",
  });

  assertPass(evaluateReview(review, rules));
});

test("unnecessary pills are flagged", () => {
  const review = mark(blankReview(), "AS-01", {
    detected: true,
    pattern: "decorative tag pill row",
    classification: "unsupported",
    justified: false,
    action: "remove",
    note: "No state or filtering role.",
  });

  const result = evaluateReview(review, rules);
  assert.equal(result.verdict, "fail");
  assert.ok(hasIssue(result, "UNSUPPORTED_ADDITION", "AS-01"));
});

test("reference-supported pill buttons are accepted", () => {
  const review = mark(blankReview(), "AS-01", {
    detected: true,
    pattern: "pill-shaped plan buttons",
    classification: "source-supported",
    justification: "The reference uses pill buttons as the plan selector.",
    referenceEvidence: [
      "hero capture (1440px) - pricing row: three rounded-full plan buttons",
    ],
    justified: true,
    action: "keep",
    note: "Reference-backed control, not decorative tag soup.",
  });

  assertPass(evaluateReview(review, rules));
});

test("unsupported section numbering is flagged", () => {
  const review = mark(blankReview(), "AS-12", {
    detected: true,
    pattern: "01 / 02 / 03 labels on unordered sections",
    classification: "unsupported",
    justified: false,
    action: "remove",
    note: "No reading order.",
  });

  const result = evaluateReview(review, rules);
  assert.equal(result.verdict, "fail");
  assert.ok(hasIssue(result, "UNSUPPORTED_ADDITION", "AS-12"));
});

test("functional numbering with a requirement reference is accepted", () => {
  const review = mark(blankReview(), "AS-12", {
    detected: true,
    pattern: "numbered onboarding steps",
    classification: "functional-requirement",
    justification: "The four onboarding steps must be completed in order.",
    requirementReference: "Onboarding spec: ordered steps 1-4",
    justified: true,
    action: "keep",
    note: "The sequence carries information.",
  });

  assertPass(evaluateReview(review, rules));
});

test("an indicator with no entry is undeclared", () => {
  const review = blankReview();
  review.indicators = review.indicators.filter((entry) => entry.id !== "AS-07");

  const result = evaluateReview(review, rules);
  assert.equal(result.verdict, "fail");
  assert.ok(hasIssue(result, "UNDECLARED_INDICATOR", "AS-07"));
});

test("a source-supported claim without reference evidence fails", () => {
  const review = mark(blankReview(), "AS-19", {
    detected: true,
    pattern: "hero scrim",
    classification: "source-supported",
    justification: "It looks like the reference.",
    referenceEvidence: [],
    justified: true,
    action: "keep",
    note: "No measurement recorded.",
  });

  const result = evaluateReview(review, rules);
  assert.equal(result.verdict, "fail");
  assert.ok(hasIssue(result, "CLAIMED_SOURCE_WITHOUT_EVIDENCE", "AS-19"));
});

test("a source-supported claim fails when reference evidence is unavailable", () => {
  const review = mark(blankReview(), "AS-19", {
    detected: true,
    pattern: "hero scrim",
    classification: "source-supported",
    justification: "It looks like the reference.",
    referenceEvidence: ["hero capture (1440px) - hero scrim"],
    justified: true,
    action: "keep",
    note: "Reference was not captured.",
  });
  review.referenceEvidenceAvailable = false;

  const result = evaluateReview(review, rules);
  assert.equal(result.verdict, "fail");
  assert.ok(hasIssue(result, "SOURCE_EVIDENCE_UNAVAILABLE", "AS-19"));
});

test("design-system support without a reference fails", () => {
  const review = mark(blankReview(), "AS-08", {
    detected: true,
    pattern: "bordered cards",
    classification: "design-system-supported",
    justification: "Cards normally have borders.",
    designSystemReference: "",
    justified: true,
    action: "keep",
    note: "No token named.",
  });

  const result = evaluateReview(review, rules);
  assert.equal(result.verdict, "fail");
  assert.ok(hasIssue(result, "DESIGN_SYSTEM_WITHOUT_REFERENCE", "AS-08"));
});

test("a functional requirement without a requirement reference fails", () => {
  const review = mark(blankReview(), "AS-12", {
    detected: true,
    pattern: "numbered steps",
    classification: "functional-requirement",
    justification: "The steps are ordered.",
    requirementReference: "",
    justified: true,
    action: "keep",
    note: "No requirement line cited.",
  });

  const result = evaluateReview(review, rules);
  assert.equal(result.verdict, "fail");
  assert.ok(hasIssue(result, "FUNCTIONAL_WITHOUT_REFERENCE", "AS-12"));
});

test("an unsupported addition marked as justified is always a violation", () => {
  const review = mark(blankReview(), "AS-19", {
    detected: true,
    pattern: "radial glow",
    classification: "unsupported",
    justification: "It looks professional.",
    justified: true,
    action: "keep",
    note: "Taste is not evidence.",
  });

  const result = evaluateReview(review, rules);
  assert.equal(result.verdict, "fail");
  assert.ok(hasIssue(result, "UNSUPPORTED_JUSTIFICATION", "AS-19"));
});

test("a justified indicator requiring removal is contradictory", () => {
  const review = mark(blankReview(), "AS-19", {
    detected: true,
    pattern: "source-backed hero scrim",
    classification: "source-supported",
    justification: "Measured from the reference.",
    referenceEvidence: ["hero capture (1440px) - hero scrim"],
    justified: true,
    action: "remove",
    note: "Contradictory action.",
  });

  const result = evaluateReview(review, rules);
  assert.equal(result.verdict, "fail");
  assert.ok(hasIssue(result, "CONTRADICTORY_ACTION", "AS-19"));
});

test("a verdict mismatch is reported", () => {
  const review = blankReview();
  review.verdict = "fail";

  const result = evaluateReview(review, rules);
  assert.equal(result.verdict, "fail");
  assert.ok(hasIssue(result, "VERDICT_MISMATCH"));
});

test("duplicate and unknown indicator entries are reported", () => {
  const review = blankReview();
  review.indicators.push(structuredClone(review.indicators[0]));
  review.indicators.push({ id: "AS-99", detected: false });

  const result = evaluateReview(review, rules);
  assert.equal(result.verdict, "fail");
  assert.ok(hasIssue(result, "DUPLICATE_INDICATOR", "AS-01"));
  assert.ok(hasIssue(result, "UNKNOWN_INDICATOR", "AS-99"));
});

test("summary table escapes pipes and renders undetected rows", () => {
  const review = mark(blankReview(), "AS-01", {
    detected: true,
    pattern: "pill | chip row",
    classification: "source-supported",
    justification: "Reference-backed.",
    referenceEvidence: ["hero capture (1440px) - region | pricing"],
    justified: true,
    action: "keep",
    note: "Pipes must not break the table.",
  });

  const table = summariseReview(review);
  assert.ok(table.startsWith("| Indicator | Detected pattern | Evidence in reference | Justified | Required action |"));
  assert.ok(table.includes("pill \\| chip row"));
  assert.ok(table.includes("region \\| pricing"));
  assert.ok(table.includes("| AS-02 | Not detected | None | Not applicable | None |"));
});

test("every rule rejects an unsupported detected instance", () => {
  for (const rule of rules.indicators) {
    const review = mark(blankReview(), rule.id, {
      detected: true,
      pattern: `${rule.name} pattern`,
      classification: "unsupported",
      justified: false,
      action: rule.defaultAction,
      note: "No evidence.",
    });

    const result = evaluateReview(review, rules);
    assert.equal(result.verdict, "fail", `${rule.id} should fail`);
    assert.ok(
      hasIssue(result, "UNSUPPORTED_ADDITION", rule.id),
      `${rule.id} should report UNSUPPORTED_ADDITION`,
    );
  }
});

test("every rule accepts a source-supported instance with evidence", () => {
  for (const rule of rules.indicators) {
    const review = mark(blankReview(), rule.id, {
      detected: true,
      pattern: `${rule.name} copied from the reference`,
      classification: "source-supported",
      justification: `The reference contains ${rule.name.toLowerCase()}.`,
      referenceEvidence: [
        `reference/sample.webp - region: ${rule.name} measurement at 1440px`,
      ],
      justified: true,
      action: "keep",
      note: "Source-backed.",
    });

    assertPass(evaluateReview(review, rules));
  }
});

test("a classification outside the rule's acceptable list is rejected", () => {
  const review = mark(blankReview(), "AS-14", {
    detected: true,
    pattern: "dither overlay",
    classification: "functional-requirement",
    justification: "It adds texture.",
    requirementReference: "No requirement exists.",
    justified: true,
    action: "keep",
    note: "Dithering only accepts source support.",
  });

  const result = evaluateReview(review, rules);
  assert.equal(result.verdict, "fail");
  assert.ok(hasIssue(result, "UNSUPPORTED_ADDITION", "AS-14"));
});

test("a non-boolean detected value is invalid rather than silently ignored", () => {
  const review = blankReview();
  mark(review, "AS-19", { detected: "true" });

  const result = evaluateReview(review, rules);
  assert.equal(result.verdict, "fail");
  assert.ok(hasIssue(result, "INVALID_INDICATOR_ENTRY", "AS-19"));
});

test("the CLI exits 0 and prints PASS for a valid review", () => {
  const stdout = execFileSync(
    process.execPath,
    [CLI, path.join(FIXTURES, "valid-review.json")],
    { encoding: "utf8" },
  );

  assert.match(stdout, /## Verdict: PASS/);
  assert.match(stdout, /\| AS-19 \|/);
});

test("the CLI exits 1 and prints FAIL for the violations review", () => {
  let error = null;
  try {
    execFileSync(process.execPath, [CLI, path.join(FIXTURES, "violations-review.json")], {
      encoding: "utf8",
    });
  } catch (caught) {
    error = caught;
  }

  assert.ok(error, "CLI should exit non-zero");
  assert.equal(error.status, 1);
  assert.match(String(error.stdout), /## Verdict: FAIL/);
  assert.match(String(error.stdout), /UNSUPPORTED_ADDITION/);
});

test("the CLI emits machine-readable JSON with --json", () => {
  const stdout = execFileSync(
    process.execPath,
    [CLI, path.join(FIXTURES, "valid-review.json"), "--json"],
    { encoding: "utf8" },
  );

  const parsed = JSON.parse(stdout);
  assert.equal(parsed.verdict, "pass");
  assert.equal(parsed.summary.indicatorsReviewed, 20);
  assert.deepEqual(parsed.issues, []);
});
