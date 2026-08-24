import {
  ROUTE_PREDICTION_SCHEMA_VERSION,
  type EvidenceQuality,
  type PrecedentTier,
  type RoutePrediction,
  type RoutePredictionFeatures,
} from "./routePredictionTypes";
import type { RouteOutcome } from "./routeOutcome";

export const PREDICTOR_VERSION = "route-precedent-v1";

/** Operational v1 constants — not statistically proven thresholds. */
export const MIN_TIER_SUPPORT = 5;
export const SUPPORTED_EVIDENCE = 20;

/** A historical precedent: a pre-execution feature snapshot joined to its observed outcome. */
export interface Precedent {
  prediction: RoutePrediction;
  outcome: RouteOutcome;
}

export interface PrecedentRiskResult {
  failureRisk: number | null;
  riskInterval95: { low: number; high: number } | null;
  support: { total: number; successes: number; failures: number };
  evidenceQuality: EvidenceQuality;
  precedentTier: PrecedentTier;
  corpusWindow: { before: string; earliest?: string };
}

/**
 * Wilson binomial 95% interval. Deterministic and cheap; handles small samples
 * far better than a naive percentage. Clamps numerical artifacts into [0,1].
 * Returns null for zero/negative support.
 */
export function wilsonInterval(
  failures: number,
  total: number,
  z = 1.96
): { low: number; high: number } | null {
  if (!Number.isInteger(total) || total <= 0) return null;
  if (!Number.isInteger(failures) || failures < 0 || failures > total) return null;

  const p = failures / total;
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denom;
  const margin =
    (z * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total))) / denom;
  const low = Math.max(0, center - margin);
  const high = Math.min(1, center + margin);
  return { low, high };
}

function matchesExact(f: RoutePredictionFeatures, p: Precedent): boolean {
  const g = p.prediction.features;
  return (
    f.selectedModel === g.selectedModel &&
    f.routeId === g.routeId &&
    f.domain === g.domain &&
    f.hingeBand === g.hingeBand &&
    f.structured === g.structured &&
    f.adversarialBand === g.adversarialBand &&
    f.inputSizeBand === g.inputSizeBand
  );
}

function matchesRelaxed(f: RoutePredictionFeatures, p: Precedent): boolean {
  const g = p.prediction.features;
  return (
    f.selectedModel === g.selectedModel &&
    f.routeId === g.routeId &&
    f.hingeBand === g.hingeBand &&
    f.structured === g.structured &&
    f.inputSizeBand === g.inputSizeBand
  );
}

function matchesModelRoute(f: RoutePredictionFeatures, p: Precedent): boolean {
  const g = p.prediction.features;
  return f.selectedModel === g.selectedModel && f.routeId === g.routeId;
}

/**
 * Build the temporally-eligible precedent corpus. A precedent is eligible only
 * when: a valid prior prediction snapshot exists (same feature schema), it is a
 * different request, its outcome is present with a delivery verdict of
 * success|failure, its outcome observability is proven, and its outcome was
 * observable strictly before the current prediction. Never infer from routing
 * order — an earlier request could still have been executing concurrently.
 */
export function buildPrecedentCorpus(
  priorPredictions: RoutePrediction[],
  outcomes: RouteOutcome[],
  currentRequestId: string,
  currentPredictedAt: string
): Precedent[] {
  const outcomeByRequest = new Map<string, RouteOutcome>();
  for (const o of outcomes) {
    if (o.requestId) outcomeByRequest.set(o.requestId, o);
  }

  const precedents: Precedent[] = [];
  for (const pred of priorPredictions) {
    if (pred.requestId === currentRequestId) continue;
    if (pred.features.schemaVersion !== ROUTE_PREDICTION_SCHEMA_VERSION) continue;

    const outcome = outcomeByRequest.get(pred.requestId);
    if (!outcome) continue;
    if (outcome.delivery.status !== "success" && outcome.delivery.status !== "failure") continue;
    if (outcome.observedAtProvenance === "unavailable") continue;
    if (!outcome.observedAt) continue;
    if (outcome.observedAt >= currentPredictedAt) continue;

    precedents.push({ prediction: pred, outcome });
  }
  return precedents;
}

/**
 * Deterministic tier selection. `selectedModel` unavailable → no usable precedent
 * (do not pool "unknown model" requests). Selection:
 *   1. EXACT if support >= MIN_TIER_SUPPORT
 *   2. RELAXED if support >= MIN_TIER_SUPPORT
 *   3. MODEL_ROUTE if support >= MIN_TIER_SUPPORT
 *   4. narrowest non-empty tier (sparse evidence)
 *   5. none (empty)
 */
export function selectCohort(
  features: RoutePredictionFeatures,
  corpus: Precedent[]
): { tier: PrecedentTier; precedents: Precedent[] } {
  if (!features.selectedModel) return { tier: "none", precedents: [] };

  const exact = corpus.filter((p) => matchesExact(features, p));
  const relaxed = corpus.filter((p) => matchesRelaxed(features, p));
  const modelRoute = corpus.filter((p) => matchesModelRoute(features, p));

  if (exact.length >= MIN_TIER_SUPPORT) return { tier: "exact", precedents: exact };
  if (relaxed.length >= MIN_TIER_SUPPORT) return { tier: "relaxed", precedents: relaxed };
  if (modelRoute.length >= MIN_TIER_SUPPORT) return { tier: "model-route", precedents: modelRoute };

  if (exact.length > 0) return { tier: "exact", precedents: exact };
  if (relaxed.length > 0) return { tier: "relaxed", precedents: relaxed };
  if (modelRoute.length > 0) return { tier: "model-route", precedents: modelRoute };

  return { tier: "none", precedents: [] };
}

function earliestPredictionTime(precedents: Precedent[]): string | undefined {
  const times = precedents
    .map((p) => p.prediction.predictedAt)
    .filter((t): t is string => typeof t === "string" && !Number.isNaN(Date.parse(t)))
    .sort();
  return times[0];
}

/**
 * Compute a deterministic delivery-failure probability from only historically
 * available, pre-execution feature snapshots joined to already-observed outcomes.
 * Zero evidence → null risk (never 0%). Zero observed failures with nonzero
 * evidence → risk 0 with a wide Wilson interval (there is evidence; it is weak).
 */
export function computePrecedentRisk(
  features: RoutePredictionFeatures,
  currentRequestId: string,
  currentPredictedAt: string,
  priorPredictions: RoutePrediction[],
  outcomes: RouteOutcome[]
): PrecedentRiskResult {
  const corpus = buildPrecedentCorpus(priorPredictions, outcomes, currentRequestId, currentPredictedAt);
  const { tier, precedents } = selectCohort(features, corpus);

  const empty: PrecedentRiskResult = {
    failureRisk: null,
    riskInterval95: null,
    support: { total: 0, successes: 0, failures: 0 },
    evidenceQuality: "unavailable",
    precedentTier: "none",
    corpusWindow: { before: currentPredictedAt },
  };
  if (precedents.length === 0) return empty;

  const failures = precedents.filter((p) => p.outcome.delivery.status === "failure").length;
  const successes = precedents.filter((p) => p.outcome.delivery.status === "success").length;
  const total = failures + successes;
  const failureRisk = total > 0 ? failures / total : null;
  const riskInterval95 = wilsonInterval(failures, total);
  const evidenceQuality: EvidenceQuality = total >= SUPPORTED_EVIDENCE ? "supported" : "sparse";
  const earliest = earliestPredictionTime(precedents);

  return {
    failureRisk,
    riskInterval95,
    support: { total, successes, failures },
    evidenceQuality,
    precedentTier: tier,
    corpusWindow: { before: currentPredictedAt, earliest },
  };
}
