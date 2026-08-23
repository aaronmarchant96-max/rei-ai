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
      >
        {isAssistantStructuredReply ? (
          (() => {
            if (!isStructured) {
              return <div style={{ fontSize: "15px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{cleanDeliverableText}</div>;
            }

            return (
              <div className="rei-cardo-response">
                {sections.intro && <div className="rei-cardo-response__intro">{sections.intro}</div>}

                {/* 📌 1. THE HINGE FOCUS CONTAINER */}
                {hasHinge && (
                  <div
                    className="rei-cardo-hinge-box"
                  >
                    <div className="rei-cardo-card__label">
                      THE HINGE <span>Core pivot point</span>
                    </div>
                    <div className="rei-cardo-hinge-box__text">
                      {sections.Hinge}
                    </div>
                  </div>
                )}

                {/* 🔬 2. COMPARATIVE GRID: FACTS vs ASSUMPTIONS */}
                {(hasFacts || hasAssumptions) && (
                  <div className={`rei-cardo-comparison ${mobile ? "is-mobile" : ""}`}>
                    {hasFacts && (
                      <div className="rei-cardo-card rei-cardo-card--facts">
                        <div className="rei-cardo-card__label">
                          FACTS <span>Known reality</span>
                        </div>
                        <div className="rei-cardo-card__body">{sections.Facts}</div>
                      </div>
                    )}
                    {hasAssumptions && (
                      <div className="rei-cardo-card rei-cardo-card--assumptions">
                        <div className="rei-cardo-card__label">
                          ASSUMPTIONS <span>Uncertainty</span>
                        </div>
                        <div className="rei-cardo-card__body">{sections.Assumptions}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* ⚖️ 3. EVALUATION & CHANGE MIND */}
                {hasEval && (
                  <div className="rei-cardo-card rei-cardo-card--evaluation">
                    <div className="rei-cardo-card__label">
                      EVALUATION <span>Risk and tradeoffs</span>
                    </div>
                    <div className="rei-cardo-card__body">{sections.Evaluation}</div>
                  </div>
                )}

                {hasChange && (
                  <div className="rei-cardo-card rei-cardo-card--change">
                    <div className="rei-cardo-card__label">
                      WHAT WOULD CHANGE MY MIND
                    </div>
                    <div className="rei-cardo-card__body">{sections.ChangeMind}</div>
                  </div>
                )}

                {/* 🚀 4. NEXT MOVE */}
                {hasMove && (
                  <div className="rei-cardo-card rei-cardo-card--move">
                    <div className="rei-cardo-card__label">
                      NEXT MOVE <span>Recommended action</span>
                    </div>
                    <div className="rei-cardo-card__body">{sections.Move}</div>
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
        <div className="rei-bubble-actions">
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
        {msg.sender === "user" ? "You" : domainLabel} • {msg.timestamp}
      </span>
    </div>
  );
}
