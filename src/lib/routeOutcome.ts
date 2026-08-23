import type { RoutingLogEntry } from "./routingLog";
import type { EvalEntry } from "./evalLog";

export const ROUTE_OUTCOME_SCHEMA_VERSION = 1 as const;

export type ModelIdentityProvenance = "observed" | "derived" | "unavailable";
export type DeliveryStatus = "success" | "failure" | "unknown";
export type QualityStatus = "pass" | "fail" | "unknown";
export type SafetyStatus = "pass" | "fail" | "unknown";
export type RoutingPolicyStatus = "correct" | "incorrect" | "unknown";

/** Which raw routing signals were present and considered in the delivery
 * derivation. Ordered deterministically. */
export type DeliveryBasis =
  | "status"
  | "finalTruncated"
  | "truncated"
  | "rescue"
  | "continuations";

export interface RouteOutcome {
  schemaVersion: typeof ROUTE_OUTCOME_SCHEMA_VERSION;
  requestId: string;
  routeId?: string;
  /** Model the router selected pre-API (routingLog.model). */
  selectedModel?: string;
  /** Model that actually executed (resolvedModel, falling back to model). */
  executedModel?: string;
  modelIdentityProvenance: ModelIdentityProvenance;
  delivery: {
    status: DeliveryStatus;
    /** Delivery is always a derivation over raw signals — never a raw observation. */
    provenance: "derived";
    basis: DeliveryBasis[];
  };
  execution: {
    rescue?: boolean;
    truncated?: boolean;
    finalTruncated?: boolean;
    continuations?: number;
    totalChunks?: number;
    tokenCount?: number;
    actualTokens?: number;
    actualCost?: number;
  };
  quality: {
    status: QualityStatus;
    evaluations: string[];
  };
  safety: {
    status: SafetyStatus;
    evaluations: string[];
  };
  routingPolicy: {
    status: RoutingPolicyStatus;
  };
  createdAt?: string;
}

function nonEmpty(value?: string): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function deriveModelIdentity(routing: RoutingLogEntry): {
  selectedModel?: string;
  executedModel?: string;
  modelIdentityProvenance: ModelIdentityProvenance;
} {
  const selectedModel = nonEmpty(routing.model);
  const executedModel = nonEmpty(routing.resolvedModel) || selectedModel;

  let modelIdentityProvenance: ModelIdentityProvenance;
  if (nonEmpty(routing.resolvedModel)) {
    modelIdentityProvenance = "observed";
  } else if (selectedModel) {
    // No distinct resolved identity — executed model is inferred from selection.
    modelIdentityProvenance = "derived";
  } else {
    modelIdentityProvenance = "unavailable";
  }

  return { selectedModel, executedModel, modelIdentityProvenance };
}

/**
 * Conservative delivery derivation.
 *
 *   status === "error"                                     → failure
 *   finalTruncated === true                                → failure
 *   status === "success" && finalTruncated === false       → success
 *   otherwise                                              → unknown
 *
 * A `truncated === true` with `finalTruncated === false` remains success —
 * a continuation repaired the initial truncation. `rescue` annotates the path;
 * it never forces failure. Missing telemetry → unknown, never success.
 */
function deriveDelivery(routing: RoutingLogEntry): {
  status: DeliveryStatus;
  basis: DeliveryBasis[];
} {
  const basis: DeliveryBasis[] = [];
  if (routing.status !== undefined) basis.push("status");
  if (routing.finalTruncated !== undefined) basis.push("finalTruncated");
  if (routing.truncated !== undefined) basis.push("truncated");
  if (routing.rescue !== undefined) basis.push("rescue");
  if (routing.continuations !== undefined) basis.push("continuations");

  let status: DeliveryStatus;
  if (routing.status === "error") {
    status = "failure";
  } else if (routing.finalTruncated === true) {
    status = "failure";
  } else if (routing.status === "success" && routing.finalTruncated === false) {
    status = "success";
  } else {
    status = "unknown";
  }

  return { status, basis };
}

/** Evaluator label for provenance lists: prefer the specific version, else the type. */
function evaluatorLabel(entry: EvalEntry): string {
  return entry.evaluatorVersion && entry.evaluatorVersion.trim()
    ? entry.evaluatorVersion
    : entry.evaluator;
}

/**
 * Quality has no defined pass contract in v1. A qualityScore is a number until a
 * producing evaluator publishes a pass threshold — so v1 reports `unknown` while
 * retaining which evaluators produced a score. `pass`/`fail` remain reserved for
 * a future, explicitly calibrated contract.
 */
function deriveQuality(evals: EvalEntry[]): { status: QualityStatus; evaluations: string[] } {
  const evaluations = evals
    .filter((e) => typeof e.evaluation?.qualityScore === "number")
    .map(evaluatorLabel);
  return { status: "unknown", evaluations };
}

const SAFETY_MAP: Record<string, SafetyStatus> = {
  clean: "pass",
  critical: "fail",
  suspicious: "unknown",
  "high-risk": "unknown",
};

function deriveSafety(evals: EvalEntry[]): { status: SafetyStatus; evaluations: string[] } {
  const withVerdict = evals.filter((e) => e.evaluation?.safetyVerdict !== undefined);
  const evaluations = withVerdict.map(evaluatorLabel);

  const statuses = withVerdict.map((e) => SAFETY_MAP[e.evaluation.safetyVerdict as string]);
  let status: SafetyStatus = "unknown";
  if (statuses.includes("fail")) status = "fail";
  else if (statuses.includes("pass")) status = "pass";
  return { status, evaluations };
}

function deriveRoutingPolicy(evals: EvalEntry[]): { status: RoutingPolicyStatus } {
  const withRoute = evals.filter((e) => typeof e.evaluation?.routeCorrect === "boolean");
  const anyIncorrect = withRoute.some((e) => e.evaluation.routeCorrect === false);
  const anyCorrect = withRoute.some((e) => e.evaluation.routeCorrect === true);

  let status: RoutingPolicyStatus = "unknown";
  if (anyIncorrect) status = "incorrect";
  else if (anyCorrect) status = "correct";
  return { status };
}

/**
 * Pure deterministic join of a routing record and its correlated evaluations into
 * a canonical RouteOutcome. No new store — projection over existing authorities.
 * Returns null when the routing record cannot be correlated (missing requestId).
 */
export function buildRouteOutcome(
  routing: RoutingLogEntry,
  evals: EvalEntry[] = []
): RouteOutcome | null {
  const requestId = nonEmpty(routing.requestId);
  if (!requestId) return null;

  const identity = deriveModelIdentity(routing);
  const delivery = deriveDelivery(routing);
  const quality = deriveQuality(evals);
  const safety = deriveSafety(evals);
  const routingPolicy = deriveRoutingPolicy(evals);

  return {
    schemaVersion: ROUTE_OUTCOME_SCHEMA_VERSION,
    requestId,
    routeId: nonEmpty(routing.routeId),
    selectedModel: identity.selectedModel,
    executedModel: identity.executedModel,
    modelIdentityProvenance: identity.modelIdentityProvenance,
    delivery: {
      status: delivery.status,
      provenance: "derived",
      basis: delivery.basis,
    },
    execution: {
      rescue: routing.rescue,
      truncated: routing.truncated,
      finalTruncated: routing.finalTruncated,
      continuations: routing.continuations,
      totalChunks: routing.totalChunks,
      tokenCount: routing.tokenCount,
      actualTokens: routing.actualTokens,
      actualCost: routing.actualCost,
    },
    quality,
    safety,
    routingPolicy,
    createdAt: nonEmpty(routing.timestamp),
  };
}
