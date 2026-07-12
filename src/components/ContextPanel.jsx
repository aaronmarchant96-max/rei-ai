import { parseAssistantStyleReply } from "../lib/replyParser.js";
import EvidenceCard from "./EvidenceCard.jsx";

export default function ContextPanel({ message, isOpen, onClose }) {
  if (!message) return null;

  const sections = parseAssistantStyleReply(message.text);
  const hasContent = sections.Hinge || sections.Facts || sections.Assumptions
    || sections.Evaluation || sections.ChangeMind || sections.Move
    || (message.evidence && message.evidence.length > 0);

  return (
    <>
      <div
        className={`rei-context-overlay ${isOpen ? "rei-context-overlay--visible" : ""}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />
      <div
        className={`rei-context-panel ${isOpen ? "rei-context-panel--open" : ""}`}
        role="complementary"
        aria-label="Reasoning context"
      >
        <div className="rei-context-panel__header">
          <span className="rei-context-panel__title">Context &middot; REI</span>
          <button
            className="rei-context-panel__close"
            onClick={onClose}
            aria-label="Close context panel"
          >
            &times;
          </button>
        </div>

        <div className="rei-context-panel__body">
          {!hasContent && (
            <div className="rei-context-panel__empty">
              This response doesn&rsquo;t include structured reasoning sections.
              Try asking a question that requires analysis.
            </div>
          )}

          {sections.Hinge && (
            <div className="rei-context-panel__section">
              <div className="rei-context-panel__section-label">Hinge Point</div>
              <div className="rei-context-panel__section-content">{sections.Hinge}</div>
            </div>
          )}

          {(sections.Facts || sections.Assumptions) && (
            <div className="rei-context-panel__section">
              <div className="rei-context-panel__section-label">Facts vs Assumptions</div>
              {sections.Facts && (
                <div className="rei-context-panel__subsection">
                  <div className="rei-context-panel__subsection-label">Known</div>
                  <div className="rei-context-panel__section-content">{sections.Facts}</div>
                </div>
              )}
              {sections.Assumptions && (
                <div className="rei-context-panel__subsection">
                  <div className="rei-context-panel__subsection-label">Inferred</div>
                  <div className="rei-context-panel__section-content">{sections.Assumptions}</div>
                </div>
              )}
            </div>
          )}

          {sections.ChangeMind && (
            <div className="rei-context-panel__section">
              <div className="rei-context-panel__section-label">What Would Change the Conclusion</div>
              <div className="rei-context-panel__section-content">{sections.ChangeMind}</div>
            </div>
          )}

          {message.evidence && message.evidence.length > 0 && (
            <div className="rei-context-panel__section">
              <div className="rei-context-panel__section-label">Evidence Tiers</div>
              {message.evidence.map((e, i) => (
                <EvidenceCard key={i} evidence={e} />
              ))}
            </div>
          )}

          {sections.Evaluation && (
            <div className="rei-context-panel__section">
              <div className="rei-context-panel__section-label">Evaluation</div>
              <div className="rei-context-panel__section-content">{sections.Evaluation}</div>
            </div>
          )}

          {sections.Move && (
            <div className="rei-context-panel__section">
              <div className="rei-context-panel__section-label">Next Move</div>
              <div className="rei-context-panel__section-content">{sections.Move}</div>
            </div>
          )}

          {message.routerDecision && (
            <div className="rei-context-panel__section rei-context-panel__section--routing">
              <div className="rei-context-panel__section-label">Routing</div>
              <div className="rei-context-panel__section-content">
                <div>{message.routerDecision.label} &middot; {message.model || message.routerDecision.model}</div>
                <div className="rei-context-panel__routing-meta">
                  Pathway: {message.routerDecision.pathway || "medium"}
                  {message.routerDecision.routingConfidence != null && (
                    <> &middot; Confidence: {(message.routerDecision.routingConfidence * 100).toFixed(0)}%</>
                  )}
                </div>
                {message.cost != null && (
                  <div className="rei-context-panel__routing-meta">
                    Cost: ${message.cost.toFixed(6)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
