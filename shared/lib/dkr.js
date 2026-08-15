// REI Dynamic Knowledge Repository (DKR)
//
// Session-scoped response cache.
//
// Tenant model:
//   Tenant = "session:<X-Session-Id header>".
//   If no session ID is supplied the DKR is entirely disabled for that
//   request — there is NO fallback to a shared pool. This guarantees
//   zero cross-user data leakage by design, not by policy.
//
// Cache-key model:
//   hashMessages(messages) — SHA-256 of the FULL canonical messages array.
//   Two requests are cache-equivalent only when every message (role + content)
//   after normalization is identical. A single differing message produces a
//   completely different hash, so short follow-up messages ('yes', 'go on')
//   are never collapsed across conversations.
//
// Write discipline:
//   On Vercel Serverless, callers pass storeDkrEntry() to waitUntil() so
//   the response returns immediately without KV write latency overhead,
//   while guaranteeing the asynchronous write finishes before container teardown.
//   In non-serverless environments, callers can await storeDkrEntry().
//
// KV key patterns (all owned by this module):
//   rei:dkr:{tenant}:{entryId}       → DkrEntry JSON (full response record)
//   rei:dkr:hash:{tenant}:{hash}     → entryId string (exact-match fast path)
//   rei:dkr:index:{tenant}           → Sorted Set (score=ts ms, member=entryId)
//
// Degrades gracefully when KV is unconfigured — all reads return null,
// all writes are silent no-ops.

import { createHash } from "crypto";
import { kvSet, kvGet, kvZadd, kvZrange } from "./kv.js";

const PREFIX = "rei";
const DKR_TYPE = "dkr";

// ── Key builders ─────────────────────────────────────────────────────────────

function entryKey(tenant, entryId) {
  return `${PREFIX}:${DKR_TYPE}:${tenant}:${entryId}`;
}

function hashKey(tenant, queryHash) {
  return `${PREFIX}:${DKR_TYPE}:hash:${tenant}:${queryHash}`;
}

function indexKey(tenant) {
  return `${PREFIX}:${DKR_TYPE}:index:${tenant}`;
}

// ── Query normalization ───────────────────────────────────────────────────────

/**
 * Normalize a query string for deterministic hashing.
 * Lowercases, collapses internal whitespace, and trims edges.
 * Must produce identical output for semantically identical queries.
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeQuery(text) {
  if (typeof text !== "string") return "";
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * SHA-256 hex hash of a normalized query string.
 * Kept for backwards-compatibility with existing tests and DKR unit coverage.
 * For chat-completion caching, prefer hashMessages() which covers the full
 * conversation context rather than a single normalised string.
 *
 * @param {string} normalized — output of normalizeQuery()
 * @returns {string} 64-char hex SHA-256
 */
export function hashQuery(normalized) {
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

/**
 * SHA-256 of the canonical full messages array.
 *
 * Covers the ENTIRE conversation context — role + normalised content of every
 * message. Two requests are only cache-equivalent if their full history is
 * identical. A single differing message (including short follow-ups like 'yes'
 * or 'explain more') produces a completely different hash.
 *
 * The canonical form intentionally excludes metadata fields (name, tool_call_id,
 * etc.) that do not affect the answer content. Only role and content matter.
 *
 * @param {Array<{role: string, content?: string}>} messages
 * @returns {string} 64-char hex SHA-256, or "" for an empty/invalid array
 */
export function hashMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return "";
  const canonical = JSON.stringify(
    messages.map((m) => ({
      role: typeof m.role === "string" ? m.role.trim() : "",
      content: normalizeQuery(m.content ?? ""),
    }))
  );
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

// ── Write path ────────────────────────────────────────────────────────────────

/**
 * Write a successful model response to the DKR.
 *
 * In serverless environments, pass this promise to `waitUntil(storeDkrEntry(...))`
 * so the HTTP response is not delayed by KV write latency while still ensuring
 * the write completes before function termination.
 *
 * @param {DkrEntry} entry
 * @returns {Promise<void>}
 */
export async function storeDkrEntry(entry) {
  if (
    !entry ||
    typeof entry.entryId !== "string" || entry.entryId.length === 0 ||
    typeof entry.queryHash !== "string" || entry.queryHash.length === 0
  ) return;
  try {
    const ts = Date.parse(entry.timestamp) || Date.now();
    // 1. Store the full entry JSON
    await kvSet(entryKey(entry.tenantId, entry.entryId), entry);
    // 2. Store the hash→entryId pointer for the O(1) exact-match fast path
    await kvSet(hashKey(entry.tenantId, entry.queryHash), entry.entryId);
    // 3. Add to temporal sorted-set index (for analytics + fuzzy seed loading)
    await kvZadd(indexKey(entry.tenantId), ts, entry.entryId);
  } catch (e) {
    // Silent — never let a DKR write failure surface to the caller
    console.warn("[dkr] storeDkrEntry failed:", e.message);
  }
}

// ── Read path (exact-hash, O(1)) ──────────────────────────────────────────────

/**
 * Exact-hash lookup. Returns the full DkrEntry or null on miss.
 *
 * This is the server-side fast path: sub-millisecond, zero ML, safe to call
 * on every serverless request. Semantic/fuzzy matching runs client-side only.
 *
 * @param {string} tenant
 * @param {string} queryHash — output of hashQuery()
 * @returns {Promise<DkrEntry | null>}
 */
export async function lookupDkrByHash(tenant, queryHash) {
  if (!tenant || !queryHash) return null;
  try {
    const entryId = await kvGet(hashKey(tenant, queryHash));
    if (!entryId || typeof entryId !== "string") return null;
    const entry = await kvGet(entryKey(tenant, entryId));
    if (!entry || typeof entry !== "object") return null;
    return entry;
  } catch (e) {
    console.warn("[dkr] lookupDkrByHash failed:", e.message);
    return null;
  }
}

// ── Hit accounting ────────────────────────────────────────────────────────────

/**
 * Increment hitCount and update lastHitAt for a served DKR entry.
 * Fire-and-forget — callers must `void recordDkrHit(...)`.
 *
 * @param {string} tenant
 * @param {string} entryId
 * @returns {Promise<void>}
 */
export async function recordDkrHit(tenant, entryId) {
  if (!tenant || !entryId) return;
  try {
    const existing = await kvGet(entryKey(tenant, entryId));
    if (!existing || typeof existing !== "object") return;
    const updated = {
      ...existing,
      hitCount: (typeof existing.hitCount === "number" ? existing.hitCount : 0) + 1,
      lastHitAt: new Date().toISOString(),
    };
    await kvSet(entryKey(tenant, entryId), updated);
  } catch (e) {
    console.warn("[dkr] recordDkrHit failed:", e.message);
  }
}

// ── Index access (for client-side fuzzy seeding + analytics) ─────────────────

/**
 * Return up to `limit` most-recent DkrEntry objects from the index.
 * Used by dkrClient.ts to seed the local cosine-similarity search index.
 * Also useful for analytics dashboards.
 *
 * @param {string} tenant
 * @param {number} [limit=200]
 * @returns {Promise<DkrEntry[]>}
 */
export async function getDkrIndex(tenant, limit = 200) {
  if (!tenant) return [];
  try {
    // zrange with byScore: true needs a score range. Use 0→now to get all,
    // then slice to limit. Vercel KV zrange returns newest last; reverse for
    // recency order.
    const now = Date.now();
    const members = await kvZrange(indexKey(tenant), 0, now);
    if (!Array.isArray(members) || members.length === 0) return [];

    // Take the most recent `limit` entries (end of the sorted set = newest)
    const recents = members.slice(-limit).reverse();

    // Fetch entries in parallel, filter nulls
    const entries = await Promise.all(
      recents.map((id) => kvGet(entryKey(tenant, id)))
    );
    return entries.filter((e) => e && typeof e === "object");
  } catch (e) {
    console.warn("[dkr] getDkrIndex failed:", e.message);
    return [];
  }
}
