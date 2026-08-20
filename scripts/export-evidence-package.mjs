/**
 * export-evidence-package.mjs
 *
 * Emits a single, self-contained, machine-readable JSON evidence package
 * for third-party auditing and independent reproduction.
 *
 * Runs a fresh test runner execution and verifies all claims live.
 *
 * Usage: tsx scripts/export-evidence-package.mjs [--output <path>]
 */

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { verifyAll } from "../src/lib/claimGateway.ts";
import "../src/__eval__/claimRegistry.ts";
import { buildPool, computeRouterScores } from "../src/__eval__/hingeCalibrationDebate.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// 1. Git metadata
let gitCommit = "unknown";
let gitBranch = "unknown";
try {
  gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  gitBranch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
} catch {}

// 2. Fresh test runner execution (authoritative proof)
console.log("evidence-pack: executing fresh test suite run via jest --json...");
const startTime = Date.now();
let jestSummary = null;
let jestExitStatus = 0;
try {
  const stdout = execFileSync(
    "npx",
    ["jest", "--json", "--runInBand", "--silent"],
    { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 600000 }
  );
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed.numTotalTests === "number") {
        jestSummary = parsed;
        break;
      }
    } catch {}
  }
} catch (err) {
  jestExitStatus = err.status || 1;
  const stdout = err.stdout || "";
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed.numTotalTests === "number") {
        jestSummary = parsed;
        break;
      }
    } catch {}
  }
}
const durationMs = Date.now() - startTime;

if (!jestSummary) {
  console.error("evidence-pack: could not parse jest JSON output");
  process.exit(1);
}

// 3. Feynman Gate verified claims with explicit availability semantics
const verifiedReports = verifyAll();
const evaluatedReports = verifiedReports.filter((r) => r.computed !== null);
const unavailableReports = verifiedReports.filter((r) => r.computed === null);
const passingEvaluated = evaluatedReports.filter((r) => r.pass);

const feynmanGateSummary = {
  registeredClaims: verifiedReports.length,
  evaluatedClaims: evaluatedReports.length,
  passingEvaluatedClaims: passingEvaluated.length,
  unavailableClaims: unavailableReports.length,
  gateStatus: evaluatedReports.length === 0 ? "NO_RUNTIME_DATA" : passingEvaluated.length === evaluatedReports.length ? "PASS" : "WARN",
  reports: verifiedReports.map((r) => ({
    claimId: r.claimId,
    title: r.title,
    category: r.category,
    status: r.computed === null ? "UNAVAILABLE_NO_DATA" : r.pass ? "PASS" : "FAIL",
    severity: r.severity,
    computed: r.computed,
    reason: r.reason,
    source: r.source,
  })),
};

// 4. Pooled benchmark accuracy
const pool = buildPool();
const scored = computeRouterScores(pool);
const correctCount = scored.filter((e) => e.routedLabel === e.domain).length;
const benchmarkAccuracy = Number(((correctCount / scored.length) * 100).toFixed(1));

// 5. Epistemic provenance taxonomy
const epistemicCatalog = [
  {
    metric: "Router Benchmark Accuracy",
    claimedValue: "60–80% deterministic accuracy on pooled calibration corpus",
    epistemicTier: "Observed & Replayed",
    dataset: "Pooled calibration corpus combining held-out Blind V1, Blind V2, V3, and semantic benchmark fixtures",
    uniqueScoredSamples: scored.length,
    producingCode: "src/__eval__/hingeCalibrationDebate.js (buildPool + computeRouterScores)",
    measured: `${correctCount}/${scored.length} = ${benchmarkAccuracy}%`,
    reproductionCommand: "npm test -- src/__eval__/claimsSync.test.js",
  },
  {
    metric: "Synthetic Demo Replay Savings",
    claimedValue: "-85.7% vs always-premium baseline",
    epistemicTier: "Replayed",
    dataset: "9-request synthetic demo corpus",
    producingCode: "src/lib/nightShiftRouter.ts",
    reproductionCommand: "npm test -- src/ToolsLanding.test.jsx",
  },
  {
    metric: "Provider-Price Stress Test Savings",
    claimedValue: "91.2% (active free-tier) / 81.1% (all-paid commercial)",
    epistemicTier: "Modeled Counterfactual",
    dataset: "Scenario analysis matrix",
    producingCode: "src/lib/providerSensitivity.test.ts",
    reproductionCommand: "npm test -- src/lib/providerSensitivity.test.ts",
  },
  {
    metric: "Prompt-Freeze Development Cache Ratio",
    claimedValue: "88.0% reconstructed effective cache ratio (136.2M / 154.7M input tokens)",
    sampleSize: "N=1,500 reconstructed model turns",
    epistemicTier: "Reconstructed Development Telemetry",
    reconciliationStatus: "pending_provider_billing",
    producingCode: "scripts/aggregate_telemetry.py",
    reproductionCommand: "python3 scripts/aggregate_telemetry.py",
    policyDoc: "docs/CACHING_RULES.md",
  },
  {
    metric: "Decision Store Ring Buffer Cap",
    claimedValue: "200 entries maximum enforced",
    epistemicTier: "Observed",
    dataset: "Local client ring-buffer storage",
    producingCode: "src/lib/decisionStore.ts",
    reproductionCommand: "npm test -- src/lib/decisionStore.test.ts",
  },
];

const evidencePackage = {
  $schema: "https://rei.ai/schemas/evidence-package-v1.json",
  metadata: {
    generatedAt: new Date().toISOString(),
    gitCommit,
    gitBranch,
    nodeVersion: process.version,
    platform: process.platform,
  },
  freshTestRunnerExecution: {
    executedAt: new Date().toISOString(),
    durationMs,
    exitCode: jestExitStatus,
    status: jestSummary.success && jestExitStatus === 0 ? "PASS" : "FAIL",
    totalSuites: jestSummary.numTotalTestSuites,
    passedSuites: jestSummary.numPassedTestSuites,
    failedSuites: jestSummary.numFailedTestSuites,
    totalTests: jestSummary.numTotalTests,
    passedTests: jestSummary.numPassedTests,
    failedTests: jestSummary.numFailedTests,
  },
  routerBenchmark: {
    dataset: "Pooled calibration corpus",
    uniqueScoredSamples: scored.length,
    correctRoutes: correctCount,
    measuredAccuracyPct: benchmarkAccuracy,
    claimedRange: "60–80%",
    status: benchmarkAccuracy >= 60 && benchmarkAccuracy <= 80 ? "PASS" : "WARN",
  },
  feynmanGate: feynmanGateSummary,
  epistemicProvenance: epistemicCatalog,
};

const outputArgIdx = process.argv.indexOf("--output");
const outputPath = outputArgIdx !== -1 && process.argv[outputArgIdx + 1]
  ? join(root, process.argv[outputArgIdx + 1])
  : join(root, "docs", "evidence-package.json");

writeFileSync(outputPath, JSON.stringify(evidencePackage, null, 2) + "\n");
console.log(`evidence-pack: successfully generated evidence package → ${outputPath}`);
console.log(`  Fresh Test Run: ${jestSummary.numPassedTests}/${jestSummary.numTotalTests} passed across ${jestSummary.numTotalTestSuites} suites (${(durationMs / 1000).toFixed(1)}s)`);
console.log(`  Benchmark Accuracy: ${benchmarkAccuracy}% (${correctCount}/${scored.length} unique samples)`);
console.log(`  Feynman Gate: ${feynmanGateSummary.evaluatedClaims}/${feynmanGateSummary.registeredClaims} evaluated (${feynmanGateSummary.gateStatus})`);
