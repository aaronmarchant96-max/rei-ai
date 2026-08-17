import React, { useState } from "react";

export default function EvidenceLedgerModal({ onClose }) {
  const [copied, setCopied] = useState(false);
  const verifyCommand = "node scripts/verify-cache-spend.mjs";

  const handleCopy = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(verifyCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(6px)",
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
          border: "1px solid rgba(240, 201, 101, 0.3)",
          borderRadius: "14px",
          maxWidth: "640px",
          width: "100%",
          padding: "24px",
          boxShadow: "0 25px 50px rgba(0,0,0,0.7)",
          color: "#f4f4f5",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>📊</span>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--amber-text, #f0c965)" }}>
              REI.ai Evidence Ledger & Audit Trail
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#a1a1aa",
              fontSize: "20px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: "13.5px", color: "#a1a1aa", marginTop: 0, marginBottom: "16px", lineHeight: "1.5" }}>
          Every economic claim in REI.ai is anchored to immutable, version-controlled machine telemetry. Below is the verified ledger summary from production telemetry:
        </p>

        {/* 4 Metric Cards with Explicit Epistemic Provenance */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#a1a1aa", fontSize: "11px", textTransform: "uppercase", fontWeight: 600 }}>Tokens Tracked</span>
              <span style={{ fontSize: "10px", color: "#71717a", background: "rgba(255,255,255,0.06)", padding: "1px 5px", borderRadius: "3px" }}>Observed</span>
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#f4f4f5", marginTop: "4px" }}>1,848,473,560</div>
            <div style={{ fontSize: "11px", color: "#71717a" }}>1.79B hit / 48.8M miss / 4.77M out</div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#a1a1aa", fontSize: "11px", textTransform: "uppercase", fontWeight: 600 }}>Actual Billed Spend</span>
              <span style={{ fontSize: "10px", color: "#4ade80", background: "rgba(74, 222, 128, 0.1)", padding: "1px 5px", borderRadius: "3px" }}>Observed</span>
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#4ade80", marginTop: "4px" }}>$23.52</div>
            <div style={{ fontSize: "11px", color: "#71717a" }}>239 production batches billed</div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#a1a1aa", fontSize: "11px", textTransform: "uppercase", fontWeight: 600 }}>Cache Hit Rate</span>
              <span style={{ fontSize: "10px", color: "#60a5fa", background: "rgba(96, 165, 250, 0.1)", padding: "1px 5px", borderRadius: "3px" }}>Derived</span>
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#60a5fa", marginTop: "4px" }}>97.35%</div>
            <div style={{ fontSize: "11px", color: "#71717a" }}>Hit tokens ÷ (Hit + Miss)</div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#a1a1aa", fontSize: "11px", textTransform: "uppercase", fontWeight: 600 }}>Modeled Savings</span>
              <span style={{ fontSize: "10px", color: "var(--amber-text, #f0c965)", background: "rgba(240, 201, 101, 0.1)", padding: "1px 5px", borderRadius: "3px" }}>Derived</span>
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--amber-text, #f0c965)", marginTop: "4px" }}>$567.06 (96%)</div>
            <div style={{ fontSize: "11px", color: "#71717a" }}>vs $590.57 modeled no-cache</div>
          </div>
        </div>

        {/* Explicit Calculation Chain Breakdown */}
        <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "12px", marginBottom: "16px", fontSize: "12.5px" }}>
          <div style={{ fontWeight: 600, color: "#f4f4f5", marginBottom: "6px" }}>
            Audit Calculation Chain:
          </div>
          <div style={{ color: "#d4d4d8", lineHeight: "1.5" }}>
            <code>1.848B tokens observed ($23.52 billed)</code> ──► <code>Modeled no-cache equivalent ($590.57)</code> ──► <code>Net derived savings = $567.06 (96.0%)</code>
          </div>
        </div>

        {/* Reproducibility CLI Box */}
        <div style={{ background: "#09090b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", color: "#a1a1aa", textTransform: "uppercase", fontWeight: 600 }}>
              Verify Locally (CLI Reproduction Command)
            </span>
            <button
              onClick={handleCopy}
              style={{
                background: copied ? "#22c55e" : "rgba(255,255,255,0.1)",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                padding: "2px 8px",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <code style={{ fontSize: "12.5px", color: "#f0c965", fontFamily: "monospace" }}>
            {verifyCommand}
          </code>
        </div>

        {/* Epistemic Tiers Table */}
        <div style={{ fontSize: "12px", color: "#a1a1aa", marginBottom: "16px" }}>
          <div style={{ fontWeight: 600, color: "#f4f4f5", marginBottom: "4px" }}>Epistemic Provenance Standard:</div>
          <ul style={{ margin: 0, paddingLeft: "18px", lineHeight: "1.6" }}>
            <li><strong>Observed:</strong> Physical runtime events (tokens billed, timestamps recorded).</li>
            <li><strong>Derived:</strong> Mathematical calculations from observed data (savings delta, hit rate %).</li>
            <li><strong>Modeled:</strong> Counterfactual estimates based on declared pricing baselines (e.g. GPT-4o).</li>
            <li><strong>Replayed:</strong> Benchmark runs reproduced across fixed test fixtures.</li>
          </ul>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <span style={{ fontSize: "11px", color: "#71717a" }}>
            Source: data/cache-spend.csv (239 rows)
          </span>
          <button
            onClick={onClose}
            style={{
              background: "var(--amber-text, #f0c965)",
              color: "#18181b",
              border: "none",
              borderRadius: "6px",
              padding: "6px 16px",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
