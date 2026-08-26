/**
 * @file index.ts
 * @description Unified ingestion entrypoint `normalizePilotTraffic()` for PR A2.
 * Auto-detects log formats, enforces resource limits (50MB / 100k rows), fails closed on ambiguity,
 * and outputs CanonicalPilotRequest[] with full provenance.
 */
import type {
  CanonicalPilotRequest,
  ExclusionCode,
  IngestError,
  IngestOptions,
  IngestResult,
  IngestSource,
} from "./types";
import { DEFAULT_INGEST_OPTIONS } from "./contract";
import { isOpenAIPayload, parseOpenAIRow } from "./openaiAdapter";
import { isAnthropicPayload, parseAnthropicRow } from "./anthropicAdapter";
import { isGeminiPayload, parseGeminiRow } from "./geminiAdapter";
import {
  isGenericJsonPayload,
  parseGenericJsonRow,
  parseCSVPayload,
} from "./genericJsonCsvAdapter";

export * from "./types";
export * from "./contract";
export * from "./openaiAdapter";
export * from "./anthropicAdapter";
export * from "./geminiAdapter";
export * from "./genericJsonCsvAdapter";

/**
 * Detect the ingestion format for an object or array payload.
 * Fail-closed: If multiple adapters match without an explicit sourceHint, returns "ambiguous".
 */
export function detectFormat(payload: any, hint?: IngestSource): IngestSource | "ambiguous" | "unknown" {
  if (hint && ["openai", "anthropic", "gemini", "generic_json", "csv", "rei"].includes(hint)) {
    return hint;
  }

  const sample = Array.isArray(payload) ? payload[0] : payload;
  if (!sample || typeof sample !== "object") return "unknown";

  const specificMatches: IngestSource[] = [];
  if (isOpenAIPayload(sample)) specificMatches.push("openai");
  if (isAnthropicPayload(sample)) specificMatches.push("anthropic");
  if (isGeminiPayload(sample)) specificMatches.push("gemini");

  if (specificMatches.length === 1) {
    return specificMatches[0];
  }

  if (specificMatches.length > 1) {
    return "ambiguous";
  }

  if (isGenericJsonPayload(sample)) {
    return "generic_json";
  }

  return "unknown";
}

/**
 * Main ingestion entrypoint for pilot logs.
 */
export function normalizePilotTraffic(
  rawInput: string | object | any[],
  options?: IngestOptions
): IngestResult {
  const maxSizeBytes = options?.maxSizeBytes ?? DEFAULT_INGEST_OPTIONS.maxSizeBytes;
  const maxRows = options?.maxRows ?? DEFAULT_INGEST_OPTIONS.maxRows;
  const sourceHint = options?.sourceHint;

  const emptyResult = (source: IngestSource, code?: ExclusionCode, msg?: string): IngestResult => ({
    source,
    totalParsed: 0,
    canonicalRequests: [],
    replayEligibleCount: 0,
    excludedCount: 0,
    exclusionBreakdown: code ? { [code]: 1 } : {},
    errors: code && msg ? [{ code, message: msg }] : [],
  });

  if (!rawInput) {
    return emptyResult("generic_json", "unsupported_shape", "Input payload is empty or null.");
  }

  // 1. Enforce payload size limit for string inputs
  let textInput = "";
  let parsedObject: any = null;

  if (typeof rawInput === "string") {
    textInput = rawInput;
    if (Buffer.byteLength(textInput, "utf8") > maxSizeBytes) {
      return emptyResult(
        sourceHint || "generic_json",
        "payload_too_large",
        `Payload size exceeds maximum allowed limit of ${maxSizeBytes} bytes.`
      );
    }

    const trimmed = textInput.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        parsedObject = JSON.parse(trimmed);
      } catch (e: any) {
        return emptyResult(
          sourceHint || "generic_json",
          "unsupported_shape",
          "Failed to parse JSON string payload."
        );
      }
    }
  } else {
    parsedObject = rawInput;
  }

  // 2. CSV String handling
  if (!parsedObject && textInput) {
    const csvResult = parseCSVPayload(textInput, sourceHint || "csv");
    const canonicalRequests = csvResult.requests;
    const replayEligibleCount = canonicalRequests.filter(r => r.replayEligible).length;
    const exclusionBreakdown: Partial<Record<ExclusionCode, number>> = {};

    for (const r of canonicalRequests) {
      if (!r.replayEligible && r.exclusionCode) {
        exclusionBreakdown[r.exclusionCode] = (exclusionBreakdown[r.exclusionCode] || 0) + 1;
      }
    }

    for (const err of csvResult.errors) {
      exclusionBreakdown[err.code] = (exclusionBreakdown[err.code] || 0) + 1;
    }

    return {
      source: "csv",
      totalParsed: tableLengthFromCSV(textInput),
      canonicalRequests,
      replayEligibleCount,
      excludedCount: canonicalRequests.length - replayEligibleCount + csvResult.errors.length,
      exclusionBreakdown,
      errors: csvResult.errors,
    };
  }

  // 3. Format detection for JSON object/array
  const detected = detectFormat(parsedObject, sourceHint);
  if (detected === "ambiguous") {
    return emptyResult(
      "generic_json",
      "ambiguous_format",
      "Payload matches multiple provider formats ambiguously. Supply an explicit sourceHint."
    );
  }

  if (detected === "unknown") {
    return emptyResult(
      "generic_json",
      "unsupported_shape",
      "Payload shape does not match any supported ingestion schema."
    );
  }

  const rows: any[] = Array.isArray(parsedObject) ? parsedObject : [parsedObject];

  // 4. Enforce max rows limit
  if (rows.length > maxRows) {
    return emptyResult(
      detected,
      "excessive_rows",
      `Payload contains ${rows.length} rows, exceeding maximum limit of ${maxRows}.`
    );
  }

  const canonicalRequests: CanonicalPilotRequest[] = [];
  const errors: IngestError[] = [];
  const exclusionBreakdown: Partial<Record<ExclusionCode, number>> = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let parseRes: { request?: CanonicalPilotRequest; error?: IngestError };

    switch (detected) {
      case "openai":
        parseRes = parseOpenAIRow(row, i, detected);
        break;
      case "anthropic":
        parseRes = parseAnthropicRow(row, i, detected);
        break;
      case "gemini":
        parseRes = parseGeminiRow(row, i, detected);
        break;
      default:
        parseRes = parseGenericJsonRow(row, i, detected);
        break;
    }

    if (parseRes.request) {
      canonicalRequests.push(parseRes.request);
      if (!parseRes.request.replayEligible && parseRes.request.exclusionCode) {
        exclusionBreakdown[parseRes.request.exclusionCode] =
          (exclusionBreakdown[parseRes.request.exclusionCode] || 0) + 1;
      }
    } else if (parseRes.error) {
      errors.push(parseRes.error);
      exclusionBreakdown[parseRes.error.code] = (exclusionBreakdown[parseRes.error.code] || 0) + 1;
    }
  }

  const replayEligibleCount = canonicalRequests.filter(r => r.replayEligible).length;
  const excludedCount = rows.length - replayEligibleCount;

  return {
    source: detected,
    totalParsed: rows.length,
    canonicalRequests,
    replayEligibleCount,
    excludedCount,
    exclusionBreakdown,
    errors,
  };
}

function tableLengthFromCSV(csvText: string): number {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  return lines.length > 1 ? lines.length - 1 : lines.length;
}
