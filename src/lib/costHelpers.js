import { getRouterCosts } from "./nightShiftRouter.js";
import { computeMsgCost, formatCostDisplay } from "./contracts.js";

const FINGERPRINT_COSTS = getRouterCosts();
const MODEL_COST_PER_1K = {
  ...Object.fromEntries(
    Object.entries(FINGERPRINT_COSTS).map(([model, costs]) => [
      model,
      (costs.costPer1kInput + costs.costPer1kOutput) / 2,
    ])
  ),
  mock: 0,
  "rate-limited": 0,
};

export const DEFAULT_COST_MODEL = "llama-3.3-70b-versatile";

export function getModelCostRate(model) {
  return MODEL_COST_PER_1K[model] || MODEL_COST_PER_1K[DEFAULT_COST_MODEL];
}

export function getCostBadgeLabel(model, tokens) {
  const rate = getModelCostRate(model);
  const cost = computeMsgCost(tokens, rate);
  return `⚡ ${tokens} tok · ${formatCostDisplay(cost)}`;
}
