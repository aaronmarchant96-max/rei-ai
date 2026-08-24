export const ROUTE_PREDICTION_SCHEMA_VERSION = 1 as const;

export type HingeBand = "low" | "medium" | "high" | "unknown";
export type AdversarialBand = "clean" | "suspicious" | "high" | "unknown";
export type InputSizeBand = "tiny" | "small" | "medium" | "large" | "very-large" | "unknown";
export type EvidenceQuality = "unavailable" | "sparse" | "supported";
export type PrecedentTier = "exact" | "relaxed" | "model-route" | "none";
export type PredictionTarget = "delivery_failure";

export interface RoutePredictionFeatures {
  schemaVersion: typeof ROUTE_PREDICTION_SCHEMA_VERSION;
  routeId: string;
  domain?: string;
  /** The model the router believed would execute — never backfilled from outcome. */
  selectedModel?: string;
  hingeBand: HingeBand;
  structured: boolean;
  escalationExpected: boolean;
  adversarialBand: AdversarialBand;
  inputSizeBand: InputSizeBand;
}

export interface RoutePrediction {
  schemaVersion: typeof ROUTE_PREDICTION_SCHEMA_VERSION;
  id: string;
  requestId: string;
  predictorVersion: string;
  target: PredictionTarget;
  predictedAt: string;
  features: RoutePredictionFeatures;
  failureRisk: number | null;
  /** Wilson 95% binomial interval. Absent when there is no evidence. */
  riskInterval95?: { low: number; high: number } | null;
  support: {
    total: number;
    successes: number;
    failures: number;
  };
  evidenceQuality: EvidenceQuality;
  precedentTier: PrecedentTier;
  corpusWindow: {
    before: string;
    earliest?: string;
  };
}

const HINGE_BANDS: readonly HingeBand[] = ["low", "medium", "high", "unknown"];
const ADVERSARIAL_BANDS: readonly AdversarialBand[] = ["clean", "suspicious", "high", "unknown"];
const INPUT_SIZE_BANDS: readonly InputSizeBand[] = ["tiny", "small", "medium", "large", "very-large", "unknown"];
const EVIDENCE_QUALITIES: readonly EvidenceQuality[] = ["unavailable", "sparse", "supported"];
const PRECEDENT_TIERS: readonly PrecedentTier[] = ["exact", "relaxed", "model-route", "none"];

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isIsoTimestamp(v: unknown): v is string {
  return typeof v === "string" && !Number.isNaN(Date.parse(v));
}

function isFiniteNonNegativeInteger(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}

export function isRoutePredictionFeatures(value: unknown): value is RoutePredictionFeatures {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const f = value as Partial<RoutePredictionFeatures>;
  return (
    f.schemaVersion === ROUTE_PREDICTION_SCHEMA_VERSION &&
    isNonEmptyString(f.routeId) &&
    (f.domain === undefined || isNonEmptyString(f.domain)) &&
    (f.selectedModel === undefined || isNonEmptyString(f.selectedModel)) &&
    (HINGE_BANDS as readonly string[]).includes(f.hingeBand as string) &&
    typeof f.structured === "boolean" &&
    typeof f.escalationExpected === "boolean" &&
    (ADVERSARIAL_BANDS as readonly string[]).includes(f.adversarialBand as string) &&
    (INPUT_SIZE_BANDS as readonly string[]).includes(f.inputSizeBand as string)
  );
}

/**
 * Runtime validation for persisted predictions. TypeScript alone is not enough —
 * localStorage may hold legacy or corrupted records. Enforces the "no evidence
 * must not become zero risk" invariant: when support.total is 0, failureRisk
 * must be null (an unavailable estimate, not a fabricated 0%).
 */
export function isRoutePrediction(value: unknown): value is RoutePrediction {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const p = value as Partial<RoutePrediction>;

  if (p.schemaVersion !== ROUTE_PREDICTION_SCHEMA_VERSION) return false;
  if (!isNonEmptyString(p.id)) return false;
  if (!isNonEmptyString(p.requestId)) return false;
  if (!isNonEmptyString(p.predictorVersion)) return false;
  if (p.target !== "delivery_failure") return false;
  if (!isIsoTimestamp(p.predictedAt)) return false;
  if (!isRoutePredictionFeatures(p.features)) return false;

  const support = p.support;
  if (!support || typeof support !== "object" || Array.isArray(support)) return false;
  if (!isFiniteNonNegativeInteger(support.total)) return false;
  if (!isFiniteNonNegativeInteger(support.successes)) return false;
  if (!isFiniteNonNegativeInteger(support.failures)) return false;
  if (support.successes + support.failures !== support.total) return false;

  // failureRisk: null, or a finite probability in [0, 1] backed by evidence.
  if (p.failureRisk !== null && p.failureRisk !== undefined) {
    if (typeof p.failureRisk !== "number" || !Number.isFinite(p.failureRisk)) return false;
    if (p.failureRisk < 0 || p.failureRisk > 1) return false;
  }
  if (support.total === 0 && p.failureRisk !== null && p.failureRisk !== undefined) {
    return false;
  }

  // riskInterval95: optional; when present must be a bounded 0..1 interval.
  if (p.riskInterval95 !== undefined && p.riskInterval95 !== null) {
    const interval = p.riskInterval95;
    if (!interval || typeof interval !== "object" || Array.isArray(interval)) return false;
    const low = (interval as { low?: unknown }).low;
    const high = (interval as { high?: unknown }).high;
    if (typeof low !== "number" || !Number.isFinite(low) || low < 0 || low > 1) return false;
    if (typeof high !== "number" || !Number.isFinite(high) || high < 0 || high > 1) return false;
    if (low > high) return false;
  }
  // A risk interval without evidence is invalid (same no-evidence rule).
  if (support.total === 0 && p.riskInterval95 !== undefined && p.riskInterval95 !== null) {
    return false;
  }

  if (!(EVIDENCE_QUALITIES as readonly string[]).includes(p.evidenceQuality as string)) return false;
  if (!(PRECEDENT_TIERS as readonly string[]).includes(p.precedentTier as string)) return false;

  const window_ = p.corpusWindow;
  if (!window_ || typeof window_ !== "object" || Array.isArray(window_)) return false;
  if (!isIsoTimestamp(window_.before)) return false;
  if (window_.earliest !== undefined && !isIsoTimestamp(window_.earliest)) return false;

  return true;
}
