/**
 * validate-model-rates.mjs — CI gate for src/data/modelRates.json.
 *
 * Verifies modelRates.json parses, all entries have valid {input, output, ceiling}
 * numbers, and the _premium field points to an existing entry. Unlike
 * index-source.mjs this file is hand-maintained, not auto-generated — so "stale"
 * here means "structurally invalid" or "premium model reference broken."
 *
 * Usage: node scripts/validate-model-rates.mjs [--check]
 *   --check  exit 1 if modelRates.json is invalid (CI gate)
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ratesPath = join(root, "src", "data", "modelRates.json");
const checkOnly = process.argv.includes("--check");

function fail(msg) {
  console.error(`modelRates.json: ${msg}`);
  if (checkOnly) process.exit(1);
}

if (!existsSync(ratesPath)) {
  fail("file not found");
  process.exit(0);
}

let rates;
try {
  const raw = readFileSync(ratesPath, "utf-8");
  rates = JSON.parse(raw);
} catch (e) {
  fail(`invalid JSON: ${e.message}`);
}

if (!rates || typeof rates !== "object") {
  fail("not a JSON object");
}

const premium = rates._premium;
if (!premium || typeof premium !== "string") {
  fail("missing or invalid _premium field");
}

if (!rates[premium]) {
  fail(`_premium "${premium}" does not match any model entry`);
}

for (const [key, val] of Object.entries(rates)) {
  if (key === "_premium") continue;
  if (typeof val !== "object" || val === null) {
    fail(`model "${key}" is not an object`);
  }
  for (const field of ["input", "output", "ceiling"]) {
    if (typeof val[field] !== "number" || val[field] < 0) {
      fail(`model "${key}" missing or invalid field "${field}"`);
    }
  }
  if (val.ceiling !== val.input + val.output) {
    console.warn(`modelRates.json: model "${key}" ceiling (${val.ceiling}) ≠ input + output (${val.input + val.output}) — ceiling should equal sum`);
  }
}

console.log("modelRates.json: valid");
process.exit(0);
