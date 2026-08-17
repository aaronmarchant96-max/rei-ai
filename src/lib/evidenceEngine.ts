/**
 * evidenceEngine.ts — Canonical observer and normalizer for runtime execution traces.
 *
 * ARCHITECTURAL INVARIANT:
 *   This module is strictly DOWNSTREAM of execution.
 *   It NEVER re-classifies, re-routes, or re-scans requests.
 *   It takes runtime telemetry/traces and normalizes them into a canonical RequestEvidence object
 *   with explicit field-level epistemic provenance (observed, derived, modeled, unavailable).
 */

import { getModelCosts, computeActualCost } from "./costHelpers";
import { detectAISlop } from "./detectAISlop.js";

export type EpistemicProvenance = "observed" | "derived" | "modeled" | "replayed" | "unavailable";

export interface RouteTraceEvent {
  stageId: "red-team" | "intent-classification" | "complexity-scoring" | "model-selection" | "dispatch" | "verification" | string;
  stage: string;
  timestamp: string;
  passed: boolean;
  decision: string;
  rule?: string;
  detail?: string;
}

export interface RequestEvidence {
  requestId: string;
  timestamp: string;
  route: string;
  model: string;
  
  routeTrace: RouteTraceEvent[];

  tokens: {
    inputTokens: number | null;
    outputTokens: number | null;
    cachedInputTokens: number | null;
    cacheHit: boolean;
    cacheHitRatePct: number | null;
    provenance: EpistemicProvenance;
  };

  economics: {
    observedCostUsd: number | null;
    observedProvenance: "observed" | "unavailable";

    counterfactual: {
      costUsd: number | null;
      basis: string;
      model: string;
      provenance: "modeled" | "unavailable";
    };

    savings: {
      amountUsd: number | null;
      percentage: number | null;
      provenance: "derived" | "replayed" | "unavailable";
    };
  };

  routeRationale: {
    classification: string;
    complexityScore: number | null;
    complexityProvenance: EpistemicProvenance;
    adversarialSignal: boolean;
    selectionReason: string;
  };

  verificationSignals: {
    slopDetected: boolean;
    slopMarkersFound: string[];
    cardoCompliant: boolean;
    provenance: "observed" | "unavailable";
  };
}

export interface BuildEvidenceInput {
  requestId?: string;
  timestamp?: string;
  routerDecision?: {
    label?: string;
    model?: string;
    domain?: string;
    hingeScore?: number;
    score?: number;
    reason?: string;
    rule?: string;
    selectionReason?: string;
    isAdversarial?: boolean;
    [key: string]: any;
  } | null;
  rawTrace?: Array<{
    stageId?: string;
    stage?: string;
    timestamp?: string;
    passed?: boolean;
    decision?: string;
    rule?: string;
    detail?: string;
  }> | null;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cached_prompt_tokens?: number;
  } | null;
  responseText?: string | null;
  redTeamResult?: {
    flagged?: boolean;
    category?: string;
    [key: string]: any;
  } | null;
}

const GPT4O_RATES = {
  inputPer1k: 0.0025,
  outputPer1k: 0.0100,
};

/**
 * Normalizes recorded execution telemetry into a canonical RequestEvidence object.
 */
export function buildRequestEvidence(input: BuildEvidenceInput): RequestEvidence {
  const requestId = input.requestId || `req-${Date.now()}`;
  const timestamp = input.timestamp || new Date().toISOString();
  const decision = input.routerDecision || {};
  const model = decision.model || "unknown-model";
  const route = decision.label || decision.domain || "default";

  // 1. Normalize Route Trace (Preserves only recorded stages; never manufactures)
  const routeTrace: RouteTraceEvent[] = [];
  if (Array.isArray(input.rawTrace) && input.rawTrace.length > 0) {
    for (const event of input.rawTrace) {
      routeTrace.push({
        stageId: event.stageId || event.stage || "trace-stage",
        stage: event.stage || event.stageId || "Unknown Stage",
        timestamp: event.timestamp || timestamp,
        passed: event.passed !== false,
        decision: event.decision || "Executed",
        rule: event.rule || undefined, // Left undefined if not recorded
        detail: event.detail || undefined,
      });
    }
  } else if (decision.label || decision.model) {
    // If runtime passed routerDecision without discrete stage array, record the decision event
    routeTrace.push({
      stageId: "model-selection",
      stage: "Router Decision",
      timestamp,
      passed: true,
      decision: `${decision.label || "Route"} -> ${model}`,
      rule: decision.rule || undefined,
      detail: decision.reason || undefined,
    });
  }

  // 2. Normalize Tokens & Caching Telemetry
  const promptTokens = input.usage?.prompt_tokens ?? null;
  const completionTokens = input.usage?.completion_tokens ?? null;
  const cachedTokens = input.usage?.cached_prompt_tokens ?? null;
  const hasTokenData = promptTokens != null && completionTokens != null;

  let cacheHit = false;
  let cacheHitRatePct: number | null = null;

  if (hasTokenData && cachedTokens != null && promptTokens > 0) {
    cacheHit = cachedTokens > 0;
    cacheHitRatePct = Number(((cachedTokens / promptTokens) * 100).toFixed(1));
  }

  const tokenProvenance: EpistemicProvenance = hasTokenData ? "observed" : "unavailable";

  // 3. Economics: Observed, Modeled Counterfactual, Derived Savings
  let observedCostUsd: number | null = null;
  let counterfactualCostUsd: number | null = null;
  let savingsAmountUsd: number | null = null;
  let savingsPercentage: number | null = null;

  if (hasTokenData && promptTokens != null && completionTokens != null) {
    const costs = getModelCosts(model);
    observedCostUsd = Number(computeActualCost(promptTokens, completionTokens, costs.input, costs.output).toFixed(6));

    // Modeled GPT-4o benchmark counterfactual
    counterfactualCostUsd = Number(
      computeActualCost(promptTokens, completionTokens, GPT4O_RATES.inputPer1k, GPT4O_RATES.outputPer1k).toFixed(6)
    );

    if (counterfactualCostUsd > 0 && observedCostUsd != null) {
      savingsAmountUsd = Number((counterfactualCostUsd - observedCostUsd).toFixed(6));
      savingsPercentage = Number((((counterfactualCostUsd - observedCostUsd) / counterfactualCostUsd) * 100).toFixed(1));
    }
  }

  // 4. Route Rationale & Constraints
  const rawScore = decision.hingeScore ?? decision.score ?? null;
  const complexityScore = rawScore != null ? Number(Number(rawScore).toFixed(2)) : null;
  const adversarialSignal = Boolean(decision.isAdversarial || input.redTeamResult?.flagged);

  const selectionReason =
    decision.selectionReason ||
    decision.reason ||
    (adversarialSignal
      ? "Adversarial security route triggered by pattern detection"
      : `Dispatched to ${model} satisfying domain constraints`);

  // 5. Output Verification Signals
  let slopDetected = false;
  let slopMarkersFound: string[] = [];
  let cardoCompliant = true;

  if (typeof input.responseText === "string" && input.responseText.trim().length > 0) {
    const slopCheck = detectAISlop(input.responseText);
    slopDetected = slopCheck.score > 0;
    slopMarkersFound = slopCheck.flags.map((f: any) => f.label);
    cardoCompliant = slopCheck.verdict === "clean" || slopCheck.verdict === "minor";
  }

  return {
    requestId,
    timestamp,
    route,
    model,
    routeTrace,
    tokens: {
      inputTokens: promptTokens,
      outputTokens: completionTokens,
      cachedInputTokens: cachedTokens,
      cacheHit,
      cacheHitRatePct,
      provenance: tokenProvenance,
    },
    economics: {
      observedCostUsd,
      observedProvenance: observedCostUsd != null ? "observed" : "unavailable",
      counterfactual: {
        costUsd: counterfactualCostUsd,
        basis: "GPT-4o standard rates ($2.50/1M input, $10.00/1M output)",
        model: "gpt-4o",
        provenance: counterfactualCostUsd != null ? "modeled" : "unavailable",
      },
      savings: {
        amountUsd: savingsAmountUsd,
        percentage: savingsPercentage,
        provenance: savingsAmountUsd != null ? "derived" : "unavailable",
      },
    },
    routeRationale: {
      classification: decision.domain || decision.label || "General Query",
      complexityScore,
      complexityProvenance: complexityScore != null ? "observed" : "unavailable",
      adversarialSignal,
      selectionReason,
    },
    verificationSignals: {
      slopDetected,
      slopMarkersFound,
      cardoCompliant,
      provenance: input.responseText ? "observed" : "unavailable",
    },
  };
}
