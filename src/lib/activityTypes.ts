export const ACTIVITY_SCHEMA_VERSION = 1 as const;

export type ActivityCategory =
  | "routing"
  | "hinge"
  | "research"
  | "security"
  | "economics"
  | "strategic"
  | "prediction"
  | "evaluation"
  | "system";

export type ActivityStatus = "success" | "warning" | "error" | "info";
export type ActivityProjectionStatus = "complete" | "partial" | "legacy" | "orphaned";
export type ActivitySourceState = "present" | "missing" | "expired" | "legacy" | "not_expected";

/**
 * Delivery completeness — whether the user-visible answer fulfilled its contract.
 * Distinct from evidence coverage: a request can be fully evidenced yet fail to
 * deliver a complete answer (or vice versa).
 */
export type DeliveryStatus = "complete" | "incomplete" | "failed" | "unknown";

/**
 * Evidence coverage — whether the telemetry sources (routing/decision/evaluation)
 * are present. This is about records existing, NOT about the answer's quality.
 */
export type EvidenceCoverage = "complete" | "partial" | "legacy" | "orphaned";

export interface ActivitySourceAvailability {
  routing: Exclude<ActivitySourceState, "not_expected">;
  decision: Exclude<ActivitySourceState, "not_expected">;
  evaluation: ActivitySourceState;
}

export interface ActivityEvent {
  schemaVersion: typeof ACTIVITY_SCHEMA_VERSION;
  id: string;
  requestId: string;
  parentEventId?: string;
  timestamp: string;
  category: ActivityCategory;
  type: string;
  stage: string;
  status: ActivityStatus;
  summary: string;
  details?: Record<string, unknown>;
  sourceStore: "routing" | "decision" | "evaluation" | "prediction";
  sourceRecordId: string;
}

export interface ActivityProjection {
  schemaVersion: typeof ACTIVITY_SCHEMA_VERSION;
  requestId: string;
  /** Evidence coverage (telemetry records present). Kept for backward-compat as the
   *  single `status` field, now explicitly evidence-only. */
  status: ActivityProjectionStatus;
  /** Delivery completeness (did the user-visible answer fulfill its contract). */
  delivery: DeliveryStatus;
  sources: ActivitySourceAvailability;
  events: ActivityEvent[];
}
