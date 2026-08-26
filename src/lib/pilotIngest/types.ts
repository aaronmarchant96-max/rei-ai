/**
 * @file types.ts
 * @description Canonical schemas, provenance structures, and exclusion codes for PR A1 pilot ingestion.
 *
 * Invariants:
 *  - ingestable ≠ replay-routable (missing/redacted prompt → replayEligible: false, exclusionCode: "no_routing_input")
 *  - Field-level provenance explicitly tracks data source, traffic, cost, routingInput, and tokens
 *  - Stable exclusion codes ensure auditable denominators without freeform error strings
 *  - Fail-closed error objects never log raw prompt content
 */

export type ExclusionCode =
  | "missing_model"
  | "missing_input_tokens"
  | "missing_output_tokens"
  | "no_routing_input"
  | "ambiguous_format"
  | "invalid_number"
  | "unsupported_shape"
  | "payload_too_large"
  | "excessive_rows";

export type IngestSource =
  | "openai"
  | "anthropic"
  | "gemini"
  | "generic_json"
  | "csv"
  | "rei";

export interface PilotProvenance {
  source: IngestSource;
  traffic: "observed" | "replayed" | "synthetic";
  cost: "observed" | "derived" | "unavailable";
  routingInput: "observed" | "redacted" | "unavailable";
  tokens: "observed" | "derived" | "unavailable";
}

export interface CanonicalPilotRequest {
  /** Deterministic id derived from row content + timestamp + model */
  id: string;
  /** Optional customer/trace request identifier */
  requestId?: string;
  /** Normalized ISO-8601 timestamp */
  timestamp?: string;
  /** Standard currency code */
  currency: "USD";

  /** Raw or sanitized prompt text — required for replay routing */
  prompt?: string;
  /** Invariant: true ONLY if non-empty prompt text is present */
  replayEligible: boolean;
  /** Present when replayEligible is false or ingestion was excluded */
  exclusionCode?: ExclusionCode;

  provider?: string;
  model: string;

  inputTokens: number;
  cachedInputTokens?: number;
  outputTokens: number;

  /** What the customer actually paid (if known/provided) */
  actualCost?: number;

  finishReason?: string;
  latencyMs?: number;

  provenance: PilotProvenance;
}

export interface IngestOptions {
  /** Explicit source hint to override format auto-detection */
  sourceHint?: IngestSource;
  /** Maximum file payload size in bytes (default: 50MB) */
  maxSizeBytes?: number;
  /** Maximum rows allowed in batch (default: 100,000) */
  maxRows?: number;
}

export interface IngestError {
  rowIndex?: number;
  columnOffset?: number;
  code: ExclusionCode;
  message: string;
}

export interface IngestResult {
  source: IngestSource;
  totalParsed: number;
  canonicalRequests: CanonicalPilotRequest[];
  replayEligibleCount: number;
  excludedCount: number;
  exclusionBreakdown: Partial<Record<ExclusionCode, number>>;
  errors: IngestError[];
}
