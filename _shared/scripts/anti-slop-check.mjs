#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  DEFAULT_RULES_PATH,
  evaluateReview,
  loadRules,
  summariseReview,
} from "./lib/anti-slop.mjs";

const USAGE = `Usage: node _shared/scripts/anti-slop-check.mjs <review.json> [--rules <path>] [--json]

Evaluate an anti-slop review against _shared/references/anti-slop-rules.json.

Options:
  --rules <path>  Use an alternative rules file.
  --json          Print the machine-readable result instead of the table.
  -h, --help      Show this help.

Exit codes:
  0  Review passes.
  1  Review fails.
  2  Invalid arguments or unreadable input.`;

function parseArgs(argv) {
  let reviewPath = null;
  let rulesPath = null;
  let json = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      return { help: true };
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--rules") {
      const value = argv[index + 1];
      if (!value || value.startsWith("-")) {
        throw new Error("--rules requires a path.");
      }
      rulesPath = value;
      index += 1;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option "${arg}".`);
    }
    if (reviewPath !== null) {
      throw new Error("Only one review file may be supplied.");
    }
    reviewPath = arg;
  }

  return { help: false, reviewPath, rulesPath, json };
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 2;
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    fail(`${error.message}\n\n${USAGE}`);
    return;
  }

  if (options.help) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }
  if (!options.reviewPath) {
    fail(`Missing review file.\n\n${USAGE}`);
    return;
  }

  const reviewPath = path.resolve(process.cwd(), options.reviewPath);
  const rulesPath = options.rulesPath
    ? path.resolve(process.cwd(), options.rulesPath)
    : DEFAULT_RULES_PATH;

  let review;
  try {
    review = JSON.parse(readFileSync(reviewPath, "utf8"));
  } catch (error) {
    fail(`Unable to read review at ${reviewPath}: ${error.message}`);
    return;
  }

  let rules;
  try {
    rules = loadRules(rulesPath);
  } catch (error) {
    fail(error.message);
    return;
  }

  let result;
  try {
    result = evaluateReview(review, rules);
  } catch (error) {
    fail(error.message);
    return;
  }

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          subject: typeof review.subject === "string" ? review.subject : null,
          verdict: result.verdict,
          issues: result.issues,
          summary: result.summary,
        },
        null,
        2,
      )}\n`,
    );
  } else {
    const subject = typeof review.subject === "string" ? review.subject : reviewPath;
    process.stdout.write(`# Anti-slop review: ${subject}\n\n`);
    process.stdout.write(`${summariseReview(review)}\n\n`);

    if (result.issues.length > 0) {
      process.stdout.write(`## Issues (${result.issues.length})\n\n`);
      for (const issue of result.issues) {
        const indicator = issue.indicatorId ? ` ${issue.indicatorId}` : "";
        process.stdout.write(
          `- [${issue.severity}]${indicator} ${issue.code}: ${issue.message}\n`,
        );
      }
      process.stdout.write("\n");
    }

    process.stdout.write(`## Verdict: ${result.verdict.toUpperCase()}\n`);
  }

  process.exitCode = result.verdict === "pass" ? 0 : 1;
}

main();
