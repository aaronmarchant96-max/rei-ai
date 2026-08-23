import { useState } from "react";

export default function DomainBanner({ currentDomain, selectedDomain, reasoningLoopSteps }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rei-domain-banner">
      {/* Compact bar — always visible */}
      <div
        onClick={() => setExpanded(!expanded)}
        className="rei-domain-banner__summary"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setExpanded(!expanded);
          }
        }}
      >
        <div className="rei-domain-banner__identity">
          <span className="rei-domain-banner__signal" />
          <span className="rei-domain-banner__name">
            {currentDomain.label}
          </span>
          <span className="rei-domain-banner__description">
            {currentDomain.description}
          </span>
        </div>

        <div className="rei-domain-banner__controls">
          <span className="rei-domain-banner__protocol">
            CARDO v3.4
          </span>
          <span className={`rei-domain-banner__chevron ${expanded ? "is-expanded" : ""}`}>
            ▼
          </span>
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="rei-domain-banner__detail">
          <div className="rei-domain-banner__detail-copy">
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
            <div className="rei-domain-banner__pipeline">
              <div className="rei-domain-banner__pipeline-label">
                CARDO Cognitive Pipeline (Pivot Dissection)
              </div>
              <div className="rei-domain-banner__steps">
                <span className="rei-domain-banner__step">
                  C · Collect Raw Data
                </span>
                <span className="rei-domain-banner__arrow">→</span>
                <span className="rei-domain-banner__step">
                  A · Analyze Patterns
                </span>
                <span className="rei-domain-banner__arrow">→</span>
                <span className="rei-domain-banner__step is-hinge">
                  R · Record Hinge
                </span>
                <span className="rei-domain-banner__arrow">→</span>
                <span className="rei-domain-banner__step">
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
