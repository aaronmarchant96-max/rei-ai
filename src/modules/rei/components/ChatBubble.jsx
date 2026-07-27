import { parseAssistantStyleReply } from "../../../lib/replyParser.js";

export default function ChatBubble({ msg, selectedDomain, mobile, onCopy }) {
  return (
    <div
      className={`rei-chat-message ${msg.sender === "user" ? "rei-chat-message--user" : "rei-chat-message--rei"}`}
      style={{ maxWidth: "95%", width: "100%" }}
      onAnimationEnd={(e) => { e.currentTarget.style.opacity = "1"; }}
    >
      {msg.sender === "user" && msg.attachedRecord && (
        <div style={{ fontSize: "11px", color: "#f0c965", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
          📋 Attached Record — {msg.attachedRecord.sourceType} ({msg.attachedRecord.charCount.toLocaleString()} chars)
        </div>
      )}

      {msg.sender === "rei" && msg.rawJson?.routerDecision && (
        <div className="rei-router-badge" style={{ marginBottom: "6px" }}>
          <span style={{ fontSize: "11px" }}>⚡</span>
          <span>{msg.rawJson.routerDecision.label}</span>
          <span style={{ color: "#f0c965", fontWeight: 700 }}>
            {msg.rawJson.routerDecision.model}
          </span>
        </div>
      )}

      <div
        className={`rei-chat-bubble ${msg.sender === "user" ? "rei-chat-bubble--user" : "rei-chat-bubble--rei"}`}
        style={{ padding: "16px 52px 16px 20px" }}
      >
        {selectedDomain === "assistant" && msg.sender === "rei" && !msg.rawJson?.fallback ? (
          (() => {
            const sections = parseAssistantStyleReply(msg.text);
            const hasHinge = sections.Hinge && sections.Hinge.trim();
            const hasFacts = sections.Facts && sections.Facts.trim();
            const hasAssumptions = sections.Assumptions && sections.Assumptions.trim();
            const hasEval = sections.Evaluation && sections.Evaluation.trim();
            const hasChange = sections.ChangeMind && sections.ChangeMind.trim();
            const hasMove = sections.Move && sections.Move.trim();

            const isStructured = hasHinge || hasFacts || hasAssumptions || hasEval || hasChange || hasMove;

            if (!isStructured) {
              return <div style={{ fontSize: "15px", lineHeight: "1.6" }}>{msg.text}</div>;
            }

            return (
              <div style={{ display: "grid", gap: "16px", paddingRight: "36px" }}>
                {sections.intro && <div style={{ fontSize: "15px", lineHeight: "1.6" }}>{sections.intro}</div>}

                {/* 📌 1. THE HINGE FOCUS CONTAINER */}
                {hasHinge && (
                  <div
                    style={{
                      background: "rgba(240, 201, 101, 0.1)",
                      borderLeft: "4px solid #f0c965",
                      borderRadius: "0 10px 10px 0",
                      padding: "12px 16px",
                      boxShadow: "0 4px 14px rgba(240, 201, 101, 0.08)",
                    }}
                  >
                    <div style={{ color: "#f0c965", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 800, marginBottom: "4px" }}>
                      📌 THE HINGE (Core Pivot Point)
                    </div>
                    <div style={{ color: "#f8fafc", fontSize: "14.5px", fontWeight: 600, lineHeight: "1.5" }}>
                      {sections.Hinge}
                    </div>
                  </div>
                )}

                {/* 🔬 2. COMPARATIVE GRID: FACTS vs ASSUMPTIONS */}
                {(hasFacts || hasAssumptions) && (
                  <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: "12px" }}>
                    {hasFacts && (
                      <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(240, 201, 101, 0.15)", borderRadius: "10px", padding: "12px" }}>
                        <div style={{ color: "#38bdf8", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: "6px" }}>
                          🔬 FACTS (Known Reality)
                        </div>
                        <div style={{ fontSize: "13.5px", color: "#cbd5e1", lineHeight: "1.5" }}>{sections.Facts}</div>
                      </div>
                    )}
                    {hasAssumptions && (
                      <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(251, 146, 60, 0.15)", borderRadius: "10px", padding: "12px" }}>
                        <div style={{ color: "#fb923c", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: "6px" }}>
                          ❓ ASSUMPTIONS (Uncertainty)
                        </div>
                        <div style={{ fontSize: "13.5px", color: "#cbd5e1", lineHeight: "1.5" }}>{sections.Assumptions}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* ⚖️ 3. EVALUATION & CHANGE MIND */}
                {hasEval && (
                  <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "12px" }}>
                    <div style={{ color: "#f0c965", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: "6px" }}>
                      ⚖️ EVALUATION &amp; RISK
                    </div>
                    <div style={{ fontSize: "13.5px", color: "#e2e8f0", lineHeight: "1.5" }}>{sections.Evaluation}</div>
                  </div>
                )}

                {hasChange && (
                  <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "12px" }}>
                    <div style={{ color: "#a855f7", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: "6px" }}>
                      🔄 WHAT WOULD CHANGE MY MIND
                    </div>
                    <div style={{ fontSize: "13.5px", color: "#e2e8f0", lineHeight: "1.5" }}>{sections.ChangeMind}</div>
                  </div>
                )}

                {/* 🚀 4. NEXT MOVE */}
                {hasMove && (
                  <div style={{ background: "rgba(240, 201, 101, 0.06)", border: "1px solid rgba(240, 201, 101, 0.2)", borderRadius: "10px", padding: "12px" }}>
                    <div style={{ color: "#4ade80", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: "6px" }}>
                      🚀 NEXT MOVE
                    </div>
                    <div style={{ fontSize: "14px", color: "#f8fafc", fontWeight: 600, lineHeight: "1.5" }}>{sections.Move}</div>
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          <div style={{ fontSize: "15px", lineHeight: "1.6" }}>{msg.text}</div>
        )}

        {/* Collapsible Telemetry Dropdown */}
        {msg.rawJson && (
          <details style={{ marginTop: "14px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "8px" }}>
            <summary style={{ fontSize: "11.5px", color: "#94a3b8", cursor: "pointer", fontWeight: 600, userSelect: "none" }}>
              🔍 View Night Shift Routing Telemetry ({msg.rawJson.routerDecision?.model || "auto"})
            </summary>
            <div className="rei-router-panel__grid" style={{ marginTop: "8px" }}>
              <div className="rei-router-panel__item"><span className="rei-router-panel__label">Route:</span> {msg.rawJson.routerDecision?.label || "n/a"}</div>
              <div className="rei-router-panel__item"><span className="rei-router-panel__label">Model:</span> {msg.rawJson.routerDecision?.model || msg.rawJson.model || "n/a"}</div>
              <div className="rei-router-panel__item"><span className="rei-router-panel__label">Max tokens:</span> {msg.rawJson.routerDecision?.maxTokens || "n/a"}</div>
              <div className="rei-router-panel__item"><span className="rei-router-panel__label">Quality gate:</span> {msg.rawJson.routerDecision?.qualityGate || "n/a"}</div>
              <div className="rei-router-panel__item"><span className="rei-router-panel__label">Enforcement:</span> {msg.rawJson.routerDecision?.enforce || "none"}</div>
              <div className="rei-router-panel__item"><span className="rei-router-panel__label">Est. cost:</span> ${msg.rawJson.routerDecision?.estimatedCost?.toFixed(4) || "—"}</div>
              <div className="rei-router-panel__item"><span className="rei-router-panel__label">Premium cost:</span> ${msg.rawJson.routerDecision?.premiumCost?.toFixed(4) || "—"}</div>
              <div className="rei-router-panel__item"><span className="rei-router-panel__label">Savings:</span> {msg.rawJson.routerDecision?.premiumCost > 0
                ? Math.round((1 - msg.rawJson.routerDecision.estimatedCost / msg.rawJson.routerDecision.premiumCost) * 100) + "% vs frontier"
                : "—"}</div>
            </div>
          </details>
        )}

        <button
          onClick={() => onCopy(msg.text)}
          className="rei-copy-btn touch-target"
          aria-label="Copy message"
          onMouseOver={(e) => e.currentTarget.style.opacity = 1}
          onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
          title="Copy message"
        >
          Copy
        </button>
      </div>

      <span className="rei-chat-meta">
        {msg.sender === "user" ? "You" : "REI.ai Cognitive Engine"} • {msg.timestamp}
      </span>
    </div>
  );
}
