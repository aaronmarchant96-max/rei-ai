import { useState, useMemo } from "react";
import { parseAssistantStyleReply, extractDeliverableAndScaffolding } from "../../../lib/replyParser.js";
import { buildRequestEvidence } from "../../../lib/evidenceEngine";
import TelemetryCapsule from "./TelemetryCapsule.jsx";
import CardoComparisonToggle from "./CardoComparisonToggle.jsx";

export default function ChatBubble({ msg, selectedDomain, mobile, onCopy, onExport, onInspect, domainLabel = "REI.ai" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (text) => {
    const ok = await onCopy(text);
    if (ok !== false) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const isSystemNotice = Boolean(
    msg.isSystemNotice ||
    !msg.text ||
    msg.text.startsWith("System initialized") ||
    msg.text.startsWith("[REI.AI NOTICE]")
  );

  const isAssistantStructuredReply = !isSystemNotice && selectedDomain === "assistant" && msg.sender === "rei" && !msg.rawJson?.fallback;
  const sections = isAssistantStructuredReply ? parseAssistantStyleReply(msg.text) : null;
  const hasHinge = sections?.Hinge && sections.Hinge.trim();
  const hasFacts = sections?.Facts && sections.Facts.trim();
  const hasAssumptions = sections?.Assumptions && sections.Assumptions.trim();
  const hasEval = sections?.Evaluation && sections.Evaluation.trim();
  const hasChange = sections?.ChangeMind && sections.ChangeMind.trim();
  const hasMove = sections?.Move && sections.Move.trim();
  const isStructured = hasHinge || hasFacts || hasAssumptions || hasEval || hasChange || hasMove;

  const evidence = useMemo(() => {
    if (msg.sender !== "rei" || isSystemNotice) return null;
    if (msg.evidence) return msg.evidence;
    if (!msg.rawJson?.routerDecision && !msg.rawJson?.model) return null;
    return buildRequestEvidence({
      requestId: msg.rawJson?.requestId || msg.requestId,
      timestamp: msg.timestamp || msg.rawJson?.timestamp,
      routerDecision: msg.rawJson?.routerDecision,
      rawTrace: msg.rawJson?.rawTrace,
      usage: msg.rawJson?.usage,
      responseText: msg.text,
      redTeamResult: msg.rawJson?.redTeamResult,
      research: msg.rawJson?.research || msg.research,
    });
  }, [msg, isSystemNotice]);

  const exportPayload = {
    sections,
    routerDecision: msg.rawJson?.routerDecision,
    domainLabel,
    sourceText: msg.text,
    createdAt: msg.rawJson?.timestamp || new Date().toISOString(),
  };

  const { deliverable: cleanDeliverableText } = extractDeliverableAndScaffolding(msg.text);

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

      {msg.sender === "rei" && !isSystemNotice && evidence && (
        <TelemetryCapsule evidence={evidence} onInspect={onInspect} />
      )}

      <div
        className={`rei-chat-bubble ${msg.sender === "user" ? "rei-chat-bubble--user" : "rei-chat-bubble--rei"}`}
        style={{ padding: "16px 52px 16px 20px" }}
      >
        {isAssistantStructuredReply ? (
          (() => {
            if (!isStructured) {
              return <div style={{ fontSize: "15px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{cleanDeliverableText}</div>;
            }

            return (
              <div style={{ display: "grid", gap: "22px", paddingRight: "36px" }}>
                {sections.intro && <div style={{ fontSize: "15px", lineHeight: "1.45" }}>{sections.intro}</div>}

                {/* 📌 1. THE HINGE FOCUS CONTAINER */}
                {hasHinge && (
                  <div
                    className="rei-cardo-hinge-box"
                    style={{
                      borderLeft: "4px solid var(--amber-border)",
                      marginBottom: "12px",
                      borderRadius: "0 10px 10px 0",
                      padding: "12px 16px",
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

                {msg.sender === "rei" && !isSystemNotice && evidence && isStructured && (
                  <CardoComparisonToggle
                    responseText={msg.text}
                    sections={sections}
                    verificationSignals={evidence?.verificationSignals}
                  />
                )}
              </div>
            );
          })()
        ) : (
          <div>
            <div style={{ fontSize: "15px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{cleanDeliverableText}</div>
          </div>
        )}

        {/* Bubble Bottom Actions */}
        <div style={{ position: "absolute", bottom: "10px", right: "12px", display: "flex", gap: "6px" }}>
          <button
            onClick={() => handleCopy(cleanDeliverableText)}
            className="rei-copy-btn touch-target"
            aria-label="Copy message"
            onMouseOver={(e) => e.currentTarget.style.opacity = 1}
            onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
            title="Copy message"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
          {msg.sender === "rei" && !isSystemNotice && (() => {
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
                  onClick={() => onExport && onExport({ sections: s, routerDecision: msg.rawJson?.routerDecision, timestamp: msg.timestamp, domainLabel })}
                  className="rei-copy-btn touch-target"
                  aria-label="Export Report decision"
                  style={{ fontSize: "9px" }}
                  onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                  onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
                  title="Export Report decision"
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
