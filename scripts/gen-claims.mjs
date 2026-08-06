/**
 * gen-claims.mjs — generate src/data/claims.json from the live test suite.
 *
 * The landing page badge ("558+ Passing Tests") must never be hand-edited
 * again: this script runs `jest --json`, writes the authoritative counts,
 * and CI fails if the checked-in file is stale (git diff after run).
 *
 * Usage: node scripts/gen-claims.mjs [--check]
 *   --check  exit 1 if claims.json differs from what jest reports (CI gate)
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const claimsPath = join(root, "src", "data", "claims.json");
const checkOnly = process.argv.includes("--check");

// Run jest with JSON reporter. Mirrors the package.json test invocation
// (jest --runInBand). Capture the JSON summary from stdout.
let summary;
try {
  const stdout = execFileSync(
    "npx",
    ["jest", "--json", "--runInBand", "--silent"],
    { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 600000 }
  );
  // jest --json prints the JSON blob after any banner noise — take the
  // first line that parses as the reporter payload.
  const lines = stdout.split("\n");
  let payload = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed.numTotalTests === "number") { payload = parsed; break; }
    } catch { /* not json */ }
  }
  if (!payload) {
    console.error("gen-claims: could not parse jest JSON output");
    process.exit(1);
  }
  summary = payload;
} catch (err) {
  // jest exits nonzero on test failure but still emits JSON on stdout —
  // parse it so the claim still reflects reality, but flag the failure.
  console.error("gen-claims: jest exited nonzero — claims reflect the failing suite:", err.status);
  const stdout = err.stdout || "";
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed.numTotalTests === "number") { summary = parsed; break; }
    } catch { /* not json */ }
  }
  if (!summary) {
    console.error("gen-claims: could not parse jest JSON output on failure");
    process.exit(1);
  }
}

const claims = {
  testCount: summary.numTotalTests,
  suiteCount: summary.numTotalTestSuites,
  generatedAt: new Date().toISOString(),
};

const rendered = JSON.stringify(claims, null, 2) + "\n";

let existing = null;
try {
  existing = existsSync(claimsPath) ? JSON.parse(readFileSync(claimsPath, "utf8")) : null;
} catch { existing = null; }

const countsMatch =
  existing &&
  existing.testCount === claims.testCount &&
  existing.suiteCount === claims.suiteCount;

if (countsMatch) {
  console.log(`gen-claims: claims.json up to date (${claims.testCount} tests / ${claims.suiteCount} suites)`);
  process.exit(0);
}

if (checkOnly) {
  console.error(
    `gen-claims: STALE claims.json (file: ${existing ? existing.testCount + "/" + existing.suiteCount : "missing"}, suite: ${claims.testCount}/${claims.suiteCount}) — run \`node scripts/gen-claims.mjs\` and commit the update`
  );
  process.exit(1);
}

writeFileSync(claimsPath, rendered);
console.log(`gen-claims: wrote ${claims.testCount} tests / ${claims.suiteCount} suites → src/data/claims.json`);
