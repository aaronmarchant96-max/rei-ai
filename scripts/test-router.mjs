#!/usr/bin/env node

/**
 * @file scripts/test-router.mjs
 * @description CARDO-Inspired Deterministic Test Router
 * Classifies modified files, branch merge-bases, or developer intent into targeted test tiers,
 * prioritizing 100% failure recall and fail-closed safety over unverified speed.
 */

import { execSync, spawn } from "child_process";
import { pathToFileURL } from "url";

export const HISTORICAL_BASELINE_SECONDS = 95.42;
export const HISTORICAL_BASELINE_ENV = "Node v20.20.2 / 84 suites / 2026-08-20";

export const INFRASTRUCTURE_PATTERNS = [
  /^package\.json$/i,
  /^package-lock\.json$/i,
  /^jest\.config\.[a-z0-9]+$/i,
  /^jest\.setup\.[a-z0-9]+$/i,
  /^tsconfig\.json$/i,
  /^babel\.config\.[a-z0-9]+$/i,
  /^vite\.config\.[a-z0-9]+$/i,
  /^scripts\/test-router\.mjs$/i,
  /^scripts\/gen-claims\.mjs$/i,
  /^scripts\/validate-[a-z0-9-]+\.mjs$/i,
  /^\.env/i,
  /^\.gitlab-ci\.yml$/i,
];

export const VISUAL_LAYOUT_PATTERNS = [
  /^src\/styles?\//i,
  /\.css$/i,
  /^src\/AppShell\.jsx$/i,
  /^src\/REI\.jsx$/i,
  /^src\/modules\/rei\/components\/WelcomePanel\.jsx$/i,
  /^src\/modules\/rei\/components\/ChatInput\.jsx$/i,
  /^src\/components\/InstrumentRail\.jsx$/i,
];

export const TIERS = {
  core: {
    id: "core-router",
    label: "Core Reasoning & Router Logic",
    description: "Router, classifier, cost models, slop detection, and domain matchers",
    estimatedSeconds: 4,
    patterns: [
      "src/lib/nightShiftRouter.test.js",
      "src/lib/hingeClassifier.test.js",
      "src/lib/costHelpers.test.js",
      "src/domains/_index.test.js",
      "src/lib/persistentContextEngine.test.js",
      "src/lib/fileExtractor.test.js",
      "src/lib/deRoboticize.test.js",
      "src/lib/detectAISlop.test.js",
      "src/lib/sourceContext.test.ts",
      "src/lib/selfAuditContext.test.ts",
      "src/lib/deliveryIntegrityGate.test.ts",
      "src/lib/gatewayConcurrency.test.js",
      "src/__eval__/archivistAdherenceEval.test.js",
    ],
    fileMatches: [
      /^src\/lib\/(?:nightShiftRouter|hingeClassifier|costHelpers|deRoboticize|detectAISlop|persistentContextEngine|fileExtractor|sourceContext|selfAuditContext|deliveryIntegrityGate|concurrencyPool|singleFlight|batchRunner|gatewayConcurrency)\.[a-z0-9]+$/i,
      /^src\/domains\//i,
      /^data\/(?:fingerprints|modelRates)\.json$/i,
      /^src\/data\//i,
    ],
  },
  ui: {
    id: "ui-workspace",
    label: "UI Components & Workspace Shell",
    description: "AppShell, REI conversation feed, controls, panels, and viewports",
    estimatedSeconds: 6,
    patterns: [
      "src/AppShell.test.jsx",
      "src/REI.test.jsx",
      "src/components/",
      "src/modules/rei/components/",
      "src/CardoGuard.test.jsx",
      "src/CreativeEngine.test.jsx",
      "src/DebateFurnace.test.jsx",
      "src/ToolsLanding.test.jsx",
      "src/Analytics.test.jsx",
    ],
    fileMatches: [
      /^src\/(?:AppShell|REI|CardoGuard|CreativeEngine|DebateFurnace|ToolsLanding|Analytics)\.jsx?$/i,
      /^src\/components\//i,
      /^src\/modules\//i,
      /^src\/styles?\//i,
      /\.css$/i,
    ],
  },
  api: {
    id: "api-serverless",
    label: "Serverless Endpoints & Gateways",
    description: "Cloudflare/Vercel serverless handlers, proxy gateways, and KV persistence",
    estimatedSeconds: 6,
    patterns: [
      "tests/api/",
      "src/lib/claimGateway.test.ts",
      "src/lib/claimHistory.test.ts",
      "src/lib/dkrClient.test.ts",
    ],
    fileMatches: [
      /^api\//i,
      /^shared\/lib\//i,
      /^tests\/api\//i,
      /^src\/lib\/(?:claimGateway|claimHistory|dkrClient)\.[a-z0-9]+$/i,
    ],
  },
  security: {
    id: "security-guard",
    label: "Adversarial Defense & CARDO Guard",
    description: "Red-team scanners, injection taxonomy, and safety escalation gates",
    estimatedSeconds: 4,
    patterns: [
      "src/lib/cardoGuard.test.js",
      "src/lib/cardoGuardChecklist.test.js",
      "src/lib/redTeamScanner.test.js",
      "src/__eval__/redTeamEval.test.js",
      "src/CardoGuard.test.jsx",
    ],
    fileMatches: [
      /^src\/lib\/(?:cardoGuard|redTeamScanner|redTeamTaxonomy)\.[a-z0-9]+$/i,
      /^src\/CardoGuard\.jsx?$/i,
    ],
  },
  eval: {
    id: "eval-replay",
    label: "Evaluation Plane & Claims Replay",
    description: "Feynman Gate, claims sync, cost replay, and longitudinal benchmarks",
    estimatedSeconds: 25,
    patterns: [
      "src/__eval__/",
      "src/lib/pilotEval.test.ts",
      "src/lib/evalLog.test.ts",
      "src/lib/costReplayStats.test.ts",
      "src/lib/evalReplayStats.test.ts",
      "src/lib/providerSensitivity.test.ts",
      "src/lib/policyProposalEngine.test.ts",
      "src/lib/policyProposalStore.test.ts",
      "src/lib/policyProposalMetrics.test.ts",
    ],
    fileMatches: [
      /^src\/__eval__\//i,
      /^src\/lib\/(?:pilotEval|evalLog|costReplayStats|evalReplayStats|providerSensitivity|policyProposal[A-Za-z]*)\.[a-z0-9]+$/i,
      /^docs\/CLAIM_LEDGER\.md$/i,
    ],
  },
};

/**
 * Parse git status / diff output with rename detection (R100 old new)
 */
export function parseGitDiffStatus(output = "") {
  const files = new Set();
  const lines = output.split("\n").map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const parts = line.split(/\t+/);
    if (parts.length >= 2) {
      const status = parts[0];
      if (status.startsWith("R") && parts.length >= 3) {
        files.add(parts[1]); // Old path
        files.add(parts[2]); // New path
      } else {
        files.add(parts[1]);
      }
    } else if (line) {
      files.add(line);
    }
  }
  return Array.from(files);
}

/**
 * Resolves changed files based on git working tree, branch merge-base, or CI base
 */
export function getGitChangedFiles(options = {}) {
  const baseOverride = options.base || process.env.TEST_ROUTER_BASE_REF;
  const execOpts = { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] };

  try {
    // 1. Dirty Working Tree check
    const diffHead = execSync("git diff HEAD --name-status -M", execOpts);
    const untracked = execSync("git ls-files --others --exclude-standard", execOpts);
    const dirtyFiles = new Set([
      ...parseGitDiffStatus(diffHead),
      ...untracked.split("\n").map(s => s.trim()).filter(Boolean),
    ]);

    if (dirtyFiles.size > 0) {
      return {
        files: Array.from(dirtyFiles),
        source: "working-tree-dirty",
        baseRef: "HEAD",
      };
    }

    // 2. Clean worktree: Resolve merge-base
    let candidateBase = baseOverride;
    if (!candidateBase) {
      const ciBase = process.env.GITHUB_BASE_REF || process.env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME;
      if (ciBase) {
        try {
          execSync(`git rev-parse --verify ${ciBase}`, execOpts);
          candidateBase = ciBase;
        } catch {
          // Unresolvable CI base ref
        }
      }
    }

    if (!candidateBase) {
      for (const target of ["origin/main", "main"]) {
        try {
          execSync(`git rev-parse --verify ${target}`, execOpts);
          candidateBase = target;
          break;
        } catch {}
      }
    }

    let currentHead = "";
    try {
      currentHead = execSync("git rev-parse HEAD", execOpts).trim();
    } catch {}

    if (candidateBase) {
      let mergeBase = "";
      try {
        mergeBase = execSync(`git merge-base ${candidateBase} HEAD`, execOpts).trim();
      } catch {
        mergeBase = "";
      }

      if (mergeBase && mergeBase !== currentHead) {
        const branchDiff = execSync(`git diff ${mergeBase}...HEAD --name-status -M`, execOpts);
        const branchFiles = parseGitDiffStatus(branchDiff);
        if (branchFiles.length > 0) {
          return {
            files: branchFiles,
            source: "branch-merge-base",
            baseRef: `${mergeBase.slice(0, 8)}...HEAD (${candidateBase})`,
          };
        }
      }

      if (mergeBase && mergeBase === currentHead) {
        return {
          files: [],
          source: "clean-upstream-equal",
          baseRef: candidateBase,
        };
      }
    }

    // 3. Feature branch with unresolvable base: fail closed
    let currentBranch = "";
    try {
      currentBranch = execSync("git branch --show-current", execOpts).trim();
    } catch {}

    if (currentBranch && currentBranch !== "main" && currentBranch !== "master") {
      return {
        files: ["__UNRESOLVABLE_FEATURE_BRANCH_BASE__"],
        source: "unresolvable-feature-branch",
        baseRef: null,
      };
    }

    return {
      files: [],
      source: "clean-no-diff",
      baseRef: candidateBase || "HEAD",
    };
  } catch {
    return {
      files: [],
      source: "git-error-fallback",
      baseRef: null,
    };
  }
}

/**
 * Pure deterministic route resolver
 */
export function resolveRoute(targetArg = null, changedFiles = [], options = {}) {
  const normalizedTarget = targetArg ? String(targetArg).toLowerCase().trim() : null;

  // 1. Explicit full / gate
  if (normalizedTarget === "full" || normalizedTarget === "gate" || normalizedTarget === "all") {
    return {
      tierKey: "full",
      tier: {
        id: "full-gate",
        label: "Full Repository Verification Gate",
        description: "Executes the complete Jest suite discovered at runtime, followed by claims verification",
        estimatedSeconds: HISTORICAL_BASELINE_SECONDS,
      },
      reason: "Explicit command-line target: 'full'",
      patterns: [],
      includeVisual: false,
      isVisualOnly: false,
      isFull: true,
      matchedFiles: [],
      directTestFiles: [],
    };
  }

  // 2. Explicit visual / layout
  if (normalizedTarget === "visual" || normalizedTarget === "layout") {
    return {
      tierKey: "visual",
      tier: {
        id: "visual-layout",
        label: "Visual Browser Invariants (Playwright)",
        description: "Viewport containment, single-scroll ownership, 100dvh, and responsive layout",
        estimatedSeconds: 10,
      },
      reason: "Explicit command-line target: 'visual'",
      patterns: [],
      includeVisual: true,
      isVisualOnly: true,
      isFull: false,
      matchedFiles: [],
      directTestFiles: [],
    };
  }

  // 3. Explicit UI target: Compositional (UI Jest + Playwright Visual)
  if (normalizedTarget === "ui") {
    return {
      tierKey: "ui",
      tier: TIERS.ui,
      reason: "Explicit command-line target: 'ui' (compositional: UI Jest + Playwright layout suite)",
      patterns: [...TIERS.ui.patterns],
      includeVisual: true,
      isVisualOnly: false,
      isFull: false,
      matchedFiles: [],
      directTestFiles: [],
    };
  }

  // 4. Explicit named tier
  if (normalizedTarget && TIERS[normalizedTarget]) {
    const tier = TIERS[normalizedTarget];
    return {
      tierKey: normalizedTarget,
      tier,
      reason: `Explicit command-line target: '${normalizedTarget}'`,
      patterns: [...tier.patterns],
      includeVisual: false,
      isVisualOnly: false,
      isFull: false,
      matchedFiles: [],
      directTestFiles: [],
    };
  }

  // 5. Custom pattern / path argument
  if (normalizedTarget && normalizedTarget !== "diff" && normalizedTarget !== "auto") {
    return {
      tierKey: "custom",
      tier: {
        id: "custom-pattern",
        label: "Targeted Path Pattern",
        description: `Direct pattern: ${targetArg}`,
        estimatedSeconds: 3,
      },
      reason: `Direct pattern argument: '${targetArg}'`,
      patterns: [targetArg],
      includeVisual: false,
      isVisualOnly: false,
      isFull: false,
      matchedFiles: [],
      directTestFiles: [],
    };
  }

  // 6. Clean branch with unresolvable base: fail closed to full-gate
  if (changedFiles.includes("__UNRESOLVABLE_FEATURE_BRANCH_BASE__")) {
    return {
      tierKey: "full",
      tier: {
        id: "full-gate",
        label: "Full Repository Verification Gate",
        description: "Executes the complete Jest suite discovered at runtime, followed by claims verification",
        estimatedSeconds: HISTORICAL_BASELINE_SECONDS,
      },
      reason: "Unresolvable merge-base on feature branch; failing closed to full suite",
      patterns: [],
      includeVisual: false,
      isVisualOnly: false,
      isFull: true,
      matchedFiles: ["__UNRESOLVABLE_FEATURE_BRANCH_BASE__"],
      directTestFiles: [],
    };
  }

  // 7. No changed files detected: default to fast core reasoning sanity run
  if (changedFiles.length === 0) {
    return {
      tierKey: "core",
      tier: TIERS.core,
      reason: "No working tree or branch diff detected — running core reasoning sanity route",
      patterns: [...TIERS.core.patterns],
      includeVisual: false,
      isVisualOnly: false,
      isFull: false,
      matchedFiles: [],
      directTestFiles: [],
    };
  }

  // 8. Fail-Closed Check: Infrastructure or build files
  const infraMatches = changedFiles.filter(f => INFRASTRUCTURE_PATTERNS.some(rx => rx.test(f)));
  if (infraMatches.length > 0) {
    return {
      tierKey: "full",
      tier: {
        id: "full-gate",
        label: "Full Repository Verification Gate",
        description: "Executes the complete Jest suite discovered at runtime, followed by claims verification",
        estimatedSeconds: HISTORICAL_BASELINE_SECONDS,
      },
      reason: `High-blast-radius infrastructure change (${infraMatches.slice(0, 3).join(", ")}) — failing closed to full gate`,
      patterns: [],
      includeVisual: false,
      isVisualOnly: false,
      isFull: true,
      matchedFiles: infraMatches,
      directTestFiles: [],
    };
  }

  // 9. Separate direct test files vs source files
  const directTestFiles = [];
  const sourceFiles = [];

  for (const file of changedFiles) {
    if (/\.(?:test|spec)\.[a-z0-9]+$/i.test(file)) {
      directTestFiles.push(file);
    } else {
      sourceFiles.push(file);
    }
  }

  // 10. Classify source files into subsystem tiers
  const matchedTierKeys = new Set();
  const unclassifiedFiles = [];
  let triggersVisual = false;

  for (const file of sourceFiles) {
    let matchedAny = false;
    for (const [key, tier] of Object.entries(TIERS)) {
      if (tier.fileMatches.some(rx => rx.test(file))) {
        matchedTierKeys.add(key);
        matchedAny = true;
      }
    }
    if (VISUAL_LAYOUT_PATTERNS.some(rx => rx.test(file))) {
      triggersVisual = true;
    }
    if (!matchedAny) {
      unclassifiedFiles.push(file);
    }
  }

  // 11. Fail-Closed Check: Unclassified source files
  if (unclassifiedFiles.length > 0) {
    return {
      tierKey: "full",
      tier: {
        id: "full-gate",
        label: "Full Repository Verification Gate",
        description: "Executes the complete Jest suite discovered at runtime, followed by claims verification",
        estimatedSeconds: HISTORICAL_BASELINE_SECONDS,
      },
      reason: `Unclassified file changes (${unclassifiedFiles.slice(0, 3).join(", ")}) — failing closed to full gate`,
      patterns: [],
      includeVisual: false,
      isVisualOnly: false,
      isFull: true,
      matchedFiles: unclassifiedFiles,
      directTestFiles,
    };
  }

  // 12. Only test files modified
  if (sourceFiles.length === 0 && directTestFiles.length > 0) {
    return {
      tierKey: "direct-tests",
      tier: {
        id: "direct-test-files",
        label: "Directly Modified Test Files",
        description: directTestFiles.join(", "),
        estimatedSeconds: directTestFiles.length * 2,
      },
      reason: `Targeting directly modified test files (${directTestFiles.length} suites)`,
      patterns: [...directTestFiles],
      includeVisual: false,
      isVisualOnly: false,
      isFull: false,
      matchedFiles: directTestFiles,
      directTestFiles,
    };
  }

  // 13. Single Subsystem Tier (Union with directTestFiles if present)
  const matchedArray = Array.from(matchedTierKeys);
  if (matchedArray.length === 1) {
    const key = matchedArray[0];
    const combinedPatterns = Array.from(new Set([...TIERS[key].patterns, ...directTestFiles]));
    return {
      tierKey: key,
      tier: TIERS[key],
      reason: `Git diff matches ${TIERS[key].label}${directTestFiles.length > 0 ? ` + ${directTestFiles.length} direct test files` : ""}`,
      patterns: combinedPatterns,
      includeVisual: triggersVisual,
      isVisualOnly: false,
      isFull: false,
      matchedFiles: sourceFiles,
      directTestFiles,
    };
  }

  // 14. Multi-Tier Subsystems (Union with directTestFiles)
  if (matchedArray.length > 1) {
    const combinedPatterns = new Set(directTestFiles);
    let estSec = 0;
    matchedArray.forEach(k => {
      TIERS[k].patterns.forEach(p => combinedPatterns.add(p));
      estSec += TIERS[k].estimatedSeconds;
    });

    return {
      tierKey: "multi-tier",
      tier: {
        id: "multi-tier",
        label: `Combined (${matchedArray.join(" + ")})`,
        description: `Covers ${matchedArray.length} active subsystem domains`,
        estimatedSeconds: Math.min(estSec, 35),
      },
      reason: `Multi-domain diff detected across: ${matchedArray.join(", ")}${directTestFiles.length > 0 ? ` + ${directTestFiles.length} direct test files` : ""}`,
      patterns: Array.from(combinedPatterns),
      includeVisual: triggersVisual,
      isVisualOnly: false,
      isFull: false,
      matchedFiles: sourceFiles,
      directTestFiles,
    };
  }

  // Safe fallback
  return {
    tierKey: "core",
    tier: TIERS.core,
    reason: "Defaulting to core reasoning router",
    patterns: [...TIERS.core.patterns, ...directTestFiles],
    includeVisual: triggersVisual,
    isVisualOnly: false,
    isFull: false,
    matchedFiles: sourceFiles,
    directTestFiles,
  };
}

/**
 * Execute child process and return exit code promise
 */
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("exit", (code) => resolve(code || 0));
    child.on("error", (err) => {
      console.error(`Execution error [${command}]:`, err.message);
      resolve(1);
    });
  });
}

/**
 * CLI Main Entry Point
 */
export async function main() {
  const rawArgs = process.argv.slice(2);
  const isDryRun = rawArgs.includes("--dry-run");
  const isExplainJson = rawArgs.includes("--explain-json");

  let baseArg = null;
  const baseIdx = rawArgs.indexOf("--base");
  if (baseIdx !== -1 && rawArgs[baseIdx + 1]) {
    baseArg = rawArgs[baseIdx + 1];
  }

  const filteredArgs = rawArgs.filter((a, idx) => {
    if (a === "--dry-run" || a === "--explain-json") return false;
    if (a === "--base" || (idx > 0 && rawArgs[idx - 1] === "--base")) return false;
    return true;
  });

  const targetArg = filteredArgs[0] && !filteredArgs[0].startsWith("-") ? filteredArgs[0] : null;
  const extraJestFlags = filteredArgs.filter(a => a !== targetArg);

  const diffResult = getGitChangedFiles({ base: baseArg });
  const decision = resolveRoute(targetArg, diffResult.files, { base: baseArg });

  if (isExplainJson) {
    console.log(JSON.stringify({
      tierKey: decision.tierKey,
      tierId: decision.tier.id,
      label: decision.tier.label,
      reason: decision.reason,
      patterns: decision.patterns,
      includeVisual: decision.includeVisual,
      isVisualOnly: decision.isVisualOnly,
      isFull: decision.isFull,
      matchedFiles: decision.matchedFiles,
      directTestFiles: decision.directTestFiles,
      diffSource: diffResult.source,
      baseRef: diffResult.baseRef,
    }, null, 2));
    return;
  }

  console.log("\n\x1b[1;33m============================================================\x1b[0m");
  console.log("\x1b[1;36m🎯 REI DETERMINISTIC TEST ROUTER (CARDO Tiered Matrix)\x1b[0m");
  console.log(`\x1b[1mRoute Pathway:\x1b[0m   \x1b[32m${decision.tier.label} [${decision.tier.id}]\x1b[0m`);
  console.log(`\x1b[1mClassification:\x1b[0m  ${decision.reason}`);
  if (decision.includeVisual && !decision.isVisualOnly) {
    console.log(`\x1b[1mOrchestration:\x1b[0m   \x1b[35mCompositional (Jest Suites + Playwright Visual Suite)\x1b[0m`);
  }
  console.log(`\x1b[1mDiff Source:\x1b[0m     ${diffResult.source}${diffResult.baseRef ? ` (${diffResult.baseRef})` : ""}`);
  console.log("\x1b[1;33m============================================================\x1b[0m\n");

  if (isDryRun) {
    console.log("\x1b[90m[--dry-run enabled: skipping child process execution]\x1b[0m\n");
    return;
  }

  const startTime = performance.now();

  // Route: Visual Only
  if (decision.isVisualOnly) {
    const code = await runCommand("node", ["scripts/verify-workspace-layout.mjs", ...extraJestFlags]);
    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`\n\x1b[32mObserved route duration:\x1b[0m ${duration}s (measured)`);
    process.exit(code);
  }

  // Route: Full Gate (Phase 1 Jest + Phase 2 Claims Check)
  if (decision.isFull) {
    console.log("\x1b[1;34m▶ Phase 1: Running Complete Jest Test Suite...\x1b[0m");
    const jestCode = await runCommand("npx", ["--no-install", "jest", "--runInBand", ...extraJestFlags]);

    console.log("\n\x1b[1;34m▶ Phase 2: Running Claims Synchronization Verification...\x1b[0m");
    const claimsCode = await runCommand("node", ["scripts/gen-claims.mjs", "--check"]);

    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log("\n\x1b[1;33m============================================================\x1b[0m");
    console.log(`\x1b[1mObserved route duration:\x1b[0m ${duration}s (measured)`);
    console.log(`\x1b[1mComparison baseline:\x1b[0m     ${HISTORICAL_BASELINE_SECONDS}s (${HISTORICAL_BASELINE_ENV})`);
    console.log(`\x1b[1mPhase 1 (Jest):\x1b[0m          ${jestCode === 0 ? "\x1b[32mPASSED\x1b[0m" : "\x1b[31mFAILED\x1b[0m"}`);
    console.log(`\x1b[1mPhase 2 (Claims):\x1b[0m        ${claimsCode === 0 ? "\x1b[32mPASSED\x1b[0m" : "\x1b[31mFAILED\x1b[0m"}`);
    console.log("\x1b[1;33m============================================================\x1b[0m\n");

    process.exit(jestCode !== 0 ? jestCode : claimsCode);
  }

  // Route: Targeted Jest Tier
  const jestArgs = ["--no-install", "jest", "--runInBand", ...decision.patterns, ...extraJestFlags];
  const jestCode = await runCommand("npx", jestArgs);

  let visualCode = 0;
  if (decision.includeVisual && jestCode === 0) {
    console.log("\n\x1b[1;35m▶ Phase 2: Running Compositional Playwright Visual Regression Suite...\x1b[0m");
    visualCode = await runCommand("node", ["scripts/verify-workspace-layout.mjs"]);
  }

  const duration = ((performance.now() - startTime) / 1000).toFixed(2);
  const reductionPct = Math.max(0, (((HISTORICAL_BASELINE_SECONDS - parseFloat(duration)) / HISTORICAL_BASELINE_SECONDS) * 100)).toFixed(1);

  console.log("\n\x1b[1;33m============================================================\x1b[0m");
  console.log(`\x1b[1mObserved route duration:\x1b[0m ${duration}s (measured)`);
  console.log(`\x1b[1mComparison baseline:\x1b[0m     ${HISTORICAL_BASELINE_SECONDS}s (${HISTORICAL_BASELINE_ENV})`);
  console.log(`\x1b[1mObserved reduction:\x1b[0m      ${reductionPct}% (against historical baseline)`);
  console.log("\x1b[1;33m============================================================\x1b[0m\n");

  process.exit(jestCode !== 0 ? jestCode : visualCode);
}

// CLI entry guard
if (process.argv[1]) {
  const currentFileUrl = import.meta.url;
  const entryFileUrl = pathToFileURL(process.argv[1]).href;
  if (currentFileUrl === entryFileUrl) {
    main().catch(err => {
      console.error("Test Router error:", err);
      process.exit(1);
    });
  }
}
