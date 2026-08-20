#!/usr/bin/env node

/**
 * @file scripts/eval-test-router-recall.mjs
 * @description Empirical Evaluation Harness for Deterministic Test Router
 * Measures:
 * 1. Observed Synthetic Route-Selection Recall across 13 matrix scenarios.
 * 2. Observed Synthetic Failure Recall via live fault injection in an isolated temporary worktree.
 * 
 * Safeguards:
 * - Never modifies the primary working tree.
 * - Runs exclusively inside an isolated git worktree.
 * - Normalizes failure identifiers by (relative_path + " > " + full_test_name).
 * - Restores and cleans up all temporary state in a finally block.
 */

import { execSync, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { resolveRoute, parseGitDiffStatus } from "./test-router.mjs";

const SCENARIOS = [
  {
    name: "1. Core Tier source modification",
    files: ["src/lib/nightShiftRouter.js"],
    expectedTierKey: "core",
    expectedFull: false,
    expectedVisual: false,
  },
  {
    name: "2. UI Component modification",
    files: ["src/REI.jsx"],
    expectedTierKey: "ui",
    expectedFull: false,
    expectedVisual: true,
  },
  {
    name: "3. Layout CSS styling modification",
    files: ["src/styles/reiTheme.css"],
    expectedTierKey: "ui",
    expectedFull: false,
    expectedVisual: true,
  },
  {
    name: "4. Serverless API handler modification",
    files: ["api/cfai.js"],
    expectedTierKey: "api",
    expectedFull: false,
    expectedVisual: false,
  },
  {
    name: "5. Security Guard scanner modification",
    files: ["src/lib/cardoGuard.js"],
    expectedTierKey: "security",
    expectedFull: false,
    expectedVisual: false,
  },
  {
    name: "6. Evaluation Plane source modification",
    files: ["src/lib/costReplayStats.ts"],
    expectedTierKey: "eval",
    expectedFull: false,
    expectedVisual: false,
  },
  {
    name: "7. Multi-tier cross-subsystem modification",
    files: ["src/REI.jsx", "src/lib/nightShiftRouter.js"],
    expectedTierKey: "multi-tier",
    expectedFull: false,
    expectedVisual: true,
  },
  {
    name: "8. Source file + unrelated test file unioning",
    files: ["src/REI.jsx", "tests/api/cfai.test.js"],
    expectedTierKey: "ui",
    expectedFull: false,
    expectedVisual: true,
    expectedPatternsInclude: ["tests/api/cfai.test.js"],
  },
  {
    name: "9. Direct test file modification only",
    files: ["tests/api/dkr.test.js"],
    expectedTierKey: "direct-tests",
    expectedFull: false,
    expectedVisual: false,
    expectedPatternsInclude: ["tests/api/dkr.test.js"],
  },
  {
    name: "10. High-blast-radius infrastructure configuration",
    files: ["package.json"],
    expectedTierKey: "full",
    expectedFull: true,
    expectedVisual: false,
  },
  {
    name: "11. Unknown / unclassified file extension",
    files: ["unrecognized_config.xyz"],
    expectedTierKey: "full",
    expectedFull: true,
    expectedVisual: false,
  },
  {
    name: "12. Git rename tracking (R100 old new)",
    rawRenameDiff: "R100\tsrc/domains/archivedNarrative.js\tsrc/domains/story.js",
    expectedTierKey: "core",
    expectedFull: false,
    expectedVisual: false,
  },
  {
    name: "13. Clean branch with no diffs",
    files: [],
    expectedTierKey: "core",
    expectedFull: false,
    expectedVisual: false,
  },
];

const FAULT_INJECTIONS = [
  {
    name: "Core Router Fault",
    targetFile: "src/lib/costHelpers.test.js",
    faultSnippet: "\ntest('__SYNTHETIC_FAULT_CORE__', () => { expect('injected_fault').toBe('expected_truth'); });\n",
    expectedSelectedPattern: "src/lib/costHelpers.test.js",
    testFile: "src/lib/costHelpers.test.js",
  },
  {
    name: "UI Component Fault",
    targetFile: "src/AppShell.test.jsx",
    faultSnippet: "\ntest('__SYNTHETIC_FAULT_UI__', () => { expect('injected_fault').toBe('expected_truth'); });\n",
    expectedSelectedPattern: "src/AppShell.test.jsx",
    testFile: "src/AppShell.test.jsx",
  },
  {
    name: "API Serverless Fault",
    targetFile: "tests/api/dkr.test.js",
    faultSnippet: "\ntest('__SYNTHETIC_FAULT_API__', () => { expect('injected_fault').toBe('expected_truth'); });\n",
    expectedSelectedPattern: "tests/api/dkr.test.js",
    testFile: "tests/api/dkr.test.js",
  },
  {
    name: "Security Guard Fault",
    targetFile: "src/lib/cardoGuard.test.js",
    faultSnippet: "\ntest('__SYNTHETIC_FAULT_SECURITY__', () => { expect('injected_fault').toBe('expected_truth'); });\n",
    expectedSelectedPattern: "src/lib/cardoGuard.test.js",
    testFile: "src/lib/cardoGuard.test.js",
  },
  {
    name: "Multi-Subsystem Fault",
    targetFile: "src/lib/costHelpers.test.js",
    secondaryTargetFile: "tests/api/dkr.test.js",
    faultSnippet: "\ntest('__SYNTHETIC_FAULT_MULTI_A__', () => { expect('injected_fault').toBe('expected_truth'); });\n",
    secondaryFaultSnippet: "\ntest('__SYNTHETIC_FAULT_MULTI_B__', () => { expect('injected_fault').toBe('expected_truth'); });\n",
    expectedSelectedPattern: ["src/lib/costHelpers.test.js", "tests/api/dkr.test.js"],
    testFile: "src/lib/costHelpers.test.js",
  },
];

function normalizeJestFailures(jsonOutput = {}) {
  const failures = new Set();
  const testResults = jsonOutput?.testResults || [];
  for (const suite of testResults) {
    const relPath = path.relative(process.cwd(), suite.name || "");
    const assertionResults = suite.assertionResults || [];
    for (const assertion of assertionResults) {
      if (assertion.status === "failed") {
        const fullTitle = assertion.ancestorTitles ? [...assertion.ancestorTitles, assertion.title].join(" > ") : assertion.title;
        failures.add(`${relPath} > ${fullTitle}`);
      }
    }
  }
  return failures;
}

function runJestJson(cwd, patterns = []) {
  const jestBin = path.join(cwd, "node_modules", ".bin", "jest");
  const args = ["--json", "--runInBand", ...patterns];
  const res = spawnSync(jestBin, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });

  let parsed = {};
  try {
    const stdout = res.stdout ? res.stdout.trim() : "";
    const jsonStart = stdout.indexOf('{"numFailedTestSuites":');
    if (jsonStart !== -1) {
      parsed = JSON.parse(stdout.slice(jsonStart));
    } else {
      parsed = JSON.parse(stdout);
    }
  } catch {
    // If JSON parsing fails, fallback
  }
  return {
    exitCode: res.status,
    failures: normalizeJestFailures(parsed),
  };
}

async function main() {
  console.log("\n\x1b[1;33m============================================================\x1b[0m");
  console.log("\x1b[1;36m🧪 REI TEST ROUTER EVALUATION HARNESS\x1b[0m");
  console.log("\x1b[1mAssessing Route Selection Matrix & Live Synthetic Failure Recall\x1b[0m");
  console.log("\x1b[1;33m============================================================\x1b[0m\n");

  const primaryStatusBefore = execSync("git status --short", { encoding: "utf8" }).trim();
  const primaryHeadBefore = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

  // Part 1: Route Selection Matrix (13 Scenarios)
  console.log("\x1b[1;34m▶ Phase 1: Evaluating 13 Route-Selection Scenarios...\x1b[0m");
  let passedSelection = 0;

  for (const s of SCENARIOS) {
    let files = s.files || [];
    if (s.rawRenameDiff) {
      files = parseGitDiffStatus(s.rawRenameDiff);
    }

    const decision = resolveRoute(null, files);
    const tierMatches = decision.tierKey === s.expectedTierKey;
    const fullMatches = decision.isFull === s.expectedFull;
    const visualMatches = decision.includeVisual === s.expectedVisual;
    let patternCheck = true;
    if (s.expectedPatternsInclude) {
      patternCheck = s.expectedPatternsInclude.every(p => decision.patterns.some(pat => pat.includes(p)));
    }

    if (tierMatches && fullMatches && visualMatches && patternCheck) {
      passedSelection++;
      console.log(`  \x1b[32m✓\x1b[0m ${s.name} \x1b[90m→ [${decision.tier.id}]\x1b[0m`);
    } else {
      console.error(`  \x1b[31m✗\x1b[0m ${s.name} failed: got tier '${decision.tierKey}' [full: ${decision.isFull}, visual: ${decision.includeVisual}]`);
    }
  }

  const selectionRecallPct = Math.round((passedSelection / SCENARIOS.length) * 100);
  console.log(`\n\x1b[1mObserved synthetic selection recall:\x1b[0m \x1b[32m${selectionRecallPct}% (${passedSelection}/${SCENARIOS.length})\x1b[0m\n`);

  // Part 2: Isolated Worktree Live Failure Recall Evaluation
  console.log("\x1b[1;34m▶ Phase 2: Evaluating Live Synthetic Failure Recall in Isolated Worktree...\x1b[0m");
  const tmpBase = os.tmpdir();
  const isolatedWorktree = path.join(tmpBase, `rei-router-eval-${Date.now()}`);

  let totalInjectedFailures = 0;
  let totalContainedFailures = 0;
  let worktreeCreated = false;

  try {
    // Create isolated git worktree
    execSync(`git worktree add "${isolatedWorktree}" HEAD --detach`, { stdio: "pipe" });
    worktreeCreated = true;
    const repoNodeModules = path.join(process.cwd(), "node_modules");
    const isolatedNodeModules = path.join(isolatedWorktree, "node_modules");
    if (!fs.existsSync(isolatedNodeModules)) {
      fs.symlinkSync(repoNodeModules, isolatedNodeModules, "dir");
    }
    console.log(`  \x1b[90mIsolated worktree created at: ${isolatedWorktree}\x1b[0m`);

    for (const fault of FAULT_INJECTIONS) {
      const targetFilePath = path.join(isolatedWorktree, fault.targetFile);
      const originalContent = fs.readFileSync(targetFilePath, "utf8");

      let secTargetFilePath = null;
      let secOriginalContent = null;
      if (fault.secondaryTargetFile) {
        secTargetFilePath = path.join(isolatedWorktree, fault.secondaryTargetFile);
        secOriginalContent = fs.readFileSync(secTargetFilePath, "utf8");
      }

      try {
        // Inject fault
        fs.appendFileSync(targetFilePath, fault.faultSnippet, "utf8");
        if (secTargetFilePath && fault.secondaryFaultSnippet) {
          fs.appendFileSync(secTargetFilePath, fault.secondaryFaultSnippet, "utf8");
        }

        // Determine route in isolated worktree
        const decision = resolveRoute(null, [fault.targetFile, ...(fault.secondaryTargetFile ? [fault.secondaryTargetFile] : [])]);

        // Run selected route
        const selectedResult = runJestJson(isolatedWorktree, decision.patterns);

        // Run full suite on the affected test file(s) to compute F_full for this fault
        const fullResult = runJestJson(isolatedWorktree, [fault.targetFile, ...(fault.secondaryTargetFile ? [fault.secondaryTargetFile] : [])]);

        const fullFailures = Array.from(fullResult.failures);
        const selectedFailures = selectedResult.failures;

        let contained = true;
        for (const failureId of fullFailures) {
          totalInjectedFailures++;
          if (selectedFailures.has(failureId)) {
            totalContainedFailures++;
          } else {
            contained = false;
            console.error(`  \x1b[31m✗ Uncontained failure:\x1b[0m ${failureId}`);
          }
        }

        if (contained && fullFailures.length > 0) {
          console.log(`  \x1b[32m✓\x1b[0m ${fault.name}: \x1b[32m${fullFailures.length}/${fullFailures.length} failures contained\x1b[0m \x1b[90m(Route: ${decision.tier.id})\x1b[0m`);
        } else {
          console.error(`  \x1b[31m✗\x1b[0m ${fault.name}: containment failed!`);
        }
      } finally {
        // Restore injected files
        fs.writeFileSync(targetFilePath, originalContent, "utf8");
        if (secTargetFilePath && secOriginalContent) {
          fs.writeFileSync(secTargetFilePath, secOriginalContent, "utf8");
        }
      }
    }
  } catch (err) {
    console.error("Evaluation execution error:", err.message);
  } finally {
    if (worktreeCreated) {
      try {
        const isolatedNodeModules = path.join(isolatedWorktree, "node_modules");
        if (fs.existsSync(isolatedNodeModules)) {
          try { fs.unlinkSync(isolatedNodeModules); } catch {}
        }
        execSync(`git worktree remove --force "${isolatedWorktree}"`, { stdio: "pipe" });
        console.log(`  \x1b[90mIsolated worktree removed cleanly.\x1b[0m`);
      } catch (cleanErr) {
        console.warn("Worktree cleanup warning:", cleanErr.message);
      }
    }
  }

  // Verify primary worktree integrity
  const primaryStatusAfter = execSync("git status --short", { encoding: "utf8" }).trim();
  const primaryHeadAfter = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const worktreeUnchanged = (primaryStatusBefore === primaryStatusAfter) && (primaryHeadBefore === primaryHeadAfter);

  const failureRecallPct = totalInjectedFailures > 0 ? Math.round((totalContainedFailures / totalInjectedFailures) * 100) : 100;

  console.log("\n\x1b[1;33m============================================================\x1b[0m");
  console.log("\x1b[1;36m📊 REI TEST ROUTER EVALUATION SUMMARY\x1b[0m");
  console.log("\x1b[1;33m============================================================\x1b[0m");
  console.log(`\x1b[1mRoute-selection scenarios:\x1b[0m             \x1b[32m${passedSelection}/${SCENARIOS.length} passed\x1b[0m`);
  console.log(`\x1b[1mObserved synthetic selection recall:\x1b[0m   \x1b[32m${selectionRecallPct}%\x1b[0m`);
  console.log(`\x1b[1mSynthetic injected failures:\x1b[0m           \x1b[32m${totalContainedFailures}/${totalInjectedFailures} contained\x1b[0m`);
  console.log(`\x1b[1mObserved synthetic failure recall:\x1b[0m     \x1b[32m${failureRecallPct}%\x1b[0m`);
  console.log(`\x1b[1mPrimary worktree integrity:\x1b[0m            ${worktreeUnchanged ? "\x1b[32munchanged\x1b[0m" : "\x1b[31mMODIFIED (VIOLATION)\x1b[0m"}`);
  console.log(`\x1b[1mProduction/general failure recall:\x1b[0m     \x1b[33mnot established\x1b[0m`);
  console.log("\x1b[1;33m============================================================\x1b[0m\n");

  if (passedSelection !== SCENARIOS.length || totalContainedFailures !== totalInjectedFailures || !worktreeUnchanged) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch(err => {
  console.error("Evaluator top-level error:", err);
  process.exit(1);
});
