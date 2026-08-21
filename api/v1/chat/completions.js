// REI.ai OpenAI-compatible Chat Completions proxy
// Route: /api/v1/chat/completions
// Implements OpenAI chat completions schema with CARDO routing underneath.
// Auth: Bearer token via REI_API_KEY env var.
// model: "rei-auto" triggers auto-routing. A real model name bypasses the router.

import "dotenv/config";
import { waitUntil } from "@vercel/functions";
import { handleCfaiRequest, callModelDirect } from "../../cfai.js";
import { storeTrace } from "../../../shared/lib/kv.js";
import { projectedCost, maxCostPerQuery, isOverBudget } from "../../../shared/lib/costModel.js";
import { hashMessages, lookupDkrByHash, storeDkrEntry, recordDkrHit } from "../../../shared/lib/dkr.js";
import { buildRouterDecision } from "../../../src/lib/nightShiftRouter.js";

const ERROR_CODES = {
  CF_INVALID_REQUEST: "CF_INVALID_REQUEST",
  CF_AUTH_REQUIRED: "CF_AUTH_REQUIRED",
  CF_MODEL_UNAVAILABLE: "CF_MODEL_UNAVAILABLE",
  CF_PROVIDER_ERROR: "CF_PROVIDER_ERROR",
  CF_RATE_LIMITED: "CF_RATE_LIMITED",
  CF_BUDGET_EXCEEDED: "CF_BUDGET_EXCEEDED",
  CF_INTERNAL_ERROR: "CF_INTERNAL_ERROR",
};

// Conservative model rate basis used exclusively for pre-inference budget projection
// when auto-routing (isAutoRoute === true). The actual model is selected dynamically
// by handleCfaiRequest / buildRouterDecision downstream.
const AUTO_ROUTE_BUDGET_BASIS_MODEL = "deepseek-v4-flash";

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

function errorTypeForStatus(status) {
  if (status === 401) return "authentication_error";
  if (status === 400 || status === 405) return "invalid_request_error";
  if (status === 402) return "budget_exceeded_error";
  if (status === 429) return "rate_limit_error";
  return "server_error";
}

function errorReply(res, status, code, message, param = null) {
  return res.status(status).json({
    error: {
      message: message,
      type: errorTypeForStatus(status),
      param: param,
      code: code,
    },
  });
}

function extractCacheTokens(usage) {
  if (!usage || typeof usage !== "object") return { cacheHitTokens: null, cacheMissTokens: null };
  const cacheHitTokens =
    usage.prompt_cache_hit_tokens ??
    usage.cache_read_input_tokens ??
    usage.total_cached_tokens ??
    usage.prompt_tokens_details?.cached_tokens ??
    null;
  const cacheMissTokens =
    usage.prompt_cache_miss_tokens ??
    usage.uncached_input_tokens ??
    usage.prompt_tokens_details?.uncached_tokens ??
    null;
  return {
    cacheHitTokens: typeof cacheHitTokens === "number" ? cacheHitTokens : null,
    cacheMissTokens: typeof cacheMissTokens === "number" ? cacheMissTokens : null,
  };
}

function buildTraceEntry({ requestId, clientRequestId, routeId, model, estimatedCost, premiumCost, responseModel, result }) {
  const usage = result?.usage || null;
  const cache = extractCacheTokens(usage);
  return {
    requestId: requestId,
    clientRequestId: clientRequestId || null,
    policyVersion: POLICY_VERSION,
    tenantId: PILOT_TENANT,
    timestamp: new Date().toISOString(),
    routeId: routeId || null,
    model: model || null,
    estimatedCost: estimatedCost ?? null,
    premiumCost: premiumCost ?? null,
    responseModel: responseModel || null,
    provider: resolveProvider(responseModel),
    usage: usage,
    cacheHitTokens: cache.cacheHitTokens,
    cacheMissTokens: cache.cacheMissTokens,
  };
}

function makeRequestId(req) {
  return (
    (req.body && req.body.requestId) ||
    (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "req-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10))
  );
}

function normalizeUsage(rawUsage, userPrompt, contentText) {
  const promptTok = typeof rawUsage?.prompt_tokens === "number" && rawUsage.prompt_tokens > 0
    ? rawUsage.prompt_tokens
    : Math.max(1, Math.ceil((userPrompt || "").length / 4));
  const compTok = typeof rawUsage?.completion_tokens === "number" && rawUsage.completion_tokens > 0
    ? rawUsage.completion_tokens
    : Math.max(1, Math.ceil((contentText || "").length / 4));
  const totalTok = typeof rawUsage?.total_tokens === "number" && rawUsage.total_tokens > 0
    ? rawUsage.total_tokens
    : promptTok + compTok;

  const usageObj = {
    prompt_tokens: promptTok,
    completion_tokens: compTok,
    total_tokens: totalTok,
  };

  const cacheHit = rawUsage?.prompt_cache_hit_tokens ?? rawUsage?.prompt_tokens_details?.cached_tokens;
  if (typeof cacheHit === "number") {
    usageObj.prompt_tokens_details = { cached_tokens: cacheHit };
  }
  return usageObj;
}

function sendStreamingResponse(res, completionId, createdTime, modelName, contentText, usage, reiMeta) {
  if (typeof res.setHeader === "function") {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    if (reiMeta?.pathway) res.setHeader("X-REI-Pathway", reiMeta.pathway);
    if (reiMeta?.savings) res.setHeader("X-REI-Savings", String(reiMeta.savings));
  }

  // Initial role announcement chunk
  const roleChunk = {
    id: completionId,
    object: "chat.completion.chunk",
    created: createdTime,
    model: modelName,
    choices: [
      {
        index: 0,
        delta: { role: "assistant", content: "" },
        finish_reason: null,
      },
    ],
  };
  if (typeof res.write === "function") {
    res.write(`data: ${JSON.stringify(roleChunk)}\n\n`);
  }

  // Content chunks (send in streamable fragments)
  const chunks = contentText ? (contentText.match(/.{1,32}/gs) || [contentText]) : [""];
  for (const chunk of chunks) {
    const dataChunk = {
      id: completionId,
      object: "chat.completion.chunk",
      created: createdTime,
      model: modelName,
      choices: [
        {
          index: 0,
          delta: { content: chunk },
          finish_reason: null,
        },
      ],
    };
    if (typeof res.write === "function") {
      res.write(`data: ${JSON.stringify(dataChunk)}\n\n`);
    }
  }

  // Final terminal chunk
  const finalChunk = {
    id: completionId,
    object: "chat.completion.chunk",
    created: createdTime,
    model: modelName,
    choices: [
      {
        index: 0,
        delta: {},
        finish_reason: "stop",
      },
    ],
    usage: usage || null,
  };
  if (typeof res.write === "function") {
    res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
    res.write("data: [DONE]\n\n");
  }
  if (typeof res.end === "function") {
    res.end();
  }
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

    const { model, messages, temperature, max_tokens, stream } = req.body || {};

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

    // ── DKR session-scoped cache (read path) ────────────────────────────────────
    // Tenant = "session:<X-Session-Id header>". If no X-Session-Id is present
    // the DKR is entirely disabled for this request — there is NO fallback to
    // a shared pool. Zero cross-user data leakage by design, not by policy.
    //
    // Cache key = hashMessages(messages) — SHA-256 of the FULL messages array.
    // A single differing message produces a completely different hash, so short
    // follow-up messages ('yes', 'go on') never collide across conversations.
    //
    // Only runs for auto-routed requests; explicit model calls bypass the DKR.
    const rawSessionId = req.headers["x-session-id"] || null;
    const dkrTenant = rawSessionId && typeof rawSessionId === "string" && rawSessionId.length > 0
      ? `session:${rawSessionId}`
      : null;
    const msgHash = dkrTenant ? hashMessages(messages) : null;

    if (dkrTenant && msgHash && useAutoRoute) {
      const dkrHit = await lookupDkrByHash(dkrTenant, msgHash);
      if (dkrHit && dkrHit.response) {
        void recordDkrHit(dkrTenant, dkrHit.entryId); // hit-count is analytics; void is fine
        const completionId = `chatcmpl-dkr-${Date.now()}`;
        const createdTime = Math.floor(Date.now() / 1000);
        const usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
        if (stream) {
          return sendStreamingResponse(res, completionId, createdTime, dkrHit.model || "unknown", dkrHit.response, usage, {
            pathway: "dkr-cache",
            savings: "100%",
          });
        }
        return res.status(200).json({
          id: completionId,
          object: "chat.completion",
          created: createdTime,
          model: dkrHit.model || "unknown",
          usage,
          choices: [{
            index: 0,
            message: { role: "assistant", content: dkrHit.response },
            finish_reason: "stop",
          }],
          rei: {
            routed: false,
            dkr_hit: true,
            dkr_entry_id: dkrHit.entryId,
            dkr_hit_count: dkrHit.hitCount ?? 0,
            savings_usd: dkrHit.estimatedCost ?? 0,
          },
        });
      }
    }

    // ── Per-query cost ceiling (ROADMAP Phase 3, Increment B) ──
    // Enforced BEFORE any provider token spend. Refuses with CF_BUDGET_EXCEEDED
    // when the projected worst-case cost exceeds MAX_COST_PER_QUERY. Never
    // downgrades silently — refusing is the honest boundary.
    const ceiling = maxCostPerQuery();
    if (ceiling !== null) {
      const projectedForEnforcement = projectedCost({
        model: useAutoRoute ? AUTO_ROUTE_BUDGET_BASIS_MODEL : model,
        maxTokens: max_tokens,
      });
      if (isOverBudget(projectedForEnforcement, ceiling)) {
        return errorReply(res, 402, ERROR_CODES.CF_BUDGET_EXCEEDED,
          "Requested query would exceed the configured per-query cost ceiling ($" +
          ceiling.toFixed(6) + "): projected $" + projectedForEnforcement.toFixed(6));
      }
    }

    if (!useAutoRoute) {
      // ── Explicit model: bypass the router and call the provider directly ──
      const directResult = await callModelDirect(model, messages, max_tokens, temperature);

      if (directResult.rateLimited || directResult.model === "none") {
        const code = directResult.rateLimited ? ERROR_CODES.CF_RATE_LIMITED : ERROR_CODES.CF_PROVIDER_ERROR;
        return errorReply(res, 503, code, directResult.content);
      }

      const usage = normalizeUsage(directResult.usage, userPrompt, directResult.content);
      const completionId = `chatcmpl-${Date.now()}`;
      const createdTime = Math.floor(Date.now() / 1000);

      const requestId = makeRequestId(req);
      const tracePromise = storeTrace(PILOT_TENANT, requestId, buildTraceEntry({
        requestId: requestId,
        clientRequestId: (req.body && req.body.requestId) || null,
        routeId: null,
        model: model,
        estimatedCost: null,
        premiumCost: null,
        responseModel: directResult.model || null,
        result: { usage: usage },
      }));
      void tracePromise;

      if (stream) {
        return sendStreamingResponse(res, completionId, createdTime, directResult.model, directResult.content, usage, {
          pathway: null,
          savings: null,
        });
      }

      return res.status(200).json({
        id: completionId,
        object: "chat.completion",
        created: createdTime,
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
    // array preserves the original multi-turn structure. The router still runs
    // on the flattened userPrompt for text-feature extraction (hinge, terms, DAS).
    const routerDecision = buildRouterDecision(userPrompt);
    const result = await handleCfaiRequest("chat", [], userPrompt, systemPrompt, [], routerDecision, messages);

    if (!result.success) {
      return errorReply(res, 500, ERROR_CODES.CF_INTERNAL_ERROR, result.error || "Routing error");
    }

    const effectiveRouterDecision = result.routerDecision || routerDecision;
    const selectedModel = result.model || effectiveRouterDecision?.model || "unknown";
    const reiPathway = effectiveRouterDecision?.id || "unknown";
    const reiSavings = computeSavings(
      effectiveRouterDecision?.estimatedCost,
      effectiveRouterDecision?.premiumCost
    );

    const usage = normalizeUsage(result.usage, userPrompt, result.result);
    const completionId = `chatcmpl-${Date.now()}`;
    const createdTime = Math.floor(Date.now() / 1000);

    // Persist a durable trace entry to the evaluation plane so the savings
    // dashboard can aggregate REAL dollar savings over proxy traffic. Mirrors
    // cfai.js; non-blocking (Vercel waits for the promise before returning).
    // Gracefully no-ops when KV is not configured.
    const requestId = makeRequestId(req);
    const tracePromise = storeTrace(PILOT_TENANT, requestId, buildTraceEntry({
      requestId: requestId,
      clientRequestId: (req.body && req.body.requestId) || null,
      routeId: routerDecision?.id || null,
      model: routerDecision?.model || null,
      estimatedCost: routerDecision?.estimatedCost ?? null,
      premiumCost: routerDecision?.premiumCost ?? null,
      responseModel: result.model || null,
      result: result,
    }));
    void tracePromise;

    // ── DKR session-scoped cache (write path) ────────────────────────────────
    // Writes when: session ID is present (X-Session-Id header), msgHash is computed,
    // handleCfaiRequest succeeded (result.success === true), and result.result is a valid string.
    // Note: result.success checks execution/transport success of the router & model API call
    // (claimGateway verification is browser-resident).
    //
    // Uses waitUntil from @vercel/functions so the response returns immediately without
    // KV write latency overhead while ensuring the async persistence completes before
    // the serverless execution context terminates.
    //
    // queryText is intentionally omitted — the full-message hash alone is sufficient for
    // lookup; storing raw conversation text is an unnecessary privacy surface.
    if (dkrTenant && msgHash && result.success && typeof result.result === "string") {
      waitUntil(
        storeDkrEntry({
          entryId: crypto.randomUUID(),
          queryHash: msgHash,
          queryText: "",
          queryVector: [],
          response: result.result,
          model: routerDecision?.model || selectedModel,
          provider: resolveProvider(result.model || selectedModel),
          routeId: routerDecision?.id || null,
          estimatedCost: routerDecision?.estimatedCost ?? 0,
          tenantId: dkrTenant,
          timestamp: new Date().toISOString(),
          policyVersion: POLICY_VERSION,
          hitCount: 0,
          lastHitAt: null,
        })
      );
    }

    if (stream) {
      return sendStreamingResponse(res, completionId, createdTime, selectedModel, result.result, usage, {
        pathway: reiPathway,
        savings: reiSavings,
      });
    }

    if (typeof res.setHeader === "function") {
      res.setHeader("X-REI-Pathway", reiPathway);
      res.setHeader("X-REI-Savings", String(reiSavings));
    }

    return res.status(200).json({
      id: completionId,
      object: "chat.completion",
      created: createdTime,
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
