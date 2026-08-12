import { useState } from "react";
import { parseAssistantStyleReply } from "../../../lib/replyParser.js";

export default function ChatBubble({ msg, selectedDomain, mobile, onCopy, onExport, domainLabel = "REI.ai" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text) => {
    const ok = await onCopy(text);
    if (ok !== false) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const isAssistantStructuredReply = selectedDomain === "assistant" && msg.sender === "rei" && !msg.rawJson?.fallback;
  const sections = isAssistantStructuredReply ? parseAssistantStyleReply(msg.text) : null;
  const hasHinge = sections?.Hinge && sections.Hinge.trim();
  const hasFacts = sections?.Facts && sections.Facts.trim();
  const hasAssumptions = sections?.Assumptions && sections.Assumptions.trim();
  const hasEval = sections?.Evaluation && sections.Evaluation.trim();
  const hasChange = sections?.ChangeMind && sections.ChangeMind.trim();
  const hasMove = sections?.Move && sections.Move.trim();
  const isStructured = hasHinge || hasFacts || hasAssumptions || hasEval || hasChange || hasMove;
  const exportPayload = {
    sections,
    routerDecision: msg.rawJson?.routerDecision,
    domainLabel,
    sourceText: msg.text,
    createdAt: msg.rawJson?.timestamp || new Date().toISOString(),
  };

  return (
    <div
      className={`rei-chat-message ${msg.sender === "user" ? "rei-chat-message--user" : "rei-chat-message--rei"}`}
      style={{ maxWidth: "95%", width: "100%" }}
      onAnimationEnd={(e) => { e.currentTarget.style.opacity = "1"; }}
    >
      {msg.sender === "user" && msg.attachedRecord && (
        <div style={{ fontSize: "11px", color: "var(--amber-text)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
          📋 Attached Record — {msg.attachedRecord.sourceType} ({msg.attachedRecord.charCount.toLocaleString()} chars)
        </div>
      )}

      {msg.sender === "rei" && msg.rawJson?.routerDecision && (
        <div className="rei-router-badge" style={{ marginBottom: "6px" }}>
          <span style={{ fontSize: "11px" }}>⚡</span>
          <span>{msg.rawJson.routerDecision.label}</span>
          <span style={{ margin: "0 2px" }}>·</span>
          <span style={{ color: "var(--amber-text)", fontWeight: 700 }}>
            {msg.rawJson.routerDecision.model}
          </span>
          {msg.rawJson.routerDecision.hingeScore != null && (
            <span style={{ fontSize: "10px", color: "var(--amber-badge-tx)", background: "var(--amber-badge-bg)", padding: "1px 6px", borderRadius: "4px", marginLeft: "6px", fontWeight: 600 }}
              title={"HingeScore: " + msg.rawJson.routerDecision.hingeScore.toFixed(2)}>
              {msg.rawJson.routerDecision.hingeScore < 0.3 ? "Low" : msg.rawJson.routerDecision.hingeScore < 0.55 ? "Med" : "High"}
            </span>
          )}
          {msg.rawJson?.truncated && (
            <span style={{ fontSize: "10px", color: "#DC2626", background: "rgba(220,38,38,0.12)", padding: "1px 6px", borderRadius: "4px", marginLeft: "6px", fontWeight: 600 }} title={"Response truncated by model — finish_reason: " + (msg.rawJson?.routerDecision?.finishReason || "length")}>⚠️ Truncated</span>
          )}
          {msg.rawJson?.rateLimited && (
            <span style={{ fontSize: "10px", color: "var(--text-muted)", marginLeft: "4px" }}>
              ({msg.rawJson.attemptedModel || "model"} busy · retry {msg.rawJson.retryAfter || "soon"})
            </span>
          )}
        </div>
      )}

      <div
        className={`rei-chat-bubble ${msg.sender === "user" ? "rei-chat-bubble--user" : "rei-chat-bubble--rei"}`}
        style={{ padding: "16px 52px 16px 20px" }}
      >
        {isAssistantStructuredReply ? (
          (() => {
            if (!isStructured) {
              return <div style={{ fontSize: "15px", lineHeight: "1.6" }}>{msg.text}</div>;
            }

            return (
              <div style={{ display: "grid", gap: "22px", paddingRight: "36px" }}>
                {sections.intro && <div style={{ fontSize: "15px", lineHeight: "1.45" }}>{sections.intro}</div>}

                {/* 📌 1. THE HINGE FOCUS CONTAINER */}
                {hasHinge && (
                  <div
                    style={{
                      borderLeft: "4px solid var(--amber-border)",
                      marginBottom: "12px",
                      borderRadius: "0 10px 10px 0",
                      padding: "12px 16px",
                      boxShadow: "0 4px 14px rgba(240, 201, 101, 0.08)",
                    }}
                  >
                    <div style={{ color: "var(--amber-text)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 800, marginBottom: "4px" }}>
                      📌 THE HINGE (Core Pivot Point)
                    </div>
                    <div style={{ color: "var(--text)", fontSize: "14.5px", fontWeight: 600, lineHeight: "1.5" }}>
                      {sections.Hinge}
                    </div>
                  </div>
                )}

                {/* 🔬 2. COMPARATIVE GRID: FACTS vs ASSUMPTIONS */}
                {(hasFacts || hasAssumptions) && (
                  <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: "12px" }}>
                    {hasFacts && (
                      <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(240, 201, 101, 0.15)", borderRadius: "10px", padding: "12px", marginBottom: "12px" }}>
                        <div style={{ color: "var(--cardo-facts)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: "6px" }}>
                             🔬 FACTS (Known Reality)
                        </div>
                        <div style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: "1.45" }}>{sections.Facts}</div>
                      </div>
                    )}
                    {hasAssumptions && (
                      <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(251, 146, 60, 0.15)", borderRadius: "10px", padding: "12px", marginBottom: "12px" }}>
                        <div style={{ color: "var(--cardo-assumptions)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: "6px" }}>
                             ❓ ASSUMPTIONS (Uncertainty)
                        </div>
                        <div style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: "1.45" }}>{sections.Assumptions}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* ⚖️ 3. EVALUATION & CHANGE MIND */}
                {hasEval && (
                  <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "12px", marginBottom: "12px" }}>
                    <div style={{ color: "var(--amber-text)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: "6px" }}>
                         ⚖️ EVALUATION & RISK
                    </div>
                    <div style={{ fontSize: "13.5px", color: "var(--text)", lineHeight: "1.45" }}>{sections.Evaluation}</div>
                  </div>
                )}

                {hasChange && (
                  <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "12px", marginBottom: "12px" }}>
                    <div style={{ color: "var(--cardo-change)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: "6px" }}>
                         🔄 WHAT WOULD CHANGE MY MIND
                    </div>
                    <div style={{ fontSize: "13.5px", color: "var(--text)", lineHeight: "1.45" }}>{sections.ChangeMind}</div>
                  </div>
                )}

                {/* 🚀 4. NEXT MOVE */}
                {hasMove && (
                  <div style={{ background: "rgba(240, 201, 101, 0.06)", border: "1px solid rgba(240, 201, 101, 0.2)", borderRadius: "10px", padding: "12px", marginBottom: "12px" }}>
                    <div style={{ color: "var(--cardo-move)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: "6px" }}>
                         🚀 NEXT MOVE
                    </div>
                    <div style={{ fontSize: "14px", color: "var(--text)", fontWeight: 600, lineHeight: "1.45" }}>{sections.Move}</div>
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
            <summary style={{ fontSize: "11.5px", color: "var(--text-muted)", cursor: "pointer", fontWeight: 600, userSelect: "none" }}>
              🔍 View Night Shift Routing Telemetry ({msg.rawJson.routerDecision?.model || "auto"})
            </summary>
            <div className="rei-router-panel__grid" style={{ marginTop: "8px" }}>
              <div className="rei-router-panel__item"><span className="rei-router-panel__label">Route:</span> {msg.rawJson.routerDecision?.label || "n/a"}</div>
              <div className="rei-router-panel__item"><span className="rei-router-panel__label">Model:</span> {msg.rawJson.routerDecision?.model || msg.rawJson.model || "n/a"}</div>
              <div class="rei-router-panel__item"><span class="rei-router-panel__label">Hinge score:</span> {msg.rawJson.routerDecision?.hingeScore?.toFixed(2) || "n/a"}</div>
              <div class="rei-router-panel__item"><span class="rei-router-panel__label">Matched terms:</span> {msg.rawJson.routerDecision?.matchedTerms?.join(", ") || "none"}</div>
              <div className="rei-router-panel__item"><span className="rei-router-panel__label">Max tokens:</span> {msg.rawJson.routerDecision?.maxTokens || "n/a"}</div>
              <div className="rei-router-panel__item"><span className="rei-router-panel__label">Quality gate:</span> {msg.rawJson.routerDecision?.qualityGate || "n/a"}</div>
              <div className="rei-router-panel__item"><span className="rei-router-panel__label">Escalation:</span> {msg.rawJson.routerDecision?.escalation?.escalate ? "⚠️ Recommended — " + msg.rawJson.routerDecision.escalation.reason : "Not recommended • routing cost within threshold"}</div>
              <div className="rei-router-panel__item"><span className="rei-router-panel__label">Enforcement:</span> {msg.rawJson.routerDecision?.enforce || "none"}</div>
              <div class="rei-router-panel__item"><span class="rei-router-panel__label">Rationale:</span> {msg.rawJson.routerDecision?.rationale || "n/a"}</div>
              <div className="rei-router-panel__item"><span className="rei-router-panel__label">Est. cost:</span> ${msg.rawJson.routerDecision?.estimatedCost?.toFixed(4) || "—"}</div>
              <div className="rei-router-panel__item"><span className="rei-router-panel__label">Premium cost:</span> ${msg.rawJson.routerDecision?.premiumCost?.toFixed(4) || "—"}</div>
              <div className="rei-router-panel__item"><span className="rei-router-panel__label">Savings:</span> {msg.rawJson.routerDecision?.premiumCost > 0
                ? Math.round((1 - msg.rawJson.routerDecision.estimatedCost / msg.rawJson.routerDecision.premiumCost) * 100) + "% vs gpt-4o"
                : "—"}</div>
            </div>
          </details>
        )}

        <div className="rei-bubble-actions">
          {onExport && isStructured && (
            <button
              type="button"
              onClick={() => onExport(exportPayload)}
              className="rei-copy-btn touch-target"
              aria-label="Export Report decision"
              onMouseOver={(e) => e.currentTarget.style.opacity = 1}
              onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
              title="Export Report decision"
            >
              Export Report
            </button>
          )}

          <button
            onClick={() => handleCopy(msg.text)}
            className="rei-copy-btn touch-target"
            aria-label="Copy message"
            onMouseOver={(e) => e.currentTarget.style.opacity = 1}
            onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
            title="Copy message"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
          {msg.sender === "rei" && (() => {
            const s = parseAssistantStyleReply(msg.text);
            if (!s.Hinge && !s.Facts) return null;
            const report = [
              "## CARDO Analysis",
              s.Hinge && `**Hinge:** ${s.Hinge}`,
              s.Facts && `**Facts:** ${s.Facts}`,
              s.Assumptions && `**Assumptions:** ${s.Assumptions}`,
              s.Evaluation && `**Evaluation:** ${s.Evaluation}`,
              s.ChangeMind && `**What would change my mind:** ${s.ChangeMind}`,
              s.Move && `**Move:** ${s.Move}`,
            ].filter(Boolean).join("\n\n");
            return (
              <>
                <button
                  onClick={() => handleCopy(report)}
                  className="rei-copy-btn touch-target"
                  aria-label="Copy report"
                  style={{ fontSize: "9px" }}
                  onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                  onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
                  title="Copy CARDO report"
                >
                  {copied ? "Copied ✓" : "Report"}
                </button>
                <button
                  onClick={() => onExport && onExport({ sections: s, routerDecision: msg.rawJson?.routerDecision, timestamp: msg.timestamp })}
                  className="rei-copy-btn touch-target"
                  aria-label="Export Report decision document"
                  style={{ fontSize: "9px" }}
                  onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                  onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
                  title="Download CARDO decision report"
                >
                  📄 Export Report
                </button>
              </>
            );
          })()}
        </div>
      </div>

      <span className="rei-chat-meta">
        {msg.sender === "user" ? "You" : "REI.ai Cognitive Engine"} • {msg.timestamp}
      </span>
    </div>
  );
}
