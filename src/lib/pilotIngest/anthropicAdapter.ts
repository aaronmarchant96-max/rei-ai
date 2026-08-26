/**
 * @file anthropicAdapter.ts
 * @description Adapter for Anthropic API response logs and message payloads.
 */
import type { CanonicalPilotRequest, IngestError, IngestSource } from "./types";
import {
  generateDeterministicRequestId,
  validateRequestReplayEligibility,
  buildProvenance,
} from "./contract";

export function isAnthropicPayload(obj: any): boolean {
  if (!obj || typeof obj !== "object") return false;
  if (obj.type === "message" || (typeof obj.model === "string" && obj.model.includes("claude"))) {
    return true;
  }
  if (obj.usage && (typeof obj.usage.input_tokens === "number" || typeof obj.usage.output_tokens === "number")) {
    return true;
  }
  return false;
}

export function parseAnthropicRow(
  row: any,
  rowIndex: number,
  source: IngestSource = "anthropic"
): { request?: CanonicalPilotRequest; error?: IngestError } {
  if (!row || typeof row !== "object") {
    return {
      error: {
        rowIndex,
        code: "unsupported_shape",
        message: "Expected an object for Anthropic payload row.",
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

  const usage = row.usage || {};
  const inputTokens = typeof usage.input_tokens === "number" ? usage.input_tokens : typeof row.inputTokens === "number" ? row.inputTokens : -1;
  const outputTokens = typeof usage.output_tokens === "number" ? usage.output_tokens : typeof row.outputTokens === "number" ? row.outputTokens : -1;

  if (inputTokens < 0) {
    return {
      error: {
        rowIndex,
        code: "missing_input_tokens",
        message: "Missing or invalid 'usage.input_tokens'.",
      },
    };
  }

  if (outputTokens < 0) {
    return {
      error: {
        rowIndex,
        code: "missing_output_tokens",
        message: "Missing or invalid 'usage.output_tokens'.",
      },
    };
  }

  let promptText = "";
  if (Array.isArray(row.messages)) {
    const userMsg = row.messages.find((m: any) => m && m.role === "user");
    if (userMsg) {
      if (typeof userMsg.content === "string") {
        promptText = userMsg.content;
      } else if (Array.isArray(userMsg.content) && userMsg.content[0]?.text) {
        promptText = userMsg.content[0].text;
      }
    }
  } else if (typeof row.prompt === "string") {
    promptText = row.prompt;
  } else if (Array.isArray(row.content) && row.content[0]?.text) {
    promptText = row.content[0].text;
  }

  const { replayEligible, exclusionCode } = validateRequestReplayEligibility(promptText);
  const actualCost = typeof row.actualCost === "number" ? row.actualCost : undefined;
  const cachedInputTokens = typeof usage.cache_read_input_tokens === "number"
    ? usage.cache_read_input_tokens
    : typeof row.cachedInputTokens === "number"
    ? row.cachedInputTokens
    : undefined;

  const timestamp = typeof row.timestamp === "string" ? row.timestamp : undefined;
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
    provider: "anthropic",
    model,
    inputTokens,
    cachedInputTokens,
    outputTokens,
    actualCost,
    finishReason: row.stop_reason || row.finishReason || undefined,
    latencyMs: typeof row.latencyMs === "number" ? row.latencyMs : undefined,
    provenance: buildProvenance(source, replayEligible, actualCost !== undefined, true),
  };

  return { request };
}
