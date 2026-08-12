/**
 * providerSensitivity.ts — provider-price sensitivity stress test.
 *
 * The economics question the product has to answer honestly:
 *   "If every provider charged money tomorrow, would REI still save money?"
 *
 * That question cannot be answered by the 93%-vs-GPT-4o headline alone, because
 * the headline silently mixes two different economic sources:
 *   1. price optimization  — REI routes paid → cheaper paid
 *   2. free capacity       — REI routes paid → a $0-rate provider
 *
 * This module runs a controlled economic counterfactual over a FIXED workload:
 * the same traffic, costed under different provider-price/availability views.
 * Because the workload never changes, any movement in REI's cost is a property
 * of provider economics — not of policy adaptation.
 *
 * Baselines per scenario (computed on the same measured entries):
 *   B1 = premium baseline        (the catalog's premiumModel, "always premium")
 *   B2 = cheapest paid model     (lowest combined rate among paid models, every request)
 *   B3 = best fixed paid model   (the single paid model minimizing total workload cost)
 *   B4 = REI routing             (the customer's route→model map at scenario rates)
 *
 * Honest framing baked in: B2 and B3 are cheaper than REI on cost BECAUSE they
 * ignore the security/quality floor — they never escalate. The results carry the
 * escalation count so a reader can see REI's extra cost buys the adversarial
 * floor that B2/B3 do not provide.
 *
 * Invariant: scenario evaluation NEVER mutates the source catalog or traffic.
 * Each scenario gets an isolated rate/availability view built by spreading the
 * base catalog and applying that scenario's deltas.
 *
 * Deliberately $0 and deterministic: no model calls, no API keys.
 */
import { buildRouterDecision } from "./nightShiftRouter";
import type { PilotCatalog, PilotModelRate, PilotTrafficEntry } from "./pilotEval";

/** Per-scenario deltas applied to a cloned base catalog. Never mutates inputs. */
export interface ScenarioDelta {
  id: string;
  label: string;
  note?: string;
  /** Model rates to add or override for this scenario (isolated view). */
  models?: Record<string, PilotModelRate>;
  /** Route→model reassignments for this scenario (e.g. fallback to next-cheapest paid). */
  routeModels?: Record<string, string>;
  /** Models removed from availability entirely (cannot serve, not eligible for B2/B3). */
  unavailableModels?: string[];
  /** Premium model for this scenario (defaults to the base catalog's). */
  premiumModel?: string;
  /** Default route model for this scenario. */
  defaultModel?: string;
}

export interface ScenarioResult {
  id: string;
  label: string;
  note?: string;
  measured: number;
  excluded: number;
  excludedReasons: Record<string, number>;
  /** B1 — total cost if every measured request went to the premium model. */
  b1Cost: number;
  /** B2 — total cost if every measured request went to the cheapest paid model. */
  b2Cost: number;
  /** B2's chosen model (lowest combined rate among available paid models). */
  b2Model: string | null;
  /** B3 — total cost of the single paid model that minimizes this workload's cost. */
  b3Cost: number;
  /** B3's chosen model. */
  b3Model: string | null;
  /** B4 — total cost under REI routing at this scenario's rates/availability. */
  b4Cost: number;
  /** Savings of REI routing vs the premium baseline (b1 - b4), as a fraction of b1. */
  savingsVsB1Percent: number | null;
  /** Savings of REI routing vs the cheapest-paid floor (b2 - b4), as a fraction of b2. */
  savingsVsB2Percent: number | null;
  /** Requests routed to adversarial-validation under REI (identical across scenarios). */
  escalated: number;
  /** Share of REI-routed cost attributable to $0-rate (free-capacity) models, 0–100. */
  freeCapacityShare: number | null;
}

const num = (n: unknown): number => (typeof n === "number" && isFinite(n) ? n : 0);

function costOf(rate: PilotModelRate, tokens: number): number {
  return ((tokens || 0) / 1000) * (rate.input + rate.output);
}

function isPaid(rate: PilotModelRate): boolean {
  return rate.input + rate.output > 0;
}

function combinedRate(rate: PilotModelRate): number {
  return rate.input + rate.output;
}

/** Build an isolated catalog view for a scenario. Does not mutate base or delta. */
function isolatedCatalog(
  base: PilotCatalog | null | undefined,
  delta: ScenarioDelta | null | undefined
): { models: Record<string, PilotModelRate>; routeModels: Record<string, string>; defaultModel?: string; premiumModel: string } {
  const models: Record<string, PilotModelRate> = { ...(base?.models ?? {}) };
  for (const [name, rate] of Object.entries(delta?.models ?? {})) {
    models[name] = { ...rate };
  }
  for (const name of delta?.unavailableModels ?? []) {
    delete models[name];
  }
  const routeModels = { ...(base?.routeModels ?? {}) };
  for (const [route, model] of Object.entries(delta?.routeModels ?? {})) {
    routeModels[route] = model;
  }
  const defaultModel = delta?.defaultModel ?? base?.defaultModel;
  const premiumModel = delta?.premiumModel ?? base?.premiumModel ?? "gpt-4o";
  return { models, routeModels, defaultModel, premiumModel };
}

/** Precompute routing decisions ONCE so every scenario re-costs the same policy. */
function routeDecisions(entries: PilotTrafficEntry[]): Map<PilotTrafficEntry, string> {
  const map = new Map<PilotTrafficEntry, string>();
  for (const entry of entries) {
    if (!entry || typeof entry.prompt !== "string" || !entry.prompt.trim()) continue;
    map.set(entry, buildRouterDecision({ input: entry.prompt }).id || "unknown");
  }
  return map;
}

/** Pick the lowest-combined-rate PAID model from a rate table. */
function cheapestPaidModel(models: Record<string, PilotModelRate>): { model: string; rate: PilotModelRate } | null {
  let best: { model: string; rate: PilotModelRate } | null = null;
  for (const [model, rate] of Object.entries(models)) {
    if (!isPaid(rate)) continue;
    if (!best || combinedRate(rate) < combinedRate(best.rate)) {
      best = { model, rate };
    }
  }
  return best;
}

/**
 * Evaluate the FIXED traffic under each scenario's isolated economic view.
 * B4 always uses the same precomputed routing decisions; only rates/availability change.
 */
export function evaluateScenarios(
  traffic: PilotTrafficEntry[] | null | undefined,
  baseCatalog: PilotCatalog | null | undefined,
  scenarios: ScenarioDelta[] | null | undefined
): ScenarioResult[] {
  const entries = Array.isArray(traffic) ? traffic : [];
  const list = Array.isArray(scenarios) ? scenarios : [];
  const decisions = routeDecisions(entries);

  return list.map((scenario) => {
    const { models, routeModels, defaultModel, premiumModel } = isolatedCatalog(baseCatalog, scenario);
    const hasPremium = typeof models[premiumModel] === "object" && models[premiumModel] !== null;

    const excludedReasons: Record<string, number> = {};
    let measured = 0;
    let escalated = 0;
    let b1Cost = 0;
    let b4Cost = 0;
    let freeCapacitySavings = 0;
    // Per-entry baseline tokens for B2/B3 are the same measured entries; we need
    // the token counts that enter the fixed-workload sums.
    const measuredTokens: number[] = [];
    const measuredRoutes: string[] = [];

    for (const entry of entries) {
      if (!entry || typeof entry.prompt !== "string" || !entry.prompt.trim()) {
        excludedReasons.no_prompt = (excludedReasons.no_prompt || 0) + 1;
        continue;
      }
      const tokens = num(entry.tokens);
      if (tokens <= 0) {
        excludedReasons.no_tokens = (excludedReasons.no_tokens || 0) + 1;
        continue;
      }

      const routeId = decisions.get(entry) || "unknown";
      if (routeId === "adversarial-validation") escalated += 1;

      const reiModel = routeModels[routeId] || defaultModel || "";
      const reiRate = models[reiModel];
      if (!reiRate) {
        excludedReasons[`no_rate_for_route:${routeId}`] = (excludedReasons[`no_rate_for_route:${routeId}`] || 0) + 1;
        continue;
      }

      const rei = costOf(reiRate, tokens);
      measured += 1;
      b4Cost += rei;
      if (hasPremium) {
        const b1 = costOf(models[premiumModel], tokens);
        b1Cost += b1;
        // Free-capacity savings = premium baseline avoided on $0-route entries.
        if (!isPaid(reiRate)) freeCapacitySavings += b1 - rei;
      }
      measuredTokens.push(tokens);
      measuredRoutes.push(routeId);
    }

    // B2 and B3 run on the SAME measured workload (same entries, same tokens).
    const paidModels = Object.entries(models).filter(([, r]) => isPaid(r));
    const b2 = cheapestPaidModel(models);
    let b2Cost = 0;
    if (b2) for (const t of measuredTokens) b2Cost += costOf(b2.rate, t);

    let b3Model: string | null = null;
    let b3Cost = Infinity;
    for (const [model, rate] of paidModels) {
      let total = 0;
      for (const t of measuredTokens) total += costOf(rate, t);
      if (total < b3Cost) {
        b3Cost = total;
        b3Model = model;
      }
    }
    if (b3Model === null) b3Cost = 0;

    const savingsVsB1Percent = b1Cost > 0 ? ((b1Cost - b4Cost) / b1Cost) * 100 : null;
    const savingsVsB2Percent = b2Cost > 0 ? ((b2Cost - b4Cost) / b2Cost) * 100 : null;
    const freeCapacityShare = b1Cost > 0 ? (freeCapacitySavings / b1Cost) * 100 : null;

    return {
      id: scenario.id,
      label: scenario.label,
      note: scenario.note,
      measured,
      excluded: entries.length - measured,
      excludedReasons,
      b1Cost,
      b2Cost,
      b2Model: b2?.model ?? null,
      b3Cost,
      b3Model,
      b4Cost,
      savingsVsB1Percent,
      savingsVsB2Percent,
      escalated,
      freeCapacityShare,
    };
  });
}
