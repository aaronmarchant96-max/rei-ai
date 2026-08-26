import { useState, useMemo, useEffect } from "react";
import { getLogs, clearLogs, exportLogsJSON } from "./lib/routingLog";
import { getEvals } from "./lib/evalLog";
import { deriveProvider } from "./lib/provider";
import { verifyAll } from "./lib/claimGateway";
import "./__eval__/claimRegistry";
import { generateProposals, exportProposalAsFixture, SIGNAL_LABEL } from "./lib/policyProposalEngine";
import {
  getProposals,
  upsertProposals,
  dismissProposal,
  acceptProposal,
  rejectProposal,
  markImplemented,
} from "./lib/policyProposalStore";
import { computeProposalMetrics } from "./lib/policyProposalMetrics";
import { fetchLongitudinalEvals } from "./lib/longitudinalEvalSource";
import DecisionFeed from "./modules/rei/components/DecisionFeed.jsx";
import AnimatedCounter from "./modules/rei/components/AnimatedCounter.jsx";
import MetricCard from "./modules/rei/components/MetricCard.jsx";
import ProgressBar from "./modules/rei/components/ProgressBar.jsx";
import { fetchSavings } from "./lib/savingsClient.js";

const DOMAIN_LABELS = {
  assistant: "Generalist",
  coding: "Coding",
  genealogy: "Genealogy",
  story: "Story",
  legal: "Legal",
};

function formatCost(n) {
  if (n < 0.0001) return "< $0.0001";
  return "$" + n.toFixed(4);
}

function exportCSV(logs) {
  const header = "timestamp,domain,routeId,model,hingeScore,estimatedCost,premiumCost,tokenCount,rationale,matchedTerms,routingMs,inputPreview,provider,rescue,truncated,actualCost,actualTokens";
  const rows = logs.map(function (e) {
    return [
      e.timestamp,
      e.domain,
      e.routeId,
      e.model,
      e.hingeScore,
      e.estimatedCost,
      e.premiumCost,
      e.tokenCount,
      "\"" + (e.rationale || "").replace(/"/g, "\"\"") + "\"",
      "\"" + (e.matchedTerms || []).join(" | ") + "\"",
      e.routingMs || "",
      "\"" + (e.inputPreview || "").replace(/"/g, "\"\"") + "\"",
      e.provider || "",
      e.rescue ? "true" : "false",
      e.truncated ? "true" : "false",
      e.actualCost != null ? e.actualCost : "",
      e.actualTokens != null ? e.actualTokens : "",
    ].join(",");
  });
  const csv = header + "\n" + rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rei-analytics-" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}

function exportJSON(logs) {
  const json = exportLogsJSON(logs);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rei-analytics-" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  URL.revokeObjectURL(url);
}

function hingScoreColor(hs) {
  if (hs >= 0.7) return "#16a34a";
  if (hs >= 0.4) return "#ca8a04";
  return "#c2410c";
}

function complexityLabel(hs) {
  if (hs >= 0.7) return "High";
  if (hs >= 0.4) return "Medium";
  return "Low";
}

function complexityDot(hs) {
  if (hs >= 0.7) return "🟢";
  if (hs >= 0.4) return "🟡";
  return "🟠";
}

export default function Analytics() {
  const [tab, setTab] = useState("usage");
  const [logs, setLogs] = useState(function () { return getLogs(); });
  const [dateRange, setDateRange] = useState("all");
  const [proposals, setProposals] = useState(function () { return getProposals(); });
  const [savings, setSavings] = useState(null);

  // Proxy savings telemetry (ROADMAP Phase 3). Reads the durable evaluation
  // plane via /api/savings. On failure or unavailable telemetry the UI shows
  // the honest empty state rather than a fabricated number.
  useEffect(function () {
    var cancelled = false;
    fetchSavings().then(function (data) {
      if (!cancelled) setSavings(data);
    }).catch(function () {
      // Leave savings null → the section renders the unavailable state.
    });
    return function () { cancelled = true; };
  }, []);

  // Generate policy proposals from observed evidence — both local (localStorage)
  // and longitudinal (server-side KV). The engine is pure/deterministic; this
  // useEffect is the data-source layer only. Set local proposals immediately,
  // then async-fetch the durable eval plane to supplement.
  useEffect(function () {
    var evals = getEvals({ evaluator: "deterministic" });
    var claims = verifyAll();
    var localLogs = getLogs();
    var generated = generateProposals(evals, localLogs, claims);
    var immediate = upsertProposals(generated);
    setProposals(immediate);

    // Supplement from the durable evaluation plane (server-side KV via
    // /api/eval/status). Degrades gracefully — a failure here leaves the
    // localStorage-only proposals in place.
    fetchLongitudinalEvals().then(function (remote) {
      if (remote.evals.length === 0 && remote.logs.length === 0) return;
      var allEvals = evals.concat(remote.evals);
      var allLogs = localLogs.concat(remote.logs);
      var merged = generateProposals(allEvals, allLogs, claims);

      // Merge longitudinal proposals into the store, with local proposals
      // winning on id collisions so disposition (dismissed/accepted) is preserved
      // across regeneration.
      var byId = new Map();
      for (var i = 0; i < immediate.length; i++) byId.set(immediate[i].id, immediate[i]);
      for (var j = 0; j < merged.length; j++) {
        if (!byId.has(merged[j].id)) byId.set(merged[j].id, merged[j]);
      }
      setProposals(upsertProposals(Array.from(byId.values())));
    }).catch(function () {});
  }, [logs, dateRange]);

  // Date-range filter: logs carry ISO timestamps; filter before aggregation.
  var filteredLogs = useMemo(function () {
    if (dateRange === "all") return logs;
    var cutoff = Date.now() - (dateRange === "30d" ? 30 : 7) * 24 * 60 * 60 * 1000;
    return logs.filter(function (e) {
      var ts = e.timestamp ? new Date(e.timestamp).getTime() : Date.now();
      return ts >= cutoff;
    });
  }, [logs, dateRange]);

  var aggregates = useMemo(function () {
    if (filteredLogs.length === 0) return null;

    var totalCost = 0;
    var totalPremium = 0;
    var totalRoutingMs = 0;
    var routingMsCount = 0;
    var domainCounts = {};
    var modelCounts = {};
    var rescueCount = 0;
    var truncatedCount = 0;
    var hingeBands = { ">= 0.8": 0, "0.55-0.8": 0, "0.3-0.55": 0, "< 0.3": 0 };
    var totalActual = 0;
    var actualCount = 0;
    var paidCount = 0;
    var paidEstimated = 0;
    var paidPremium = 0;

    for (var i = 0; i < filteredLogs.length; i++) {
      var e = filteredLogs[i];
      totalCost += e.estimatedCost || 0;
      totalPremium += e.premiumCost || 0;
      var isFreeTier = deriveProvider(e.model) === "groq";
      if (!isFreeTier) {
        paidCount += 1;
        paidEstimated += e.estimatedCost || 0;
        paidPremium += e.premiumCost || 0;
      }
      if (e.routingMs != null) {
        totalRoutingMs += e.routingMs;
        routingMsCount += 1;
      }
      domainCounts[e.domain] = (domainCounts[e.domain] || 0) + 1;
      modelCounts[e.model] = (modelCounts[e.model] || 0) + 1;
      if (e.rescue) rescueCount += 1;
      if (e.truncated) truncatedCount += 1;
      if (e.hingeScore != null) {
        if (e.hingeScore >= 0.8) hingeBands[">= 0.8"] += 1;
        else if (e.hingeScore >= 0.55) hingeBands["0.55-0.8"] += 1;
        else if (e.hingeScore >= 0.3) hingeBands["0.3-0.55"] += 1;
        else hingeBands["< 0.3"] += 1;
      }
      if (e.actualCost != null) {
        totalActual += e.actualCost;
        actualCount += 1;
      }
    }

    var totalSavings = totalPremium - totalCost;
    var savingsPct = totalPremium > 0 ? Math.round((totalSavings / totalPremium) * 100) : 0;

    var sortedDomains = Object.entries(domainCounts)
      .sort(function (a, b) { return b[1] - a[1]; });
    var sortedModels = Object.entries(modelCounts)
      .sort(function (a, b) { return b[1] - a[1]; });
    var maxDomainCount = sortedDomains[0] ? sortedDomains[0][1] : 1;
    var maxModelCount = sortedModels[0] ? sortedModels[0][1] : 1;

    var actualSavingsPct = null;
    var estimateVsActualPct = null;
    if (actualCount > 0) {
      actualSavingsPct = totalPremium > 0 ? Math.round(((totalPremium - totalActual) / totalPremium) * 100) : null;
      estimateVsActualPct = totalCost > 0 ? Math.round((totalActual / totalCost) * 100) : null;
    }

    var paidSavingsPct = paidPremium > 0 ? Math.round(((paidPremium - paidEstimated) / paidPremium) * 100) : null;

    return {
      totalRequests: filteredLogs.length,
      totalCost: totalCost,
      totalPremium: totalPremium,
      totalSavings: totalSavings,
      savingsPct: savingsPct,
      avgRoutingMs: routingMsCount > 0 ? Math.round((totalRoutingMs / routingMsCount) * 100) / 100 : null,
      domainCount: sortedDomains.length,
      sortedDomains: sortedDomains,
      sortedModels: sortedModels,
      maxDomainCount: maxDomainCount,
      maxModelCount: maxModelCount,
      rescueRate: filteredLogs.length > 0 ? Math.round((rescueCount / filteredLogs.length) * 100) : 0,
      rescueCount: rescueCount,
      truncationRate: filteredLogs.length > 0 ? Math.round((truncatedCount / filteredLogs.length) * 100) : 0,
      truncatedCount: truncatedCount,
      hingeBands: hingeBands,
      actualCount: actualCount,
      totalActual: totalActual,
      actualSavingsPct: actualSavingsPct,
      estimateVsActualPct: estimateVsActualPct,
      paidCount: paidCount,
      paidEstimated: paidEstimated,
      paidPremium: paidPremium,
      paidSavingsPct: paidSavingsPct,
    };
  }, [filteredLogs, logs]);

  // Deterministic evaluation aggregates: route-correctness from the eval log.
  var evalAggregates = useMemo(function () {
    var evals = getEvals({ evaluator: "deterministic" });
    if (evals.length === 0) return null;

    var escalated = evals.filter(function (e) { return e.evaluation.routeExpected === true; });
    var hits = escalated.filter(function (e) { return e.evaluation.routeCorrect === true; }).length;
    var misses = escalated.length - hits;
    var safetyFailures = evals.filter(function (e) {
      return e.evaluation.safetyVerdict && e.evaluation.safetyVerdict !== "clean";
    }).length;

    return {
      totalEvaluated: evals.length,
      escalatedCount: escalated.length,
      missedEscalations: misses,
      adherencePct: escalated.length > 0 ? Math.round((hits / escalated.length) * 100) : null,
      safetyFailures: safetyFailures,
    };
  }, [filteredLogs]);

  // Cost trend: cumulative savings (premiumCost - estimatedCost) over time.
  var costTrend = useMemo(function () {
    if (filteredLogs.length === 0) return [];
    var sorted = filteredLogs.slice().sort(function (a, b) {
      return new Date(a.timestamp || 0) - new Date(b.timestamp || 0);
    });
    var points = [];
    var running = 0;
    for (var i = 0; i < sorted.length; i++) {
      running += (sorted[i].premiumCost || 0) - (sorted[i].estimatedCost || 0);
      points.push({ label: (sorted[i].timestamp || "").slice(5, 10), value: Math.round(running * 10000) / 10000 });
    }
    return points;
  }, [filteredLogs]);

  // Model Health: per-model success rate, avg latency, avg cost per request.
  var modelHealth = useMemo(function () {
    var byModel = {};
    for (var i = 0; i < filteredLogs.length; i++) {
      var e = filteredLogs[i];
      var key = e.model || "unknown";
      if (!byModel[key]) byModel[key] = { model: key, count: 0, rescueCount: 0, latencySum: 0, latencyCount: 0, costSum: 0 };
      byModel[key].count += 1;
      if (e.rescue) byModel[key].rescueCount += 1;
      if (e.routingMs != null) { byModel[key].latencySum += e.routingMs; byModel[key].latencyCount += 1; }
      byModel[key].costSum += e.estimatedCost || 0;
    }
    return Object.values(byModel).map(function (m) {
      return {
        model: m.model,
        count: m.count,
        successRate: m.count > 0 ? Math.round(((m.count - m.rescueCount) / m.count) * 100) : 0,
        avgLatencyMs: m.latencyCount > 0 ? Math.round((m.latencySum / m.latencyCount) * 100) / 100 : null,
        avgCost: m.count > 0 ? Math.round((m.costSum / m.count) * 10000) / 10000 : 0,
      };
    }).sort(function (a, b) { return b.count - a.count; });
  }, [filteredLogs]);

  // Lifetime Saved derives from the routing log itself (sum of premiumCost
  // minus estimatedCost across all logged entries), so every number on this
  // page comes from one source of truth. premiumCost is frozen at log time,
  // so historical savings stay stable even if pricing config changes later.
  var lifetimeSaved = useMemo(function () {
    var premium = 0;
    var actual = 0;
    for (var i = 0; i < logs.length; i++) {
      var e = logs[i];
      premium += e.premiumCost || 0;
      actual += e.estimatedCost || 0;
    }
    return premium - actual;
  }, [logs]);

  var themeMode = useMemo(function () {
    try {
      return localStorage.getItem("rei_theme_mode") || "dark";
    } catch (e) {
      return "dark";
    }
  }, []);

  var isDark = themeMode === "dark";

  var colors = {
    page: isDark
      ? "radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.04) 0%, transparent 55%), #0A0C12"
      : "radial-gradient(ellipse at 50% 0%, rgba(180,83,9,0.06) 0%, transparent 55%), #F8F9FA",
    surface: isDark ? "#111318" : "#FFFFFF",
    border: isDark ? "rgba(255,255,255,0.08)" : "#E5E5E5",
    text: isDark ? "#E2E8F0" : "#1C1917",
    textDim: isDark ? "#94A3B8" : "#767676",
    amber: isDark ? "#F59E0B" : "#B45309",
    amberBg: isDark ? "rgba(245,158,11,0.12)" : "#FEF3C7",
  };

  var cardStyle = {
    padding: "18px 20px",
    borderRadius: "12px",
    background: colors.surface,
    border: "1px solid " + colors.border,
    textAlign: "center",
    flex: "1 1 120px",
    minWidth: "120px",
  };

  var barTrackStyle = {
    height: "8px",
    borderRadius: "4px",
    background: colors.border,
    flex: 1,
    minWidth: "60px",
    overflow: "hidden",
  };

  function handleClear() {
    if (!window.confirm("Delete all routing logs? This cannot be undone.")) return;
    clearLogs();
    setLogs([]);
  }

  return (
    <div style={{
      background: colors.page,
      minHeight: "100vh",
      fontFamily: "Inter, system-ui, sans-serif",
      color: colors.text,
      padding: "36px 20px 60px",
    }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        {/* ── Header ── */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "28px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.35em", color: colors.amber, fontWeight: 800, marginBottom: "8px", textTransform: "uppercase" }}>
              Observability
            </div>
            <h1 style={{ fontSize: "28px", fontWeight: 900, margin: 0, letterSpacing: "-0.5px", lineHeight: "1.15" }}>
              Routing Analytics
            </h1>
            <p style={{ fontSize: "13px", color: colors.textDim, margin: "8px 0 0" }}>
              From router decision to model response — what actually happened and what it cost.
            </p>
            {filteredLogs.length > 0 && (
              <p style={{ fontSize: "11px", color: colors.textDim, margin: "6px 0 0", fontFamily: "monospace" }}>
                Data as of {new Date(filteredLogs[0].timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {filteredLogs.length} requests · last {dateRange === "30d" ? "30 days" : dateRange === "7d" ? "7 days" : "all time"}
              </p>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", maxWidth: "100%" }}>
            {logs.length > 0 && (
              <button
                onClick={function () { exportCSV(logs); }}
                style={{
                  padding: "7px 14px", borderRadius: "8px",
                  background: "transparent", border: "1px solid " + colors.border,
                  color: colors.textDim, cursor: "pointer", fontSize: "12px", fontWeight: 600,
                }}
              >
                Export CSV
              </button>
            )}
            {logs.length > 0 && (
              <button
                onClick={function () { exportJSON(logs); }}
                style={{
                  padding: "7px 14px", borderRadius: "8px",
                  background: "transparent", border: "1px solid " + colors.border,
                  color: colors.textDim, cursor: "pointer", fontSize: "12px", fontWeight: 600,
                }}
              >
                Export JSON
              </button>
            )}
            {[["all", "All"], ["30d", "30 days"], ["7d", "7 days"]].map(function (r) { return (
              <button
                key={r[0]}
                onClick={function () { setDateRange(r[0]); }}
                style={{
                  padding: "7px 14px", borderRadius: "8px",
                  background: dateRange === r[0] ? colors.amber : "transparent",
                  border: "1px solid " + (dateRange === r[0] ? colors.amber : colors.border),
                  color: dateRange === r[0] ? "#000" : colors.textDim,
                  cursor: "pointer", fontSize: "12px", fontWeight: 600,
                }}
              >
                {r[1]}
              </button>
            ); })}
            <button
              onClick={handleClear}
              style={{
                padding: "7px 14px", borderRadius: "8px",
                background: "transparent", border: "1px solid " + colors.border,
                color: colors.textDim, cursor: "pointer", fontSize: "12px", fontWeight: 600,
              }}
            >
              Clear Log
            </button>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div style={{
          display: "flex", gap: "0", marginBottom: "24px",
          borderBottom: "1px solid " + colors.border,
        }}>
          {[{ key: "usage", label: "Usage Dashboard" }, { key: "decisions", label: "CARDO Decisions" }].map(function (t) { return (
            <button
              key={t.key}
              onClick={function () { setTab(t.key); }}
              style={{
                padding: "10px 20px",
                background: "transparent",
                border: "none",
                borderBottom: tab === t.key ? "2px solid " + colors.amber : "2px solid transparent",
                color: tab === t.key ? colors.amber : colors.textDim,
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: tab === t.key ? 700 : 500,
                transition: "color 0.15s ease, border-color 0.15s ease",
              }}
            >
              {t.label}
            </button>
          ); })}
        </div>

        {tab === "usage" && (!aggregates ? (
          /* ── Empty state ── */
          <div style={{
            padding: "60px 24px", textAlign: "center",
            background: colors.surface, borderRadius: "16px", border: "1px solid " + colors.border,
          }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📊</div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: colors.text, marginBottom: "6px" }}>
              No routing data yet
            </div>
            <p style={{ fontSize: "13px", color: colors.textDim, maxWidth: 360, margin: "0 auto" }}>
              Start a conversation in REI.ai to see routing patterns, cost analytics, and model distribution here.
            </p>
          </div>
        ) : (
          <>
            {/* ── Summary cards ── */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
              <MetricCard delay={0} label="Requests">
                <div style={{ fontSize: "24px", fontWeight: 800 }}><AnimatedCounter value={aggregates.totalRequests} delay={100} /></div>
              </MetricCard>
              <MetricCard delay={60} label="Estimated Session Cost" title="Ceiling-based estimate at decision time (maxTokens × ceiling rate). Real spend may be much lower — see Actual vs estimate.">
                <div style={{ fontSize: "24px", fontWeight: 800 }}>{formatCost(aggregates.totalCost)}</div>
              </MetricCard>
              <MetricCard delay={120} label="Estimated savings vs gpt-4o baseline" title="Estimated = ceiling pricing (maxTokens/1000 × ceiling rate). This is the router's estimate at decision time, before real usage is known." style={{ flex: "1 1 180px" }}>
                <div style={{ fontSize: "12px", color: colors.textDim, lineHeight: "1.6" }}>
                  Without: <b style={{ color: colors.text }}>{formatCost(aggregates.totalPremium)}</b>
                  <br />With: <b style={{ color: colors.text }}>{formatCost(aggregates.totalCost)}</b>
                </div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: colors.textDim, marginTop: "4px" }}><AnimatedCounter value={aggregates.savingsPct} delay={250} />% saved</div>
              </MetricCard>
              <MetricCard delay={180} label="Avg route decision" subtext="router decision time">
                <div style={{ fontSize: "24px", fontWeight: 800 }}>{aggregates.avgRoutingMs != null ? aggregates.avgRoutingMs + " ms" : "—"}</div>
              </MetricCard>
              <MetricCard delay={240} label="Lifetime Saved" subtext="vs gpt-4o baseline" style={{ flex: "1 1 160px" }}>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#16a34a" }}>{formatCost(lifetimeSaved)}</div>
              </MetricCard>
            </div>
            <p style={{ fontSize: "11px", color: colors.textDim, margin: "0 0 28px", lineHeight: "1.5" }}>
              Lifetime savings are calculated against the configured premium baseline (currently GPT-4o pricing).
              <br />
              Actuals tracked only since the post-response outcomes deploy (2026-08-05). Free-tier providers (Groq llama-3.3-70b at $0/$0 per 1K tokens) mean pooled savings can overstate routing — <b>Routing savings (paid-only)</b> isolates the non-free requests to show savings attributable to routing itself, not free-tier cost avoidance. Estimated = ceiling pricing (maxTokens × ceiling rate); actual = real token counts at real rates, with Groq free-tier = $0.
            </p>

            {/* ── Evidence ── */}
            <div style={{
              padding: "20px", borderRadius: "14px",
              background: colors.surface, border: "1px solid " + colors.border, marginBottom: "18px",
            }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: colors.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>
                Evidence — post-response outcomes
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
                <div style={{ ...cardStyle, textAlign: "left" }} title="Request served by a fallback provider because the primary route/model failed — timeout, HTTP 429, or an unconfigured API key. Only that a fallback happened is captured, not the specific cause.">
                  <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: colors.textDim, marginBottom: "6px" }}>Rescue rate</div>
                  <div style={{ fontSize: "20px", fontWeight: 800 }}>{aggregates.rescueRate}% <span style={{ fontSize: "11px", color: colors.textDim, fontWeight: 500 }}>({aggregates.rescueCount} of {aggregates.totalRequests})</span></div>
                  <div style={{ fontSize: "10px", color: colors.textDim, marginTop: "4px" }}>served by fallback provider</div>
                </div>
                <div style={{ ...cardStyle, textAlign: "left" }} title="Response cut at the route's maxTokens cap before it completed. Truncation limits cost but can cut the reasoning short.">
                  <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: colors.textDim, marginBottom: "6px" }}>Truncation rate</div>
                  <div style={{ fontSize: "20px", fontWeight: 800 }}>{aggregates.truncationRate}% <span style={{ fontSize: "11px", color: colors.textDim, fontWeight: 500 }}>({aggregates.truncatedCount} of {aggregates.totalRequests})</span></div>
                  <div style={{ fontSize: "10px", color: colors.textDim, marginTop: "4px" }}>response cut at maxTokens</div>
                </div>
                <div style={{ ...cardStyle, flex: "1 1 160px", textAlign: "left" }} title="Estimates use ceiling pricing (est = maxTokens/1000 × ceilingRate), assuming the full token budget is consumed. Actuals use real token counts at real rates (actual = (promptTokens × inputRate + completionTokens × outputRate) / 1000), with Groq free-tier = $0. The gap is estimator bias, not a math error.">
                  <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: colors.textDim, marginBottom: "6px" }}>Actual vs estimate</div>
                  <div style={{ fontSize: "20px", fontWeight: 800 }}>
                    {aggregates.estimateVsActualPct != null ? aggregates.estimateVsActualPct + "%" : "—"}
                    {aggregates.estimateVsActualPct != null && <span style={{ fontSize: "11px", color: colors.textDim, fontWeight: 500 }}> of estimate</span>}
                  </div>
                  <div style={{ fontSize: "10px", color: colors.textDim, marginTop: "4px" }}>
                    {aggregates.actualCount > 0 ? "real spend " + formatCost(aggregates.totalActual) + " vs est. " + formatCost(aggregates.totalCost) : "no actuals logged yet"}
                  </div>
                  <div style={{ fontSize: "10px", color: colors.textDim, marginTop: "4px" }}>
                    estimate is ceiling-based; actuals use real tokens (Groq free-tier = $0)
                  </div>
                </div>
                {aggregates.actualCount > 0 && (
                  <div style={{ ...cardStyle, flex: "1 1 160px", textAlign: "left" }}>
                    <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: colors.textDim, marginBottom: "6px" }}>Actual savings</div>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: "#16a34a" }}>
                      {aggregates.actualSavingsPct != null ? aggregates.actualSavingsPct + "%" : "—"}
                    </div>
                    <div style={{ fontSize: "10px", color: colors.textDim, marginTop: "4px" }}>
                      {aggregates.actualSavingsPct != null ? "actual spend vs premium baseline" : "no actual spend tracked yet"}
                    </div>
                  </div>
                )}
                {aggregates.paidCount > 0 && (
                  <div style={{ ...cardStyle, flex: "1 1 160px", textAlign: "left" }}>
                    <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: colors.textDim, marginBottom: "6px" }}>Routing savings (paid-only)</div>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: "#0ea5e9" }}>
                      {aggregates.paidSavingsPct != null ? aggregates.paidSavingsPct + "%" : "—"}
                    </div>
                    <div style={{ fontSize: "10px", color: colors.textDim, marginTop: "4px" }}>
                      {aggregates.paidCount + " paid requests · non-free providers only"}
                    </div>
                  </div>
                )}
                {evalAggregates && evalAggregates.escalatedCount > 0 && (
                  <div style={{ ...cardStyle, flex: "1 1 160px", textAlign: "left" }} title="Of inputs the deterministic scanner escalated, the share that reached the adversarial-validation route. 'Flags' = responses whose safety scan returned non-clean (suspicious/high-risk/critical). 100% adherence with 0 misses is the healthy signal.">
                    <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: colors.textDim, marginBottom: "6px" }}>Adversarial route adherence</div>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: evalAggregates.adherencePct != null && evalAggregates.adherencePct >= 80 ? "#16a34a" : "#e11d48" }}>
                      {evalAggregates.adherencePct != null ? evalAggregates.adherencePct + "%" : "—"}
                    </div>
                    <div style={{ fontSize: "10px", color: colors.textDim, marginTop: "4px" }}>
                      {evalAggregates.missedEscalations} missed of {evalAggregates.escalatedCount} escalated · {evalAggregates.safetyFailures} response flag(s)
                    </div>
                  </div>
                )}
              </div>
              <div style={{ fontSize: "11px", color: colors.textDim, marginBottom: "8px" }} title="0.3–0.55 is the Medium complexity band. A 0% share at ≥0.8 just means no ultra-complex query in this window — not a defect. Low/medium queries route cheap; high/ultra queries get more tokens and stricter reasoning.">HingeScore distribution</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {Object.entries(aggregates.hingeBands).map(function (entry) {
                  var band = entry[0];
                  var count = entry[1];
                  var pct = aggregates.totalRequests > 0 ? Math.round((count / aggregates.totalRequests) * 100) : 0;
                  return (
                    <div key={band} style={{ fontSize: "11px", color: colors.textDim, background: colors.amberBg, borderRadius: "6px", padding: "5px 10px" }}>
                      <b style={{ color: colors.text }}>{count}</b> {band} ({pct}%)
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Domain distribution ── */}
            <div style={{
              padding: "20px", borderRadius: "14px",
              background: colors.surface, border: "1px solid " + colors.border, marginBottom: "18px",
            }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: colors.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>
                Requests by Domain
              </div>
              {aggregates.sortedDomains.map(function (entry) {
                var domain = entry[0];
                var count = entry[1];
                var pct = Math.round((count / aggregates.totalRequests) * 100);
                return (
                  <div key={domain} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, width: "90px", flexShrink: 0, color: colors.text }}>
                      {DOMAIN_LABELS[domain] || domain}
                    </div>
                    <div style={barTrackStyle}>
                      <div style={{
                        height: "100%", width: Math.max((count / aggregates.maxDomainCount) * 100, 2) + "%",
                        borderRadius: "4px", background: colors.amber,
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                    <div style={{ fontSize: "12px", color: colors.textDim, width: "48px", textAlign: "right", flexShrink: 0 }}>
                      {count} ({pct}%)
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Cost trend ── */}
            <div style={{
              padding: "20px", borderRadius: "14px",
              background: colors.surface, border: "1px solid " + colors.border, marginBottom: "18px",
            }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: colors.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>
                Cumulative Savings Trend
              </div>
              <div style={{ fontSize: "11px", color: colors.textDim, margin: "-8px 0 12px", lineHeight: "1.5" }}>
                Lifetime saved {formatCost(lifetimeSaved)} vs gpt-4o baseline at current pricing.
              </div>
              {costTrend.length === 0 ? (
                <div style={{ fontSize: "12px", color: colors.textDim }}>No data in range yet.</div>
              ) : (
                <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "90px", paddingTop: "8px" }}>
                  {costTrend.map(function (p, i) {
                    var maxVal = Math.max.apply(null, costTrend.map(function (q) { return Math.abs(q.value); })) || 1;
                    var h = Math.max((Math.abs(p.value) / maxVal) * 80, 2);
                    var isNeg = p.value < 0;
                    return (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                        <div style={{
                          width: "100%", maxWidth: "14px", height: h + "px",
                          borderRadius: "2px 2px 0 0",
                          background: isNeg ? "#EF4444" : colors.amber,
                          opacity: 0.85,
                        }} />
                        {costTrend.length <= 20 && (
                          <div style={{ fontSize: "9px", color: colors.textDim, writingMode: "vertical-rl", textOverflow: "ellipsis", overflow: "hidden", maxHeight: "22px" }}>
                            {p.label}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Model Health ── */}
            <div style={{
              padding: "20px", borderRadius: "14px",
              background: colors.surface, border: "1px solid " + colors.border, marginBottom: "18px",
            }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: colors.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>
                Model Health
              </div>
              {modelHealth.length === 0 ? (
                <div style={{ fontSize: "12px", color: colors.textDim }}>No data in range yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {modelHealth.map(function (m) {
                    var okCount = m.count - m.rescueCount;
                    return (
                      <div key={m.model} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px" }}
                        title={m.rescueCount > 0 ? ("Rescued = requests that hit a fallback provider (outage, HTTP 429, timeout, unconfigured key). " + m.rescueCount + " of " + m.count + " requests were rescued. Details appear in Recent Requests.") : undefined}>
                        <div style={{ fontSize: "13px", fontWeight: 600, width: "180px", flexShrink: 0, color: colors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={m.model}>
                          {m.model}
                        </div>
                        <div style={{ width: "110px", flexShrink: 0, color: colors.textDim }}>
                          {m.count} reqs · {m.successRate}% ok
                          {m.rescueCount > 0 && <span style={{ color: "#e11d48", fontWeight: 700 }}> · {okCount}/{m.count} ok · {m.rescueCount} rescued</span>}
                        </div>
                        <div style={{ width: "90px", flexShrink: 0, color: colors.textDim }}>
                          {m.avgLatencyMs != null ? m.avgLatencyMs + " ms" : "—"} avg
                        </div>
                        <div style={{ color: colors.textDim }}>
                          ${m.avgCost.toFixed(4)} avg
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Model distribution ── */}
            <div style={{
              padding: "20px", borderRadius: "14px",
              background: colors.surface, border: "1px solid " + colors.border, marginBottom: "18px",
            }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: colors.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>
                Model Distribution
              </div>
              {aggregates.sortedModels.map(function (entry) {
                var model = entry[0];
                var count = entry[1];
                var pct = Math.round((count / aggregates.totalRequests) * 100);
                return (
                  <div key={model} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px", animation: "slide-up 0.35s ease-out both", animationDelay: (aggregates.sortedModels.indexOf(entry) * 80) + "ms" }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, width: "160px", flexShrink: 0, color: colors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={model}>
                      {model}
                    </div>
                    <div style={{ height: "8px", borderRadius: "4px", flex: 1, minWidth: "60px", overflow: "hidden" }}>
                      <div style={{
                        height: "100%", width: Math.max((count / aggregates.maxModelCount) * 100, 2) + "%",
                        borderRadius: "4px", background: colors.amber,
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                    <div style={{ fontSize: "12px", color: colors.textDim, width: "48px", textAlign: "right", flexShrink: 0 }}>
                      {count} ({pct}%)
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Recent requests ── */}
            <div style={{
              padding: "20px", borderRadius: "14px",
              background: colors.surface, border: "1px solid " + colors.border,
            }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: colors.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>
                Recent Requests
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ color: colors.textDim, textAlign: "left" }}>
                      <th style={{ padding: "6px 10px", fontWeight: 600, fontSize: "11px", borderBottom: "1px solid " + colors.border }}>Time</th>
                      <th style={{ padding: "6px 10px", fontWeight: 600, fontSize: "11px", borderBottom: "1px solid " + colors.border }}>Domain</th>
                      <th style={{ padding: "6px 10px", fontWeight: 600, fontSize: "11px", borderBottom: "1px solid " + colors.border }}>Model</th>
                      <th style={{ padding: "6px 10px", fontWeight: 600, fontSize: "11px", borderBottom: "1px solid " + colors.border }}>Why</th>
                      <th style={{ padding: "6px 10px", fontWeight: 600, fontSize: "11px", borderBottom: "1px solid " + colors.border }}>Cost</th>
                      <th style={{ padding: "6px 10px", fontWeight: 600, fontSize: "11px", borderBottom: "1px solid " + colors.border }}>Complexity (non-binding)</th>
                      <th style={{ padding: "6px 10px", fontWeight: 600, fontSize: "11px", borderBottom: "1px solid " + colors.border }}>Route</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.slice(0, 20).map(function (entry, idx) {
                      var hs = entry.hingeScore || 0;
                      var color = hingScoreColor(hs);
                      var terms = Array.isArray(entry.matchedTerms) ? entry.matchedTerms : [];
                      return (
                        <tr key={idx} style={{ borderBottom: "1px solid " + colors.border, animation: "slide-up 0.35s ease-out both", animationDelay: (idx * 100) + "ms" }}>
                          <td style={{ padding: "7px 10px", color: colors.textDim, whiteSpace: "nowrap" }}>
                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td style={{ padding: "7px 10px", color: colors.text }}>
                            {DOMAIN_LABELS[entry.domain] || entry.domain || ""}
                          </td>
                          <td style={{ padding: "7px 10px", color: colors.textDim, maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                            title={entry.model}>
                            {entry.model || ""}
                          </td>
                          <td style={{ padding: "7px 10px", maxWidth: "280px" }}
                            title={entry.rationale || (terms.length > 0 ? "Hinge: " + terms.join(", ") + " → " + (entry.routeId || "?") : "—")}>
                            <span style={{ display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
                              <span style={{
                                fontSize: "10px", padding: "1px 6px", borderRadius: "4px",
                                background: colors.amberBg, color: colors.amber,
                                fontWeight: 700, whiteSpace: "nowrap",
                              }}>
                                {entry.routeId || "—"}
                              </span>
                              {entry.rationale ? (
                                <span style={{ fontSize: "11px", color: colors.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "120px" }}>
                                  {entry.rationale}
                                </span>
                              ) : null}
                              {terms.length > 0 ? (
                                <span style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                  {terms.slice(0, 4).map(function (term) {
                                    return (
                                      <span key={term} style={{
                                        fontSize: "10px", padding: "1px 6px", borderRadius: "4px",
                                        background: colors.amberBg, color: colors.amber,
                                        fontWeight: 600, whiteSpace: "nowrap",
                                      }}>
                                        {term}
                                      </span>
                                    );
                                  })}
                                  {terms.length > 4 ? <span style={{ fontSize: "10px", color: colors.textDim }}>+{terms.length - 4}</span> : null}
                                </span>
                              ) : null}
                            </span>
                          </td>
                          <td style={{ padding: "7px 10px", color: colors.textDim, fontFamily: "monospace" }}>
                            {formatCost(entry.estimatedCost || 0)}
                          </td>
                          <td style={{ padding: "7px 10px", minWidth: "110px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <div style={{ ...barTrackStyle, height: "6px", minWidth: "40px" }}>
                                <div style={{
                                  height: "100%", width: (hs * 100) + "%",
                                  borderRadius: "3px", background: color,
                                }} />
                              </div>
                              <span style={{ fontSize: "11px", color: colors.textDim, whiteSpace: "nowrap" }}>
                                <span>{complexityDot(hs)}</span> {complexityLabel(hs)}
                                <span style={{ fontFamily: "monospace", color: colors.textDim }}> ({hs.toFixed(2)})</span>
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: "7px 10px", color: colors.textDim, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                            {entry.routingMs != null ? entry.routingMs + " ms" : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Policy Proposals ── */}
            <div style={{
              padding: "20px", borderRadius: "14px",
              background: colors.surface, border: "1px solid " + colors.border,
              marginTop: "18px",
            }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: colors.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
                Policy Proposals
              </div>
              <div style={{ fontSize: "11px", color: colors.textDim, marginBottom: "14px", lineHeight: "1.5" }}>
                Self-informed loop: deterministic signals from the eval/routing/claims logs generate
                proposals. None are applied automatically — each requires human review and an
                engineering change with tests. See docs/POLICY_LOOP.md.
              </div>
              {proposals.length > 0 &&
                (function () {
                  var m = computeProposalMetrics(proposals);
                  return (
                    <div data-testid="proposal-metrics" style={{ fontSize: "11px", color: colors.textDim, marginBottom: "14px", lineHeight: "1.6", padding: "10px 12px", borderRadius: "8px", background: colors.page, border: "1px solid " + colors.border }}>
                      <b style={{ color: colors.text }}>Proposal usefulness:</b>{" "}
                      {m.reviewed} of {m.total} reviewed · precision{" "}
                      {m.precision === null ? "—" : m.precision + "%"} (accepted/reviewed) ·
                      realization{" "}
                      {m.realization === null ? "—" : m.realization + "%"} (implemented/accepted) ·
                      {m.withValue} implemented with a value note
                    </div>
                  );
                })()}
              {proposals.length === 0 ? (
                <div style={{ fontSize: "12px", color: colors.textDim, padding: "10px 0" }}>
                  No open proposals. New signals appear here after reviewable evidence is logged.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {proposals.map(function (p) {
                    return (
                      <div key={p.id} style={{
                        padding: "14px 16px", borderRadius: "10px",
                        background: colors.page, border: "1px solid " + colors.border,
                        opacity: p.status === "dismissed" ? 0.5 : 1,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                          <span style={{
                            fontSize: "10px", padding: "2px 8px", borderRadius: "999px",
                            background: colors.amberBg, color: colors.amber, fontWeight: 700,
                            textTransform: "uppercase", letterSpacing: "0.05em",
                          }}>
                            {SIGNAL_LABEL[p.signal]}
                          </span>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: colors.text, flex: "1 1 200px" }}>
                            {p.title}
                          </span>
                          <span style={{ fontSize: "10px", color: colors.textDim, fontFamily: "monospace" }}>
                            {p.id}
                          </span>
                        </div>
                        <div style={{ fontSize: "12px", color: colors.textDim, lineHeight: "1.5", marginBottom: "4px" }}>
                          <b style={{ color: colors.text }}>Evidence:</b> {p.evidence}
                        </div>
                        <div style={{ fontSize: "12px", color: colors.textDim, lineHeight: "1.5", marginBottom: "10px" }}>
                          <b style={{ color: colors.text }}>Proposed change:</b> {p.suggestedChange}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {p.requestIds.length > 0 && (
                            <span style={{ fontSize: "10px", color: colors.textDim, fontFamily: "monospace" }}>
                              {p.requestIds.join(", ")}
                            </span>
                          )}
                          <span style={{ flex: 1 }} />
                          <button
                            onClick={function () {
                              var text = "### " + p.id + " — " + SIGNAL_LABEL[p.signal] + "\n\n**Evidence:** " + p.evidence + "\n\n**Proposed change:** " + p.suggestedChange;
                              if (navigator.clipboard && navigator.clipboard.writeText) {
                                navigator.clipboard.writeText(text).catch(function () { alert(text); });
                              } else {
                                alert(text);
                              }
                            }}
                            style={{
                              fontSize: "11px", padding: "4px 10px", borderRadius: "6px",
                              border: "1px solid " + colors.border, background: "transparent",
                              color: colors.textDim, cursor: "pointer",
                            }}
                          >
                            Copy proposal
                          </button>
                          <button
                            onClick={function () {
                              var snippet = exportProposalAsFixture(p);
                              if (navigator.clipboard && navigator.clipboard.writeText) {
                                navigator.clipboard.writeText(snippet).catch(function () { alert(snippet); });
                              } else {
                                alert(snippet);
                              }
                            }}
                            style={{
                              fontSize: "11px", padding: "4px 10px", borderRadius: "6px",
                              border: "1px solid " + colors.border, background: "transparent",
                              color: colors.amber, cursor: "pointer", fontWeight: 600,
                            }}
                            title="Copy Jest test fixture for this proposal"
                          >
                            Copy Test Fixture
                          </button>
                          {p.status === "proposed" && (
                            <button
                              onClick={function () { setProposals(dismissProposal(p.id)); }}
                              style={{
                                fontSize: "11px", padding: "4px 10px", borderRadius: "6px",
                                border: "1px solid " + colors.border, background: "transparent",
                                color: colors.textDim, cursor: "pointer",
                              }}
                            >
                              Dismiss
                            </button>
                          )}
                          {p.status === "proposed" && (
                            <button
                              onClick={function () { setProposals(rejectProposal(p.id)); }}
                              style={{
                                fontSize: "11px", padding: "4px 10px", borderRadius: "6px",
                                border: "1px solid " + colors.border, background: "transparent",
                                color: "#e11d48", cursor: "pointer",
                              }}
                            >
                              Mark rejected
                            </button>
                          )}
                          {p.status === "proposed" && (
                            <button
                              onClick={function () { setProposals(acceptProposal(p.id)); }}
                              style={{
                                fontSize: "11px", padding: "4px 10px", borderRadius: "6px",
                                border: "1px solid " + colors.border, background: colors.amberBg,
                                color: colors.amber, fontWeight: 700, cursor: "pointer",
                              }}
                            >
                              Mark accepted
                            </button>
                          )}
                          {p.status === "accepted" && (
                            <button
                              onClick={function () {
                                var note = window.prompt("Value note (baseline → post-change failure/cost). Required for realization measurement:", "");
                                if (note !== null) setProposals(markImplemented(p.id, note.trim()));
                              }}
                              style={{
                                fontSize: "11px", padding: "4px 10px", borderRadius: "6px",
                                border: "1px solid " + colors.border, background: "transparent",
                                color: "#16a34a", fontWeight: 700, cursor: "pointer",
                              }}
                            >
                              Mark implemented
                            </button>
                          )}
                          {p.status !== "proposed" && p.status !== "accepted" && (
                            <span style={{ fontSize: "10px", color: colors.textDim, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              {p.status}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ))}

        {/* ── Proxy savings telemetry (ROADMAP Phase 3, measured) ── */}
        {tab === "usage" && (
          <div style={{
            padding: "20px", borderRadius: "14px",
            background: colors.surface, border: "1px solid " + colors.border, marginBottom: "18px",
          }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: colors.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>
              Provider-spanning savings — measured (proxy telemetry)
            </div>
            {!savings ? (
              <p style={{ fontSize: "13px", color: colors.textDim }}>
                Loading measured savings from the evaluation plane…
              </p>
            ) : savings.savingsMode === "empty-unavailable" ? (
              <p style={{ fontSize: "13px", color: colors.textDim, lineHeight: "1.6" }}>
                Telemetry unavailable — no measured proxy savings to display yet. The gateway to the durable trace ledger (KV) is not reporting data, so we present <b>nothing rather than a fabricated number</b>. This appears when the proxy has not served auto-routed traffic in range, or when the trace store is not reachable.
              </p>
            ) : (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
                  <MetricCard label="Measured Saved" subtext={savings.requests + " measurable requests"}>
                    <div style={{ fontSize: "24px", fontWeight: 800, color: "#16a34a" }}>{formatCost(savings.totalSaved)}</div>
                  </MetricCard>
                  <MetricCard label="Baseline Spend" subtext="frontier (premium) cost of same traffic">
                    <div style={{ fontSize: "24px", fontWeight: 800 }}>{formatCost(savings.totalPremiumBaseline)}</div>
                  </MetricCard>
                  <MetricCard label="Avg Savings" subtext="vs frontier baseline">
                    <div style={{ fontSize: "24px", fontWeight: 800 }}>{savings.avgSavingsPercent != null ? savings.avgSavingsPercent.toFixed(1) + "%" : "—"}</div>
                  </MetricCard>
                  <MetricCard
                    label="Cache Hit Rate"
                    subtext={savings.cacheAggregates.measuredCacheHitRate != null
                      ? savings.cacheAggregates.requestsWithUsage + " requests w/ usage"
                      : "no cache usage yet"}
                  >
                    <div style={{ fontSize: "24px", fontWeight: 800 }}>
                      {savings.cacheAggregates.measuredCacheHitRate != null
                        ? savings.cacheAggregates.measuredCacheHitRate.toFixed(2) + "%"
                        : "—"}
                    </div>
                  </MetricCard>
                </div>
                {savings.avgSavingsPercent != null && (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ fontSize: "12px", color: colors.textDim, flexShrink: 0 }}>Avg measured savings</div>
                    <div style={{ height: "8px", borderRadius: "4px", flex: 1, minWidth: "60px", overflow: "hidden", background: colors.border }}>
                      <div style={{
                        height: "100%",
                        width: Math.max(savings.avgSavingsPercent, 2) + "%",
                        borderRadius: "4px",
                        background: "linear-gradient(90deg, #F59E0B, #D4AF37)",
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: colors.text }}>{savings.avgSavingsPercent.toFixed(1)}%</div>
                  </div>
                )}
                <p style={{ fontSize: "11px", color: colors.textDim, margin: "12px 0 0", lineHeight: "1.5" }}>
                  Measured = surface across the /api/v1/chat/completions proxy, aggregated from the durable evaluation-plane ledger. Savings = frontier (premium) baseline cost − REI routed cost per request. Cache hit rate = cached input tokens ÷ (cached + uncached) input tokens from provider usage, shown only when the proxy has actually received cache token usage in range. Reported only when telemetry is actually available.
                </p>
              </>
            )}
          </div>
        )}

        {tab === "decisions" && <DecisionFeed />}
      </div>
    </div>
  );
}
