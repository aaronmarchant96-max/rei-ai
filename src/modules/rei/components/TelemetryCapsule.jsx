import React, { useState } from "react";
import WhyThisRouteModal from "./WhyThisRouteModal.jsx";
import TraceStepper from "./TraceStepper.jsx";

export default function TelemetryCapsule({ evidence }) {
  const [showWhyModal, setShowWhyModal] = useState(false);
  const [showTrace, setShowTrace] = useState(false);

  if (!evidence) return null;

  const { model, economics, tokens, routeTrace } = evidence;

  const observedDisplay =
    economics.observedCostUsd != null
      ? `~$${economics.observedCostUsd.toFixed(5)}`
      : "Cost unavailable";

  const counterfactualDisplay =
    economics.counterfactual.costUsd != null
      ? `~$${economics.counterfactual.costUsd.toFixed(4)}`
      : null;

  const savingsDisplay =
    economics.savings.percentage != null
      ? `${economics.savings.percentage}%`
      : null;

  return (
    <div
      className="rei-telemetry-capsule"
      style={{
        margin: "8px 0",
        padding: "8px 12px",
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(240, 201, 101, 0.15)",
        borderRadius: "8px",
        fontSize: "12px",
        color: "var(--text-secondary, #d4d4d8)",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
          {/* Model Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: 700, color: "var(--amber-text, #f0c965)" }}>
            <span>⚡</span>
            <span>{model}</span>
          </div>

          {/* Observed Cost */}
          <div style={{ color: "#a1a1aa" }}>
            Cost: <span style={{ color: "#f4f4f5", fontWeight: 600 }}>{observedDisplay}</span>
            {economics.observedProvenance === "observed" && (
              <span style={{ fontSize: "10px", color: "#71717a", marginLeft: "2px" }}>(Observed)</span>
            )}
          </div>

          {/* Modeled Flagship Counterfactual */}
          {counterfactualDisplay && (
            <div style={{ color: "#a1a1aa" }}>
              Flagship equiv: <span style={{ color: "#f4f4f5" }}>{counterfactualDisplay}</span>
              <span style={{ fontSize: "10px", color: "#71717a", marginLeft: "2px" }}>(Modeled)</span>
            </div>
          )}

          {/* Derived Savings */}
          {savingsDisplay && (
            <div style={{ color: "#4ade80", fontWeight: 600 }}>
              Saved {savingsDisplay} <span style={{ fontSize: "10px", color: "#22c55e" }}>(Derived)</span>
            </div>
          )}

          {/* Cache Hit */}
          {tokens.cacheHit && tokens.cacheHitRatePct != null && (
            <div
              style={{
                background: "rgba(59, 130, 246, 0.15)",
                color: "#60a5fa",
                padding: "1px 6px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              🎯 {tokens.cacheHitRatePct}% Cache Hit
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={() => setShowWhyModal(true)}
            style={{
              background: "transparent",
              border: "1px solid rgba(240, 201, 101, 0.25)",
              color: "var(--amber-text, #f0c965)",
              borderRadius: "4px",
              padding: "2px 8px",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🔍 Why this route?
          </button>

          {routeTrace.length > 0 && (
            <button
              onClick={() => setShowTrace(!showTrace)}
              style={{
                background: showTrace ? "rgba(255,255,255,0.1)" : "transparent",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#d4d4d8",
                borderRadius: "4px",
                padding: "2px 8px",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              📊 Trace ({routeTrace.length})
            </button>
          )}
        </div>
      </div>

      {showTrace && <TraceStepper routeTrace={routeTrace} />}

      {showWhyModal && (
        <WhyThisRouteModal evidence={evidence} onClose={() => setShowWhyModal(false)} />
      )}
    </div>
  );
}
