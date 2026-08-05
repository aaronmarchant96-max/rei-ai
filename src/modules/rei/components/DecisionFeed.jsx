import { useState } from "react";
import { getDecisions, deleteDecision, clearDecisions } from "../../../lib/decisionStore";
import DecisionDetail from "./DecisionDetail.jsx";

function exportCSV(entries) {
  const header = "id,createdAt,domainLabel,inputPreview,Hinge,Facts,Assumptions,Evaluation,ChangeMind,Move,actualTokens,actualCost,durationMs";
  const rows = entries.map(function (e) {
    return [
      e.id,
      e.createdAt,
      "\"" + (e.domainLabel || "").replace(/"/g, "\"\"") + "\"",
      "\"" + (e.inputPreview || "").slice(0, 300).replace(/"/g, "\"\"") + "\"",
      "\"" + ((e.sections?.Hinge) || "").replace(/"/g, "\"\"") + "\"",
      "\"" + ((e.sections?.Facts) || "").replace(/"/g, "\"\"") + "\"",
      "\"" + ((e.sections?.Assumptions) || "").replace(/"/g, "\"\"") + "\"",
      "\"" + ((e.sections?.Evaluation) || "").replace(/"/g, "\"\"") + "\"",
      "\"" + ((e.sections?.ChangeMind) || "").replace(/"/g, "\"\"") + "\"",
      "\"" + ((e.sections?.Move) || "").replace(/"/g, "\"\"") + "\"",
      e.actualTokens || 0,
      e.actualCost || 0,
      e.durationMs || "",
    ].join(",");
  });
  const csv = header + "\n" + rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cardo-decisions-" + new Date().toISOString().slice(0, 10) + ".csv";
  a.click();
  if (typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(url);
  }
}

function exportJSON(entries) {
  const json = JSON.stringify(entries, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cardo-decisions-" + new Date().toISOString().slice(0, 10) + ".json";
  a.click();
  if (typeof URL.revokeObjectURL === "function") {
    URL.revokeObjectURL(url);
  }
}

export default function DecisionFeed() {
  const [allDecisions, setAllDecisions] = useState(function () { return getDecisions(); });
  const [selectedDomain, setSelectedDomain] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  var themeMode = "dark";
  try {
    themeMode = localStorage.getItem("rei_theme_mode") || "dark";
  } catch (e) { /* use dark */ }
  var isDark = themeMode === "dark";

  var colors = {
    surface: isDark ? "#111318" : "#FFFFFF",
    border: isDark ? "rgba(255,255,255,0.08)" : "#E5E5E5",
    text: isDark ? "#E2E8F0" : "#1C1917",
    textDim: isDark ? "#94A3B8" : "#767676",
    amber: isDark ? "#F59E0B" : "#B45309",
    amberBg: isDark ? "rgba(245,158,11,0.12)" : "#FEF3C7",
  };

  function refresh() {
    setAllDecisions(getDecisions());
  }

  function handleSelectDomain(domain) {
    setSelectedDomain(domain);
    setExpandedId(null);
  }

  function handleToggleExpand(id) {
    setExpandedId(expandedId === id ? null : id);
  }

  function handleDelete(id) {
    deleteDecision(id);
    if (expandedId === id) setExpandedId(null);
    refresh();
  }

  function handleClear() {
    if (!window.confirm("Delete all CARDO decision records? This cannot be undone.")) return;
    clearDecisions();
    setExpandedId(null);
    setSelectedDomain("");
    refresh();
  }

  // Gather unique domain labels from the FULL store (not filtered)
  var domains = [...new Set(allDecisions.map(function (d) { return d.domainLabel; }))].sort();

  var filtered = selectedDomain
    ? allDecisions.filter(function (d) { return d.domainLabel === selectedDomain; })
    : allDecisions;

  if (allDecisions.length === 0) {
    return (
      <div style={{
        padding: "60px 24px", textAlign: "center",
        background: colors.surface, borderRadius: "16px", border: "1px solid " + colors.border,
      }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔍</div>
        <div style={{ fontSize: "16px", fontWeight: 700, color: colors.text, marginBottom: "6px" }}>
          No CARDO decisions recorded yet
        </div>
        <p style={{ fontSize: "13px", color: colors.textDim, maxWidth: 360, margin: "0 auto" }}>
          Make a structured decision in REI.ai to see the full CARDO trace (Hinge, Facts, Assumptions, Evaluation, etc.) logged and searchable here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "18px", flexWrap: "wrap" }}>
        <select
          value={selectedDomain}
          onChange={function (e) { handleSelectDomain(e.target.value); }}
          style={{
            padding: "7px 12px", borderRadius: "8px",
            background: colors.surface, border: "1px solid " + colors.border,
            color: colors.text, fontSize: "12px", fontWeight: 600,
            cursor: "pointer", minWidth: "160px",
          }}
        >
          <option value="">All domains ({allDecisions.length})</option>
          {domains.map(function (d) {
            var count = allDecisions.filter(function (x) { return x.domainLabel === d; }).length;
            return <option key={d} value={d}>{d} ({count})</option>;
          })}
        </select>

        <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
          <button
            onClick={function () { exportCSV(filtered); }}
            style={{
              padding: "7px 14px", borderRadius: "8px",
              background: "transparent", border: "1px solid " + colors.border,
              color: colors.textDim, cursor: "pointer", fontSize: "12px", fontWeight: 600,
            }}
          >
            Export CSV
          </button>
          <button
            onClick={function () { exportJSON(filtered); }}
            style={{
              padding: "7px 14px", borderRadius: "8px",
              background: "transparent", border: "1px solid " + colors.border,
              color: colors.textDim, cursor: "pointer", fontSize: "12px", fontWeight: 600,
            }}
          >
            Export JSON
          </button>
          <button
            onClick={handleClear}
            style={{
              padding: "7px 14px", borderRadius: "8px",
              background: "transparent", border: "1px solid " + colors.border,
              color: colors.textDim, cursor: "pointer", fontSize: "12px", fontWeight: 600,
            }}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* ── Sub-header ── */}
      <div style={{ fontSize: "12px", color: colors.textDim, marginBottom: "14px" }}>
        Showing {filtered.length} of {allDecisions.length} {allDecisions.length === 1 ? "decision" : "decisions"}
        {selectedDomain ? " in " + selectedDomain : ""}
      </div>

      {/* ── Decision list ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filtered.map(function (entry) {
          var created;
          try { created = new Date(entry.createdAt).toLocaleString(); } catch (e) { created = entry.createdAt; }
          var hinge = (entry.sections?.Hinge || entry.inputPreview || "").slice(0, 120);
          var isExpanded = expandedId === entry.id;

          return (
            <div key={entry.id}>
              {/* ── Summary row (clickable) ── */}
              <div
                onClick={function () { handleToggleExpand(entry.id); }}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 14px", borderRadius: isExpanded ? "10px 10px 0 0" : "10px",
                  background: isExpanded ? colors.surface : "transparent",
                  border: "1px solid " + (isExpanded ? colors.amber + "30" : colors.border),
                  borderBottom: isExpanded ? "none" : "1px solid " + colors.border,
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
              >
                {/* Domain badge */}
                <span style={{
                  fontSize: "10px", fontWeight: 700,
                  padding: "3px 8px", borderRadius: "4px",
                  background: colors.amberBg, color: colors.amber,
                  whiteSpace: "nowrap", flexShrink: 0,
                }}>
                  {entry.domainLabel}
                </span>

                {/* Hinge / input preview */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "13px", color: colors.text,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    lineHeight: "1.4",
                  }}>
                    {hinge}
                  </div>
                  <div style={{ fontSize: "11px", color: colors.textDim, marginTop: "2px" }}>
                    {created}
                  </div>
                </div>

                {/* Tokens + cost */}
                <div style={{
                  fontSize: "11px", color: colors.textDim, textAlign: "right", flexShrink: 0, minWidth: "70px",
                  fontFamily: "monospace",
                }}>
                  {entry.actualTokens != null ? (entry.actualTokens >= 1000 ? (entry.actualTokens / 1000).toFixed(1) + "k" : entry.actualTokens) + " • " : ""}
                  {entry.actualCost != null ? "$" + entry.actualCost.toFixed(4) : ""}
                </div>

                {/* Expand chevron */}
                <span style={{
                  fontSize: "14px", color: colors.textDim, flexShrink: 0,
                  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}>
                  ▼
                </span>

                {/* Delete */}
                <button
                  type="button"
                  onClick={function (e) { e.stopPropagation(); handleDelete(entry.id); }}
                  style={{
                    background: "none", border: "none", color: colors.textDim,
                    cursor: "pointer", fontSize: "14px", padding: "2px 6px", flexShrink: 0,
                    lineHeight: 1,
                  }}
                  aria-label="Delete decision"
                  title="Delete this record"
                >
                  ×
                </button>
              </div>

              {/* ── Expanded detail ── */}
              {isExpanded && (
                <div style={{
                  border: "1px solid " + colors.amber + "30",
                  borderTop: "none",
                  borderRadius: "0 0 10px 10px",
                  background: colors.surface,
                  padding: "0 1px 1px",
                }}>
                  <DecisionDetail entry={entry} onClose={function () { setExpandedId(null); }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
