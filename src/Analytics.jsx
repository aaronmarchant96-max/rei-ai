import { useState, useMemo } from "react";
import { getLogs, clearLogs } from "./lib/routingLog";
import DecisionFeed from "./modules/rei/components/DecisionFeed.jsx";

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

function hingScoreColor(hs) {
  if (hs >= 0.7) return "#16a34a";
  if (hs >= 0.4) return "#ca8a04";
  return "#c2410c";
}

function confidenceLabel(hs) {
  if (hs >= 0.7) return "High";
  if (hs >= 0.4) return "Medium";
  return "Low";
}

function confidenceDot(hs) {
  if (hs >= 0.7) return "🟢";
  if (hs >= 0.4) return "🟡";
  return "🟠";
}

export default function Analytics() {
  const [tab, setTab] = useState("usage");
  const [logs, setLogs] = useState(function () { return getLogs(); });

  var aggregates = useMemo(function () {
    if (logs.length === 0) return null;

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

    for (var i = 0; i < logs.length; i++) {
      var e = logs[i];
      totalCost += e.estimatedCost || 0;
      totalPremium += e.premiumCost || 0;
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
      estimateVsActualPct = totalActual > 0 ? Math.round((totalCost / totalActual) * 100) : null;
    }

    return {
      totalRequests: logs.length,
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
      rescueRate: logs.length > 0 ? Math.round((rescueCount / logs.length) * 100) : 0,
      rescueCount: rescueCount,
      truncationRate: logs.length > 0 ? Math.round((truncatedCount / logs.length) * 100) : 0,
      truncatedCount: truncatedCount,
      hingeBands: hingeBands,
      actualCount: actualCount,
      totalActual: totalActual,
      actualSavingsPct: actualSavingsPct,
      estimateVsActualPct: estimateVsActualPct,
    };
  }, [logs]);

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
    page: isDark ? "#0A0C12" : "#F8F9FA",
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.35em", color: colors.amber, fontWeight: 800, marginBottom: "8px", textTransform: "uppercase" }}>
              Observability
            </div>
            <h1 style={{ fontSize: "28px", fontWeight: 900, margin: 0, letterSpacing: "-0.5px", lineHeight: "1.15" }}>
              Routing Analytics
            </h1>
            <p style={{ fontSize: "13px", color: colors.textDim, margin: "8px 0 0" }}>
              Client-side routing history. Data stored in your browser — never sent to a server.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
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
              <div style={cardStyle}>
                <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: colors.textDim, marginBottom: "6px" }}>Requests</div>
                <div style={{ fontSize: "24px", fontWeight: 800 }}>{aggregates.totalRequests}</div>
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: colors.textDim, marginBottom: "6px" }}>Session Cost</div>
                <div style={{ fontSize: "24px", fontWeight: 800 }}>{formatCost(aggregates.totalCost)}</div>
              </div>
              <div style={{ ...cardStyle, flex: "1 1 180px" }}>
                <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: colors.textDim, marginBottom: "6px" }}>Savings vs gpt-4o baseline</div>
                <div style={{ fontSize: "12px", color: colors.textDim, lineHeight: "1.6" }}>
                  Without: <b style={{ color: colors.text }}>{formatCost(aggregates.totalPremium)}</b>
                  <br />With: <b style={{ color: colors.text }}>{formatCost(aggregates.totalCost)}</b>
                </div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#16a34a", marginTop: "4px" }}>{aggregates.savingsPct}% saved</div>
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: colors.textDim, marginBottom: "6px" }}>Avg route decision</div>
                <div style={{ fontSize: "24px", fontWeight: 800 }}>{aggregates.avgRoutingMs != null ? aggregates.avgRoutingMs + " ms" : "—"}</div>
                <div style={{ fontSize: "10px", color: colors.textDim, marginTop: "2px" }}>router decision time</div>
              </div>
              <div style={{ ...cardStyle, flex: "1 1 160px" }}>
                <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: colors.textDim, marginBottom: "6px" }}>Lifetime Saved</div>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#16a34a" }}>{formatCost(lifetimeSaved)}</div>
                <div style={{ fontSize: "10px", color: colors.textDim, marginTop: "2px" }}>vs gpt-4o baseline</div>
              </div>
            </div>
            <p style={{ fontSize: "11px", color: colors.textDim, margin: "0 0 28px", lineHeight: "1.5" }}>
              Lifetime savings are calculated against the configured premium baseline (currently GPT-4o pricing).
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
                <div style={{ ...cardStyle, textAlign: "left" }}>
                  <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: colors.textDim, marginBottom: "6px" }}>Rescue rate</div>
                  <div style={{ fontSize: "20px", fontWeight: 800 }}>{aggregates.rescueRate}% <span style={{ fontSize: "11px", color: colors.textDim, fontWeight: 500 }}>({aggregates.rescueCount} of {aggregates.totalRequests})</span></div>
                  <div style={{ fontSize: "10px", color: colors.textDim, marginTop: "4px" }}>served by fallback provider</div>
                </div>
                <div style={{ ...cardStyle, textAlign: "left" }}>
                  <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: colors.textDim, marginBottom: "6px" }}>Truncation rate</div>
                  <div style={{ fontSize: "20px", fontWeight: 800 }}>{aggregates.truncationRate}% <span style={{ fontSize: "11px", color: colors.textDim, fontWeight: 500 }}>({aggregates.truncatedCount} of {aggregates.totalRequests})</span></div>
                  <div style={{ fontSize: "10px", color: colors.textDim, marginTop: "4px" }}>response cut at maxTokens</div>
                </div>
                <div style={{ ...cardStyle, flex: "1 1 160px", textAlign: "left" }}>
                  <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: colors.textDim, marginBottom: "6px" }}>Actual vs estimate</div>
                  <div style={{ fontSize: "20px", fontWeight: 800 }}>
                    {aggregates.estimateVsActualPct != null ? aggregates.estimateVsActualPct + "%" : "—"}
                    {aggregates.estimateVsActualPct != null && <span style={{ fontSize: "11px", color: colors.textDim, fontWeight: 500 }}> of estimate</span>}
                  </div>
                  <div style={{ fontSize: "10px", color: colors.textDim, marginTop: "4px" }}>
                    {aggregates.actualCount > 0 ? "real spend " + formatCost(aggregates.totalActual) + " vs est. " + formatCost(aggregates.totalCost) : "no actuals logged yet"}
                  </div>
                </div>
                {aggregates.actualCount > 0 && (
                  <div style={{ ...cardStyle, flex: "1 1 160px", textAlign: "left" }}>
                    <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", color: colors.textDim, marginBottom: "6px" }}>Real savings</div>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: "#16a34a" }}>
                      {aggregates.actualSavingsPct != null ? aggregates.actualSavingsPct + "%" : "—"}
                    </div>
                    <div style={{ fontSize: "10px", color: colors.textDim, marginTop: "4px" }}>
                      {aggregates.actualSavingsPct != null ? "actual spend vs premium baseline" : "no actual spend tracked yet"}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ fontSize: "11px", color: colors.textDim, marginBottom: "8px" }}>HingeScore distribution</div>
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
                  <div key={model} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, width: "160px", flexShrink: 0, color: colors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={model}>
                      {model}
                    </div>
                    <div style={barTrackStyle}>
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
                      <th style={{ padding: "6px 10px", fontWeight: 600, fontSize: "11px", borderBottom: "1px solid " + colors.border }}>Confidence</th>
                      <th style={{ padding: "6px 10px", fontWeight: 600, fontSize: "11px", borderBottom: "1px solid " + colors.border }}>Route</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.slice(0, 20).map(function (entry, idx) {
                      var hs = entry.hingeScore || 0;
                      var color = hingScoreColor(hs);
                      var terms = Array.isArray(entry.matchedTerms) ? entry.matchedTerms : [];
                      return (
                        <tr key={idx} style={{ borderBottom: "1px solid " + colors.border }}>
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
                          <td style={{ padding: "7px 10px", maxWidth: "220px" }}
                            title={entry.rationale || (terms.length > 0 ? "Matched: " + terms.join(", ") : "")}>
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
                            ) : (
                              <span style={{
                                fontSize: "11px", color: colors.textDim,
                                display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>
                                {entry.rationale || "—"}
                              </span>
                            )}
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
                                <span>{confidenceDot(hs)}</span> {confidenceLabel(hs)}
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
          </>
        ))}
        {tab === "decisions" && <DecisionFeed />}
      </div>
    </div>
  );
}
