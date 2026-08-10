/**
 * validate-eval-integrity.mjs — CI gate for routing-eval label integrity.
 *
 * Prevents a recurrence of the measurement contamination fixed in b2ed578:
 * stale display labels ("Coding Hinge" → "The Engineer") and phantom routes
 * (the unimplemented "Fact Check") silently invalidated router-accuracy
 * numbers. The eval label maps are now centralized in src/__eval__/evalLabelMap.js;
 * this gate validates the terminal value of every chain:
 *
 *   eval fixture category → display label → canonical category → fingerprint route id
 *
 * against the REAL catalog in data/fingerprints.json. A canonical category
 * that maps to no fingerprint route is a hard CI failure unless it is declared
 * in EXCLUDED_CATEGORIES with a reason.
 *
 * It also greps each routing-eval test file to confirm it imports the shared
 * registry instead of defining its own local label map — if a future eval
 * reintroduces a private map, the gate fails with an actionable message.
 *
 * Usage: node scripts/validate-eval-integrity.mjs [--check]
 *   --check  exit 1 on any integrity issue (CI gate)
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  validateEvalIntegrity,
  CATEGORY_TO_ROUTE_ID,
  EXCLUDED_CATEGORIES,
} from "../src/__eval__/evalLabelMap.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fingerprintsPath = join(root, "data", "fingerprints.json");
const evalDir = join(root, "src", "__eval__");
const checkOnly = process.argv.includes("--check");

const EVAL_FILES = [
  "routingEval.test.js",
  "routingEvalML.test.js",
  "routingEvalBlind.test.js",
  "routingEvalFinal.test.js",
  "routingEvalBlindV3.test.js",
];

const issues = [];

// ── 1. Chain validation against the real fingerprint catalog ────────────────
if (!existsSync(fingerprintsPath)) {
  issues.push({ type: "error", message: "data/fingerprints.json not found." });
} else {
  let fingerprints;
  try {
    fingerprints = JSON.parse(readFileSync(fingerprintsPath, "utf-8"));
  } catch (e) {
    issues.push({ type: "error", message: `cannot parse fingerprints.json: ${e.message}` });
    fingerprints = [];
  }
  issues.push(...validateEvalIntegrity(Array.isArray(fingerprints) ? fingerprints : []));
}

// ── 2. Evals must consume the shared registry, not define private maps ──────
for (const file of EVAL_FILES) {
  const abs = join(evalDir, file);
  if (!existsSync(abs)) {
    issues.push({ type: "warning", message: `expected eval file ${file} not found — list may be stale.` });
    continue;
  }
  const src = readFileSync(abs, "utf-8");

  const importsRegistry = /from\s+["'].*evalLabelMap["']/.test(src);
  const privateMap =
    /const\s+(map|LABEL_MAP|labelMap)\s*=\s*\{/.test(src) ||
    /function\s+normalizeLabel/.test(src);

  if (!importsRegistry) {
    issues.push({
      type: "error",
      message:
        `${file} does not import the shared label registry (evalLabelMap). ` +
        `Private label maps are the exact drift source this gate exists to prevent.`,
    });
  }
  if (privateMap) {
    issues.push({
      type: "error",
      message:
        `${file} still defines a private normalizeLabel/LABEL_MAP. Replace it with ` +
        `import { normalizeLabel } from "./evalLabelMap".`,
    });
  }
}

// ── 3. Report ───────────────────────────────────────────────────────────────
const errors = issues.filter((i) => i.type === "error");
const warnings = issues.filter((i) => i.type === "warning");

if (issues.length === 0) {
  console.log("eval-integrity: healthy — every eval label chain terminates at a real fingerprint route.");
  console.log(`  canonical categories: ${Object.keys(CATEGORY_TO_ROUTE_ID).length}`);
  console.log(`  excluded (route_not_implemented): ${Object.keys(EXCLUDED_CATEGORIES).join(", ") || "(none)"}`);
  process.exit(0);
}

console.error("");
console.error("ROUTING EVAL INTEGRITY FAILURE");
console.error("═══════════════════════════════");
for (const issue of [...errors, ...warnings]) {
  console.error(`[${issue.type.toUpperCase()}] ${issue.message}`);
}
console.error("");
console.error("Accuracy measurements cannot be considered valid until resolved.");
console.error("Either:");
console.error("  1. add the missing route to data/fingerprints.json, or");
console.error("  2. declare it in EXCLUDED_CATEGORIES with reason: route_not_implemented, or");
console.error("  3. restore the intentional label mapping / legacy alias in evalLabelMap.js.");
console.error("");
console.error(`  eval files that must import the shared registry:`);
for (const f of EVAL_FILES) console.error(`    - ${f}`);
if (checkOnly || errors.length > 0) {
  process.exit(1);
}
process.exit(0);
