/**
 * @file executionController.ts
 * @description Execution Controller for PR D.
 * Decouples model recommendation (buildRouterDecision) from execution authority (live | shadow | replay).
 *
 * Invariants:
 *  - Shadow mode has ZERO authority over the production model.
 *  - Requested/production model remains 100% authoritative in shadow mode.
 *  - Shadow mode makes ZERO additional provider API calls.
 */
import { buildRouterDecision, type RouterDecision } from "./nightShiftRouter";

export type ExecutionMode = "live" | "shadow" | "replay";

export interface ShadowDecision {
  requestId: string;
  decisionId: string;

  requestedModel: string;
  executedModel?: string;

  recommendedModel: string;
  recommendedRouteId: string;

  executionMode: "shadow";

  predictedRisk: number | null;

  observedProductionCost?: number;
  counterfactualCost?: number;

  policyVersion: string;
  pricingVersion?: string;

  createdAt: string;
}

export interface ExecutionResult {
  mode: ExecutionMode;
  targetModelToExecute: string;
  routerDecision: RouterDecision;
  shadowDecision?: ShadowDecision;
}

export interface ExecutionContext {
  requestId: string;
  requestedModel: string;
  promptText: string;
  mode: ExecutionMode;
  policyVersion?: string;
}

/**
 * Execution Controller entrypoint.
 * Evaluates the policy recommendation and enforces execution authority rules.
 */
export function handleExecution(ctx: ExecutionContext): ExecutionResult {
  const { requestId, requestedModel, promptText, mode, policyVersion = "2.0.0" } = ctx;

  const routerDecision: RouterDecision = buildRouterDecision(promptText);
  const recommendedModel = routerDecision.model || requestedModel;
  const recommendedRouteId = routerDecision.routeId || "default";

  if (mode === "shadow") {
    const shadowDecision: ShadowDecision = {
      requestId,
      decisionId: `sd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      requestedModel,
      executedModel: requestedModel, // Production model remains 100% authoritative
      recommendedModel,
      recommendedRouteId,
      executionMode: "shadow",
      predictedRisk: typeof routerDecision.riskScore === "number" ? routerDecision.riskScore : null,
      policyVersion,
      createdAt: new Date().toISOString(),
    };

    return {
      mode: "shadow",
      targetModelToExecute: requestedModel, // Invariant: requestedModel executed, zero extra API calls
      routerDecision,
      shadowDecision,
    };
  }

  if (mode === "replay") {
    return {
      mode: "replay",
      targetModelToExecute: requestedModel, // No provider execution should occur
      routerDecision,
    };
  }

  // Live mode
  return {
    mode: "live",
    targetModelToExecute: recommendedModel, // REI recommendation controls live execution
    routerDecision,
  };
}
