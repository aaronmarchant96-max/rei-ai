import {
  ROUTE_PREDICTION_SCHEMA_VERSION,
  type AdversarialBand,
  type HingeBand,
  type InputSizeBand,
  type RoutePredictionFeatures,
} from "./routePredictionTypes";

/**
 * Pre-execution signals: everything REI is allowed to know BEFORE the provider
 * call. This type deliberately excludes every outcome-side field so a feature
 * vector cannot leak post-execution evidence by construction.
 */
export interface PreExecutionSignals {
  routeId: string;
  domain?: string;
  selectedModel?: string;
  hingeScore?: number;
  structured?: boolean;
  escalationExpected?: boolean;
  /** Red-team D1 verdict (clean | suspicious | high-risk | critical). */
  adversarialVerdict?: string | null;
  /** Raw input length in characters. Never persist the prompt itself. */
  inputLength?: number;
}

function nonEmpty(value?: string): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

/**
 * Hinge band reuses the existing complexity thresholds:
 *   < 0.3            → low    (policyProposalEngine LOW_COMPLEXITY_HINGE)
 *   >= 0.50          → high   (nightShiftRouter high-complexity hinge)
 *   [0.3, 0.50)      → medium
 *   absent/non-finite → unknown
 */
export function hingeBandForScore(score?: number): HingeBand {
  if (typeof score !== "number" || !Number.isFinite(score)) return "unknown";
  if (score < 0.3) return "low";
  if (score >= 0.5) return "high";
  return "medium";
}

/**
 * Adversarial band from the D1 scanner verdict. `critical` and `high-risk`
 * both collapse to `high`; only `clean` and `suspicious` stay distinct.
 */
export function adversarialBandForVerdict(verdict?: string | null): AdversarialBand {
  if (verdict === "clean") return "clean";
  if (verdict === "suspicious") return "suspicious";
  if (verdict === "high-risk" || verdict === "critical") return "high";
  return "unknown";
}

/**
 * Input-size band from raw character length. No prompt content is retained —
 * only the length-derived band. Thresholds are v1 defaults (no pre-existing
 * canonical size classification exists in the repository).
 */
export function inputSizeBandForLength(length?: number): InputSizeBand {
  if (typeof length !== "number" || !Number.isFinite(length) || length < 0) return "unknown";
  if (length <= 250) return "tiny";
  if (length <= 1000) return "small";
  if (length <= 4000) return "medium";
  if (length <= 16000) return "large";
  return "very-large";
}

/**
 * Pure deterministic derivation of the privacy-preserving prediction feature
 * vector from pre-execution signals. Returns null when a required signal
 * (routeId) is absent — "feature derivation fails → no prediction".
 */
export function derivePredictionFeatures(
  signals: PreExecutionSignals
): RoutePredictionFeatures | null {
  const routeId = nonEmpty(signals.routeId);
  if (!routeId) return null;

  return {
    schemaVersion: ROUTE_PREDICTION_SCHEMA_VERSION,
    routeId,
    domain: nonEmpty(signals.domain),
    selectedModel: nonEmpty(signals.selectedModel),
    hingeBand: hingeBandForScore(signals.hingeScore),
    structured: signals.structured === true,
    escalationExpected: signals.escalationExpected === true,
    adversarialBand: adversarialBandForVerdict(signals.adversarialVerdict),
    inputSizeBand: inputSizeBandForLength(signals.inputLength),
  };
}
