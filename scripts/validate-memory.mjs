#!/usr/bin/env node
// CLI for the Kumite Design Memory Map validator.
// Usage: node scripts/validate-memory.mjs <file> [--json]

import fs from "node:fs";
import path from "node:path";
import { validateDesignMemory } from "./lib/design-memory.mjs";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const file = args.find((argument) => !argument.startsWith("--"));

if (!file) {
  console.error("Usage: node scripts/validate-memory.mjs <file> [--json]");
  process.exit(1);
}

let map;
try {
  map = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
} catch (error) {
  const message =
    error instanceof SyntaxError
      ? `Invalid JSON: ${error.message}`
      : `Cannot read file: ${error.message}`;
  if (asJson) {
    console.log(
      JSON.stringify(
        {
          file,
          valid: false,
          errors: [{ code: "FILE_READ_ERROR", path: "$", message }],
          warnings: [],
        },
        null,
        2,
      ),
    );
  } else {
    console.error(`Cannot validate ${file}`);
    console.error(message);
  }
  process.exit(1);
}

const result = validateDesignMemory(map);

if (asJson) {
  console.log(JSON.stringify({ file, ...result }, null, 2));
} else {
  printReport(file, map, result);
}

process.exit(result.valid ? 0 : 1);

function printReport(target, value, outcome) {
  const identity = value?.source?.identity ?? {};
  const title =
    identity.title && typeof identity.title.value === "string"
      ? identity.title.value
      : "(untitled source)";

  console.log(`Design Memory Map: ${value?.mapId ?? "(missing mapId)"}`);
  console.log(
    `Schema version: ${value?.schemaVersion ?? "(missing)"} | Source: ${title} [${value?.source?.sourceType ?? "unknown"}]`,
  );
  console.log(`File: ${target}`);
  console.log(
    `Status: ${outcome.valid ? "VALID" : "INVALID"} (${outcome.errors.length} error(s), ${outcome.warnings.length} warning(s))`,
  );

  if (outcome.errors.length > 0) {
    console.log("\nErrors");
    outcome.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. [${error.code}] ${error.path}`);
      console.log(`     ${error.message}`);
    });
  }

  if (outcome.warnings.length > 0) {
    console.log("\nWarnings");
    outcome.warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. [${warning.code}] ${warning.path}`);
      console.log(`     ${warning.message}`);
    });
  }
}
