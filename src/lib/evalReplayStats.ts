import { getEvals } from "./evalLog";

export interface EvalAggregate {
  totalEvaluated: number;
  escalatedCount: number;
  hits: number;
  misses: number;
  adherencePct: number | null;
  safetyFailures: number;
}

/** Recompute route-adherence aggregates from eval-log entries (deterministic).
 *  Mirrors the Analytics in-app aggregation but operates on a real exported
 *  corpus (or the live store) so the metric stays reproducible offline.
 */
export function computeEvalReplay(entries: ReturnType<typeof getEvals>): EvalAggregate {
  const escalated = entries.filter((e) => e.evaluation.routeExpected === true);
  const hits = escalated.filter((e) => e.evaluation.routeCorrect === true).length;
  const misses = escalated.length - hits;
  const safetyFailures = entries.filter(
    (e) => e.evaluation.safetyVerdict && e.evaluation.safetyVerdict !== "clean"
  ).length;

  return {
    totalEvaluated: entries.length,
    escalatedCount: escalated.length,
    hits,
    misses,
    adherencePct: escalated.length > 0 ? Math.round((hits / escalated.length) * 100) : null,
    safetyFailures,
  };
}
