import RouterBadge from "./RouterBadge.jsx";
import RouterPanel from "./RouterPanel.jsx";
import EvidenceCard from "./EvidenceCard.jsx";
import { parseAssistantStyleReply } from "../lib/replyParser.js";

export default function ChatMessage({
  msg,
  index,
  selectedDomain,
  mobile,
  onCopy,
  onRetry,
}) {
  return (
    <div
      key={msg.id || index}
      className={`rei-chat-message ${msg.sender === "user" ? "rei-chat-message--user" : "rei-chat-message--rei"}`}
      style={{ maxWidth: "95%", width: "100%" }}
      onAnimationEnd={(e) => { e.currentTarget.style.opacity = "1"; }}
    >
      {msg.sender === "user" && msg.attachedRecord && (
        <div className="rei-record-attached">
          &#x1F4CB; Record attached — {msg.attachedRecord.sourceType} ({msg.attachedRecord.charCount.toLocaleString()} chars)
        </div>
      )}
      {msg.sender === "rei" && (
        <RouterBadge
          routerDecision={msg.routerDecision}
          usage={msg.usage}
        />
      )}
      <div
        className={`rei-chat-bubble ${msg.sender === "user" ? "rei-chat-bubble--user" : "rei-chat-bubble--rei"}`}
        style={{ padding: "10px 60px 10px 14px" }}
      >
        {selectedDomain === "assistant" && msg.sender === "rei" && !msg.fallback ? (
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
                    <div className="rei-section-label">{label}</div>
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

        {msg.evidence && msg.evidence.length > 0 && (
          <div className="rei-evidence-cards" role="list" aria-label="Evidence tiers">
            {msg.evidence.map((e, i) => (
              <EvidenceCard key={i} evidence={e} />
            ))}
          </div>
        )}

        <RouterPanel
          routerDecision={msg.routerDecision}
          model={msg.model}
        />

        <button
          onClick={() => onCopy(msg.text)}
          className="rei-copy-btn touch-target"
          aria-label="Copy message"
          style={{
            fontSize: mobile ? "0.85em" : "0.75em",
            padding: mobile ? "6px 10px" : "2px 6px"
          }}
          onMouseOver={(e) => { e.currentTarget.style.opacity = "1"; }}
          onMouseOut={(e) => { e.currentTarget.style.opacity = "0.7"; }}
          title="Copy message"
        >
          Copy
        </button>

        {msg.fallback && (
          <button
            onClick={() => onRetry(index)}
            className="rei-copy-btn touch-target rei-retry-btn"
            aria-label="Retry request"
            style={{
              fontSize: mobile ? "0.85em" : "0.75em",
              padding: mobile ? "6px 10px" : "2px 6px",
            }}
            onMouseOver={(e) => { e.currentTarget.style.opacity = "1"; }}
            onMouseOut={(e) => { e.currentTarget.style.opacity = "0.7"; }}
            title="Retry request"
          >
            Retry
          </button>
        )}
      </div>
      <span className="rei-chat-meta">
        {msg.sender === "user" ? "You" : "REI.ai"} &bull; {msg.timestamp}
      </span>
    </div>
  );
}
