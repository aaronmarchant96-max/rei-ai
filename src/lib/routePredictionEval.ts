import type { RoutePrediction } from "./routePredictionTypes";
import type { RouteOutcome } from "./routeOutcome";

/** A scored evaluation point: predicted risk vs realized outcome. */
export interface EvalPoint {
  prediction: RoutePrediction;
  actualFailure: number; // 0 (success) | 1 (failure)
  predictedRisk: number;
}

/** A canonical prediction↔outcome observation (eligible: resolved delivery, temporally valid). */
export interface CanonicalObservation {
  prediction: RoutePrediction;
  outcome: RouteOutcome;
  actualFailure: number; // 0 (success) | 1 (failure)
  predictedRisk: number | null; // null when the predictor produced no estimate
}

export interface CanonicalObservationResult {
  observations: CanonicalObservation[];
  eligible: number;
  duplicatePredictionIds: string[];
}

export interface CalibrationBin {
  binLow: number;
  binHigh: number;
  count: number;
  meanPredicted: number | null;
  actualFailureRate: number | null;
}

export interface BaselineComparison {
  id: "global" | "model" | "model-route";
  /** Predictions where BOTH the predictor and this baseline produced a score. */
  matchedCount: number;
  predictorBrier: number | null;
  baselineBrier: number | null;
}

export interface TierBreakdown {
  key: string;
  count: number;
  brier: number | null;
  actualFailureRate: number | null;
}

export interface WalkForwardResult {
  eligible: number;
  scorable: number;
  coverage: number | null;
  brier: number | null;
  calibration: CalibrationBin[];
  auroc: number | null;
  baselineComparisons: BaselineComparison[];
  byTier: TierBreakdown[];
  byEvidenceQuality: TierBreakdown[];
  /** Duplicate prediction ids surfaced (deterministic first-in-order wins). */
  duplicatePredictionIds: string[];
}

function actualFailureOf(outcome: RouteOutcome): 0 | 1 | null {
  if (outcome.delivery.status === "failure") return 1;
  if (outcome.delivery.status === "success") return 0;
  return null;
}

/** Brier score: mean squared error of probabilistic predictions. Lower is better. */
export function brierScore(points: { predicted: number; actual: number }[]): number | null {
  if (points.length === 0) return null;
  let sum = 0;
  for (const p of points) {
    const d = p.predicted - p.actual;
    sum += d * d;
  }
  return sum / points.length;
}

/** Area under ROC via the Mann-Whitney U rank statistic (handles ties via average ranks). */
export function computeAuroc(points: { predicted: number; actual: number }[]): number | null {
  const failures = points.filter((p) => p.actual === 1);
  const successes = points.filter((p) => p.actual === 0);
  if (failures.length === 0 || successes.length === 0) return null;

  const sorted = [...points].sort((a, b) => a.predicted - b.predicted);
  const ranks: number[] = new Array(sorted.length).fill(0);
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j < sorted.length && sorted[j].predicted === sorted[i].predicted) j++;
    const avgRank = (i + 1 + j) / 2; // 1-indexed average rank for the tie group
    for (let k = i; k < j; k++) ranks[k] = avgRank;
    i = j;
  }

  let sumFailRanks = 0;
  for (let k = 0; k < sorted.length; k++) {
    if (sorted[k].actual === 1) sumFailRanks += ranks[k];
  }
  const n1 = failures.length;
  const n0 = successes.length;
  const u = sumFailRanks - (n1 * (n1 + 1)) / 2;
  return u / (n1 * n0);
}

/** Fixed-bin calibration: 10 bins over [0, 1). */
export function calibrationBins(points: { predicted: number; actual: number }[], numBins = 10): CalibrationBin[] {
  const bins: CalibrationBin[] = [];
  for (let b = 0; b < numBins; b++) {
    const binLow = b / numBins;
    const binHigh = (b + 1) / numBins;
    const inBin = points.filter((p) => p.predicted >= binLow && p.predicted < binHigh);
    const count = inBin.length;
    const meanPredicted = count > 0 ? inBin.reduce((a, p) => a + p.predicted, 0) / count : null;
    const actualFailureRate = count > 0 ? inBin.reduce((a, p) => a + p.actual, 0) / count : null;
    bins.push({ binLow, binHigh, count, meanPredicted, actualFailureRate });
  }
  return bins;
}

function cohortRisk(outcomes: RouteOutcome[]): number | null {
  let failures = 0;
  let total = 0;
  for (const o of outcomes) {
    const f = actualFailureOf(o);
    if (f === null) continue;
    total += 1;
    failures += f;
  }
  return total > 0 ? failures / total : null;
}

export function extractCanonicalObservations(
  predictions: RoutePrediction[],
  outcomes: RouteOutcome[]
): CanonicalObservationResult {
  const outcomeByRequest = new Map<string, RouteOutcome>();
  for (const o of outcomes) {
    if (o.requestId) outcomeByRequest.set(o.requestId, o);
  }

  const sorted = [...predictions].sort((a, b) => {
    const ta = a.predictedAt;
    const tb = b.predictedAt;
    if (ta !== tb) return ta < tb ? -1 : 1;
    if (a.requestId !== b.requestId) return a.requestId < b.requestId ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });

  const seen = new Set<string>();
  const duplicatePredictionIds: string[] = [];
  const unique = sorted.filter((p) => {
    if (seen.has(p.id)) {
      duplicatePredictionIds.push(p.id);
      return false;
    }
    seen.add(p.id);
    return true;
  });

  const observations: CanonicalObservation[] = [];
  let eligible = 0;

  for (const p of unique) {
    const outcome = outcomeByRequest.get(p.requestId);
    if (!outcome) continue;
    const actual = actualFailureOf(outcome);
    if (actual === null) continue;
    if (!outcome.observedAt) continue;
    if (!(outcome.observedAt > p.predictedAt)) continue; // strict: equal excluded
    
    eligible += 1;
    
    observations.push({
      prediction: p,
      outcome: outcome,
      actualFailure: actual,
      predictedRisk: (typeof p.failureRisk === "number" && Number.isFinite(p.failureRisk)) ? p.failureRisk : null
    });
  }

  return {
    observations,
    eligible,
    duplicatePredictionIds
  };
}

/**
 * Walk-forward evaluation. For each prediction at time T, only historical
 * outcomes observed strictly before T may inform baselines; the prediction's
 * own outcome must have been observed strictly after T to be scorable. Equal
 * timestamps are excluded. Deterministic regardless of input array order.
 */
export function evaluateWalkForward(
  predictions: RoutePrediction[],
  outcomes: RouteOutcome[]
): WalkForwardResult {
  const { observations, eligible, duplicatePredictionIds } = extractCanonicalObservations(predictions, outcomes);
  const labeledOutcomes = outcomes.filter((o) => actualFailureOf(o) !== null);

  const points: EvalPoint[] = observations
    .filter((o) => o.predictedRisk !== null)
    .map((o) => ({
      prediction: o.prediction,
      actualFailure: o.actualFailure,
      predictedRisk: o.predictedRisk as number,
    }));

  const scorable = points.length;
  const coverage = eligible > 0 ? scorable / eligible : null;
  const brier = brierScore(points.map((p) => ({ predicted: p.predictedRisk, actual: p.actualFailure })));
  const calibration = calibrationBins(points.map((p) => ({ predicted: p.predictedRisk, actual: p.actualFailure })));
  const auroc = computeAuroc(points.map((p) => ({ predicted: p.predictedRisk, actual: p.actualFailure })));

  // Baselines computed walk-forward: only outcomes observed strictly before T.
  const baselineDefs: Array<{
    id: BaselineComparison["id"];
    cohort: (p: RoutePrediction) => RouteOutcome[];
  }> = [
    {
      id: "global",
      cohort: () => labeledOutcomes,
    },
    {
      id: "model",
      cohort: (p) =>
        labeledOutcomes.filter(
          (o) => o.selectedModel === p.features.selectedModel
        ),
    },
    {
      id: "model-route",
      cohort: (p) =>
        labeledOutcomes.filter(
          (o) => o.selectedModel === p.features.selectedModel && o.routeId === p.features.routeId
        ),
    },
  ];

  const baselineComparisons: BaselineComparison[] = baselineDefs.map((def) => {
    let matched = 0;
    let predictorSum = 0;
    let baselineSum = 0;
    for (const point of points) {
      const prior = def.cohort(point.prediction).filter(
        (o) => o.observedAt && o.observedAt < point.prediction.predictedAt
      );
      const baselineRisk = cohortRisk(prior);
      if (baselineRisk === null) continue; // baseline produced no score
      matched += 1;
      const d = point.predictedRisk - point.actualFailure;
      predictorSum += d * d;
      const bd = baselineRisk - point.actualFailure;
      baselineSum += bd * bd;
    }
    return {
      id: def.id,
      matchedCount: matched,
      predictorBrier: matched > 0 ? predictorSum / matched : null,
      baselineBrier: matched > 0 ? baselineSum / matched : null,
    };
  });

  function breakdownBy(
    keyOf: (p: EvalPoint) => string
  ): TierBreakdown[] {
    const map = new Map<string, EvalPoint[]>();
    for (const p of points) {
      const k = keyOf(p);
      const list = map.get(k) || [];
      list.push(p);
      map.set(k, list);
    }
    const entries = [...map.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
    return entries.map(([key, list]) => ({
      key,
      count: list.length,
      brier: brierScore(list.map((p) => ({ predicted: p.predictedRisk, actual: p.actualFailure }))),
      actualFailureRate: list.length > 0 ? list.reduce((a, p) => a + p.actualFailure, 0) / list.length : null,
    }));
  }

  const byTier = breakdownBy((p) => p.prediction.precedentTier);
  const byEvidenceQuality = breakdownBy((p) => p.prediction.evidenceQuality);

  return {
    eligible,
    scorable,
    coverage,
    brier,
    calibration,
    auroc,
    baselineComparisons,
    byTier,
    byEvidenceQuality,
    duplicatePredictionIds,
  };
}
