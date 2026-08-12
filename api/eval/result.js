// POST /api/eval/result
// Receives a deterministic evaluation result from the client and persists it
// to the evaluation plane. Fire-and-forget from the client — localStorage
// remains the safety net if this call fails.
//
// Body: { requestId, tenantId, evaluation: { qualityScore?, safetyVerdict?,
//   routeExpected?, routeCorrect?, notes?, evaluatedAt }, evaluator,
//   evaluatorVersion?, domain?, routeId?, model? }

import { storeEval } from "../lib/kv.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  var body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const { requestId, tenantId, evaluation, evaluator } = body || {};
  if (!requestId || !tenantId || !evaluation || !evaluator) {
    return res.status(400).json({ error: "requestId, tenantId, evaluation, and evaluator are required" });
  }

  const entry = {
    requestId: requestId,
    tenantId: tenantId,
    domain: body.domain || null,
    routeId: body.routeId || null,
    model: body.model || null,
    evaluator: evaluator,
    evaluatorVersion: body.evaluatorVersion || null,
    evaluation: {
      qualityScore: evaluation.qualityScore ?? null,
      safetyVerdict: evaluation.safetyVerdict || null,
      routeExpected: typeof evaluation.routeExpected === "boolean" ? evaluation.routeExpected : null,
      routeCorrect: typeof evaluation.routeCorrect === "boolean" ? evaluation.routeCorrect : null,
      notes: Array.isArray(evaluation.notes) ? evaluation.notes : [],
      evaluatedAt: evaluation.evaluatedAt || new Date().toISOString(),
    },
    persistedAt: new Date().toISOString(),
  };

  try {
    await storeEval(tenantId, requestId, entry);
    return res.status(200).json({ persisted: true, requestId: requestId });
  } catch (e) {
    console.warn("[/api/eval/result] persistence failed:", e.message);
    return res.status(500).json({ error: "Failed to persist eval result" });
  }
}
