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

const ERROR_CODES = {
  CF_INVALID_REQUEST: "CF_INVALID_REQUEST",
  CF_AUTH_REQUIRED: "CF_AUTH_REQUIRED",
  CF_MODEL_UNAVAILABLE: "CF_MODEL_UNAVAILABLE",
  CF_PROVIDER_ERROR: "CF_PROVIDER_ERROR",
  CF_RATE_LIMITED: "CF_RATE_LIMITED",
  CF_BUDGET_EXCEEDED: "CF_BUDGET_EXCEEDED",
  CF_INTERNAL_ERROR: "CF_INTERNAL_ERROR",
};

// Auto-routed proxy traffic is served on this model unless a client-side router
// decision is supplied (it currently never is from this endpoint). Its ceiling
// rate is the cost basis for the auto-route budget projection before spend.
const AUTO_ROUTE_MODEL = "deepseek-v4-flash";

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
        return res.status(200).json({
          id: `chatcmpl-dkr-${Date.now()}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: dkrHit.model || "unknown",
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
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
        model: useAutoRoute ? AUTO_ROUTE_MODEL : model,
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

      const usage = directResult.usage || {
        prompt_tokens: null,
        completion_tokens: null,
        total_tokens: null,
        note: "Direct model proxy — token counts may not be available",
      };

      const requestId = makeRequestId(req);
      const tracePromise = storeTrace(PILOT_TENANT, requestId, buildTraceEntry({
        requestId: requestId,
        clientRequestId: (req.body && req.body.requestId) || null,
        routeId: null,
        model: model,
        estimatedCost: null,
        premiumCost: null,
        responseModel: directResult.model || null,
        result: { usage: directResult.usage || null },
      }));
      void tracePromise;

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
