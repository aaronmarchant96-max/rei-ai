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
 * Usage:
 *   node scripts/run-pilot.mjs \
 *     --traffic src/__eval__/fixtures/pilot-traffic.json \
 *     --catalog src/__eval__/fixtures/pilot-catalog.json
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluatePilotTraffic } from "../src/lib/pilotEval.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : null;
}

const trafficPath = arg("traffic");
const catalogPath = arg("catalog");
if (!trafficPath || !catalogPath) {
  console.error("usage: node scripts/run-pilot.mjs --traffic <json> --catalog <json>");
  process.exit(1);
}

const traffic = JSON.parse(readFileSync(join(root, trafficPath), "utf8"));
const catalog = JSON.parse(readFileSync(join(root, catalogPath), "utf8"));
const report = evaluatePilotTraffic(traffic, catalog);

const pct = (n) => (typeof n === "number" && isFinite(n) ? `${n.toFixed(1)}%` : "—");

console.log("\n════════════════════════════════════════════════════════");
console.log("  REI PILOT — ROUTING SAVINGS REPORT");
console.log(`  ${catalog.label || "single-customer pilot"}`);
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
console.log(`  Savings:                 $${report.savings.toFixed(5)}  (${pct(report.savingsPercent)})`);
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
