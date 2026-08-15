// Server-side KV wrapper for the evaluation plane.
// Degrades gracefully when Vercel KV isn't configured (no KV_REST_API_URL /
// KV_REST_API_TOKEN env vars) — persistence is skipped with a warning.
//
// Key patterns:
//   trace:{tenant}:{requestId}   → TraceEntry JSON
//   eval:{tenant}:{requestId}    → EvalEntry JSON
//   trace:index:{tenant}         → Sorted Set (member=requestId, score=timestamp epoch ms)
//   dkr:{tenant}:{entryId}       → DkrEntry JSON (session-scoped response cache)
//   dkr:hash:{tenant}:{hash}     → entryId string (exact-match fast path)
//   dkr:index:{tenant}           → Sorted Set (member=entryId, score=timestamp epoch ms)
//
// See docs/POLICY_LOOP.md for the evaluation plane boundary.

const PREFIX = "rei";

var _kv = null;
var _kvInit = false;

async function getKv() {
  if (_kvInit) return _kv;
  _kvInit = true;
  try {
    _kv = await import("@vercel/kv");
  } catch {
    // Silenced — persistence degrades gracefully when the SDK is unavailable.
  }
  return _kv;
}

async function isAvailable() {
  var k = await getKv();
  if (!k) return false;
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

/**
 * Whether Vercel KV is configured and reachable (REI_KV env present + SDK).
 * Exported so read-path aggregators can surface an honest status instead of
 * implying "no traffic" when telemetry is simply unavailable.
 */
export async function isKvAvailable() {
  return isAvailable();
}

function key(type, tenant, id) {
  return PREFIX + ":" + type + ":" + tenant + ":" + id;
}

/**
 * Persist a server-side trace entry. Idempotent (same requestId → overwritten
 * with same data is harmless; different data for same id means a retry, which
 * the client-side deduplication guards against).
 */
export async function storeTrace(tenant, requestId, entry) {
  if (!(await isAvailable())) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("[eval-plane] KV not configured — trace not persisted for", requestId);
    }
    return;
  }
  try {
    var k = await getKv();
    const traceKey = key("trace", tenant, requestId);
    const indexKey = key("trace:index", tenant);
    const ts = typeof entry.timestamp === "number"
      ? entry.timestamp
      : Date.parse(entry.timestamp) || Date.now();
    await k.set(traceKey, JSON.stringify(entry));
    await k.zadd(indexKey, { score: ts, member: requestId });
  } catch (e) {
    console.warn("[eval-plane] Failed to persist trace for", requestId, ":", e.message);
  }
}

/**
 * Persist a client-evaluated eval result. Stored independently from the trace
 * so "what happened" (trace) stays distinct from "what we judged" (eval).
 */
export async function storeEval(tenant, requestId, entry) {
  if (!(await isAvailable())) {
    return;
  }
  try {
    var k = await getKv();
    await k.set(key("eval", tenant, requestId), JSON.stringify(entry));
  } catch (e) {
    console.warn("[eval-plane] Failed to persist eval for", requestId, ":", e.message);
  }
}

/**
 * Retrieve traces + evals for a date range. Returns { traces: TraceEntry[],
 * evals: EvalEntry[] }. Empty arrays when KV is unavailable.
 */
export async function getTracesWithEvals(tenant, fromISO, toISO) {
  if (!(await isAvailable())) {
    return { traces: [], evals: [] };
  }
  try {
    var k = await getKv();
    const from = Date.parse(fromISO);
    const to = Date.parse(toISO);
    if (isNaN(from) || isNaN(to)) return { traces: [], evals: [] };

    const indexKey = key("trace:index", tenant);
    const members = await k.zrange(indexKey, from, to, { byScore: true });
    if (!members || members.length === 0) return { traces: [], evals: [] };

    const traceKeys = members.map(function (id) { return key("trace", tenant, id); });
    const evalKeys = members.map(function (id) { return key("eval", tenant, id); });

    const [traceJsons, evalJsons] = await Promise.all([
      k.mget(...traceKeys),
      k.mget(...evalKeys),
    ]);

    const traces = traceJsons
      .map(function (raw, i) {
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
      })
      .filter(Boolean);

    const evals = evalJsons
      .map(function (raw, i) {
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
      })
      .filter(Boolean);

    return { traces: traces, evals: evals };
  } catch (e) {
    console.warn("[eval-plane] Failed to read traces:", e.message);
    return { traces: [], evals: [] };
  }
}

// ── DKR primitives ───────────────────────────────────────────────────────────
// Thin, gracefully-degrading wrappers consumed exclusively by shared/lib/dkr.js.
// No business logic lives here — this layer only owns KV I/O.

/**
 * Set a raw KV key to a JSON-stringified value with optional config (e.g. TTL { ex: seconds }).
 * No-op when KV is unavailable.
 */
export async function kvSet(kvKey, value, options) {
  if (!(await isAvailable())) return;
  try {
    var k = await getKv();
    if (options && typeof options === "object") {
      await k.set(kvKey, JSON.stringify(value), options);
    } else {
      await k.set(kvKey, JSON.stringify(value));
    }
  } catch (e) {
    console.warn("[dkr] kvSet failed for", kvKey, ":", e.message);
  }
}

/**
 * Get a raw KV key and JSON-parse it. Returns null on miss or KV unavailability.
 */
export async function kvGet(kvKey) {
  if (!(await isAvailable())) return null;
  try {
    var k = await getKv();
    const raw = await k.get(kvKey);
    if (raw === null || raw === undefined) return null;
    if (typeof raw === "string") {
      try { return JSON.parse(raw); } catch { return raw; }
    }
    return raw;
  } catch (e) {
    console.warn("[dkr] kvGet failed for", kvKey, ":", e.message);
    return null;
  }
}

/**
 * Add a scored member to a sorted set. No-op when KV is unavailable.
 */
export async function kvZadd(kvKey, score, member) {
  if (!(await isAvailable())) return;
  try {
    var k = await getKv();
    await k.zadd(kvKey, { score: score, member: member });
  } catch (e) {
    console.warn("[dkr] kvZadd failed for", kvKey, ":", e.message);
  }
}

/**
 * Range query a sorted set by score. Returns member strings or [] on failure.
 */
export async function kvZrange(kvKey, min, max) {
  if (!(await isAvailable())) return [];
  try {
    var k = await getKv();
    const members = await k.zrange(kvKey, min, max, { byScore: true });
    return Array.isArray(members) ? members : [];
  } catch (e) {
    console.warn("[dkr] kvZrange failed for", kvKey, ":", e.message);
    return [];
  }
}
