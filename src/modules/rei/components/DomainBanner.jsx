export default function DomainBanner({ currentDomain, selectedDomain, reasoningLoopSteps }) {
  return (
    <div className="rei-domain-banner">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
        <div className="rei-domain-banner__eyebrow" style={{ margin: 0 }}>
          <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#f0c965", boxShadow: "0 0 10px #f0c965" }} />
          ACTIVE REASONING MODE · {currentDomain.label}
        </div>
        <div style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>
          CARDO HINGE ENGINE v3.4
        </div>
      </div>

      <div className="rei-domain-banner__row">
        <div className="rei-domain-banner__meta">
          <span className="rei-domain-banner__label">Mode:</span>
          <span>{currentDomain.description}</span>
        </div>
        <div className="rei-domain-banner__meta rei-domain-banner__meta--secondary">
          <span className="rei-domain-banner__label">Voice Cues:</span>
          <span>{currentDomain.rules.join(" | ")}</span>
        </div>
      </div>

      {selectedDomain === "assistant" && (
        <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid rgba(240, 201, 101, 0.15)" }}>
          <div style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.12em", color: "#f0c965", textTransform: "uppercase", marginBottom: "10px" }}>
            CARDO Cognitive Pipeline (Pivot Dissection)
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
            <span className="rei-domain-banner__step" style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#e2e8f0" }}>
              C · Collect Raw Data
            </span>
            <span style={{ color: "#f0c965", opacity: 0.6 }}>─►</span>
            <span className="rei-domain-banner__step" style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#e2e8f0" }}>
              A · Analyze Patterns
            </span>
            <span style={{ color: "#f0c965", opacity: 0.6 }}>─►</span>
            <span className="rei-domain-banner__step" style={{ background: "rgba(240, 201, 101, 0.2)", border: "1px solid #f0c965", color: "#f0c965", boxShadow: "0 0 12px rgba(240, 201, 101, 0.25)" }}>
              📌 R · Record Hinge (Pivot Point)
            </span>
            <span style={{ color: "#f0c965", opacity: 0.6 }}>─►</span>
            <span className="rei-domain-banner__step" style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#e2e8f0" }}>
              DO · Execute Move
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
