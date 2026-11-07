import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

/** Shared factory root, derived from this module rather than the process CWD. */
export const REPO_ROOT = path.resolve(MODULE_DIR, "..", "..");

/** Default location of the machine-readable anti-slop rules. */
export const DEFAULT_RULES_PATH = path.join(REPO_ROOT, "references", "anti-slop-rules.json");

export const CLASSIFICATIONS = Object.freeze([
  "unsupported",
  "source-supported",
  "design-system-supported",
  "functional-requirement",
]);

const ACTIONS = new Set(["remove", "replace", "justify", "keep"]);
const SEVERITIES = new Set(["high", "medium", "low"]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasEvidenceList(value) {
  return Array.isArray(value) && value.some((item) => isNonEmptyString(item));
}

function validateRules(rules, source) {
  if (!rules || typeof rules !== "object") {
    throw new TypeError(`Anti-slop rules at ${source} must be a JSON object.`);
  }
  if (!Array.isArray(rules.indicators) || rules.indicators.length === 0) {
    throw new TypeError(`Anti-slop rules at ${source} must declare a non-empty "indicators" array.`);
  }

  const seen = new Set();
  for (const rule of rules.indicators) {
    if (!rule || typeof rule !== "object") {
      throw new TypeError(`Anti-slop rules at ${source} contain a non-object indicator.`);
    }
    if (!/^AS-\d{2}$/.test(rule.id ?? "")) {
      throw new TypeError(`Anti-slop rule id "${rule.id}" must match AS-NN.`);
    }
    if (seen.has(rule.id)) {
      throw new TypeError(`Anti-slop rules at ${source} declare "${rule.id}" twice.`);
    }
    seen.add(rule.id);
    if (!isNonEmptyString(rule.name)) {
      throw new TypeError(`Anti-slop rule "${rule.id}" is missing a name.`);
    }
    if (!ACTIONS.has(rule.defaultAction)) {
      throw new TypeError(`Anti-slop rule "${rule.id}" has an invalid defaultAction.`);
    }
    if (!SEVERITIES.has(rule.severity)) {
      throw new TypeError(`Anti-slop rule "${rule.id}" has an invalid severity.`);
    }
    if (!Array.isArray(rule.acceptableWhen)) {
      throw new TypeError(`Anti-slop rule "${rule.id}" must declare acceptableWhen.`);
    }
  }
}

/**
 * Read and validate the anti-slop rules.
 *
 * @param {string} [filePath] Override for tests and external rule sets.
 * @returns {{schemaVersion: string, principle: string, indicators: object[]}}
 */
export function loadRules(filePath = DEFAULT_RULES_PATH) {
  let raw;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (error) {
    throw new Error(`Unable to read anti-slop rules at ${filePath}: ${error.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in anti-slop rules at ${filePath}: ${error.message}`);
  }

  validateRules(parsed, filePath);
  return parsed;
}

function makeIssue(code, indicatorId, severity, message) {
  return { code, indicatorId, severity, message };
}

function checkDetectedEntry(entry, rule, review, issues) {
  const { id, classification } = entry;

  if (!CLASSIFICATIONS.includes(classification)) {
    issues.push(
      makeIssue(
        "UNSUPPORTED_ADDITION",
        id,
        rule.severity,
        `Classification "${classification}" is not one of ${CLASSIFICATIONS.join(", ")}.`,
      ),
    );
    return;
  }

  if (classification === "unsupported") {
    if (entry.justified === true) {
      issues.push(
        makeIssue(
          "UNSUPPORTED_JUSTIFICATION",
          id,
          rule.severity,
          "An unsupported addition cannot be marked as justified. Remove or replace it.",
        ),
      );
    } else {
      issues.push(
        makeIssue(
          "UNSUPPORTED_ADDITION",
          id,
          rule.severity,
          `Detected "${rule.name}" has no source, design-system or functional evidence. Remove or replace it.`,
        ),
      );
    }
    return;
  }

  if (!rule.acceptableWhen.includes(classification)) {
    issues.push(
      makeIssue(
        "UNSUPPORTED_ADDITION",
        id,
        rule.severity,
        `"${rule.name}" does not accept the "${classification}" classification.`,
      ),
    );
  }

  if (!isNonEmptyString(entry.justification)) {
    issues.push(
      makeIssue(
        "UNSUPPORTED_ADDITION",
        id,
        rule.severity,
        `A "${classification}" exception requires an explicit justification.`,
      ),
    );
  }

  if (classification === "source-supported") {
    if (review.referenceEvidenceAvailable !== true) {
      issues.push(
        makeIssue(
          "SOURCE_EVIDENCE_UNAVAILABLE",
          id,
          rule.severity,
          "The review claims source support but records no available reference evidence.",
        ),
      );
    }
    if (!hasEvidenceList(entry.referenceEvidence)) {
      issues.push(
        makeIssue(
          "CLAIMED_SOURCE_WITHOUT_EVIDENCE",
          id,
          rule.severity,
          "Source-supported requires at least one referenceEvidence entry (quote, measurement, region or node).",
        ),
      );
    }
  } else if (classification === "design-system-supported") {
    if (!isNonEmptyString(entry.designSystemReference)) {
      issues.push(
        makeIssue(
          "DESIGN_SYSTEM_WITHOUT_REFERENCE",
          id,
          rule.severity,
          "Design-system-supported requires a designSystemReference (token, component or variant).",
        ),
      );
    }
  } else if (classification === "functional-requirement") {
    if (!isNonEmptyString(entry.requirementReference)) {
      issues.push(
        makeIssue(
          "FUNCTIONAL_WITHOUT_REFERENCE",
          id,
          rule.severity,
          "Functional-requirement requires a requirementReference.",
        ),
      );
    }
  }

  if (entry.justified !== true) {
    issues.push(
      makeIssue(
        "UNSUPPORTED_ADDITION",
        id,
        rule.severity,
        `A detected "${rule.name}" addition must be justified by evidence or removed.`,
      ),
    );
  }
}

/**
 * Evaluate an anti-slop review against the rules.
 *
 * The review is expected to declare all rules, using detected: false for
 * indicators that are not present. The verdict is computed from violations,
 * never trusted from the document.
 *
 * @param {object} review
 * @param {object} [rules]
 * @returns {{verdict: "pass" | "fail", issues: object[], summary: object}}
 */
export function evaluateReview(review, rules = loadRules()) {
  if (!review || typeof review !== "object" || Array.isArray(review)) {
    throw new TypeError("Anti-slop review must be a JSON object.");
  }
  validateRules(rules, "supplied rules");

  const ruleById = new Map(rules.indicators.map((rule) => [rule.id, rule]));
  const entries = Array.isArray(review.indicators) ? review.indicators : [];
  const issues = [];
  const seen = new Set();
  let detected = 0;
  let justifiedClaims = 0;

  for (const entry of entries) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      issues.push(
        makeIssue("INVALID_INDICATOR_ENTRY", null, "high", "Indicator entries must be objects."),
      );
      continue;
    }

    const rule = ruleById.get(entry.id);
    if (!rule) {
      issues.push(
        makeIssue(
          "UNKNOWN_INDICATOR",
          typeof entry.id === "string" ? entry.id : null,
          "high",
          `Unknown indicator id "${entry.id}". Only AS-01 to AS-20 are defined.`,
        ),
      );
      continue;
    }

    if (seen.has(entry.id)) {
      issues.push(
        makeIssue(
          "DUPLICATE_INDICATOR",
          entry.id,
          rule.severity,
          `Indicator ${entry.id} is declared more than once.`,
        ),
      );
      continue;
    }
    seen.add(entry.id);

    if (typeof entry.detected !== "boolean") {
      issues.push(
        makeIssue(
          "INVALID_INDICATOR_ENTRY",
          entry.id,
          rule.severity,
          `Indicator ${entry.id} must declare detected as true or false.`,
        ),
      );
      continue;
    }

    if (!entry.detected) {
      continue;
    }

    detected += 1;
    if (entry.justified === true) {
      justifiedClaims += 1;
    }
    checkDetectedEntry(entry, rule, review, issues);

    if (entry.justified === true && entry.action === "remove") {
      issues.push(
        makeIssue(
          "CONTRADICTORY_ACTION",
          entry.id,
          rule.severity,
          "A justified indicator cannot also require removal.",
        ),
      );
    }
  }

  for (const rule of rules.indicators) {
    if (!seen.has(rule.id)) {
      issues.push(
        makeIssue(
          "UNDECLARED_INDICATOR",
          rule.id,
          rule.severity,
          `Indicator ${rule.id} "${rule.name}" is not accounted for. Declare it with detected: false when absent.`,
        ),
      );
    }
  }

  const verdict = issues.length === 0 ? "pass" : "fail";
  if (review.verdict !== verdict) {
    issues.push(
      makeIssue(
        "VERDICT_MISMATCH",
        null,
        "medium",
        `Review declares verdict "${review.verdict}" but the violations compute "${verdict}".`,
      ),
    );
  }

  const finalVerdict = issues.length === 0 ? "pass" : "fail";
  const bySeverity = { high: 0, medium: 0, low: 0 };
  for (const issue of issues) {
    bySeverity[issue.severity] += 1;
  }

  return {
    verdict: finalVerdict,
    issues,
    summary: {
      indicatorsReviewed: rules.indicators.length,
      declared: entries.length,
      detected,
      justified: justifiedClaims,
      violations: issues.length,
      bySeverity,
    },
  };
}

function escapeCell(value) {
  return String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "\\|");
}

/**
 * Render the review as a Markdown table. Pipes in cell text are escaped so the
 * table stays parseable.
 *
 * @param {object} review
 * @returns {string}
 */
export function summariseReview(review) {
  if (!review || typeof review !== "object") {
    throw new TypeError("Anti-slop review must be a JSON object.");
  }

  const lines = [
    "| Indicator | Detected pattern | Evidence in reference | Justified | Required action |",
    "| --- | --- | --- | --- | --- |",
  ];

  for (const entry of Array.isArray(review.indicators) ? review.indicators : []) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      lines.push("| Invalid entry | Invalid entry | None | No | remove |");
      continue;
    }

    const isDetected = entry.detected === true;
    const evidence = [];

    if (Array.isArray(entry.referenceEvidence)) {
      evidence.push(...entry.referenceEvidence.filter(isNonEmptyString));
    }
    if (isNonEmptyString(entry.designSystemReference)) {
      evidence.push(`Design system: ${entry.designSystemReference}`);
    }
    if (isNonEmptyString(entry.requirementReference)) {
      evidence.push(`Requirement: ${entry.requirementReference}`);
    }

    lines.push(
      `| ${escapeCell(entry.id)} | ${escapeCell(isDetected ? entry.pattern || "Detected" : "Not detected")} | ${escapeCell(evidence.length > 0 ? evidence.join("; ") : "None")} | ${isDetected ? (entry.justified === true ? "Yes" : "No") : "Not applicable"} | ${escapeCell(isDetected ? entry.action || "None" : "None")} |`,
    );
  }

  return lines.join("\n");
}
