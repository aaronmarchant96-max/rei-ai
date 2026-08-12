import type { EvalEntry } from "./evalLog";
import type { RoutingLogEntry } from "./routingLog";

const PILOT_TENANT = "pilot";

export interface LongitudinalEvalResult {
  evals: EvalEntry[];
  logs: RoutingLogEntry[];
}

/**
 * Pull eval + trace data from the durable evaluation plane (Vercel KV via
 * /api/eval/status). Returns an {evals, logs} pair suitable for feeding
 * generateProposals() — the engine itself never touches the network.
 *
 * Degrades gracefully: returns empty arrays on any failure (network error,
 * missing KV, non-2xx response, JSON parse failure).
 */
export async function fetchLongitudinalEvals(): Promise<LongitudinalEvalResult> {
  try {
    const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date().toISOString();
    const url =
      "/api/eval/status?tenant=" +
      PILOT_TENANT +
      "&from=" +
      encodeURIComponent(from) +
      "&to=" +
      encodeURIComponent(to);
    const res = await fetch(url);
    if (!res.ok) return { evals: [], logs: [] };

    const data = await res.json();
    const evals: EvalEntry[] = Array.isArray(data.evals) ? data.evals : [];
    const traceList: any[] = Array.isArray(data.traces) ? data.traces : [];

    // Map server-side TraceEntry → RoutingLogEntry (fields the engine uses).
    const logs: RoutingLogEntry[] = traceList.map(function (t) {
      return {
        requestId: t.requestId,
        routeId: t.routeId,
        hingeScore: t.hingeScore,
        estimatedCost: t.estimatedCost,
        premiumCost: t.premiumCost,
        truncated: t.truncated,
        rescue: Boolean(t.rescue),
      };
    });

    return { evals: evals, logs: logs };
  } catch {
    return { evals: [], logs: [] };
  }
}
