/**
 * @file shared/lib/serverRouter.js
 * @description Server-safe plain JavaScript gateway boundary.
 * Free of TypeScript, JSX, or browser module dependencies.
 * Consumed by Vercel serverless functions (/api/v1/chat/completions.js, /api/cfai.js, /api/health.js).
 */

import fs from "fs";
import path from "path";

const fingerprintsPath = path.resolve(process.cwd(), "data/fingerprints.json");
const fingerprints = JSON.parse(fs.readFileSync(fingerprintsPath, "utf8"));

const DOMAIN_MAP = {
  genealogy: "genealogy-deep-dive",
  coding: "coding-hinge",
  story: "creative-story",
  creative: "creative-story",
  legal: "case-hinge-legal",
  assistant: "structured-reasoning"
};

const DEFAULT_MODEL_RATES = {
  "deepseek-chat": { input: 0.00014, output: 0.00028, premiumBasis: 0.005 },
  "deepseek-v4-flash": { input: 0.00014, output: 0.00028, premiumBasis: 0.005 },
  "llama-3.1-8b-instant": { input: 0.00005, output: 0.00008, premiumBasis: 0.003 },
  "llama-3.3-70b-versatile": { input: 0.00059, output: 0.00079, premiumBasis: 0.005 },
  "zai/glm-5.2": { input: 0.001, output: 0.0048, premiumBasis: 0.015 }
};

export function buildServerRouterDecision({ input = "", domain = null, model = null }) {
  const promptText = (input || "").toLowerCase().trim();

  // 1. Direct Model Override
  if (model && model !== "rei-auto") {
    const matchedFp = fingerprints.find((f) => f.model === model || f.id === model);
    return {
      id: matchedFp?.id || "custom-model",
      label: matchedFp?.label || model,
      model: model,
      jobType: matchedFp?.jobType || "custom",
      estimatedCost: matchedFp ? (matchedFp.costPer1kInput * 0.5 + matchedFp.costPer1kOutput * 0.5) : 0.0002,
      maxTokens: matchedFp?.maxTokens || 2048,
      temperature: matchedFp?.temperature || 0.7,
      selectionReason: "Direct model override"
    };
  }

  // 2. Domain Match Override
  if (domain && DOMAIN_MAP[domain]) {
    const targetId = DOMAIN_MAP[domain];
    const fp = fingerprints.find((f) => f.id === targetId);
    if (fp) {
      return {
        id: fp.id,
        label: fp.label,
        model: fp.model,
        jobType: fp.jobType,
        estimatedCost: fp.costPer1kInput * 0.5 + fp.costPer1kOutput * 0.5,
        maxTokens: fp.maxTokens,
        temperature: fp.temperature,
        selectionReason: `Explicit domain mapping: ${domain}`
      };
    }
  }

  // 3. Simple Greeting Check (only if input is genuinely a simple greeting)
  const greetingFp = fingerprints.find((f) => f.id === "simple-greeting");
  if (greetingFp) {
    const isGreetingMatch = greetingFp.matchTerms.some((term) => {
      if (promptText === term) return true;
      if (
        promptText.startsWith(term + " ") ||
        promptText.startsWith(term + "\n") ||
        promptText.startsWith(term + "!") ||
        promptText.startsWith(term + ",") ||
        promptText.startsWith(term + ".")
      ) {
        const rest = promptText.slice(term.length).trim();
        return (
          rest.length <= 25 &&
          !/\b(design|implement|code|function|class|story|family|ancestor|legal|runway|tradeoff|decision|build|fix|refactor|cache|api|database|lru|ttl)\b/i.test(
            rest
          )
        );
      }
      return false;
    });
    if (isGreetingMatch) {
      return {
        id: greetingFp.id,
        label: greetingFp.label,
        model: greetingFp.model,
        jobType: greetingFp.jobType,
        estimatedCost: greetingFp.costPer1kInput * 0.05 + greetingFp.costPer1kOutput * 0.05,
        maxTokens: greetingFp.maxTokens,
        temperature: greetingFp.temperature,
        selectionReason: "Matched simple greeting pattern"
      };
    }
  }

function keywordMatches(text, term) {
  const escaped = String(term || "").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  if (!escaped) return false;
  const pattern = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
  return pattern.test(text);
}

  // 4. Term-Matching Ranking across Catalog
  let bestMatch = null;
  let maxScore = 0;

  for (const fp of fingerprints) {
    if (!fp.matchTerms) continue;
    let score = 0;
    for (const term of fp.matchTerms) {
      if (keywordMatches(promptText, term)) {
        score += term.length > 4 ? 2 : 1;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestMatch = fp;
    }
  }

  if (bestMatch && maxScore > 0) {
    return {
      id: bestMatch.id,
      label: bestMatch.label,
      model: bestMatch.model,
      jobType: bestMatch.jobType,
      estimatedCost: bestMatch.costPer1kInput * 0.5 + bestMatch.costPer1kOutput * 0.5,
      maxTokens: bestMatch.maxTokens,
      temperature: bestMatch.temperature,
      selectionReason: `Matched terms (score: ${maxScore})`
    };
  }

  // 5. Default Structured Reasoning Fallback
  const defaultFp = fingerprints.find((f) => f.id === "structured-reasoning") || fingerprints[0];
  return {
    id: defaultFp.id,
    label: defaultFp.label,
    model: defaultFp.model,
    jobType: defaultFp.jobType,
    estimatedCost: defaultFp.costPer1kInput * 0.5 + defaultFp.costPer1kOutput * 0.5,
    maxTokens: defaultFp.maxTokens,
    temperature: defaultFp.temperature,
    selectionReason: "Default fallback to structured reasoning"
  };
}

export function computeServerCost(modelName = "deepseek-chat", inputTokens = 0, outputTokens = 0) {
  const canonicalModel = String(modelName || "")
    .replace(/\s*\(fallback\)\s*$/i, "")
    .trim();
  const rates = DEFAULT_MODEL_RATES[canonicalModel];

  if (!rates) {
    return {
      canonicalModel,
      modelRated: false,
      observedCostUsd: null,
      counterfactualCostUsd: null,
      modeledDifferenceUsd: null
    };
  }

  const observedCostUsd = ((inputTokens / 1000) * rates.input) + ((outputTokens / 1000) * rates.output);
  const counterfactualCostUsd = ((inputTokens / 1000) * rates.premiumBasis) + ((outputTokens / 1000) * rates.premiumBasis);
  const modeledDifferenceUsd = Math.max(0, counterfactualCostUsd - observedCostUsd);

  return {
    canonicalModel,
    modelRated: true,
    observedCostUsd: Number(observedCostUsd.toFixed(6)),
    counterfactualCostUsd: Number(counterfactualCostUsd.toFixed(6)),
    modeledDifferenceUsd: Number(modeledDifferenceUsd.toFixed(6))
  };
}

export function normalizeFinishReason(rawReason) {
  if (!rawReason) return "unknown";
  const r = String(rawReason).toLowerCase().trim();
  if (r === "stop" || r === "end_turn" || r === "stop_sequence") return "stop";
  if (r === "length" || r === "max_tokens" || r === "max_tokens_exceeded") return "length";
  if (r === "content_filter" || r === "safety") return "content_filter";
  if (r === "cancelled" || r === "abort") return "cancelled";
  return "unknown";
}

export function evaluateDeliveryIntegrity({ rawContent = "", finishReason = null, transportCompleted = true }) {
  const normalizedFinish = normalizeFinishReason(finishReason);
  const failureReasons = [];

  if (!transportCompleted) failureReasons.push("transport_incomplete");
  if (normalizedFinish !== "stop") failureReasons.push(`invalid_termination:${normalizedFinish}`);
  if (!rawContent || rawContent.trim().length === 0) failureReasons.push("empty_content");

  const deliveryGatePassed = failureReasons.length === 0;

  return {
    deliveryGatePassed,
    finishStatus: deliveryGatePassed ? "complete" : (normalizedFinish === "stop" ? "incomplete" : normalizedFinish),
    failureReasons
  };
}
