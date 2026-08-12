// GET /api/eval/status?tenant=pilot&from=2026-08-01&to=2026-08-11
// Returns all traces + evaluation results persisted to the evaluation plane
// for a date range. Supplements client-side localStorage with durable
// longitudinal data so the proposal engine can cite trends ("X% over 14 days")
// instead of single-incident snapshots.
//
// Response: { tenant, from, to, traces: TraceEntry[], evals: EvalEntry[] }

import { getTracesWithEvals } from "../lib/kv.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { tenant, from, to } = req.query || {};
  if (!tenant || !from || !to) {
    return res.status(400).json({
      error: "tenant, from, and to query parameters are required (ISO dates)",
    });
  }

  try {
    const { traces, evals } = await getTracesWithEvals(tenant, from, to);
    return res.status(200).json({
      tenant: tenant,
      from: from,
      to: to,
      traces: traces,
      evals: evals,
    });
  } catch (e) {
    console.warn("[/api/eval/status] query failed:", e.message);
    return res.status(500).json({ error: "Failed to query evaluation plane" });
  }
}
