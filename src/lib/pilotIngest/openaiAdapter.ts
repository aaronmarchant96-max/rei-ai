/**
 * @file openaiAdapter.ts
 * @description Adapter for OpenAI API response logs and chat completion payloads.
 */
import type { CanonicalPilotRequest, IngestError, IngestSource } from "./types";
import {
  generateDeterministicRequestId,
  validateRequestReplayEligibility,
  buildProvenance,
} from "./contract";

export function isOpenAIPayload(obj: any): boolean {
  if (!obj || typeof obj !== "object") return false;
  if (typeof obj.model === "string" && obj.model.includes("claude")) return false;
  if (obj.type === "message") return false;
  if (obj.usage && typeof obj.usage.input_tokens === "number") return false;

  // OpenAI chat completion response shape
  if (obj.object === "chat.completion" || (Array.isArray(obj.choices) && obj.choices[0]?.message)) {
    return true;
  }
  // OpenAI request payload shape
  if (typeof obj.model === "string" && Array.isArray(obj.messages)) {
    return true;
  }
  return false;
}

export function parseOpenAIRow(
  row: any,
  rowIndex: number,
  source: IngestSource = "openai"
): { request?: CanonicalPilotRequest; error?: IngestError } {
  if (!row || typeof row !== "object") {
    return {
      error: {
        rowIndex,
        code: "unsupported_shape",
        message: "Expected an object for OpenAI payload row.",
      },
    };
  }

  const model = typeof row.model === "string" ? row.model.trim() : "";
  if (!model) {
    return {
      error: {
        rowIndex,
        code: "missing_model",
        message: "Missing required field 'model'.",
      },
    };
  }

  // Extract tokens
  const usage = row.usage || {};
  const inputTokens = typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : typeof row.inputTokens === "number" ? row.inputTokens : -1;
  const outputTokens = typeof usage.completion_tokens === "number" ? usage.completion_tokens : typeof row.outputTokens === "number" ? row.outputTokens : -1;

  if (inputTokens < 0) {
    return {
      error: {
        rowIndex,
        code: "missing_input_tokens",
        message: "Missing or invalid 'usage.prompt_tokens'.",
      },
    };
  }

  if (outputTokens < 0) {
    return {
      error: {
        rowIndex,
        code: "missing_output_tokens",
        message: "Missing or invalid 'usage.completion_tokens'.",
      },
    };
  }

  // Extract prompt text
  let promptText = "";
  if (Array.isArray(row.messages)) {
    const userMsg = row.messages.find((m: any) => m && m.role === "user");
    if (userMsg && typeof userMsg.content === "string") {
      promptText = userMsg.content;
    } else if (row.messages[0] && typeof row.messages[0].content === "string") {
      promptText = row.messages[0].content;
    }
  } else if (typeof row.prompt === "string") {
    promptText = row.prompt;
  } else if (row.choices && row.choices[0]?.message?.content) {
    promptText = row.choices[0].message.content;
  }

  const { replayEligible, exclusionCode } = validateRequestReplayEligibility(promptText);
  const actualCost = typeof row.actualCost === "number" ? row.actualCost : undefined;
  const cachedInputTokens = typeof usage.prompt_tokens_details?.cached_tokens === "number"
    ? usage.prompt_tokens_details.cached_tokens
    : typeof row.cachedInputTokens === "number"
    ? row.cachedInputTokens
    : undefined;

  const timestamp = typeof row.created === "number"
    ? new Date(row.created * 1000).toISOString()
    : typeof row.timestamp === "string"
    ? row.timestamp
    : undefined;

  const requestId = typeof row.id === "string" ? row.id : undefined;

  const id = generateDeterministicRequestId(
    source,
    model,
    inputTokens,
    outputTokens,
    timestamp,
    promptText
  );

  const request: CanonicalPilotRequest = {
    id,
    requestId,
    timestamp,
    currency: "USD",
    prompt: promptText.trim() || undefined,
    replayEligible,
    exclusionCode: replayEligible ? undefined : exclusionCode,
    provider: "openai",
    model,
    inputTokens,
    cachedInputTokens,
    outputTokens,
    actualCost,
    finishReason: row.choices?.[0]?.finish_reason || row.finishReason || undefined,
    latencyMs: typeof row.latencyMs === "number" ? row.latencyMs : undefined,
    provenance: buildProvenance(source, replayEligible, actualCost !== undefined, true),
  };

  return { request };
}
