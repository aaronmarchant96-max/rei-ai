import RouterPanel from "./RouterPanel.jsx";
import EvidenceCard from "./EvidenceCard.jsx";
import { parseAssistantStyleReply } from "../lib/replyParser.js";

function StructuredReply({ text }) {
  const sections = parseAssistantStyleReply(text);
  const sectionOrder = [
    { key: "Hinge", label: "Hinge" },
    { key: "Facts", label: "Facts" },
    { key: "Assumptions", label: "Assumptions" },
    { key: "Evaluation", label: "Evaluation" },
    { key: "ChangeMind", label: "What would change my mind" },
    { key: "Move", label: "Move" },
  ];
  const visible = sectionOrder.filter(({ key }) => sections[key]?.trim());
  if (!sections.intro && visible.length === 0) return <>{text}</>;
  return (
    <div style={{ display: "grid", gap: "10px" }}>
      {sections.intro && <div>{sections.intro}</div>}
      {visible.map(({ key, label }) => (
        <div key={key}>
          <div className="rei-section-label">{label}</div>
          <div>{sections[key]}</div>
        </div>
      ))}
    </div>
  );
}

function RouterSummary({ routerDecision, model }) {
  if (!routerDecision) return null;
  const savings = (routerDecision.premiumCost || 0) - (routerDecision.estimatedCost || 0);
  const savingsPct = routerDecision.premiumCost > 0
    ? Math.round((savings / routerDecision.premiumCost) * 100)
    : 100;
  return (
    <div className="rei-chat-msg__router">
      <span className="rei-chat-msg__router-pathway">
        {routerDecision.pathway === "deterministic" ? "⚡" : "🌙"}
        {" "}{routerDecision.label} &middot; {model || routerDecision.model}
      </span>
      {savings > 0 && (
        <span className="rei-chat-msg__router-savings">
          {savingsPct}% saved vs premium
        </span>
      )}
    </div>
  );
}

export default function ChatMessage({
  msg,
  index,
  selectedDomain,
  onCopy,
  onRetry,
}) {
  const isRei = msg.sender === "rei";
  const isUser = msg.sender === "user";

  return (
    <div
      key={msg.id || index}
      className={`rei-chat-msg ${isUser ? "rei-chat-msg--user" : "rei-chat-msg--rei"}`}
      onAnimationEnd={(e) => { e.currentTarget.style.opacity = "1"; }}
    >
      <div className={`rei-chat-card ${isUser ? "rei-chat-card--user" : "rei-chat-card--rei"}`}>
        <div className={`rei-chat-card__sender ${isUser ? "rei-chat-card__sender--user" : ""}`}>
          <span className="rei-chat-card__exchange">[{index + 1}]</span>
          {isRei && (
            <>
              <span className="rei-chat-card__avatar rei-chat-card__avatar--rei">R</span>
              <span>{" "}REI &bull; {msg.timestamp}</span>
            </>
          )}
          {isUser && (
            <>
              <span>{msg.timestamp} &bull; You{" "}</span>
              <span className="rei-chat-card__avatar rei-chat-card__avatar--user">Y</span>
            </>
          )}
        </div>

        <div className={`rei-chat-card__body ${isUser ? "rei-chat-card__body--user" : "rei-chat-card__body--rei"}`}>
          {isUser && msg.attachedRecord && (
            <div className="rei-record-attached">
              📋 Record attached &mdash; {msg.attachedRecord.sourceType} ({msg.attachedRecord.charCount.toLocaleString()} chars)
            </div>
          )}

          {isRei && selectedDomain === "assistant" && !msg.fallback
            ? <StructuredReply text={msg.text} />
            : msg.text
          }

          {msg.evidence && msg.evidence.length > 0 && (
            <div className="rei-evidence-cards" role="list" aria-label="Evidence tiers">
              {msg.evidence.map((e, i) => (
                <EvidenceCard key={i} evidence={e} />
              ))}
            </div>
          )}

          {isRei && <RouterSummary routerDecision={msg.routerDecision} model={msg.model} />}
        </div>

        <div className="rei-chat-card__actions">
          <button
            onClick={() => onCopy(msg.text)}
            aria-label="Copy"
            title="Copy"
          >📋</button>
          {msg.fallback && (
            <button
              onClick={() => onRetry(index)}
              aria-label="Retry"
              title="Retry"
            >↻</button>
          )}
        </div>
      </div>

      {isRei && <RouterPanel routerDecision={msg.routerDecision} model={msg.model} />}
    </div>
  );
}
