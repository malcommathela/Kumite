#!/usr/bin/env node
/**
 * Compare reference evidence with an implementation manifest.
 *
 * Usage:
 *   node _shared/scripts/fidelity-check.mjs <reference.json> <implementation.json> [--json]
 *
 * The reference record needs `sections`; `components` and `images` are optional.
 * Exit 0 means no high or medium finding; exit 1 means at least one; exit 2 means
 * the input could not be read.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { compareDesign, toMarkdownReport } from './lib/fidelity.mjs';

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const files = args.filter((argument) => !argument.startsWith('--'));
  if (files.length !== 2) {
    console.error('Usage: node _shared/scripts/fidelity-check.mjs <reference.json> <implementation.json> [--json]');
    process.exit(2);
  }

  let reference;
  let implementation;
  try {
    reference = await readJson(files[0]);
    implementation = await readJson(files[1]);
  } catch (error) {
    console.error(`Could not read input: ${error.message}`);
    process.exit(2);
  }

  let result;
  try {
    result = compareDesign(reference, implementation);
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(toMarkdownReport(result, { subject: implementation.name ?? path.basename(files[1]) }));
  }
  process.exit(result.summary.verdict === 'pass' ? 0 : 1);
}

main();
