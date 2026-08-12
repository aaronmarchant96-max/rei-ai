#!/usr/bin/env node
/**
 * run-pilot.mjs — run a single-customer pilot evaluation from the CLI.
 *
 * The Phase 3 deliverable is a 5-minute company-readable report:
 *   "Your last N requests cost $X. REI would have cost $Y. Savings Z%.
 *    Quality degradation N%. Here are the requests where routing changed
 *    the outcome."
 *
 * This is the measurement engine behind that report. It runs REI's real
 * routing policy over a customer's exported traffic, costed against their
 * own model catalog, and prints the honest numbers.
 *
 * Honesty contract: the report labels savings as "measured" ONLY when the
 * catalog declares provenance.source === "production". Otherwise it prints
 * "REPLAY ESTIMATE" — the numbers are a replay of REI policy over the given
 * traffic, not measured live spend. Never present the fixture numbers as
 * measured telemetry.
 *
 * Usage:
 *   node scripts/run-pilot.mjs \
 *     --traffic src/__eval__/fixtures/pilot-traffic.json \
 *     --catalog src/__eval__/fixtures/pilot-catalog.json
 *
 *   node scripts/run-pilot.mjs \
 *     --traffic src/__eval__/fixtures/pilot-traffic.json \
 *     --catalog src/__eval__/fixtures/pilot-catalog.json \
 *     --scenarios src/__eval__/fixtures/provider-scenarios.json
 *   (the --scenarios form runs the provider-price stress test instead)
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluatePilotTraffic } from "../src/lib/pilotEval.ts";
import { evaluateScenarios } from "../src/lib/providerSensitivity.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : null;
}

const trafficPath = arg("traffic");
const catalogPath = arg("catalog");
if (!trafficPath || !catalogPath) {
  console.error("usage: node scripts/run-pilot.mjs --traffic <json> --catalog <json> [--scenarios <json>]");
  process.exit(1);
}

const traffic = JSON.parse(readFileSync(join(root, trafficPath), "utf8"));
const catalog = JSON.parse(readFileSync(join(root, catalogPath), "utf8"));

const pct = (n) => (typeof n === "number" && isFinite(n) ? `${n.toFixed(1)}%` : "—");

const scenariosPath = arg("scenarios");
if (scenariosPath) {
  const scenarios = JSON.parse(readFileSync(join(root, scenariosPath), "utf8")).scenarios;
  const results = evaluateScenarios(traffic, catalog, scenarios);
  const prov = catalog.provenance;
  const isProduction = prov?.source === "production";

  console.log("\n════════════════════════════════════════════════════════");
  console.log("  REI PILOT — PROVIDER-PRICE SENSITIVITY STRESS TEST");
  console.log(`  ${catalog.label || "single-customer pilot"}`);
  if (!isProduction) {
    console.log("  ⚠ REPLAY ESTIMATE — controlled counterfactual over the given traffic, not production telemetry");
  }
  console.log("  Question: if every provider charged money tomorrow, would REI still save?");
  console.log("  Policy is held fixed — only the economic view changes per scenario.");
  console.log("════════════════════════════════════════════════════════");
  for (const r of results) {
    console.log(`  Scenario ${r.id} — ${r.label}`);
    if (r.note) console.log(`      ${r.note}`);
    console.log(`      measured ${r.measured} · excluded ${r.excluded} · escalated ${r.escalated}`);
    for (const [reason, count] of Object.entries(r.excludedReasons)) {
      console.log(`        - ${reason}: ${count}`);
    }
    console.log(`      B1 always-premium      $${r.b1Cost.toFixed(5)}`);
    console.log(`      B2 cheapest paid floor $${r.b2Cost.toFixed(5)}  (${r.b2Model || "—"})`);
    console.log(`      B3 best fixed paid     $${r.b3Cost.toFixed(5)}  (${r.b3Model || "—"})`);
    console.log(`      B4 REI routing         $${r.b4Cost.toFixed(5)}`);
    console.log(`      savings vs B1          ${pct(r.savingsVsB1Percent)}`);
    console.log(`      savings vs B2 floor    ${pct(r.savingsVsB2Percent)}`);
    console.log(`      free-capacity share    ${r.freeCapacityShare != null ? r.freeCapacityShare.toFixed(1) : "—"}% of premium baseline`);
    console.log("  ─────────────────────────────────────────────");
  }
  console.log("  Reading: B2/B3 are cheaper than REI because they never escalate — REI's");
  console.log("  extra cost buys the adversarial/security floor (see escalated count).");
  console.log("  B3 ≤ B2 is a property of this fixed workload, not assumed.");
  console.log("════════════════════════════════════════════════════════\n");
  process.exit(0);
}

const report = evaluatePilotTraffic(traffic, catalog);

const prov = report.provenance;
const isProduction = prov?.source === "production";
const savingsLabel = isProduction ? "Measured savings:" : "Est. savings (replay):";

console.log("\n════════════════════════════════════════════════════════");
console.log("  REI PILOT — ROUTING SAVINGS REPORT");
console.log(`  ${catalog.label || "single-customer pilot"}`);
if (prov?.source === "synthetic") {
  console.log("  ⚠ REPLAY ESTIMATE — synthetic demo traffic, not production telemetry");
} else if (!isProduction) {
  console.log(`  ⚠ Source: ${prov?.source || "unknown"} — treat savings as a replay estimate`);
}
if (prov?.note) {
  console.log(`  ${prov.note}`);
}
console.log("════════════════════════════════════════════════════════");
console.log(`  Requests evaluated:      ${report.totalEntries}`);
console.log(`  Measured:                ${report.measured}`);
console.log(`  Excluded (unmeasurable): ${report.excluded}`);
for (const [reason, count] of Object.entries(report.excludedReasons)) {
  console.log(`      - ${reason}: ${count}`);
}
  console.log("  ─────────────────────────────────────────────");
  console.log(`  Customer's baseline:     $${report.baselineCost.toFixed(5)}`);
  console.log(`  REI-routed cost:         $${report.reiCost.toFixed(5)}`);
  console.log(`  ${savingsLabel}  $${report.savings.toFixed(5)}  (${pct(report.savingsPercent)})`);
  console.log("  ─────────────────────────────────────────────");
  if (report.premiumModel) {
    console.log(`  Baseline-relative savings (vs ${report.premiumModel}):  ${pct(report.premiumSavingsPercent)}`);
    console.log(`      premium baseline $${report.premiumBaselineCost.toFixed(5)} → REI $${report.reiCost.toFixed(5)}`);
  }
  if (report.paidProviderSavingsPercent != null) {
    console.log(`  Paid-provider routing savings:                ${pct(report.paidProviderSavingsPercent)}`);
    console.log(`      excludes free-tier rows ($${report.paidProviderSavings.toFixed(5)} on paid routes)`);
  } else {
    console.log("  Paid-provider routing savings:                —  (no paid-route entries measurable)");
  }
  if (report.freeCapacityContribution != null) {
    console.log(`  Free-tier contribution:                      ${report.freeCapacityContribution.toFixed(1)} points of baseline`);
  }
  console.log(`  Decomposition: price-optimization $${report.savingsDecomposition.priceOptimization.toFixed(5)} · free-capacity $${report.savingsDecomposition.freeCapacity.toFixed(5)}`);
  console.log("  ─────────────────────────────────────────────");
  console.log(`  Escalated (premium/quality-sensitive): ${report.escalated}`);
console.log("  Route distribution:");
for (const [route, count] of Object.entries(report.routeDistribution)) {
  console.log(`      ${route.padEnd(28)} ${count}`);
}
console.log("  Per-route:");
for (const [route, r] of Object.entries(report.byRoute)) {
  const sign = r.savingsPercent >= 0 ? "+" : "";
  console.log(`      ${route.padEnd(28)} n=${String(r.entries).padStart(2)}  $${r.baseline.toFixed(5)} → $${r.reiCost.toFixed(5)}  ${sign}${pct(r.savingsPercent)}`);
}
console.log("════════════════════════════════════════════════════════\n");
