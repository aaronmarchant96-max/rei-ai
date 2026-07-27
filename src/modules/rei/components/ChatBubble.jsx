import { parseAssistantStyleReply } from "../../../lib/replyParser.js";

export default function ChatBubble({ msg, selectedDomain, mobile, onCopy }) {
  return (
    <div
      className={`rei-chat-message ${msg.sender === "user" ? "rei-chat-message--user" : "rei-chat-message--rei"}`}
      style={{ maxWidth: "95%", width: "100%" }}
      onAnimationEnd={(e) => { e.currentTarget.style.opacity = "1"; }}
    >
      {msg.sender === "user" && msg.attachedRecord && (
        <div style={{ fontSize: "10.5px", color: "#f0c965", marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
          📋 Record attached — {msg.attachedRecord.sourceType} ({msg.attachedRecord.charCount.toLocaleString()} chars)
        </div>
      )}
      {msg.sender === "rei" && msg.rawJson?.routerDecision && (
        <div className="rei-router-badge">
          <span style={{ fontSize: "11px" }}>🌙</span>
          <span>{msg.rawJson.routerDecision.label}</span>
          <span style={{ color: "#f0c965", fontWeight: 600 }}>
            {msg.rawJson.routerDecision.model}
          </span>
        </div>
      )}
      <div
        className={`rei-chat-bubble ${msg.sender === "user" ? "rei-chat-bubble--user" : "rei-chat-bubble--rei"}`}
        style={{ padding: "10px 60px 10px 14px" }}
      >
        {selectedDomain === "assistant" && msg.sender === "rei" && !msg.rawJson?.fallback ? (
          (() => {
            const sections = parseAssistantStyleReply(msg.text);
            const sectionOrder = [
              { key: "Hinge", label: "Hinge" },
              { key: "Facts", label: "Facts" },
              { key: "Assumptions", label: "Assumptions" },
              { key: "Evaluation", label: "Evaluation" },
              { key: "ChangeMind", label: "What would change my mind" },
              { key: "Move", label: "Move" },
            ];
            const visibleSections = sectionOrder.filter(({ key }) => sections[key] && sections[key].trim());
            return sections.intro || visibleSections.length > 0 ? (
              <div style={{ display: "grid", gap: "10px" }}>
                {sections.intro && <div>{sections.intro}</div>}
                {visibleSections.map(({ key, label }) => (
                  <div key={key}>
                    <div style={{ color: "#f0c965", fontSize: "0.85em", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>{label}</div>
                    <div>{sections[key]}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div>{msg.text}</div>
            );
          })()
        ) : (
          msg.text
        )}

        {msg.rawJson && (
          <div className="rei-router-panel">
            <div className="rei-router-panel__title">Night Shift routing</div>
            <div className="rei-router-panel__grid">
              <div className="rei-router-panel__item"><span className="rei-router-panel__label">Route:</span> {msg.rawJson.routerDecision?.label || "n/a"}</div>
              <div className="rei-router-panel__item"><span className="rei-router-panel__label">Model:</span> {msg.rawJson.routerDecision?.model || msg.rawJson.model || "n/a"}</div>
              <div className="rei-router-panel__item"><span className="rei-router-panel__label">Max tokens:</span> {msg.rawJson.routerDecision?.maxTokens || "n/a"}</div>
              <div className="rei-router-panel__item"><span className="rei-router-panel__label">Quality gate:</span> {msg.rawJson.routerDecision?.qualityGate || "n/a"}</div>
              <div className="rei-router-panel__item"><span className="rei-router-panel__label">Enforcement:</span> {msg.rawJson.routerDecision?.enforce || "none"}</div>
            </div>
          </div>
        )}
        <button
          onClick={() => onCopy(msg.text)}
          className="rei-copy-btn touch-target"
          aria-label="Copy message"
          style={{ fontSize: mobile ? "0.85em" : "0.75em", padding: mobile ? "6px 10px" : "2px 6px" }}
          onMouseOver={(e) => e.currentTarget.style.opacity = 1}
          onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
          title="Copy message"
        >
          Copy
        </button>
      </div>
      <span className="rei-chat-meta">
        {msg.sender === "user" ? "You" : "REI.ai"} • {msg.timestamp}
      </span>
    </div>
  );
}
