import type { EvalEntry } from "./evalLog";
import type { RoutingLogEntry } from "./routingLog";
import type { ClaimReport } from "./claimGateway";
import { DETECTOR_VERSION, type CActivitySignalReport } from "./cActivitySignals";

/**
 * Deterministic policy-proposal engine.
 *
 * REI is self-informed, NOT self-modifying. This module reads observed evidence
 * (the deterministic eval log, the routing log, the claims gate's own
 * verifyAll() reports, and C-Activity learning signal reports) and emits *proposals*
 * for human review. It NEVER mutates routing thresholds, weights, fingerprints,
 * scanner patterns, claim definitions, or provider configs. See docs/POLICY_LOOP.md for the boundary.
 *
 * Invariants:
 *  - pure: same inputs → same proposals (no Date.now, no random, no network)
 *  - $0: no LLM calls
 *  - evidence-driven: every signal requires an observable downstream signal;
 *    absence of evidence never becomes evidence
 *  - non-autonomous: PR7 maps validated evidence into proposals; it never reinterprets,
 *    strengthens, or acts on evidence.
 */

export const ADAPTER_VERSION = "policy-adapter-v1";


export type PolicySignal =
  | "missed-escalation"
  | "false-positive-escalation"
  | "cheap-route-opportunity"
  | "claim-drift"
  | "persistent-delivery-risk"
  | "prediction-miscalibration"
  | "cohort-drift";

export type ProposalCategory = "routing" | "scanner" | "claims" | "measurement" | "learning";

export interface PolicyProposal {
  /** Deterministic id derived from the signal + its anchor (requestId, claimId, or sourceSignalId). */
  id: string;
  signal: PolicySignal;
  category: ProposalCategory;
  title: string;
  /** Observable evidence, not recommendation. */
  evidence: string;
  /** Concrete deterministic change to propose — applied only by a human. */
  suggestedChange: string;
  /** Correlation keys the evidence was drawn from. */
  requestIds: string[];
}

/** Routes that resolve to the premium (llama-3.3-70b) price tier. */
const PREMIUM_ROUTES: ReadonlySet<string> = new Set([
  "structured-reasoning",
  "genealogy-deep-dive",
  "adversarial-validation",
  "legal-hinge",
]);

/** HingeScore below this is the "Low" complexity band (cheapRouteConfidence high). */
const LOW_COMPLEXITY_HINGE = 0.3;

/** Score at or above this on a false-positive candidate is treated as a
 *  confident escalation, not a borderline one. */
const BORDERLINE_SCORE_MAX = 80;

const SIGNAL_LABEL: Record<PolicySignal, string> = {
  "missed-escalation": "Missed escalation",
  "false-positive-escalation": "False-positive escalation",
  "cheap-route-opportunity": "Cheap-route opportunity",
  "claim-drift": "Claim drift",
  "persistent-delivery-risk": "Persistent delivery risk",
  "prediction-miscalibration": "Prediction miscalibration",
  "cohort-drift": "Cohort drift",
};

const SIGNAL_CATEGORY: Record<PolicySignal, ProposalCategory> = {
  "missed-escalation": "routing",
  "false-positive-escalation": "scanner",
  "cheap-route-opportunity": "routing",
  "claim-drift": "claims",
  "persistent-delivery-risk": "learning",
  "prediction-miscalibration": "learning",
  "cohort-drift": "learning",
};

function bySignalThenId(a: PolicyProposal, b: PolicyProposal): number {
  if (a.signal !== b.signal) return a.signal < b.signal ? -1 : 1;
  return a.id < b.id ? -1 : 1;
}

/** Signal 1 — scanner escalated, router did not reach the adversarial route. */
function missedEscalationProposals(evals: EvalEntry[]): PolicyProposal[] {
  return evals
    .filter(
      (e) =>
        e.evaluation.routeExpected === true &&
        e.evaluation.routeCorrect === false &&
        typeof e.evaluation.qualityScore === "number"
    )
    .map((e) => {
      const id = `missed-escalation:${e.requestId}`;
      return {
        id,
        signal: "missed-escalation" as const,
        category: SIGNAL_CATEGORY["missed-escalation"],
        title: "Scanner escalated input that did not reach the adversarial route",
        evidence:
          `Input ${e.requestId} scored ${e.evaluation.qualityScore}/100 on the D1 scanner ` +
          `(escalateToD2 → routeExpected=true) but the router did not route it to ` +
          `adversarial-validation (routeCorrect=false, actual route ${e.routeId ?? "?"}, ` +
          `domain ${e.domain ?? "?"}).`,
        suggestedChange:
          "Review the router's adversarial gate for this input class — either add the " +
          "scanner's matched category terms to the gate or relax the routing regex. Verify " +
          "with a router-level regression test before the eval loop ratifies the miss as normal.",
        requestIds: [e.requestId],
      };
    });
}

/** Signal 2 — escalated AND obeyed, but the response came back clean at a
 *  borderline scan score. Clean response is the observable outcome signal that
 *  makes this a candidate review, not merely an expensive route. */
function falsePositiveEscalationProposals(evals: EvalEntry[]): PolicyProposal[] {
  return evals
    .filter(
      (e) =>
        e.evaluation.routeExpected === true &&
        e.evaluation.routeCorrect === true &&
        e.evaluation.safetyVerdict === "clean" &&
        typeof e.evaluation.qualityScore === "number" &&
        e.evaluation.qualityScore < BORDERLINE_SCORE_MAX
    )
    .map((e) => {
      const id = `false-positive-escalation:${e.requestId}`;
      return {
        id,
        signal: "false-positive-escalation" as const,
        category: SIGNAL_CATEGORY["false-positive-escalation"],
        title: "Borderline escalation that produced a clean response",
        evidence:
          `Input ${e.requestId} cleared the escalation bar (${e.evaluation.qualityScore}/100) and ` +
          `reached adversarial-validation, but the model response scanned CLEAN. This is a ` +
          `candidate over-trigger — an outcome signal, not just route cost.`,
        suggestedChange:
          "Review whether the triggering scanner category over-fires on borderline inputs " +
          "(e.g. story-openers, single-keyword matches). Consider compound-requirement gating " +
          "or a category-specific bar before shipping. Verify against the benign-story corpus.",
        requestIds: [e.requestId],
      };
    });
}

/** Signal 3 — Low-complexity request routed to a premium route with a clean,
 *  correct, untruncated outcome. "Cheaper" is only proposed when the outcome
 *  evidence says "safe to route cheaper". */
function cheapRouteOpportunityProposals(
  evals: EvalEntry[],
  logs: RoutingLogEntry[]
): PolicyProposal[] {
  const evalByRequestId = new Map<string, EvalEntry>();
  for (const e of evals) {
    if (!evalByRequestId.has(e.requestId)) evalByRequestId.set(e.requestId, e);
  }
  return logs
    .filter((log) => {
      if (!log.requestId) return false;
      if (typeof log.hingeScore !== "number") return false;
      if (log.hingeScore >= LOW_COMPLEXITY_HINGE) return false;
      if (!PREMIUM_ROUTES.has(log.routeId ?? "")) return false;
      if (log.truncated || log.rescue) return false;
      const evalEntry = evalByRequestId.get(log.requestId);
      if (!evalEntry) return false;
      return (
        evalEntry.evaluation.safetyVerdict === "clean" &&
        evalEntry.evaluation.routeCorrect === true
      );
    })
    .map((log) => {
      const rid = log.requestId!;
      const id = `cheap-route-opportunity:${rid}`;
      const evalEntry = evalByRequestId.get(rid)!;
      return {
        id,
        signal: "cheap-route-opportunity" as const,
        category: SIGNAL_CATEGORY["cheap-route-opportunity"],
        title: "Low-complexity request billed at the premium tier",
        evidence:
          `Request ${rid} (domain ${log.domain ?? "?"}) scored hingeScore ` +
          `${log.hingeScore!.toFixed(2)} (Low complexity band) but routed to ` +
          `${log.routeId} (premium tier, est. ${log.estimatedCost ?? 0} vs premium baseline ` +
          `${log.premiumCost ?? 0}). Outcome: routeCorrect, response CLEAN, not truncated, ` +
          `not rescued.`,
        suggestedChange:
          "Review whether this request class can be safely served by a cheaper route/model — " +
          "the low complexity + clean outcome evidence supports the review. Do not change " +
          "routing policy without a cost/quality regression test.",
        requestIds: [rid],
      };
    });
}

/** Signal 4 — the claims gate's OWN verifyAll() reports a failing claim.
 *  Consumes the existing claims/integrity machinery; does not invent a second
 *  definition of truth. */
function claimDriftProposals(claims: ClaimReport[]): PolicyProposal[] {
  return claims
    .filter((c) => c.pass === false && (c.severity === "warn" || c.severity === "error"))
    .map((c) => {
      const id = `claim-drift:${c.claimId}`;
      return {
        id,
        signal: "claim-drift" as const,
        category: SIGNAL_CATEGORY["claim-drift"],
        title: `Claim failing its own gate: ${c.title}`,
        evidence:
          `verifyAll() reports claim "${c.claimId}" as ${c.severity}: ${c.reason} ` +
          `(computed ${c.computed}). This is the claims gate's own verdict.`,
        suggestedChange:
          `Investigate claim "${c.claimId}" at its source (${c.source ?? "see CLAIM_LEDGER.md"}) — ` +
          "update the measurement or the policy that feeds it, then re-run the claim's " +
          "producing command and update CLAIM_LEDGER.md. Do not lower the threshold to hide drift.",
        requestIds: [],
      };
    });
}

/** C-Activity Signals Adapter (PR7)
 *  Translates validated PR6 statistical learning signals into human-reviewable proposals.
 *  Idempotent, deterministic, non-autonomous mapping layer.
 */
function cActivitySignalProposals(report?: CActivitySignalReport): PolicyProposal[] {
  if (
    !report ||
    report.schemaVersion !== 1 ||
    report.detectorVersion !== DETECTOR_VERSION ||
    !Array.isArray(report.signals)
  ) {
    return [];
  }


  const proposals: PolicyProposal[] = [];
  const seenSignalIds = new Set<string>();

  for (const s of report.signals) {
    if (!s || !s.id || !s.type || seenSignalIds.has(s.id)) {
      continue;
    }
    seenSignalIds.add(s.id);

    const proposalId = `policy-proposal:${ADAPTER_VERSION}:${s.id}`;

    if (s.type === "persistent-delivery-risk") {
      proposals.push({
        id: proposalId,
        signal: "persistent-delivery-risk",
        category: SIGNAL_CATEGORY["persistent-delivery-risk"],
        title: `Persistent delivery risk in cohort on ${s.model} / ${s.routeId}`,
        evidence:
          `Observed cohort pattern: cohort risk interval [${s.cohortRiskInterval.low.toFixed(3)}, ${s.cohortRiskInterval.high.toFixed(3)}] ` +
          `strictly exceeds comparator risk interval [${s.comparatorRiskInterval.low.toFixed(3)}, ${s.comparatorRiskInterval.high.toFixed(3)}] ` +
          `for model "${s.model}" and route "${s.routeId}". Source signal: "${s.id}". Detector version: "${report.detectorVersion}".`,
        suggestedChange:
          `Review candidate policy: evaluate whether this route/model cohort needs a routing-policy adjustment or fallback handling.`,
        requestIds: [],
      });
    } else if (s.type === "prediction-miscalibration") {
      proposals.push({
        id: proposalId,
        signal: "prediction-miscalibration",
        category: SIGNAL_CATEGORY["prediction-miscalibration"],
        title: `Prediction miscalibration (${s.direction}) on ${s.model}`,
        evidence:
          `Observed cohort pattern: predictor is ${s.direction} for model "${s.model}" in bin [${s.binLow.toFixed(1)}, ${s.binHigh.toFixed(1)}). ` +
          `Mean predicted: ${s.meanPredicted.toFixed(3)}, actual failure interval: [${s.actualInterval.low.toFixed(3)}, ${s.actualInterval.high.toFixed(3)}] ` +
          `across support count of ${s.support}. Source signal: "${s.id}". Detector version: "${report.detectorVersion}".`,
        suggestedChange:
          `Review candidate policy: evaluate whether predictor calibration or confidence threshold interpretation needs adjustment for model "${s.model}".`,
        requestIds: [],
      });
    } else if (s.type === "cohort-drift") {
      proposals.push({
        id: proposalId,
        signal: "cohort-drift",
        category: SIGNAL_CATEGORY["cohort-drift"],
        title: `Cohort failure rate drift (${s.direction}) on ${s.model} / ${s.routeId}`,
        evidence:
          `Observed cohort pattern: failure rate for cohort on model "${s.model}" / route "${s.routeId}" is ${s.direction} ` +
          `(recent 20 interval [${s.recentInterval.low.toFixed(3)}, ${s.recentInterval.high.toFixed(3)}] vs previous 20 interval [${s.previousInterval.low.toFixed(3)}, ${s.previousInterval.high.toFixed(3)}]). ` +
          `Source signal: "${s.id}". Detector version: "${report.detectorVersion}".`,
        suggestedChange:
          `Review candidate policy: evaluate whether a recently changing cohort warrants investigation or route monitoring.`,
        requestIds: [],
      });
    }
  }

  return proposals;
}

/**
 * Generate all policy proposals from observed evidence.
 *
 * @param evals           deterministic eval-log entries
 * @param logs            routing-log entries
 * @param claims          ClaimReport[] from claimGateway.verifyAll() — the claims gate's
 *                        own output, so claim drift is judged by existing machinery.
 * @param cActivityReport Optional CActivitySignalReport from cActivitySignals.detectCActivitySignals()
 */
export function generateProposals(
  evals: EvalEntry[],
  logs: RoutingLogEntry[],
  claims: ClaimReport[],
  cActivityReport?: CActivitySignalReport
): PolicyProposal[] {
  return [
    ...missedEscalationProposals(evals),
    ...falsePositiveEscalationProposals(evals),
    ...cheapRouteOpportunityProposals(evals, logs),
    ...claimDriftProposals(claims),
    ...cActivitySignalProposals(cActivityReport),
  ].sort(bySignalThenId);
}

export { SIGNAL_LABEL, SIGNAL_CATEGORY };
