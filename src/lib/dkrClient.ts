/**
 * REI DKR Client — shared type definitions
 *
 * The client-side fuzzy semantic lookup layer has been intentionally removed.
 * It was designed around `loadDkrIndex()` fetching all DKR entries for a
 * tenant to the browser so that `findSemanticMatch()` could run cosine
 * similarity locally via the ONNX embedder. That design had two blockers:
 *
 *   1. Fetch boundary: even with session-scoped tenants, pulling all cached
 *      entries to the browser is only safe once per-user (not per-session)
 *      isolation exists. Session IDs can be guessed or replayed; a user ID
 *      tied to authentication cannot.
 *
 *   2. The `/api/dkr/index` and `/api/dkr/seed` endpoints were never
 *      implemented, so none of these functions could have worked.
 *
 * What this module now exports:
 *   - DkrEntry  — the full shape of a KV-stored DKR record
 *   - DkrMatch  — a DkrEntry paired with a cosine similarity score
 *
 * These types are consumed by `shared/lib/dkr.js` (server) and any future
 * component that needs to reference the DKR record shape.
 *
 * When to revisit the fuzzy layer:
 *   When REI has real authenticated user accounts, the tenant becomes a
 *   user ID and it is safe to fetch and embed only that user's own cache
 *   entries. At that point, `scoreAgainstIndex()` + `findSemanticMatch()`
 *   can be re-introduced here with a scoped `loadDkrIndex(userId)` that
 *   never returns another user's data.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DkrEntry {
  /** Unique ID for this cache record. */
  entryId: string;
  /** SHA-256 of the canonical full messages array (from hashMessages()). */
  queryHash: string;
  /** Raw query text. Empty string by default — stored hash is sufficient for lookup. */
  queryText: string;
  /** 384-dim embedding vector. Empty array until fuzzy layer is re-introduced. */
  queryVector: number[];
  /** The cached LLM response text. */
  response: string;
  /** Model that produced the response, e.g. "deepseek-v4-flash". */
  model: string;
  /** Provider that served the response, e.g. "deepseek". */
  provider: string;
  /** CARDO route ID that selected the model, or null for direct calls. */
  routeId: string | null;
  /** Estimated cost in USD of the original LLM call. */
  estimatedCost: number;
  /** Tenant identifier. Format: "session:<sessionId>" for current scope. */
  tenantId: string;
  /** ISO 8601 timestamp of when this entry was written. */
  timestamp: string;
  /** Policy version active at write time, e.g. "v1". */
  policyVersion: string;
  /** Number of times this entry has been served from cache. */
  hitCount: number;
  /** ISO 8601 timestamp of the last cache hit, or null if never served. */
  lastHitAt: string | null;
}

export interface DkrMatch {
  entry: DkrEntry;
  /** Cosine similarity score in [0, 1]. Higher = more similar. */
  similarity: number;
}
