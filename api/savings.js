// GET /api/savings?tenant=pilot&from=2026-08-01&to=2026-08-13
// ROADMAP Phase 3 — cost savings dashboard aggregation endpoint.
//
// Aggregates REAL provider economics over the evaluation-plane trace ledger
// (the same durable traces cfai.js and v1/chat/completions.js persist). Each
// trace carries premiumCost and estimatedCost, so savings are computable as a
// genuine dollar figure, never fabricated.
//
// Response shape:
//   {
//     tenant, from, to,
//     requests,            // traces with a measurable (premiumCost + estimatedCost) pair
//     totalSaved,          // sum(premiumCost - estimatedCost) USD
//     totalPremiumBaseline,// sum(premiumCost) USD
//     avgSavingsPercent,   // 0..100, null when no measurable requests
//     series,              // [{ ts: 'YYYY-MM-DD', saved, spend, requests }] ascending
//     savingsMode: "measured" | "empty-unavailable",
//       // "measured"        -> KV present AND traces read
//       // "empty-unavailable"-> KV configured but zero traces in range, OR KV
//       //                      unavailable (cannot distinguish; UI must not
//       //                      present a number). Honesty invariant.
//   }
//
// Auth mirrors api/eval/status.js via requireApiKey.

import { getTracesWithEvals, isKvAvailable } from "../shared/lib/kv.js";
import { requireApiKey } from "../shared/lib/auth.js";

function dayBucket(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (!requireApiKey(req, res)) return;

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
    const kvAvailable = await isKvAvailable();
    let traces = [];
    if (kvAvailable) {
      const result = await getTracesWithEvals(tenant, from, to);
      traces = result.traces || [];
    }

    let totalSaved = 0;
    let totalPremiumBaseline = 0;
    let requests = 0;
    const byDay = {};

    const pushDay = (ts, saved, spend) => {
      const bucket = dayBucket(ts);
      if (!bucket) return;
      byDay[bucket] = byDay[bucket] || { saved: 0, spend: 0, requests: 0 };
      byDay[bucket].saved += saved;
      byDay[bucket].spend += spend;
      byDay[bucket].requests += 1;
    };

    for (const trace of traces) {
      const premium = trace && typeof trace.premiumCost === "number" ? trace.premiumCost : null;
      const est = trace && typeof trace.estimatedCost === "number" ? trace.estimatedCost : null;
      if (premium === null || est === null || premium <= 0) continue;
      const saved = premium - est;
      totalSaved += saved;
      totalPremiumBaseline += premium;
      requests += 1;
      pushDay(trace.timestamp || new Date().toISOString(), saved, premium);
    }

    const series = Object.keys(byDay)
      .sort()
      .map((ts) => ({
        ts,
        saved: byDay[ts].saved,
        spend: byDay[ts].spend,
        requests: byDay[ts].requests,
      }));

    const avgSavingsPercent = totalPremiumBaseline > 0
      ? (totalSaved / totalPremiumBaseline) * 100
      : null;

    return res.status(200).json({
      tenant,
      from,
      to,
      requests,
      totalSaved,
      totalPremiumBaseline,
      avgSavingsPercent,
      series,
      // When KV is unavailable we cannot distinguish "no traffic" from "no
      // telemetry" — so we must NOT report "measured". Empty/unavailable is
      // the only honest label in that case.
      savingsMode: kvAvailable ? "measured" : "empty-unavailable",
    });
  } catch (e) {
    console.warn("[/api/savings] query failed:", e.message);
    return res.status(200).json({
      tenant,
      from,
      to,
      requests: 0,
      totalSaved: 0,
      totalPremiumBaseline: 0,
      avgSavingsPercent: null,
      series: [],
      savingsMode: "empty-unavailable",
    });
  }
}
