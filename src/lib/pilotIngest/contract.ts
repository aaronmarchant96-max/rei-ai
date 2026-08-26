/**
 * @file contract.ts
 * @description Ingestion adapter contract, deterministic hash generation, and resource limit enforcement for PR A1.
 */
import type {
  CanonicalPilotRequest,
  ExclusionCode,
  IngestOptions,
  PilotProvenance,
  IngestSource,
} from "./types";

export const DEFAULT_MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const DEFAULT_MAX_ROWS = 100_000;

export const DEFAULT_INGEST_OPTIONS: Required<IngestOptions> = {
  sourceHint: "generic_json",
  maxSizeBytes: DEFAULT_MAX_SIZE_BYTES,
  maxRows: DEFAULT_MAX_ROWS,
};

/**
 * Generate a deterministic string hash for a request entry.
 * Prevents duplicate log uploads from inflating evidence counts.
 */
export function generateDeterministicRequestId(
  source: IngestSource,
  model: string,
  inputTokens: number,
  outputTokens: number,
  timestamp?: string,
  prompt?: string
): string {
  const cleanPrompt = (prompt || "").trim().slice(0, 100);
  const rawString = `${source}:${model}:${inputTokens}:${outputTokens}:${timestamp || ""}:${cleanPrompt}`;

  let hash = 0;
  for (let i = 0; i < rawString.length; i++) {
    const char = rawString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }

  const positiveHash = (hash >>> 0).toString(16);
  return `req_${source.slice(0, 3)}_${positiveHash.padStart(8, "0")}`;
}

/**
 * Enforce the strict invariant: ingestable ≠ replay-routable.
 * A request without non-empty prompt text is normalized but marked replayEligible: false.
 */
export function validateRequestReplayEligibility(
  prompt?: string
): { replayEligible: boolean; exclusionCode?: ExclusionCode } {
  if (typeof prompt !== "string" || !prompt.trim()) {
    return {
      replayEligible: false,
      exclusionCode: "no_routing_input",
    };
  }

  return {
    replayEligible: true,
  };
}

/**
 * Construct a standardized PilotProvenance object.
 */
export function buildProvenance(
  source: IngestSource,
  hasPrompt: boolean,
  hasActualCost: boolean,
  hasTokens: boolean
): PilotProvenance {
  return {
    source,
    traffic: "observed",
    cost: hasActualCost ? "observed" : "derived",
    routingInput: hasPrompt ? "observed" : "redacted",
    tokens: hasTokens ? "observed" : "unavailable",
  };
}
