/**
 * @file geminiAdapter.ts
 * @description Adapter for Google Gemini API response logs and generateContent payloads.
 */
import type { CanonicalPilotRequest, IngestError, IngestSource } from "./types";
import {
  generateDeterministicRequestId,
  validateRequestReplayEligibility,
  buildProvenance,
} from "./contract";

export function isGeminiPayload(obj: any): boolean {
  if (!obj || typeof obj !== "object") return false;
  if (obj.usageMetadata || (typeof obj.model === "string" && (obj.model.includes("gemini") || obj.model.includes("gemma")))) {
    return true;
  }
  if (Array.isArray(obj.candidates) && obj.candidates[0]?.content) {
    return true;
  }
  return false;
}

export function parseGeminiRow(
  row: any,
  rowIndex: number,
  source: IngestSource = "gemini"
): { request?: CanonicalPilotRequest; error?: IngestError } {
  if (!row || typeof row !== "object") {
    return {
      error: {
        rowIndex,
        code: "unsupported_shape",
        message: "Expected an object for Gemini payload row.",
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

  const usage = row.usageMetadata || {};
  const inputTokens = typeof usage.promptTokenCount === "number" ? usage.promptTokenCount : typeof row.inputTokens === "number" ? row.inputTokens : -1;
  const outputTokens = typeof usage.candidatesTokenCount === "number" ? usage.candidatesTokenCount : typeof row.outputTokens === "number" ? row.outputTokens : -1;

  if (inputTokens < 0) {
    return {
      error: {
        rowIndex,
        code: "missing_input_tokens",
        message: "Missing or invalid 'usageMetadata.promptTokenCount'.",
      },
    };
  }

  if (outputTokens < 0) {
    return {
      error: {
        rowIndex,
        code: "missing_output_tokens",
        message: "Missing or invalid 'usageMetadata.candidatesTokenCount'.",
      },
    };
  }

  let promptText = "";
  if (Array.isArray(row.contents)) {
    const userContent = row.contents.find((c: any) => c && (c.role === "user" || !c.role));
    if (userContent && Array.isArray(userContent.parts) && userContent.parts[0]?.text) {
      promptText = userContent.parts[0].text;
    }
  } else if (typeof row.prompt === "string") {
    promptText = row.prompt;
  } else if (Array.isArray(row.candidates) && row.candidates[0]?.content?.parts?.[0]?.text) {
    promptText = row.candidates[0].content.parts[0].text;
  }

  const { replayEligible, exclusionCode } = validateRequestReplayEligibility(promptText);
  const actualCost = typeof row.actualCost === "number" ? row.actualCost : undefined;
  const cachedInputTokens = typeof usage.cachedContentTokenCount === "number"
    ? usage.cachedContentTokenCount
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
    provider: "google",
    model,
    inputTokens,
    cachedInputTokens,
    outputTokens,
    actualCost,
    finishReason: row.candidates?.[0]?.finishReason || row.finishReason || undefined,
    latencyMs: typeof row.latencyMs === "number" ? row.latencyMs : undefined,
    provenance: buildProvenance(source, replayEligible, actualCost !== undefined, true),
  };

  return { request };
}
