import { getDecisions, type DecisionEntry } from "./decisionStore";
import { getEvals, type EvalEntry } from "./evalLog";
import { getLogs, type RoutingLogEntry } from "./routingLog";
import { getPredictions } from "./routePredictionLog";
import type { RoutePrediction } from "./routePredictionTypes";
import {
  ACTIVITY_SCHEMA_VERSION,
  type ActivityEvent,
  type ActivityProjection,
  type ActivitySourceState,
} from "./activityTypes";

export interface ActivitySources {
  routing: RoutingLogEntry[];
  decisions: DecisionEntry[];
  evaluations: EvalEntry[];
  /** Optional additive source. Absence never downgrades projection completeness. */
  predictions?: RoutePrediction[];
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function legacySourceId(source: "routing" | "decision" | "evaluation", record: unknown): string {
  return `${source}:legacy:${stableHash(JSON.stringify(record))}`;
}

function sourceState(
  record: { id?: string; schemaVersion?: number } | undefined,
  schemaRequired = false
): ActivitySourceState {
  if (!record) return "missing";
  return record.id && (!schemaRequired || record.schemaVersion === ACTIVITY_SCHEMA_VERSION)
    ? "present"
    : "legacy";
}

function timestampValue(value: string | undefined): number {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function event(
  requestId: string,
  sourceStore: ActivityEvent["sourceStore"],
  sourceRecordId: string,
  timestamp: string | undefined,
  type: string,
  category: ActivityEvent["category"],
  stage: string,
  summary: string,
  details?: Record<string, unknown>
): ActivityEvent {
  return {
    schemaVersion: ACTIVITY_SCHEMA_VERSION,
    id: `${sourceRecordId}:${type}`,
    requestId,
    timestamp: timestamp || "1970-01-01T00:00:00.000Z",
    category,
    type,
    stage,
    status: "success",
    summary,
    details,
    sourceStore,
    sourceRecordId,
  };
}

export function projectActivity(requestId: string, sources: ActivitySources): ActivityProjection {
  if (!requestId.trim()) throw new Error("Activity projection requires requestId");

  const routing = sources.routing.find((entry) => entry.requestId === requestId);
  const decision = sources.decisions.find((entry) => entry.requestId === requestId);
  const evaluations = sources.evaluations.filter((entry) => entry.requestId === requestId);
  const predictions = (sources.predictions || []).filter((entry) => entry.requestId === requestId);
  const prediction = predictions[0] || undefined;
  const routingState = sourceState(routing);
  const decisionState = sourceState(decision, true);
  const evaluationState: ActivitySourceState = evaluations.length
    ? evaluations.some((entry) => !entry.id) ? "legacy" : "present"
    : routing?.routeId === "simple-greeting" ? "not_expected" : "missing";

  const events: ActivityEvent[] = [];
  if (routing) {
    const sourceId = routing.id || legacySourceId("routing", routing);
    events.push(event(
      requestId,
      "routing",
      sourceId,
      routing.timestamp,
      "routing.request_routed",
      "routing",
      "route",
      "Request routed",
      { routeId: routing.routeId, model: routing.resolvedModel || routing.model, status: routing.status }
    ));
    if (routing.outcomeObservedAt) {
      events.push(event(
        requestId,
        "routing",
        sourceId,
        routing.outcomeObservedAt,
        "routing.outcome_observed",
        "routing",
        "outcome",
        "Route outcome observed",
        {
          status: routing.status,
          resolvedModel: routing.resolvedModel,
          finalTruncated: routing.finalTruncated,
          rescue: routing.rescue,
          continuations: routing.continuations,
        }
      ));
    }
  }
  if (prediction) {
    events.push(event(
      requestId,
      "prediction",
      prediction.id,
      prediction.predictedAt,
      "prediction.shadow_created",
      "prediction",
      "predict",
      "Shadow delivery-risk prediction recorded",
      {
        target: prediction.target,
        predictorVersion: prediction.predictorVersion,
        failureRisk: prediction.failureRisk,
        support: prediction.support.total,
        evidenceQuality: prediction.evidenceQuality,
        precedentTier: prediction.precedentTier,
        riskInterval95: prediction.riskInterval95,
      }
    ));
  }
  if (decision) {
    const sourceId = decision.id || legacySourceId("decision", decision);
    events.push(event(
      requestId,
      "decision",
      sourceId,
      decision.createdAt,
      "decision.recorded",
      "hinge",
      "record",
      "Decision artifact recorded",
      { sectionCount: Object.values(decision.sections || {}).filter(Boolean).length }
    ));
    if (decision.strategicSituation) {
      events.push(event(
        requestId,
        "decision",
        sourceId,
        decision.createdAt,
        "strategic.analysis_recorded",
        "strategic",
        "analyze",
        "Strategic analysis recorded",
        { playerCount: decision.strategicSituation.players.length }
      ));
    }
  }
  for (const evaluation of evaluations) {
    const sourceId = evaluation.id || legacySourceId("evaluation", evaluation);
    events.push(event(
      requestId,
      "evaluation",
      sourceId,
      evaluation.evaluation.evaluatedAt,
      "evaluation.recorded",
      "evaluation",
      "evaluate",
      "Evaluation recorded",
      { evaluator: evaluation.evaluator, safetyVerdict: evaluation.evaluation.safetyVerdict }
    ));
  }

  events.sort((left, right) => timestampValue(left.timestamp) - timestampValue(right.timestamp) || left.id.localeCompare(right.id));

  const hasDownstream = Boolean(decision || evaluations.length);
  const expectedMissing = decisionState === "missing" || evaluationState === "missing";
  const hasLegacy = routingState === "legacy" || decisionState === "legacy" || evaluationState === "legacy";
  const status = !routing && hasDownstream
    ? "orphaned"
    : expectedMissing
      ? "partial"
      : hasLegacy
        ? "legacy"
        : "complete";

  return {
    schemaVersion: ACTIVITY_SCHEMA_VERSION,
    requestId,
    status,
    sources: {
      routing: routingState === "not_expected" ? "missing" : routingState,
      decision: decisionState === "not_expected" ? "missing" : decisionState,
      evaluation: evaluationState,
    },
    events,
  };
}

export function projectStoredActivity(requestId: string): ActivityProjection {
  return projectActivity(requestId, {
    routing: getLogs(),
    decisions: getDecisions(),
    evaluations: getEvals(),
    predictions: getPredictions(),
  });
}

export function projectStoredSessionActivity(): ActivityProjection[] {
  const sources = {
    routing: getLogs(),
    decisions: getDecisions(),
    evaluations: getEvals(),
    predictions: getPredictions(),
  };
  const requestIds = new Set<string>();
  for (const record of [...sources.routing, ...sources.decisions, ...sources.evaluations, ...sources.predictions]) {
    if (record.requestId) requestIds.add(record.requestId);
  }
  return [...requestIds].map((requestId) => projectActivity(requestId, sources));
}

export function exportActivityJSON(
  projections: ActivityProjection[],
  options: { redact?: boolean } = {}
): string {
  const redact = options.redact !== false;
  const safeProjections = redact
    ? projections.map((projection) => ({
        ...projection,
        events: projection.events.map(({ details: _details, ...safeEvent }) => safeEvent),
      }))
    : projections;
  return JSON.stringify({
    schemaVersion: ACTIVITY_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    projectionCount: projections.length,
    projections: safeProjections,
  }, null, 2);
}
