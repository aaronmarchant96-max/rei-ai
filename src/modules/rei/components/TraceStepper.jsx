import React from "react";

export default function TraceStepper({ routeTrace }) {
  if (!Array.isArray(routeTrace) || routeTrace.length === 0) {
    return (
      <div style={{ padding: "10px", fontSize: "12px", color: "var(--text-muted, #71717a)" }}>
        No runtime trace recorded for this request.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "8px", margin: "8px 0" }}>
      <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, color: "var(--text-muted, #a1a1aa)" }}>
        Runtime Execution Trace ({routeTrace.length} stages)
      </div>
      <div style={{ display: "grid", gap: "6px" }}>
        {routeTrace.map((step, idx) => (
          <div
            key={step.stageId || idx}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              borderRadius: "6px",
              padding: "8px 12px",
              fontSize: "12.5px",
            }}
          >
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: step.passed ? "rgba(74, 222, 128, 0.15)" : "rgba(248, 113, 113, 0.15)",
                color: step.passed ? "#4ade80" : "#f87171",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                fontWeight: 700,
                marginTop: "2px",
                flexShrink: 0,
              }}
            >
              {step.passed ? "✓" : "!"}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                <span style={{ fontWeight: 600, color: "#f4f4f5" }}>{step.stage}</span>
                <span style={{ fontSize: "10.5px", color: "#71717a" }}>
                  {step.timestamp ? step.timestamp.split("T")[1]?.slice(0, 8) || step.timestamp : ""}
                </span>
              </div>
              <div style={{ color: "#d4d4d8", fontSize: "12px" }}>{step.decision}</div>
              {step.rule ? (
                <div style={{ fontSize: "11px", color: "var(--amber-text, #f0c965)", marginTop: "2px" }}>
                  Rule: {step.rule}
                </div>
              ) : (
                <div style={{ fontSize: "10.5px", color: "#71717a", marginTop: "2px" }}>
                  Rule: Not recorded in trace
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
