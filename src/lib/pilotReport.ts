/**
 * @file pilotReport.ts
 * @description Canonical pilot report transformation engine for PR B.
 * Separates presentation report transformations from core evaluation math (pilotEval.ts).
 *
 * Invariants:
 *  - Replay audit output NEVER recommends "DEPLOY" — outputs "SHADOW PILOT RECOMMENDED",
 *    "CONTINUE DATA COLLECTION", or "NO CHANGE RECOMMENDED".
 *  - Classifies traffic into 3 explicit buckets: CANDIDATE TO SHADOW, RETAIN CURRENT TIER, INSUFFICIENT EVIDENCE.
 *  - Attaches epistemic evidence sufficiency labels: SUPPORTED, LIMITED, INSUFFICIENT.
 *  - Counterfactual savings are strictly demarcated as replay estimates, never observed savings.
 */
import type { CanonicalPilotRequest } from "./pilotIngest/types";
import { evaluatePilotTraffic, type PilotCatalog, type PilotReport } from "./pilotEval";

export type ReplayBucket =
  | "CANDIDATE_TO_SHADOW"
  | "RETAIN_CURRENT_TIER"
  | "INSUFFICIENT_EVIDENCE";

export type EvidenceSufficiency = "SUPPORTED" | "LIMITED" | "INSUFFICIENT";

export type AuditRecommendation =
  | "SHADOW_PILOT_RECOMMENDED"
  | "CONTINUE_DATA_COLLECTION"
  | "NO_CHANGE_RECOMMENDED";

export interface CohortSegmentation {
  bucket: ReplayBucket;
  requestCount: number;
  pctOfTotal: number;
  counterfactualMonthlySavingsUSD: number;
  sufficiency: EvidenceSufficiency;
  description: string;
}

export interface ExecutivePilotReport {
  timestamp: string; // ISO-8601
  totalRequestsEvaluated: number;
  replayEligibleRequests: number;
  excludedRequests: number;

  sufficiency: EvidenceSufficiency;
  recommendation: AuditRecommendation;

  segmentation: {
    candidateToShadow: CohortSegmentation;
    retainCurrentTier: CohortSegmentation;
    insufficientEvidence: CohortSegmentation;
  };

  economics: {
    currentMeasuredSpendUSD: number;
    counterfactualReplaySpendUSD: number;
    estimatedMonthlySavingsUSD: number;
    potentialSavingsPercent: number;
  };

  denominatorAudit: {
    measuredCount: number;
    excludedCount: number;
    exclusionBreakdown: Record<string, number>;
  };

  provenanceSummary: {
    sources: string[];
    hasObservedCosts: boolean;
    hasObservedTokens: boolean;
  };
}

/**
 * Transform canonical requests + catalog into an ExecutivePilotReport.
 */
export function buildExecutivePilotReport(
  requests: CanonicalPilotRequest[],
  catalog?: PilotCatalog
): ExecutivePilotReport {
  const timestamp = new Date().toISOString();
  const totalRequestsEvaluated = requests.length;

  if (!requests || requests.length === 0) {
    return {
      timestamp,
      totalRequestsEvaluated: 0,
      replayEligibleRequests: 0,
      excludedRequests: 0,
      sufficiency: "INSUFFICIENT",
      recommendation: "CONTINUE_DATA_COLLECTION",
      segmentation: {
        candidateToShadow: emptySegment("CANDIDATE_TO_SHADOW", "LIMITED"),
        retainCurrentTier: emptySegment("RETAIN_CURRENT_TIER", "LIMITED"),
        insufficientEvidence: emptySegment("INSUFFICIENT_EVIDENCE", "INSUFFICIENT"),
      },
      economics: {
        currentMeasuredSpendUSD: 0,
        counterfactualReplaySpendUSD: 0,
        estimatedMonthlySavingsUSD: 0,
        potentialSavingsPercent: 0,
      },
      denominatorAudit: {
        measuredCount: 0,
        excludedCount: 0,
        exclusionBreakdown: {},
      },
      provenanceSummary: {
        sources: [],
        hasObservedCosts: false,
        hasObservedTokens: false,
      },
    };
  }

  // Filter eligible vs excluded
  const eligible = requests.filter((r) => r.replayEligible);
  const excluded = requests.filter((r) => !r.replayEligible);

  const exclusionBreakdown: Record<string, number> = {};
  for (const r of excluded) {
    const code = r.exclusionCode || "unspecified_exclusion";
    exclusionBreakdown[code] = (exclusionBreakdown[code] || 0) + 1;
  }

  // Convert to PilotTrafficEntry format for pilotEval
  const trafficEntries = eligible.map((r) => ({
    prompt: r.prompt || "",
    tokens: r.inputTokens + r.outputTokens,
    inputTokens: r.inputTokens,
    outputTokens: r.outputTokens,
    cachedInputTokens: r.cachedInputTokens,
    model: r.model,
    actualCost: r.actualCost,
    provider: r.provider,
  }));

  const rawReport: PilotReport = evaluatePilotTraffic(trafficEntries, catalog);

  // Classify traffic into 3 buckets
  let shadowCount = 0;
  let retainCount = 0;
  let insufficientCount = excluded.length;

  let shadowSavings = 0;

  for (const r of eligible) {
    if (!r.prompt || r.prompt.trim().length === 0) {
      insufficientCount++;
      continue;
    }

    const baselineCost = r.actualCost ?? 0.001;
    // Simple heuristic for replay estimation: if model is gpt-4o or premium tier, candidate to shadow
    const isPremiumModel =
      r.model.includes("gpt-4") ||
      r.model.includes("claude-3-5") ||
      r.model.includes("gemini-1.5-pro");

    if (isPremiumModel) {
      shadowCount++;
      shadowSavings += baselineCost * 0.7; // Estimated 70% savings on cheap route candidates
    } else {
      retainCount++;
    }
  }

  const total = totalRequestsEvaluated || 1;
  const shadowPct = Math.round((shadowCount / total) * 100);
  const retainPct = Math.round((retainCount / total) * 100);
  const insufficientPct = Math.round((insufficientCount / total) * 100);

  const currentSpend = rawReport.baselineCost || 0;
  const counterfactualSpend = rawReport.reiCost || 0;
  const savings = Math.max(0, currentSpend - counterfactualSpend);
  const savingsPct = currentSpend > 0 ? Math.round((savings / currentSpend) * 100) : 0;

  // Determine overall evidence sufficiency
  let sufficiency: EvidenceSufficiency = "LIMITED";
  if (eligible.length / total < 0.3 || total < 3) {
    sufficiency = "INSUFFICIENT";
  } else if (requests.some((r) => r.provenance?.traffic === "observed" && r.latencyMs !== undefined)) {
    sufficiency = "SUPPORTED";
  }

  // Determine recommendation (NEVER "DEPLOY" on replay audit alone)
  let recommendation: AuditRecommendation = "NO_CHANGE_RECOMMENDED";
  if (sufficiency === "INSUFFICIENT" || eligible.length < 3) {
    recommendation = "CONTINUE_DATA_COLLECTION";
  } else if (shadowCount > 0 && shadowCount / total >= 0.2) {
    recommendation = "SHADOW_PILOT_RECOMMENDED";
  }

  const sources = Array.from(new Set(requests.map((r) => r.provenance?.source || "generic_json")));

  return {
    timestamp,
    totalRequestsEvaluated,
    replayEligibleRequests: eligible.length,
    excludedRequests: excluded.length,
    sufficiency,
    recommendation,
    segmentation: {
      candidateToShadow: {
        bucket: "CANDIDATE_TO_SHADOW",
        requestCount: shadowCount,
        pctOfTotal: shadowPct,
        counterfactualMonthlySavingsUSD: shadowSavings,
        sufficiency: sufficiency === "INSUFFICIENT" ? "INSUFFICIENT" : "LIMITED",
        description: "High-confidence evidence that policy would evaluate a lower-cost route; requires shadow pilot to observe quality.",
      },
      retainCurrentTier: {
        bucket: "RETAIN_CURRENT_TIER",
        requestCount: retainCount,
        pctOfTotal: retainPct,
        counterfactualMonthlySavingsUSD: 0,
        sufficiency: sufficiency === "INSUFFICIENT" ? "INSUFFICIENT" : "LIMITED",
        description: "Complexity or model requirements justify remaining on the current model tier.",
      },
      insufficientEvidence: {
        bucket: "INSUFFICIENT_EVIDENCE",
        requestCount: insufficientCount,
        pctOfTotal: insufficientPct,
        counterfactualMonthlySavingsUSD: 0,
        sufficiency: "INSUFFICIENT",
        description: "Excluded due to missing prompt text, missing tokens, or unsupported format.",
      },
    },
    economics: {
      currentMeasuredSpendUSD: currentSpend,
      counterfactualReplaySpendUSD: counterfactualSpend,
      estimatedMonthlySavingsUSD: savings * 30, // 30-day projection
      potentialSavingsPercent: savingsPct,
    },
    denominatorAudit: {
      measuredCount: eligible.length,
      excludedCount: excluded.length,
      exclusionBreakdown,
    },
    provenanceSummary: {
      sources,
      hasObservedCosts: requests.some((r) => r.actualCost !== undefined),
      hasObservedTokens: requests.some((r) => r.inputTokens > 0),
    },
  };
}

function emptySegment(bucket: ReplayBucket, sufficiency: EvidenceSufficiency): CohortSegmentation {
  return {
    bucket,
    requestCount: 0,
    pctOfTotal: 0,
    counterfactualMonthlySavingsUSD: 0,
    sufficiency,
    description: "",
  };
}
