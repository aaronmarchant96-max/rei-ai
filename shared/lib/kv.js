// Server-side KV wrapper for the evaluation plane.
// Degrades gracefully when Vercel KV isn't configured (no KV_REST_API_URL /
// KV_REST_API_TOKEN env vars) — persistence is skipped with a warning.
//
// Key patterns:
//   trace:{tenant}:{requestId}   → TraceEntry JSON
//   eval:{tenant}:{requestId}    → EvalEntry JSON
//   trace:index:{tenant}         → Sorted Set (member=requestId, score=timestamp epoch ms)
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
