import React, { useState } from "react";

export default function CardoComparisonToggle({ responseText, sections, verificationSignals }) {
  const [viewMode, setViewMode] = useState("cardo"); // "cardo" | "baseline"

  const slopMarkers = verificationSignals?.slopMarkersFound || [];
  const wordCount = (responseText || "").trim().split(/\s+/).filter(Boolean).length;

  return (
    <div style={{ margin: "12px 0", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            onClick={() => setViewMode("cardo")}
            style={{
              background: viewMode === "cardo" ? "var(--amber-badge-bg, rgba(240, 201, 101, 0.15))" : "transparent",
              color: viewMode === "cardo" ? "var(--amber-text, #f0c965)" : "#a1a1aa",
              border: "1px solid " + (viewMode === "cardo" ? "rgba(240, 201, 101, 0.3)" : "rgba(255, 255, 255, 0.1)"),
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "11.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ⚡ CARDO Evaluated Response (Observed)
          </button>
          <button
            onClick={() => setViewMode("baseline")}
            style={{
              background: viewMode === "baseline" ? "rgba(255, 255, 255, 0.1)" : "transparent",
              color: viewMode === "baseline" ? "#f4f4f5" : "#a1a1aa",
              border: "1px solid " + (viewMode === "baseline" ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.1)"),
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "11.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            📄 Baseline Comparison (Reference)
          </button>
        </div>

        <div style={{ fontSize: "11px", color: "#a1a1aa" }}>
          {wordCount} words · {verificationSignals?.cardoCompliant ? "✓ CARDO Compliant" : "⚠️ Slop Detected"}
        </div>
      </div>

      {viewMode === "baseline" && (
        <div
          style={{
            background: "rgba(248, 113, 113, 0.05)",
            border: "1px solid rgba(248, 113, 113, 0.2)",
            borderRadius: "8px",
            padding: "12px",
            fontSize: "13px",
            color: "#d4d4d8",
            lineHeight: "1.5",
          }}
        >
          <div style={{ fontSize: "11px", color: "#f87171", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
            Hedge & Boilerplate Markers Identified in Baseline Tone:
          </div>
          {slopMarkers.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
              {slopMarkers.map((marker, i) => (
                <span
                  key={i}
                  style={{
                    background: "rgba(248, 113, 113, 0.15)",
                    color: "#fca5a5",
                    fontSize: "10.5px",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontWeight: 600,
                  }}
                >
                  "{marker}"
                </span>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: "11.5px", color: "#a1a1aa", fontStyle: "italic", marginBottom: "6px" }}>
              No typical AI buzzwords or filler patterns detected in this generation.
            </div>
          )}
          <div style={{ fontSize: "12px", color: "#a1a1aa" }}>
            * CARDO filtering structures reasoning into explicit facts and assumptions, removing robotic preamble.
          </div>
        </div>
      )}
    </div>
  );
}
