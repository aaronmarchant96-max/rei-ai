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
  sourceStore: "routing" | "decision" | "evaluation";
  sourceRecordId: string;
}

export interface ActivityProjection {
  schemaVersion: typeof ACTIVITY_SCHEMA_VERSION;
  requestId: string;
  status: ActivityProjectionStatus;
  sources: ActivitySourceAvailability;
  events: ActivityEvent[];
}
