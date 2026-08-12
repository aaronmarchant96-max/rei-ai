import type { StoredProposal } from "./policyProposalStore";

/**
 * Proposal usefulness metrics — the second-order measurement over the policy
 * loop. Pure and deterministic: same store state → same metrics.
 *
 * Disposition is recorded ONLY by humans (see policyProposalStore's
 * accept/reject/markImplemented). These numbers answer "are the proposals
 * actually useful?":
 *   - precision   = accepted / (accepted + rejected)   — null until any review
 *   - realization = implemented / accepted              — null until any accept
 *   - withValue   = implemented proposals carrying a baseline→post-change note
 *
 * See docs/POLICY_LOOP.md and docs/POLICY_PROPOSALS.md.
 */
export interface ProposalMetrics {
  total: number;
  reviewed: number;
  accepted: number;
  rejected: number;
  implemented: number;
  precision: number | null;
  realization: number | null;
  withValue: number;
}

export function computeProposalMetrics(
  proposals: StoredProposal[]
): ProposalMetrics {
  const total = proposals.length;
  const accepted = proposals.filter(function (p) {
    return p.status === "accepted";
  }).length;
  const rejected = proposals.filter(function (p) {
    return p.status === "rejected";
  }).length;
  const implemented = proposals.filter(function (p) {
    return p.status === "implemented";
  }).length;
  // "Accepted" for the metrics means accepted-at-some-point: implemented
  // proposals were accepted before they were implemented, so both count as
  // accepted for precision, and implemented/acceptedTotal is realization.
  const acceptedTotal = accepted + implemented;
  const reviewed = acceptedTotal + rejected;
  const precision = reviewed === 0 ? null : Math.round((acceptedTotal / reviewed) * 100);
  const realization = acceptedTotal === 0 ? null : Math.round((implemented / acceptedTotal) * 100);
  const withValue = proposals.filter(function (p) {
    return p.status === "implemented" && typeof p.valueNote === "string" && p.valueNote.length > 0;
  }).length;
  return {
    total,
    reviewed,
    accepted,
    rejected,
    implemented,
    precision,
    realization,
    withValue,
  };
}
