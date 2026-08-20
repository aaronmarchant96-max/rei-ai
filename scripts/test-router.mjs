#!/usr/bin/env node

/**
 * @file scripts/test-router.mjs
 * @description CARDO-Inspired Deterministic Test Router
 * Intelligently classifies changed files or developer intent into targeted test tiers,
 * avoiding the 100s+ monolithic 83-suite run during active iteration.
 */

import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";

const TIERS = {
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
    ],
    fileMatches: [
      /src\/lib\/(?:nightShiftRouter|hingeClassifier|costHelpers|deRoboticize|detectAISlop|persistentContextEngine|fileExtractor|sourceContext|selfAuditContext)/i,
      /src\/domains\//i,
      /data\/(?:fingerprints|modelRates)\.json/i,
      /src\/data\//i,
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
      /src\/(?:AppShell|REI|CardoGuard|CreativeEngine|DebateFurnace|ToolsLanding|Analytics)\.jsx?/i,
      /src\/components\//i,
      /src\/modules\//i,
      /src\/styles?\//i,
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
      /api\//i,
      /shared\/lib\//i,
      /tests\/api\//i,
      /src\/lib\/(?:claimGateway|claimHistory|dkrClient)/i,
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
      /src\/lib\/(?:cardoGuard|redTeamScanner)/i,
      /src\/lib\/redTeamTaxonomy/i,
      /src\/CardoGuard/i,
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
    ],
    fileMatches: [
      /src\/__eval__\//i,
      /src\/lib\/(?:pilotEval|evalLog|costReplayStats|evalReplayStats|providerSensitivity|policyProposal)/i,
      /docs\/CLAIM_LEDGER\.md/i,
    ],
  },
};

function getGitChangedFiles() {
  try {
    const diff = execSync("git diff --name-only HEAD", { encoding: "utf8" }).trim();
    const untracked = execSync("git ls-files --others --exclude-standard", { encoding: "utf8" }).trim();
    const all = [...diff.split("\n"), ...untracked.split("\n")].map(s => s.trim()).filter(Boolean);
    return Array.from(new Set(all));
  } catch {
    return [];
  }
}

function resolveRoute(targetArg, changedFiles) {
  if (targetArg && TIERS[targetArg.toLowerCase()]) {
    const tier = TIERS[targetArg.toLowerCase()];
    return {
      tierKey: targetArg.toLowerCase(),
      tier,
      reason: `Explicit command-line target: '${targetArg}'`,
      patterns: tier.patterns,
      isVisual: false,
      isFull: false,
    };
  }

  if (targetArg === "visual" || targetArg === "layout") {
    return {
      tierKey: "visual",
      tier: {
        id: "visual-layout",
        label: "Visual Browser Invariants (Playwright)",
        description: "Viewport containment, single-scroll ownership, 100dvh, and responsive layout",
        estimatedSeconds: 10,
      },
      reason: "Explicit visual regression target",
      patterns: [],
      isVisual: true,
      isFull: false,
    };
  }

  if (targetArg === "full" || targetArg === "gate" || targetArg === "all") {
    return {
      tierKey: "full",
      tier: {
        id: "full-gate",
        label: "Full Repository Verification Gate",
        description: "All 83 suites, 997 tests + claims synchronization",
        estimatedSeconds: 105,
      },
      reason: "Explicit full repository gate requested",
      patterns: [],
      isVisual: false,
      isFull: true,
    };
  }

  // If specific file or regex pattern passed directly
  if (targetArg && targetArg !== "diff" && targetArg !== "auto") {
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
      isVisual: false,
      isFull: false,
    };
  }

  // Automatic Classification via Git Diff
  if (changedFiles.length === 0) {
    // Default fast sanity run on core router
    return {
      tierKey: "core",
      tier: TIERS.core,
      reason: "No dirty files detected — default to fast core reasoning sanity run",
      patterns: TIERS.core.patterns,
      isVisual: false,
      isFull: false,
    };
  }

  const matchedTierKeys = new Set();
  const directTestFiles = new Set();

  for (const file of changedFiles) {
    if (file.includes(".test.") || file.includes(".spec.")) {
      directTestFiles.add(file);
      continue;
    }

    for (const [key, tier] of Object.entries(TIERS)) {
      if (tier.fileMatches.some(rx => rx.test(file))) {
        matchedTierKeys.add(key);
      }
    }
  }

  if (directTestFiles.size > 0 && matchedTierKeys.size === 0) {
    return {
      tierKey: "direct-tests",
      tier: {
        id: "direct-test-files",
        label: "Modified Test Files",
        description: Array.from(directTestFiles).join(", "),
        estimatedSeconds: directTestFiles.size * 2,
      },
      reason: `Targeting directly modified test files (${directTestFiles.size} suites)`,
      patterns: Array.from(directTestFiles),
      isVisual: false,
      isFull: false,
    };
  }

  const matchedArray = Array.from(matchedTierKeys);
  if (matchedArray.length === 1) {
    const key = matchedArray[0];
    return {
      tierKey: key,
      tier: TIERS[key],
      reason: `Git diff matches ${TIERS[key].label} files (${changedFiles.slice(0, 3).join(", ")}${changedFiles.length > 3 ? "..." : ""})`,
      patterns: TIERS[key].patterns,
      isVisual: false,
      isFull: false,
    };
  }

  if (matchedArray.length > 1) {
    const combinedPatterns = [];
    let estSec = 0;
    matchedArray.forEach(k => {
      combinedPatterns.push(...TIERS[k].patterns);
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
      reason: `Multi-domain diff detected across: ${matchedArray.join(", ")}`,
      patterns: Array.from(new Set(combinedPatterns)),
      isVisual: false,
      isFull: false,
    };
  }

  // Fallback to core
  return {
    tierKey: "core",
    tier: TIERS.core,
    reason: `Unclassified file changes (${changedFiles.slice(0, 2).join(", ")}) — routing to core router`,
    patterns: TIERS.core.patterns,
    isVisual: false,
    isFull: false,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const targetArg = args[0] && !args[0].startsWith("-") ? args[0] : null;
  const extraFlags = args.filter(a => a !== targetArg);

  const changedFiles = getGitChangedFiles();
  const decision = resolveRoute(targetArg, changedFiles);

  const savingsPct = Math.round(((105 - decision.tier.estimatedSeconds) / 105) * 100);

  console.log("\n\x1b[1;33m============================================================\x1b[0m");
  console.log("\x1b[1;36m🎯 REI DETERMINISTIC TEST ROUTER (CARDO Tiered Matrix)\x1b[0m");
  console.log(`\x1b[1mRoute Pathway:\x1b[0m   \x1b[32m${decision.tier.label} [${decision.tier.id}]\x1b[0m`);
  console.log(`\x1b[1mClassification:\x1b[0m  ${decision.reason}`);
  console.log(`\x1b[1mEst. Latency:\x1b[0m    ~${decision.tier.estimatedSeconds}s \x1b[90m(vs ~105s monolithic suite — \x1b[33m${savingsPct}% faster\x1b[90m)\x1b[0m`);
  console.log("\x1b[1;33m============================================================\x1b[0m\n");

  if (decision.isVisual) {
    const child = spawn("node", ["scripts/verify-workspace-layout.mjs", ...extraFlags], { stdio: "inherit" });
    child.on("exit", (code) => process.exit(code || 0));
    return;
  }

  if (decision.isFull) {
    const child = spawn("node", ["scripts/gen-claims.mjs", "--check", ...extraFlags], { stdio: "inherit" });
    child.on("exit", (code) => process.exit(code || 0));
    return;
  }

  const jestArgs = [
    "--runInBand",
    ...decision.patterns,
    ...extraFlags,
  ];

  const child = spawn("npx", ["jest", ...jestArgs], { stdio: "inherit" });
  child.on("exit", (code) => {
    if (code === 0) {
      console.log(`\n\x1b[32m✅ Test route [${decision.tier.id}] completed cleanly in ~${decision.tier.estimatedSeconds}s.\x1b[0m\n`);
    }
    process.exit(code || 0);
  });
}

main().catch(err => {
  console.error("Test Router error:", err);
  process.exit(1);
});
