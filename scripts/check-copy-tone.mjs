#!/usr/bin/env node
/**
 * check-copy-tone.mjs — copy guardrail for AI-slop phrasing.
 *
 * Scans marketing / landing copy (files or an inline string) through the
 * dependency-free detectAISlop detector and prints a report. Exits non-zero
 * when any scanned unit is graded at or above the threshold, so it can gate a
 * commit, a CI job, or an agent writing copy.
 *
 * It is a SCORE + REPORT tool by design: it never rewrites copy. A human (or
 * agent) reads the flags and rephrases.
 *
 * Usage:
 *   node scripts/check-copy-tone.mjs ../README.md
 *   node scripts/check-copy-tone.mjs --text "Unleash the power of your stack."
 *   node scripts/check-copy-tone.mjs ../src/ToolsLanding.jsx --min minor
 *   node scripts/check-copy-tone.mjs --text "Real measured savings." --strict
 */
import { readFileSync } from "node:fs";
import { detectAISlop } from "../shared/lib/detectAISlop.js";

// Fail at or above this grade. --min accepts: clean|minor|sloppy|slop
const GRADE_ORDER = ["clean", "minor", "sloppy", "slop"];
let minFail = "sloppy";
let textArg = null;
const files = [];
const args = process.argv.slice(2);

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--text") {
    textArg = args[++i];
  } else if (a === "--min") {
    const v = (args[++i] || "").toLowerCase();
    if (GRADE_ORDER.includes(v)) minFail = v;
    else {
      console.error(`Unknown --min grade "${args[i]}". Use one of: ${GRADE_ORDER.join("|")}`);
      process.exit(2);
    }
  } else if (a === "--strict") {
    minFail = "minor";
  } else if (a === "--help" || a === "-h") {
    console.log(
      "Usage: node scripts/check-copy-tone.mjs <file...> | --text \"...\" [--min clean|minor|sloppy|slop] [--strict]"
    );
    process.exit(0);
  } else {
    files.push(a);
  }
}

const units = [];
if (textArg != null) units.push({ name: "<text>", body: textArg });
for (const f of files) {
  try {
    units.push({ name: f, body: readFileSync(f, "utf8") });
  } catch (err) {
    console.error(`Cannot read "${f}": ${err.code || err.message}`);
    process.exit(2);
  }
}

if (units.length === 0) {
  console.error("No input. Provide at least one file, or --text \"...\".");
  process.exit(2);
}

let failed = false;
for (const u of units) {
  const result = detectAISlop(u.body);
  const failIndex = GRADE_ORDER.indexOf(minFail);
  const thisIndex = GRADE_ORDER.indexOf(result.verdict);
  const isFail = thisIndex >= failIndex && thisIndex > GRADE_ORDER.indexOf("clean");

  console.log(`\n${isFail ? "❌" : "✅"} ${u.name}`);
  console.log(`    score=${result.score}  verdict=${result.verdict}  (fail at >= ${minFail})`);
  if (result.details.length === 0) {
    console.log("    no AI-slop patterns flagged.");
    continue;
  }
  for (const d of result.details) {
    console.log(`    [${d.category}] ${d.label} ×${d.matches.length} (+${d.subtotal})`);
    for (const m of d.matches.slice(0, 6)) {
      console.log(`        "…${m.trim()}…"`);
    }
    if (d.matches.length > 6) console.log(`        …and ${d.matches.length - 6} more`);
  }
  if (isFail) failed = true;
}

console.log(failed ? "\nCopy contains AI-slop phrasing above threshold." : "\nNo failing AI-slop phrasing detected.");
process.exit(failed ? 1 : 0);
