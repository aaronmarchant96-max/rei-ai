import { getRouterCosts } from "./nightShiftRouter.js";

const FINGERPRINT_COSTS = getRouterCosts();

const MODEL_COSTS = Object.fromEntries(
  Object.entries(FINGERPRINT_COSTS).map(([model, costs]) => [
    model,
    {
      input: costs.costPer1kInput,                          // $/1K input tokens
      output: costs.costPer1kOutput,                        // $/1K output tokens
      ceiling: costs.costPer1kInput + costs.costPer1kOutput, // worst-case per pair (was /2)
    },
  ])
);

// Edge-case models
MODEL_COSTS.mock = { input: 0, output: 0, ceiling: 0 };
MODEL_COSTS["rate-limited"] = { input: 0, output: 0, ceiling: 0 };
MODEL_COSTS["gpt-4o"] = { input: 0.0025, output: 0.0100, ceiling: 0.0125 };

export const DEFAULT_COST_MODEL = "llama-3.3-70b-versatile";

export function getModelCosts(model) {
  return MODEL_COSTS[model] || MODEL_COSTS[DEFAULT_COST_MODEL];
}

export function getModelCostRate(model) {
  return getModelCosts(model).ceiling;
}

export function computeCeilingCost(totalTokens, model) {
  return ((totalTokens || 0) / 1000) * getModelCostRate(model);
}

export function computeActualCost(promptTokens, completionTokens, inputRate, outputRate) {
  return ((promptTokens || 0) * inputRate + (completionTokens || 0) * outputRate) / 1000;
}

function formatCostDisplay(cost) {
  if (cost <= 0) return "~$0.0000";
  if (cost < 0.0001) return "< $0.0001";
  return `~$${cost.toFixed(4)}`;
}

export function getCostBadgeLabel(model, tokens, usage) {
  const costs = getModelCosts(model);
  if (usage?.prompt_tokens != null && usage?.completion_tokens != null) {
    const actual = computeActualCost(
      usage.prompt_tokens, usage.completion_tokens,
      costs.input, costs.output
    );
    return `⚡ ${usage.total_tokens || tokens} tok · actual ${formatCostDisplay(actual)}`;
  }
  const ceiling = computeCeilingCost(tokens, model);
  return `⚡ ${tokens} tok · est ${formatCostDisplay(ceiling)}`;
}
