#!/usr/bin/env node
/**
 * Compare a Design Memory Map with an implementation manifest.
 *
 * Usage:
 *   node scripts/fidelity-check.mjs <memory.json> <implementation.json> [--json]
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
    console.error('Usage: node scripts/fidelity-check.mjs <memory.json> <implementation.json> [--json]');
    process.exit(2);
  }

  let memory;
  let implementation;
  try {
    memory = await readJson(files[0]);
    implementation = await readJson(files[1]);
  } catch (error) {
    console.error(`Could not read input: ${error.message}`);
    process.exit(2);
  }

  const result = compareDesign(memory, implementation);
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(toMarkdownReport(result, { subject: implementation.name ?? path.basename(files[1]) }));
  }
  process.exit(result.summary.verdict === 'pass' ? 0 : 1);
}

main();
