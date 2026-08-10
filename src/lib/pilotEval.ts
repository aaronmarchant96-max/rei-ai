/**
 * pilotEval.ts — single-customer pilot evaluator (Phase 1 wedge).
 *
 * The product pitch is NOT "REI saves you 92.3%" — it's:
 *   "REI measures what your traffic actually costs and identifies where
 *    cheaper routing can preserve the required quality."
 *
 * This module is that measurement core. It takes:
 *   - a customer's traffic stream (raw prompts + tokens + what they paid), and
 *   - a customer's model catalog (their provider prices + which of their own
 *     models should serve each REI route).
 *
 * and runs REI's ACTUAL routing policy (buildRouterDecision) over every entry
 * to produce an honest savings report: baseline cost vs REI cost, route
 * distribution, escalation rate, and — following INCIDENT-001 — a measured /
 * excluded split so the denominator is auditable. We never silently drop
 * cases; anything we cannot measure is counted and reported with a reason.
 *
 * Deliberately $0 and deterministic: no model calls, no API keys. Pure math on
 * the router's decision objects + the customer's rate table.
 */
import { buildRouterDecision } from "./nightShiftRouter";

export interface PilotTrafficEntry {
  /** Raw request text — required, the router routes on this. */
  prompt: string;
  /** Token count for the request — required to cost REI's side. */
  tokens?: number;
  /** Customer's model that actually handled this request. */
  model?: string;
  /** What the customer actually paid (0 if free-tier). Preferred baseline. */
  actualCost?: number;
  /** Their provider, for reference. */
  provider?: string;
}

export interface PilotModelRate {
  /** USD per 1K input tokens. */
  input: number;
  /** USD per 1K output tokens. */
  output: number;
}

export interface PilotProvenance {
  /** Where the traffic actually came from. 'synthetic' vs 'production' vs unknown. */
  source?: string;
  /** Human-readable caveat about the data's origin. */
  note?: string;
}

export interface PilotCatalog {
  /** The customer's own model → rate table. */
  models: Record<string, PilotModelRate>;
  /** routeId → which of the customer's models should serve that route. */
  routeModels: Record<string, string>;
  /** Default customer model for routes not present in routeModels. */
  defaultModel?: string;
  /** Optional label for the report. */
  label?: string;
  /** Origin of the traffic being evaluated — determines how savings are worded. */
  provenance?: PilotProvenance;
}

export interface PilotRouteStat {
  entries: number;
  baseline: number;
  reiCost: number;
  savings: number;
  savingsPercent: number;
}

export interface PilotReport {
  totalEntries: number;
  /** Entries where BOTH baseline and REI cost were measurable. */
  measured: number;
  /** Entries dropped from the savings math, with reasons. */
  excluded: number;
  excludedReasons: Record<string, number>;
  baselineCost: number;
  reiCost: number;
  savings: number;
  savingsPercent: number;
  /** routeId → request count. */
  routeDistribution: Record<string, number>;
  /** Requests routed to adversarial-validation (quality-sensitive). */
  escalated: number;
  byRoute: Record<string, PilotRouteStat>;
  /**
   * Origin of the evaluated traffic. When source is NOT 'production', savings
   * is a REPLAY ESTIMATE over the given traffic, not measured live spend —
   * the report must never present it as measured telemetry.
   */
  provenance: PilotProvenance | null;
}

const num = (n: unknown): number => (typeof n === "number" && isFinite(n) ? n : 0);

function costOf(rate: PilotModelRate, tokens: number): number {
  return ((tokens || 0) / 1000) * (rate.input + rate.output);
}

/**
 * Evaluate a customer traffic stream under REI's routing policy, costed
 * against the customer's own model prices.
 */
export function evaluatePilotTraffic(
  traffic: PilotTrafficEntry[] | null | undefined,
  catalog: PilotCatalog | null | undefined
): PilotReport {
  const entries = Array.isArray(traffic) ? traffic : [];
  const models = catalog?.models ?? {};
  const routeModels = catalog?.routeModels ?? {};
  const defaultModel = catalog?.defaultModel;

  const excludedReasons: Record<string, number> = {};
  const byRoute: Record<string, PilotRouteStat> = {};
  const routeDistribution: Record<string, number> = {};

  let measured = 0;
  let baselineCost = 0;
  let reiCost = 0;
  let escalated = 0;

  const exclude = (reason: string) => {
    excludedReasons[reason] = (excludedReasons[reason] || 0) + 1;
  };

  for (const entry of entries) {
    if (!entry || typeof entry.prompt !== "string" || !entry.prompt.trim()) {
      exclude("no_prompt");
      continue;
    }
    const tokens = num(entry.tokens);
    if (tokens <= 0) {
      exclude("no_tokens");
      continue;
    }

    // REI's real routing decision for this prompt.
    const decision = buildRouterDecision({ input: entry.prompt });

    // Route accounting (counted for every routable entry).
    const routeId = decision.id || "unknown";
    routeDistribution[routeId] = (routeDistribution[routeId] || 0) + 1;
    if (routeId === "adversarial-validation") escalated += 1;

    // Baseline: prefer what the customer actually paid.
    let baseline = num(entry.actualCost);
    if (baseline > 0 && entry.model && models[entry.model]) {
      baseline = baseline; // actual reported spend wins
    } else if (baseline <= 0 && entry.model && models[entry.model]) {
      baseline = costOf(models[entry.model], tokens); // synthesize from their catalog
    }
    // If still zero, baseline is unmeasurable → excluded.
    if (baseline <= 0) {
      exclude("no_baseline");
      continue;
    }

    // REI cost: the customer model serving this route, at the customer's rate.
    const reiModel = routeModels[routeId] || defaultModel || decision.model || "";
    const rate = models[reiModel];
    if (!rate) {
      exclude(`no_rate_for_route:${routeId}`);
      continue;
    }
    const rei = costOf(rate, tokens);

    measured += 1;
    baselineCost += baseline;
    reiCost += rei;

    if (!byRoute[routeId]) {
      byRoute[routeId] = { entries: 0, baseline: 0, reiCost: 0, savings: 0, savingsPercent: 0 };
    }
    const r = byRoute[routeId];
    r.entries += 1;
    r.baseline += baseline;
    r.reiCost += rei;
  }

  const savings = baselineCost - reiCost;
  const savingsPercent = baselineCost > 0 ? (savings / baselineCost) * 100 : 0;

  for (const routeId of Object.keys(byRoute)) {
    const r = byRoute[routeId];
    r.savings = r.baseline - r.reiCost;
    r.savingsPercent = r.baseline > 0 ? (r.savings / r.baseline) * 100 : 0;
  }

  return {
    totalEntries: entries.length,
    measured,
    excluded: entries.length - measured,
    excludedReasons,
    baselineCost,
    reiCost,
    savings,
    savingsPercent,
    routeDistribution,
    escalated,
    byRoute,
    provenance: catalog?.provenance ?? null,
  };
}
