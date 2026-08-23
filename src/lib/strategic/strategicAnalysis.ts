import type { StrategicClaim, StrategicSituation } from "./strategicTypes";

const CONFIDENCE_RANK = { unknown: 0, weak: 1, moderate: 2, strong: 3, dominant: 4 } as const;
const STATUS_RANK = { unknown: 0, counterfactual: 1, inferred: 2, stated: 3, observed: 4 } as const;

function claimsById(situation: StrategicSituation): Map<string, StrategicClaim> {
  const claims: StrategicClaim[] = [
    ...situation.rules, ...situation.objectives, ...situation.constraints,
    ...situation.strategies, ...situation.conflicts, ...situation.alternatives,
    ...situation.players.flatMap((player) => player.objectives),
    ...situation.incentives.map((incentive) => incentive.claim),
    ...(situation.strategicHinge ? [situation.strategicHinge] : []),
  ];
  return new Map(claims.map((claim) => [claim.id, claim]));
}

export function evaluateStrategicRevision(
  control: StrategicSituation,
  revision: StrategicSituation
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  const controlClaims = claimsById(control);
  const revisionClaims = claimsById(revision);
  const controlEvidence = new Set(control.evidence.map((item) => item.id));

  for (const [id, previous] of controlClaims) {
    const next = revisionClaims.get(id);
    if (!next) continue;
    const previousEvidenceCount = previous.evidenceRefs.filter((ref) => controlEvidence.has(ref)).length;
    const nextEvidenceCount = next.evidenceRefs.filter((ref) => revision.evidence.some((item) => item.id === ref)).length;
    if (nextEvidenceCount < previousEvidenceCount) {
      const statusDegraded = STATUS_RANK[next.epistemicStatus] < STATUS_RANK[previous.epistemicStatus];
      const confidenceDegraded = CONFIDENCE_RANK[next.confidence] < CONFIDENCE_RANK[previous.confidence];
      if (!statusDegraded && !confidenceDegraded) {
        violations.push(`${id}: evidence weakened without epistemic or confidence degradation`);
      }
    }

    const contradictionAdded = revision.evidence.some((item) =>
      item.relation === "contradicts" && item.claimRefs.includes(id) && !controlEvidence.has(item.id)
    );
    if (contradictionAdded) {
      const reconsidered = next.statement !== previous.statement ||
        STATUS_RANK[next.epistemicStatus] < STATUS_RANK[previous.epistemicStatus] ||
        CONFIDENCE_RANK[next.confidence] < CONFIDENCE_RANK[previous.confidence];
      if (!reconsidered) violations.push(`${id}: contradictory evidence added without reconsideration`);
    }
  }
  return { valid: violations.length === 0, violations };
}
