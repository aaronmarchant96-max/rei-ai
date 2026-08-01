import { useState } from "react";

export default function DomainBanner({ currentDomain, selectedDomain, reasoningLoopSteps }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rei-domain-banner">
      {/* Compact bar — always visible */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "8px 0", cursor: "pointer", userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            display: "inline-block", width: "7px", height: "7px", borderRadius: "50%",
            background: "var(--amber-fill)", boxShadow: "0 0 8px var(--amber-border)", flexShrink: 0,
          }} />
          <span style={{
            fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "15px",
            color: "var(--text)",
          }}>
            {currentDomain.label}
          </span>
          <span style={{
            fontSize: "12px", color: "var(--text-muted)", fontWeight: 400,
            maxWidth: "360px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {currentDomain.description}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "10px", color: "var(--text-dim)", fontFamily: "monospace" }}>
            CARDO v3.4
          </span>
          <span style={{
            fontSize: "11px", color: "var(--text-dim)", transition: "transform 0.2s",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}>
            ▼
          </span>
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div style={{
          marginTop: "6px", padding: "12px 14px",
          background: "rgba(15, 17, 22, 0.7)", borderRadius: "6px",
          border: "1px solid rgba(240, 201, 101, 0.1)",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div className="rei-domain-banner__meta" style={{ fontSize: "12px" }}>
              <span className="rei-domain-banner__label">Mode:</span>
              <span>{currentDomain.description}</span>
            </div>
            <div className="rei-domain-banner__meta rei-domain-banner__meta--secondary" style={{ fontSize: "12px" }}>
              <span className="rei-domain-banner__label">Voice Cues:</span>
              <span>{currentDomain.rules.join(" | ")}</span>
            </div>
          </div>

          {selectedDomain === "assistant" && (
            <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: "1px solid rgba(240, 201, 101, 0.12)" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--amber-text)", textTransform: "uppercase", marginBottom: "8px" }}>
                CARDO Cognitive Pipeline (Pivot Dissection)
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
                <span className="rei-domain-banner__step" style={{ fontSize: "11px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text)", padding: "3px 8px", borderRadius: "4px" }}>
                  C · Collect Raw Data
                </span>
                <span style={{ color: "var(--amber-text)", opacity: 0.5, fontSize: "10px" }}>─►</span>
                <span className="rei-domain-banner__step" style={{ fontSize: "11px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text)", padding: "3px 8px", borderRadius: "4px" }}>
                  A · Analyze Patterns
                </span>
                <span style={{ color: "var(--amber-text)", opacity: 0.5, fontSize: "10px" }}>─►</span>
                <span className="rei-domain-banner__step" style={{ fontSize: "11px", background: "rgba(240,201,101,0.2)", border: "1px solid var(--amber-border)", color: "var(--amber-text)", padding: "3px 8px", borderRadius: "4px", boxShadow: "0 0 12px rgba(240,201,101,0.2)" }}>
                  📌 R · Record Hinge
                </span>
                <span style={{ color: "var(--amber-text)", opacity: 0.5, fontSize: "10px" }}>─►</span>
                <span className="rei-domain-banner__step" style={{ fontSize: "11px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text)", padding: "3px 8px", borderRadius: "4px" }}>
                  DO · Execute Move
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
