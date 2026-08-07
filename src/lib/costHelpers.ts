import { getRouterCosts } from "./nightShiftRouter";

interface ModelCost {
  input: number;
  output: number;
  ceiling: number;
}

const FINGERPRINT_COSTS = getRouterCosts();

const MODEL_COSTS: Record<string, ModelCost> = Object.fromEntries(
  Object.entries(FINGERPRINT_COSTS).map(([model, costs]: [string, any]) => [
    model,
    {
      input: costs.costPer1kInput,
      output: costs.costPer1kOutput,
      ceiling: costs.costPer1kInput + costs.costPer1kOutput,
    },
  ])
);

MODEL_COSTS.mock = { input: 0, output: 0, ceiling: 0 };
MODEL_COSTS["rate-limited"] = { input: 0, output: 0, ceiling: 0 };
MODEL_COSTS["gpt-4o"] = { input: 0.0025, output: 0.0100, ceiling: 0.0125 };
MODEL_COSTS["deepseek-v4-flash"] = { input: 0.00014, output: 0.00028, ceiling: 0.00042 };

export const DEFAULT_COST_MODEL = "llama-3.3-70b-versatile";

export function getModelCosts(model: string): ModelCost {
  const clean = String(model || "").replace(" (fallback)", "");
  return MODEL_COSTS[clean] || MODEL_COSTS[DEFAULT_COST_MODEL];
}

export function getModelCostRate(model: string): number {
  return getModelCosts(model).ceiling;
}

export function computeCeilingCost(totalTokens: number, model: string): number {
  return ((totalTokens || 0) / 1000) * getModelCostRate(model);
}

export function computeActualCost(
  promptTokens: number,
  completionTokens: number,
  inputRate: number,
  outputRate: number
): number {
  return ((promptTokens || 0) * inputRate + (completionTokens || 0) * outputRate) / 1000;
}

function formatCostDisplay(cost: number): string {
  if (cost <= 0) return "~$0.0000";
  if (cost < 0.0001) return "< $0.0001";
  return `~$${cost.toFixed(4)}`;
}

export interface CostBadgeUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export function getCostBadgeLabel(model: string, tokens: number, usage?: CostBadgeUsage | null): string {
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
