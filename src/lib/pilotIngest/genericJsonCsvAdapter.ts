/**
 * @file genericJsonCsvAdapter.ts
 * @description Ingestion adapter for generic JSON arrays and CSV exports.
 * Supports quoted delimiters, escaped quotes, BOM stripping, and flexible column header mapping.
 */
import type { CanonicalPilotRequest, IngestError, IngestSource } from "./types";
import {
  generateDeterministicRequestId,
  validateRequestReplayEligibility,
  buildProvenance,
} from "./contract";

export function isGenericJsonPayload(obj: any): boolean {
  if (!obj) return false;
  if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === "object") {
    return true;
  }
  if (typeof obj === "object" && (obj.model || obj.inputTokens || obj.prompt_tokens)) {
    return true;
  }
  return false;
}

export function parseGenericJsonRow(
  row: any,
  rowIndex: number,
  source: IngestSource = "generic_json"
): { request?: CanonicalPilotRequest; error?: IngestError } {
  if (!row || typeof row !== "object") {
    return {
      error: {
        rowIndex,
        code: "unsupported_shape",
        message: "Row must be a non-null object.",
      },
    };
  }

  const model = String(row.model || row.model_name || row.modelId || "").trim();
  if (!model) {
    return {
      error: {
        rowIndex,
        code: "missing_model",
        message: "Missing required model field.",
      },
    };
  }

  const inputTokens = Number(
    row.inputTokens ?? row.input_tokens ?? row.prompt_tokens ?? row.promptTokens ?? -1
  );
  const outputTokens = Number(
    row.outputTokens ?? row.output_tokens ?? row.completion_tokens ?? row.completionTokens ?? -1
  );

  if (isNaN(inputTokens) || inputTokens < 0) {
    return {
      error: {
        rowIndex,
        code: "missing_input_tokens",
        message: "Missing or invalid input tokens field.",
      },
    };
  }

  if (isNaN(outputTokens) || outputTokens < 0) {
    return {
      error: {
        rowIndex,
        code: "missing_output_tokens",
        message: "Missing or invalid output tokens field.",
      },
    };
  }

  const promptText = String(row.prompt ?? row.input ?? row.request ?? row.query ?? "").trim();
  const { replayEligible, exclusionCode } = validateRequestReplayEligibility(promptText);

  const rawCost = row.actualCost ?? row.actual_cost ?? row.cost ?? row.price;
  const parsedCost = typeof rawCost === "number" ? rawCost : typeof rawCost === "string" && rawCost.trim() !== "" ? Number(rawCost) : undefined;
  const actualCost = typeof parsedCost === "number" && !isNaN(parsedCost) ? parsedCost : undefined;

  const rawCached = row.cachedInputTokens ?? row.cached_input_tokens ?? row.cached_tokens;
  const cachedInputTokens = typeof rawCached === "number" && !isNaN(rawCached) ? rawCached : undefined;

  const timestamp = typeof row.timestamp === "string" ? row.timestamp : undefined;
  const requestId = typeof row.requestId === "string" || typeof row.id === "string" ? String(row.requestId || row.id) : undefined;

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
    prompt: promptText || undefined,
    replayEligible,
    exclusionCode: replayEligible ? undefined : exclusionCode,
    provider: typeof row.provider === "string" ? row.provider : undefined,
    model,
    inputTokens,
    cachedInputTokens,
    outputTokens,
    actualCost,
    finishReason: typeof row.finishReason === "string" ? row.finishReason : undefined,
    latencyMs: typeof row.latencyMs === "number" && !isNaN(row.latencyMs) ? row.latencyMs : undefined,
    provenance: buildProvenance(source, replayEligible, actualCost !== undefined, true),
  };

  return { request };
}

/**
 * Robust CSV parser supporting quotes, escaped quotes (""), and BOM removal.
 */
export function parseCSVString(csvContent: string): string[][] {
  if (!csvContent || typeof csvContent !== "string") return [];
  
  // Strip UTF-8 BOM if present
  let clean = csvContent.replace(/^\uFEFF/, "");
  
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = "";
  let insideQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentVal += '"';
        i++;
      } else {
        // Toggle quotes
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = "";
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some(cell => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = "";
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function parseCSVPayload(
  csvText: string,
  source: IngestSource = "csv"
): { requests: CanonicalPilotRequest[]; errors: IngestError[] } {
  const table = parseCSVString(csvText);
  if (table.length === 0) {
    return { requests: [], errors: [] };
  }

  const headers = table[0].map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, ""));
  const requests: CanonicalPilotRequest[] = [];
  const errors: IngestError[] = [];

  for (let i = 1; i < table.length; i++) {
    const rowCells = table[i];
    const rowObj: Record<string, any> = {};
    for (let j = 0; j < headers.length; j++) {
      if (j < rowCells.length) {
        rowObj[headers[j]] = rowCells[j];
      }
    }

    const { request, error } = parseGenericJsonRow(rowObj, i, source);
    if (request) {
      requests.push(request);
    } else if (error) {
      errors.push(error);
    }
  }

  return { requests, errors };
}
