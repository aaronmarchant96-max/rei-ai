// REI.ai OpenAI-compatible Chat Completions proxy
// Route: /api/v1/chat/completions
// Implements OpenAI chat completions schema with CARDO routing underneath.

import "dotenv/config";
import { handleCfaiRequest } from "../../cfai.js";
import { buildServerRouterDecision, computeServerCost, normalizeFinishReason } from "../../../shared/lib/serverRouter.js";
import { parseApiKeyHeader, resolveTenantContext } from "../../../shared/lib/authTenantEngine.js";

const ERROR_CODES = {
  CF_INVALID_REQUEST: "CF_INVALID_REQUEST",
  CF_AUTH_REQUIRED: "CF_AUTH_REQUIRED",
  CF_AUTH_INVALID: "CF_AUTH_INVALID",
  CF_MODEL_UNAVAILABLE: "CF_MODEL_UNAVAILABLE",
  CF_PROVIDER_ERROR: "CF_PROVIDER_ERROR",
  CF_QUOTA_EXCEEDED: "CF_QUOTA_EXCEEDED",
  CF_INTERNAL_ERROR: "CF_INTERNAL_ERROR",
};

function errorTypeForStatus(status) {
  if (status === 401) return "authentication_error";
  if (status === 400 || status === 405) return "invalid_request_error";
  if (status === 402 || status === 429) return "rate_limit_error";
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

  return {
    prompt_tokens: promptTok,
    completion_tokens: compTok,
    total_tokens: totalTok,
  };
}

function sendStreamingResponse(res, completionId, createdTime, modelName, contentText, usage, finishReason, receipt) {
  if (typeof res.setHeader === "function") {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    if (receipt?.eligible_savings_usd != null) {
      res.setHeader("X-REI-Eligible-Savings-USD", String(receipt.eligible_savings_usd));
      res.setHeader("X-REI-Savings-Eligibility", receipt.savings_eligibility);
    }
  }

  // Initial role chunk
  const roleChunk = {
    id: completionId,
    object: "chat.completion.chunk",
    created: createdTime,
    model: modelName,
    choices: [{ index: 0, delta: { role: "assistant", content: "" }, finish_reason: null }],
  };
  if (typeof res.write === "function") res.write(`data: ${JSON.stringify(roleChunk)}\n\n`);

  // Content chunks (send in buffered streamable chunks)
  const chunks = contentText ? (contentText.match(/.{1,32}/gs) || [contentText]) : [""];
  for (const chunk of chunks) {
    const dataChunk = {
      id: completionId,
      object: "chat.completion.chunk",
      created: createdTime,
      model: modelName,
      choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }],
    };
    if (typeof res.write === "function") res.write(`data: ${JSON.stringify(dataChunk)}\n\n`);
  }

  // Terminal chunk with normalized finish_reason and receipt
  const finalChunk = {
    id: completionId,
    object: "chat.completion.chunk",
    created: createdTime,
    model: modelName,
    choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
    usage: usage || null,
    receipt: receipt || null,
  };
  if (typeof res.write === "function") {
    res.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
    res.write("data: [DONE]\n\n");
  }
  if (typeof res.end === "function") res.end();
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return errorReply(res, 405, ERROR_CODES.CF_INVALID_REQUEST, "Method Not Allowed");
    }

    // 1. Unified Authentication & Tenant Identity Check
    const authHeader = req.headers.authorization || req.headers["x-api-key"] || "";
    const apiKey = parseApiKeyHeader(authHeader);
    const tenantCtx = resolveTenantContext(apiKey);

    if (!tenantCtx.isAllowed) {
      return errorReply(res, tenantCtx.status, tenantCtx.code, tenantCtx.message);
    }

    const { model, messages, domain, stream } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return errorReply(res, 400, ERROR_CODES.CF_INVALID_REQUEST, "'messages' must be a non-empty array");
    }

    const userPrompt = messages.map((m) => m.content).join("\n");

    // 2. Server Router Decision
    const routerDecision = buildServerRouterDecision({ input: userPrompt, domain, model });
    const selectedModel = routerDecision.model;

    // 3. Delegate to serverless CFAI request executor
    let cfaiRes;
    try {
      cfaiRes = await handleCfaiRequest({
        prompt: userPrompt,
        domain: domain || (routerDecision.id.includes("genealogy") ? "genealogy" : "assistant"),
        modelOverride: selectedModel !== "rei-auto" ? selectedModel : null,
        tenantId: tenantCtx.tenantId,
        stream: Boolean(stream)
      });
    } catch (err) {
      return errorReply(res, 503, ERROR_CODES.CF_PROVIDER_ERROR, `Provider execution failed: ${err.message}`);
    }

    const replyText = cfaiRes.reply ?? cfaiRes.content ?? cfaiRes.result ?? "";

    if (!cfaiRes || cfaiRes.rateLimited || cfaiRes.success === false || replyText.includes("All reasoning backends are unavailable") || (cfaiRes.reply === undefined && cfaiRes.content === undefined && cfaiRes.result === undefined)) {
      return errorReply(res, 503, ERROR_CODES.CF_MODEL_UNAVAILABLE, "All upstream model backends unavailable");
    }
    const rawFinishReason = cfaiRes.finishReason || (cfaiRes.isTruncated ? "length" : "stop");
    const normalizedFinish = normalizeFinishReason(rawFinishReason);
    const isComplete = normalizedFinish === "stop";

    const usage = normalizeUsage(cfaiRes.usage, userPrompt, replyText);
    const costs = computeServerCost(selectedModel, usage.prompt_tokens, usage.completion_tokens);

    if (typeof res.setHeader === "function") {
      res.setHeader("X-REI-Pathway", selectedModel);
      res.setHeader("X-REI-Savings", String(costs.modeledDifferenceUsd));
    }

    const requestId = cfaiRes.requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const createdTime = Math.floor(Date.now() / 1000);
    const completionId = `chatcmpl-${requestId}`;

    // 4. Delivery-Gated-V1 Integrity Receipt
    const receipt = {
      request_id: requestId,
      tenant_id: tenantCtx.tenantId,
      observed_cost_usd: costs.observedCostUsd,
      modeled_difference_usd: costs.modeledDifferenceUsd,
      eligible_savings_usd: isComplete ? costs.modeledDifferenceUsd : 0,
      savings_policy_version: "delivery-gated-v1",
      savings_eligibility: isComplete ? "eligible" : "excluded",
      finish_status: isComplete ? "complete" : normalizedFinish,
      single_flight_coalesced: Boolean(cfaiRes.singleFlightCoalesced),
      execution_role: cfaiRes.executionRole || "leader"
    };

    // 5. Streaming vs Non-Streaming OpenAI Response
    if (stream) {
      return sendStreamingResponse(res, completionId, createdTime, selectedModel, replyText, usage, normalizedFinish, receipt);
    }

    return res.status(200).json({
      id: completionId,
      object: "chat.completion",
      created: createdTime,
      model: selectedModel,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: replyText,
          },
          finish_reason: normalizedFinish,
        },
      ],
      usage,
      receipt
    });
  } catch (err) {
    return errorReply(res, 500, ERROR_CODES.CF_INTERNAL_ERROR, `Internal Gateway Error: ${err.message}`);
  }
}
