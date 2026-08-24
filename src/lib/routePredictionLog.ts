import {
  ROUTE_PREDICTION_SCHEMA_VERSION,
  isRoutePrediction,
  type RoutePrediction,
  type RoutePredictionFeatures,
} from "./routePredictionTypes";

const STORAGE_KEY = "rei_route_prediction_log";
export const MAX_PREDICTION_ENTRIES = 500;

/**
 * Deterministic, idempotent prediction identity. One delivery prediction per
 * predictor version per request. No array position, no randomness.
 */
export function createPredictionId(
  requestId: string,
  predictorVersion: string,
  target: RoutePrediction["target"] = "delivery_failure"
): string {
  return `prediction:${requestId}:${predictorVersion}:${target}`;
}

export interface BuildPredictionInput {
  requestId: string;
  predictorVersion: string;
  features: RoutePredictionFeatures;
  predictedAt?: string;
  /** PR 2 has no predictor yet — risk/support default to the no-evidence state. */
  failureRisk?: number | null;
  support?: { total: number; successes: number; failures: number };
  evidenceQuality?: RoutePrediction["evidenceQuality"];
  precedentTier?: RoutePrediction["precedentTier"];
}

/**
 * Construct a RoutePrediction. Defaults to the "no predictor" state that PR 2
 * legitimately produces: null risk, zero support, unavailable evidence, none tier.
 * The corpus window is anchored to predictedAt (no historical lookup yet).
 */
export function buildRoutePrediction(input: BuildPredictionInput): RoutePrediction {
  const predictedAt = input.predictedAt || new Date().toISOString();
  const support = input.support ?? { total: 0, successes: 0, failures: 0 };
  return {
    schemaVersion: ROUTE_PREDICTION_SCHEMA_VERSION,
    id: createPredictionId(input.requestId, input.predictorVersion),
    requestId: input.requestId,
    predictorVersion: input.predictorVersion,
    target: "delivery_failure",
    predictedAt,
    features: input.features,
    failureRisk: input.failureRisk ?? null,
    support,
    evidenceQuality: input.evidenceQuality ?? "unavailable",
    precedentTier: input.precedentTier ?? "none",
    corpusWindow: { before: predictedAt },
  };
}

/**
 * Durably persist a shadow prediction. Fail-closed: an invalid prediction is
 * rejected (not stored); a storage failure is swallowed so it can never break
 * routing or the user response. Idempotent per deterministic id.
 */
export function logRoutePrediction(prediction: RoutePrediction): void {
  if (typeof window === "undefined") return;
  if (!isRoutePrediction(prediction)) {
    console.warn("Refusing to persist invalid route prediction");
    return;
  }
  try {
    const store = getPredictions();
    const filtered = store.filter((p) => p.id !== prediction.id);
    filtered.unshift(prediction);
    if (filtered.length > MAX_PREDICTION_ENTRIES) {
      filtered.length = MAX_PREDICTION_ENTRIES;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn("Unable to persist route prediction:", e);
  }
}

export function getPredictions(filter?: {
  requestId?: string;
  predictorVersion?: string;
}): RoutePrediction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const all = Array.isArray(parsed) ? parsed.filter(isRoutePrediction) : [];
    if (!filter) return all;
    return all.filter(
      (p) =>
        (filter.requestId === undefined || p.requestId === filter.requestId) &&
        (filter.predictorVersion === undefined || p.predictorVersion === filter.predictorVersion)
    );
  } catch {
    return [];
  }
}

export function clearPredictions(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
