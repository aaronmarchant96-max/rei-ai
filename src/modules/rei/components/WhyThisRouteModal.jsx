import React from "react";

export default function WhyThisRouteModal({ evidence, onClose }) {
  if (!evidence) return null;

  const { routeRationale, model, route, economics } = evidence;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#18181b",
          border: "1px solid rgba(240, 201, 101, 0.25)",
          borderRadius: "14px",
          maxWidth: "520px",
          width: "100%",
          padding: "24px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
          color: "#f4f4f5",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "18px" }}>🔍</span>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--amber-text, #f0c965)" }}>
              Why this route: {model}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#a1a1aa",
              fontSize: "18px",
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "grid", gap: "12px", fontSize: "13.5px" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ color: "#a1a1aa", fontSize: "11px", textTransform: "uppercase", fontWeight: 600, marginBottom: "4px" }}>
              Task Classification
            </div>
            <div style={{ fontWeight: 600 }}>{routeRationale.classification}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ color: "#a1a1aa", fontSize: "11px", textTransform: "uppercase", fontWeight: 600, marginBottom: "4px" }}>
                Complexity Score ({routeRationale.complexityProvenance})
              </div>
              <div style={{ fontWeight: 600 }}>
                {routeRationale.complexityScore != null ? `${routeRationale.complexityScore}` : "Not scored"}
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ color: "#a1a1aa", fontSize: "11px", textTransform: "uppercase", fontWeight: 600, marginBottom: "4px" }}>
                Adversarial Scanner
              </div>
              <div style={{ fontWeight: 600, color: routeRationale.adversarialSignal ? "#f87171" : "#4ade80" }}>
                {routeRationale.adversarialSignal ? "Flagged (Red Team)" : "Clean"}
              </div>
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ color: "#a1a1aa", fontSize: "11px", textTransform: "uppercase", fontWeight: 600, marginBottom: "4px" }}>
              Selection Principle
            </div>
            <div style={{ color: "#e4e4e7", lineHeight: "1.4" }}>
              {routeRationale.selectionReason}
            </div>
          </div>

          {evidence.research && evidence.research.invoked && (
            <div style={{ background: "rgba(16, 185, 129, 0.05)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <div style={{ color: "#34d399", fontSize: "11px", textTransform: "uppercase", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>🌐</span>
                  <span>External Research & Evidence ({evidence.research.provider || "web"})</span>
                </div>
                <span style={{ fontSize: "10px", color: "#10b981" }}>({evidence.research.provenance})</span>
              </div>
              <div style={{ fontSize: "12px", color: "#d4d4d8", marginBottom: "6px" }}>
                <strong>Reason:</strong> {evidence.research.reason.replace(/_/g, " ")}
              </div>
              {evidence.research.queries.length > 0 && (
                <div style={{ fontSize: "12px", color: "#a1a1aa", marginBottom: "6px" }}>
                  <strong>Queries:</strong> {evidence.research.queries.map((q, i) => (
                    <span key={i} style={{ background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: "4px", margin: "0 4px", color: "#f4f4f5" }}>
                      "{q}"
                    </span>
                  ))}
                </div>
              )}
              {evidence.research.sources.length > 0 && (
                <div style={{ display: "grid", gap: "4px", marginTop: "6px" }}>
                  <div style={{ fontSize: "11px", color: "#a1a1aa", fontWeight: 600 }}>Sources Retrieved ({evidence.research.resultCount}):</div>
                  {evidence.research.sources.map((s, idx) => (
                    <div key={idx} style={{ fontSize: "11.5px", padding: "4px 8px", background: "rgba(0,0,0,0.2)", borderRadius: "4px" }}>
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noreferrer" style={{ color: "#60a5fa", textDecoration: "none", fontWeight: 600 }}>
                          🔗 {s.title || s.url}
                        </a>
                      ) : (
                        <span style={{ color: "#e4e4e7" }}>📄 {s.title}</span>
                      )}
                      {(s.highlights || s.snippet) && (
                        <div style={{ color: "#9ca3af", fontSize: "11px", marginTop: "2px", lineHeight: "1.3" }}>
                          {(s.highlights || s.snippet).slice(0, 140)}...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {evidence.research.budget && (
                <div style={{ marginTop: "6px", fontSize: "10.5px", color: "#6ee7b7", display: "flex", gap: "12px" }}>
                  <span>Excerpt: {evidence.research.budget.excerptCharacters} chars</span>
                  <span>Estimated tokens: ~{evidence.research.budget.excerptTokensEstimated} ({evidence.research.budget.tokenAccounting})</span>
                </div>
              )}
            </div>
          )}

          {economics.counterfactual.costUsd != null && (
            <div style={{ background: "rgba(240, 201, 101, 0.05)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(240, 201, 101, 0.15)" }}>
              <div style={{ color: "var(--amber-text, #f0c965)", fontSize: "11px", textTransform: "uppercase", fontWeight: 600, marginBottom: "4px" }}>
                Modeled Benchmark Basis
              </div>
              <div style={{ fontSize: "12px", color: "#d4d4d8" }}>
                {economics.counterfactual.basis}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: "var(--amber-text, #f0c965)",
              color: "#18181b",
              border: "none",
              borderRadius: "6px",
              padding: "6px 14px",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
