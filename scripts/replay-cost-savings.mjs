// Offline Counterfactual Replay Engine for REI.ai
// Simulates routing decisions and calculates realized savings without invoking external LLMs.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeHingeScore } from "../src/lib/hingeClassifier.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Model Rates table (per 1k tokens)
const MODEL_PRICING = {
  "gpt-4o": { input: 0.00250, output: 0.01000 },
  "claude-3-5-sonnet": { input: 0.00300, output: 0.01500 },
  "deepseek-v4-pro": { input: 0.00055, output: 0.00219 },
  "deepseek-reasoner": { input: 0.00055, output: 0.00219 },
  "deepseek-v4-flash": { input: 0.00014, output: 0.00028 },
  "openai/gpt-oss-120b": { input: 0.00059, output: 0.00079 },
  "openai/gpt-oss-20b": { input: 0.00010, output: 0.00020 },
  "llama-3.1-8b-instant": { input: 0.00005, output: 0.00008 },
  "gemini-3.6-flash": { input: 0.000075, output: 0.00030 },
  "zai/glm-5.2": { input: 0.00140, output: 0.00440 },
};

const SAMPLE_DEVELOPER_CORPUS = [
  { prompt: "git status", inputTokens: 450, outputTokens: 80, baselineModel: "deepseek-v4-pro" },
  { prompt: "git diff --stat", inputTokens: 520, outputTokens: 120, baselineModel: "deepseek-v4-pro" },
  { prompt: "check if test passed", inputTokens: 890, outputTokens: 60, baselineModel: "deepseek-v4-pro" },
  { prompt: "what does this error code 404 mean?", inputTokens: 320, outputTokens: 140, baselineModel: "deepseek-v4-pro" },
  { prompt: "write a regex to match email addresses", inputTokens: 400, outputTokens: 250, baselineModel: "deepseek-v4-pro" },
  { prompt: "refactor this React useState hook to useReducer for complex form state", inputTokens: 1200, outputTokens: 650, baselineModel: "deepseek-v4-pro" },
  { prompt: "implement a TypeScript interface for user authentication session tokens", inputTokens: 980, outputTokens: 400, baselineModel: "deepseek-v4-pro" },
  { prompt: "write a Jest unit test to mock fetch failure on 503 status code", inputTokens: 1450, outputTokens: 520, baselineModel: "deepseek-v4-pro" },
  { prompt: "design the multi-tier caching architecture and memory hierarchy for high-throughput distributed state", inputTokens: 3200, outputTokens: 1800, baselineModel: "deepseek-v4-pro" },
  { prompt: "evaluate the formal security proof and potential side-channel timing attacks on this cryptographic signature verification protocol", inputTokens: 4500, outputTokens: 2200, baselineModel: "deepseek-v4-pro" },
];

function calcCost(modelKey, inputTokens, outputTokens) {
  const p = MODEL_PRICING[modelKey] || MODEL_PRICING["deepseek-v4-pro"];
  return (inputTokens / 1000) * p.input + (outputTokens / 1000) * p.output;
}

export async function runCounterfactualReplay(corpus = SAMPLE_DEVELOPER_CORPUS) {
  console.log("================================================================================");
  console.log("                 REI.ai OFFLINE COUNTERFACTUAL REPLAY ENGINE                    ");
  console.log("================================================================================");
  console.log(`Analyzing ${corpus.length} turns through the zero-spend Hinge Classifier...
`);

  let totalBaselineCost = 0;
  let totalReiCost = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const routeCounts = {
    "llama-3.1-8b-instant": 0,
    "openai/gpt-oss-20b": 0,
    "openai/gpt-oss-120b": 0,
    "deepseek-reasoner": 0,
  };

  console.log("| Prompt Snippet            | HS   | Tier   | Routed Model         | Baseline ($) | REI ($)    | Saved (%) |");
  console.log("|---------------------------|------|--------|----------------------|--------------|------------|-----------|");

  for (const item of corpus) {
    const hingeRes = computeHingeScore(item.prompt);
    const hs = hingeRes.hs;

    let routedModel = "llama-3.1-8b-instant";
    if (hs >= 0.80) routedModel = "deepseek-reasoner";
    else if (hs >= 0.55) routedModel = "openai/gpt-oss-120b";
    else if (hs >= 0.35) routedModel = "openai/gpt-oss-20b";

    routeCounts[routedModel] = (routeCounts[routedModel] || 0) + 1;

    const baselineCost = calcCost(item.baselineModel || "deepseek-v4-pro", item.inputTokens, item.outputTokens);
    const reiCost = calcCost(routedModel, item.inputTokens, item.outputTokens);
    const savingsPct = baselineCost > 0 ? (((baselineCost - reiCost) / baselineCost) * 100).toFixed(1) : "0.0";

    totalBaselineCost += baselineCost;
    totalReiCost += reiCost;
    totalInputTokens += item.inputTokens;
    totalOutputTokens += item.outputTokens;

    const snippet = item.prompt.length > 25 ? item.prompt.slice(0, 22) + "..." : item.prompt.padEnd(25);
    console.log(`| ${snippet.padEnd(25)} | ${hs.toFixed(2)} | ${hingeRes.tier.padEnd(6)} | ${routedModel.padEnd(20)} | $${baselineCost.toFixed(6)} | $${reiCost.toFixed(6)} | ${savingsPct.padStart(7)}% |`);
  }

  const netSavings = totalBaselineCost - totalReiCost;
  const netSavingsPct = totalBaselineCost > 0 ? ((netSavings / totalBaselineCost) * 100).toFixed(2) : "0.00";

  console.log("================================================================================");
  console.log("                           AGGREGATE REPLAY SUMMARY                             ");
  console.log("================================================================================");
  console.log(`Total Replayed Tokens:        ${(totalInputTokens + totalOutputTokens).toLocaleString()} tokens (${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out)`);
  console.log(`Unrouted Baseline Spend:     $${totalBaselineCost.toFixed(5)} (Defaulting to DeepSeek Pro)`);
  console.log(`REI Arbitrated Spend:        $${totalReiCost.toFixed(5)} (Dynamic Multi-Tier Routing)`);
  console.log(`Realized Net Dollars Saved:  $${netSavings.toFixed(5)}`);
  console.log(`Empirical Savings Ratio:     ${netSavingsPct}%`);
  console.log("--------------------------------------------------------------------------------");
  console.log("Route Distribution Breakdown:");
  for (const [model, count] of Object.entries(routeCounts)) {
    const pct = ((count / corpus.length) * 100).toFixed(1);
    console.log(`  - ${model.padEnd(22)}: ${String(count).padStart(2)} turns (${pct}%)`);
  }
  console.log("================================================================================\n");
}

runCounterfactualReplay();
