/**
 * REI DKR Client — client-side semantic fuzzy lookup
 *
 * The Engelbart DKR has two lookup paths:
 *   1. Exact-hash (server-side, completions.js) — O(1), no ML, sub-millisecond
 *   2. Semantic fuzzy (this module, client-side) — uses the local ONNX embedder
 *      to find near-matches above a cosine similarity threshold
 *
 * Why client-side? @xenova/transformers (ONNX) cannot cold-start inside a
 * Vercel serverless function within budget. The browser is the right host —
 * the embedder is already warmed by the time the user types a query.
 *
 * Usage:
 *   import { findSemanticMatch } from "./dkrClient";
 *   const match = await findSemanticMatch("how do I optimize a SQL query?");
 *   if (match) console.log(`DKR hit (${(match.similarity * 100).toFixed(1)}%)`);
 */

import { embedText, cosineSimilarity } from "./semanticEmbedder.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DkrEntry {
  entryId: string;
  queryHash: string;
  queryText: string;
  queryVector: number[];       // 384-dim; may be [] for legacy entries written before client-side seeding
  response: string;
  model: string;
  provider: string;
  routeId: string | null;
  estimatedCost: number;
  tenantId: string;
  timestamp: string;           // ISO 8601
  policyVersion: string;
  hitCount: number;
  lastHitAt: string | null;    // ISO 8601
}

export interface DkrMatch {
  entry: DkrEntry;
  similarity: number;          // cosine similarity [0, 1]
}

// ── Default similarity threshold ──────────────────────────────────────────────
// 0.92: strict — requires nearly identical phrasing. Start conservative;
// loosen with empirical measurement once the DKR has sufficient entries.
const DEFAULT_THRESHOLD = 0.92;

// ── Index cache (in-memory, browser lifetime) ─────────────────────────────────
// Stores the last-loaded DKR index so repeated queries don't re-fetch.
let _cachedIndex: DkrEntry[] = [];
let _indexLoadedAt: number | null = null;
const INDEX_TTL_MS = 5 * 60 * 1000; // Re-fetch index at most every 5 minutes

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Load recent DKR entries from the server and return them.
 * Results are cached in memory for INDEX_TTL_MS to avoid hammering the API.
 *
 * @param tenant  Tenant ID (default: "pilot")
 * @param force   Force a fresh fetch even if the cache is warm
 */
export async function loadDkrIndex(tenant = "pilot", force = false): Promise<DkrEntry[]> {
  const now = Date.now();
  if (
    !force &&
    _indexLoadedAt !== null &&
    now - _indexLoadedAt < INDEX_TTL_MS &&
    _cachedIndex.length > 0
  ) {
    return _cachedIndex;
  }

  try {
    const res = await fetch(`/api/dkr/index?tenant=${encodeURIComponent(tenant)}&limit=200`);
    if (!res.ok) return _cachedIndex; // serve stale on error
    const data = await res.json();
    if (!Array.isArray(data.entries)) return _cachedIndex;
    _cachedIndex = data.entries;
    _indexLoadedAt = now;
    return _cachedIndex;
  } catch {
    return _cachedIndex; // network error → serve stale
  }
}

/**
 * Score a query vector against a pre-loaded DKR index.
 * Returns all entries sorted by similarity descending.
 *
 * Only entries with a non-empty `queryVector` are eligible for fuzzy matching.
 * Entries written before client-side vector seeding are skipped (queryVector=[]).
 *
 * @param queryVector  384-dim embedding of the user query
 * @param index        DKR entries to search (from loadDkrIndex)
 */
export function scoreAgainstIndex(
  queryVector: number[],
  index: DkrEntry[]
): DkrMatch[] {
  if (!queryVector.length || !index.length) return [];

  return index
    .filter((e) => Array.isArray(e.queryVector) && e.queryVector.length === 384)
    .map((entry) => ({
      entry,
      similarity: cosineSimilarity(queryVector, entry.queryVector),
    }))
    .sort((a, b) => b.similarity - a.similarity);
}

/**
 * Given a user query string, embed it locally and find the best DKR match
 * above the similarity threshold.
 *
 * Returns null if:
 *   - No DKR entries have embedded vectors yet (cold start)
 *   - Best match is below the threshold
 *   - The embedder falls back to synthetic (fallback: true) — accuracy invalid
 *
 * @param query      Raw user query text
 * @param threshold  Cosine similarity threshold (default: 0.92)
 * @param tenant     Tenant ID (default: "pilot")
 */
export async function findSemanticMatch(
  query: string,
  threshold = DEFAULT_THRESHOLD,
  tenant = "pilot"
): Promise<DkrMatch | null> {
  if (!query || typeof query !== "string") return null;

  // Embed the query locally (ONNX pipeline, warm after first call)
  const { vector, fallback } = await embedText(query);

  // Synthetic fallback embeddings are explicitly invalid for accuracy measurement
  if (fallback) return null;

  // Load the DKR index (cached)
  const index = await loadDkrIndex(tenant);
  if (!index.length) return null;

  // Score against all entries with pre-computed vectors
  const scored = scoreAgainstIndex(vector, index);
  if (!scored.length) return null;

  const best = scored[0];
  if (best.similarity < threshold) return null;

  return best;
}

/**
 * Seed an existing DKR entry with its queryVector if it's empty.
 * Call this opportunistically after a DKR cache hit to back-fill vectors
 * for the fuzzy-match path.
 *
 * Non-blocking — fire-and-forget. Server will store the updated entry.
 *
 * @param entryId  ID of the DKR entry to seed
 * @param query    The query text to embed and store
 * @param tenant   Tenant ID (default: "pilot")
 */
export async function seedDkrVector(entryId: string, query: string, tenant = "pilot"): Promise<void> {
  if (!entryId || !query) return;
  try {
    const { vector, fallback } = await embedText(query);
    if (fallback || !vector.length) return; // don't seed with invalid vectors
    await fetch("/api/dkr/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId, tenant, vector }),
    });
  } catch {
    // Seeding is always best-effort — never throws
  }
}
