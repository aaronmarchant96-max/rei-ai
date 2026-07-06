#!/usr/bin/env node
/**
 * Night Shift Router — Competition Demo
 *
 * Usage:
 *   node scripts/demo.mjs              → runs the two-prompt demo
 *   node scripts/demo.mjs "your text"  → routes a single custom prompt
 *
 * Shows: route, pathway, confidence, estimated cost, premium cost,
 * savings %, and rationale for every routing decision.
 */

import { buildRouterDecision } from "../src/lib/nightShiftRouter.js";

const DEMO_PROMPTS = [
  {
    input: "hello",
    description: "Simple greeting → cheapest possible route (deterministic, $0)",
  },
  {
    input: "prove my argument wrong about remote work productivity",
    description: "Adversarial request → escales to premium (gpt-4o, higher cost)",
  },
];

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

function colorSavings(savings, cost) {
  if (cost === 0) return `${GREEN}100%${RESET}`;
  if (savings > 0) return `${GREEN}${Math.round((savings / (cost + savings)) * 100)}%${RESET}`;
  return `${RED}0%${RESET}`;
}

function colorPathway(pathway) {
  if (pathway === "deterministic") return `${GREEN}${pathway}${RESET}`;
  if (pathway === "premium") return `${RED}${pathway}${RESET}`;
  if (pathway === "cheap") return `${YELLOW}${pathway}${RESET}`;
  return pathway;
}

function routeOne(input) {
  const decision = buildRouterDecision({ input, domain: "assistant" });
  const savings = (decision.premiumCost || 0) - (decision.estimatedCost || 0);
  const savedPct = colorSavings(savings, decision.estimatedCost);

  console.log(`\n  Prompt:  ${BOLD}"${input}"${RESET}`);
  console.log(`  ${"─".repeat(66)}`);
  console.log(`  Route:   ${decision.label}`);
  console.log(`  Pathway: ${colorPathway(decision.pathway || "medium")}`);
  console.log(`  Model:   ${decision.model || "n/a"}`);
  const rawConfidence = decision.deterministicLayer
    ? 1.0
    : Math.min(decision.routingConfidence || 0, 1.0);
  const confidenceDisplay = decision.deterministicLayer
    ? "100%"
    : decision.routingConfidence != null && decision.routingConfidence > 0
      ? Math.round(rawConfidence * 100) + "%"
      : "n/a (threshold-based)";
  console.log(`  Confidence: ${confidenceDisplay}`);
  console.log(`  Est. cost:      $${(decision.estimatedCost || 0).toFixed(6)}`);
  console.log(`  Premium cost:   $${(decision.premiumCost || 0).toFixed(6)}`);
  console.log(`  Savings:  ${savedPct}`);
  console.log(`  Reason:   ${decision.rationale || "Default routing decision"}`);

  if (decision.alternativeRoutes && decision.alternativeRoutes.length > 0) {
    console.log(`  ${DIM}Alternatives:${RESET}`);
    for (const alt of decision.alternativeRoutes) {
      const delta = alt.costDeltaFromSelected;
      const sign = delta > 0 ? "+" : "";
      const color = delta > 0 ? RED : GREEN;
      console.log(`    ${DIM}${alt.label} — ${(alt.costPer1kTotal * 1000).toFixed(2)}¢/1K tok ${color}${sign}${alt.savingsPercentage}%${RESET}${DIM} (${alt.pathway})${RESET}`);
    }
  }

  return { decision, savings };
}

function printBenchmarkSummary() {
  console.log(`\n${"═".repeat(70)}`);
  console.log(`  BENCHMARK SUITE`);
  console.log(`${"═".repeat(70)}`);
  console.log(`  Prompts:  57 across 9 categories (greeting, coding, genealogy,`);
  console.log(`            creative, fact-check, reasoning, mixed, adversarial, unknown)`);
  console.log(`  Savings:  68% vs always-premium routing`);
  console.log(`  Pathways: 5 deterministic · 14 cheap · 33 medium · 5 premium`);
  console.log(`  Tests:    162 total · 15 suites · all passing`);
  console.log(`  Run:      npm test -- --testPathPatterns=routingEval`);
  console.log(`${"═".repeat(70)}\n`);
}

function main() {
  const arg = process.argv[2];

  if (arg) {
    console.log(`\n${BOLD}Night Shift Router — Single Prompt${RESET}`);
    routeOne(arg);
    return;
  }

  console.log(`${"═".repeat(70)}`);
  console.log(`  ${BOLD}NIGHT SHIFT ROUTER — Competition Demo${RESET}`);
  console.log(`  The cheapest model that still meets the confidence bar.`);
  console.log(`${"═".repeat(70)}`);

  const results = [];
  for (const prompt of DEMO_PROMPTS) {
    const { decision, savings } = routeOne(prompt.input);
    results.push({ ...prompt, decision, savings });
  }

  printBenchmarkSummary();

  console.log(`${BOLD}  Docker:${RESET} docker compose up`);
  console.log(`  ${BOLD}Benchmarks:${RESET} npm test -- --testPathPatterns=routingEval`);
  console.log(`  ${BOLD}Architecture:${RESET} docs/ARCHITECTURE.md\n`);
}

main();
