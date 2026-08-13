// REI.ai OpenAI-compatible Chat Completions proxy
// Route: /api/v1/chat/completions
// Implements OpenAI chat completions schema with CARDO routing underneath.
// Auth: Bearer token via REI_API_KEY env var.
// model: "rei-auto" triggers auto-routing. A real model name bypasses the router.

import "dotenv/config";
import { handleCfaiRequest, callModelDirect } from "../../cfai.js";
import { storeTrace } from "../../../shared/lib/kv.js";

const ERROR_CODES = {
  CF_INVALID_REQUEST: "CF_INVALID_REQUEST",
  CF_AUTH_REQUIRED: "CF_AUTH_REQUIRED",
  CF_MODEL_UNAVAILABLE: "CF_MODEL_UNAVAILABLE",
  CF_PROVIDER_ERROR: "CF_PROVIDER_ERROR",
  CF_RATE_LIMITED: "CF_RATE_LIMITED",
  CF_INTERNAL_ERROR: "CF_INTERNAL_ERROR",
};

const PILOT_TENANT = "pilot";
const POLICY_VERSION = "v1";

function resolveProvider(modelName) {
  if (!modelName) return null;
  const m = modelName.toLowerCase();
  if (m.includes("deepseek")) return "deepseek";
  if (m.includes("gemini")) return "gemini";
  if (m.includes("llama") || m.includes("groq")) return "groq";
  if (m.includes("gpt") || m.includes("openai")) return "openai";
  return "unknown";
}

function errorReply(res, status, code, message) {
  return res.status(status).json({ error: { code: code, message: message } });
}

function computeSavings(estimatedCost, premiumCost) {
  if (typeof estimatedCost !== "number" || typeof premiumCost !== "number" || premiumCost === 0) {
    return null;
  }
  const pct = ((premiumCost - estimatedCost) / premiumCost) * 100;
  return `${pct.toFixed(1)}%`;
}

export default async function handler(req, res) {
  try {
    res.setHeader("Content-Type", "application/json");

    // ── Auth ──
    const apiKey = process.env.REI_API_KEY;
    if (!apiKey) {
      return errorReply(res, 500, ERROR_CODES.CF_INTERNAL_ERROR, "Server misconfigured: REI_API_KEY not set");
    }
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ") || auth.slice(7) !== apiKey) {
      return errorReply(res, 401, ERROR_CODES.CF_AUTH_REQUIRED, "Invalid or missing API key. Use Authorization: Bearer <key>");
    }

    if (req.method !== "POST") {
      return errorReply(res, 405, ERROR_CODES.CF_INVALID_REQUEST, "Method Not Allowed");
    }

    const { model, messages, temperature, max_tokens } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return errorReply(res, 400, ERROR_CODES.CF_INVALID_REQUEST, "'messages' must be a non-empty array");
    }

    // Build flattened prompt for routing text features
    const systemPrompt = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");
    const userPrompt = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => m.content)
      .join("\n");

    const useAutoRoute = !model || model === "rei-auto";

    if (!useAutoRoute) {
      // ── Explicit model: bypass the router and call the provider directly ──
      const directResult = await callModelDirect(model, messages, max_tokens, temperature);

      if (directResult.rateLimited || directResult.model === "none") {
        const code = directResult.rateLimited ? ERROR_CODES.CF_RATE_LIMITED : ERROR_CODES.CF_PROVIDER_ERROR;
        return errorReply(res, 503, code, directResult.content);
      }

      const usage = directResult.usage || {
        prompt_tokens: null,
        completion_tokens: null,
        total_tokens: null,
        note: "Direct model proxy — token counts may not be available",
      };

      return res.status(200).json({
        id: `chatcmpl-${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: directResult.model,
        usage,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: directResult.content },
            finish_reason: directResult.finishReason || "stop",
          },
        ],
        rei: {
          routed: false,
          model_selected: model,
        },
      });
    }

    // ── Auto-route through CARDO ──
    // Pass the structured messages as messagesOverride so the inference-visible
    // array preserves the original multi-turn structure.  The router still runs
    // on the flattened userPrompt for text-feature extraction (hinge, terms, DAS).
    const result = await handleCfaiRequest("chat", [], userPrompt, systemPrompt, [], null, messages);

    if (!result.success) {
      return errorReply(res, 500, ERROR_CODES.CF_INTERNAL_ERROR, result.error || "Routing error");
    }

    const routerDecision = result.routerDecision;
    const selectedModel = result.model || "unknown";
    const reiPathway = routerDecision?.id || "unknown";
    const reiSavings = computeSavings(
      routerDecision?.estimatedCost,
      routerDecision?.premiumCost
    );

    const usage = result.usage || {
      prompt_tokens: null,
      completion_tokens: null,
      total_tokens: null,
      note: "Routing proxy — token counts available via provider API directly",
    };

    // Persist a durable trace entry to the evaluation plane so the savings
    // dashboard can aggregate REAL dollar savings over proxy traffic. Mirrors
    // cfai.js; non-blocking (Vercel waits for the promise before returning).
    // Gracefully no-ops when KV is not configured.
    const requestId =
      (req.body && req.body.requestId) ||
      (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "req-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10));
    const tracePromise = storeTrace(PILOT_TENANT, requestId, {
      requestId: requestId,
      clientRequestId: (req.body && req.body.requestId) || null,
      policyVersion: POLICY_VERSION,
      tenantId: PILOT_TENANT,
      timestamp: new Date().toISOString(),
      routeId: routerDecision?.id || null,
      model: routerDecision?.model || null,
      estimatedCost: routerDecision?.estimatedCost ?? null,
      premiumCost: routerDecision?.premiumCost ?? null,
      responseModel: result.model || null,
      provider: resolveProvider(result.model),
      usage: result.usage || null,
    });
    void tracePromise;

    return res.status(200).json({
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: selectedModel,
      usage,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: result.result },
          finish_reason: "stop",
        },
      ],
      rei: {
        routed: true,
        pathway: reiPathway,
        savings: reiSavings,
        model_selected: selectedModel,
      },
    });
  } catch (error) {
    console.error("Chat completions handler error:", error);
    return errorReply(res, 500, ERROR_CODES.CF_INTERNAL_ERROR, "Server error: " + (error.message || "unknown"));
  }
}
