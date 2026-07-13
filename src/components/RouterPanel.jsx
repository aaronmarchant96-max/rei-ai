import { useState } from "react";

export default function RouterPanel({ routerDecision, model, defaultExpanded }) {
  const [expanded, setExpanded] = useState(defaultExpanded || false);
  if (!routerDecision) return null;

  const savings = (routerDecision.premiumCost || 0) - (routerDecision.estimatedCost || 0);
  const savingsPct = routerDecision.premiumCost > 0
    ? Math.round((savings / routerDecision.premiumCost) * 100)
    : 0;

  return (
    <div className="rei-router-panel" role="region" aria-label="Routing details">
      <button
        type="button"
        className="rei-router-panel__summary"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span>
          {routerDecision.pathway === "deterministic" ? "⚡" : "🌙"}
          {" "}{routerDecision.label} · {model || routerDecision.model}
        </span>
        {savingsPct > 0 && (
          <span className="rei-router-panel__savings">
            Saved {savingsPct}% vs premium
          </span>
        )}
        <span className="rei-router-panel__toggle">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="rei-router-panel__grid">
          <div className="rei-router-panel__item">
            <span className="rei-router-panel__label">Pathway:</span> {routerDecision.pathway || "medium"}
          </div>
          <div className="rei-router-panel__item">
            <span className="rei-router-panel__label">Confidence:</span>{" "}
            {routerDecision.routingConfidence != null
              ? `${(routerDecision.routingConfidence * 100).toFixed(0)}%`
              : routerDecision.pathway === "deterministic" ? "100%" : "n/a"}
          </div>
          <div className="rei-router-panel__item">
            <span className="rei-router-panel__label">Est. cost:</span>{" "}
            ${routerDecision.estimatedCost?.toFixed(6) || "0"}
          </div>
          <div className="rei-router-panel__item">
            <span className="rei-router-panel__label">Premium cost:</span>{" "}
            ${routerDecision.premiumCost?.toFixed(6) || "0"}
          </div>
          <div className="rei-router-panel__item">
            <span className="rei-router-panel__label">Quality gate:</span> {routerDecision.qualityGate}
          </div>
          {routerDecision.rationale && (
            <div className="rei-router-panel__why">
              <span className="rei-router-panel__label">Why:</span> {routerDecision.rationale}
            </div>
          )}
          {routerDecision.routingSignals && (
            <div className="rei-router-panel__item">
              <span className="rei-router-panel__label">Signals:</span>{" "}
              {routerDecision.matchedPattern
                ? `Pattern: ${routerDecision.matchedPattern}`
                : routerDecision.routingSignals.matchedTerms?.length > 0
                  ? `Matched: ${routerDecision.routingSignals.matchedTerms.join(", ")}`
                  : "No specific terms matched"}
              {" · "}Complexity: {routerDecision.routingSignals.complexityTier || "n/a"}
            </div>
          )}
          {routerDecision.alternativeRoutes && routerDecision.alternativeRoutes.length > 0 && (
            <div className="rei-router-panel__item--muted">
              <span className="rei-router-panel__label">Also available:</span>{" "}
              {routerDecision.alternativeRoutes.map((alt, i) => (
                <span key={alt.model}>
                  {i > 0 && " · "}
                  {alt.label}
                  {" "}({(alt.costPer1kTotal * 1000).toFixed(2)}¢/1K)
                  {alt.costDeltaFromSelected !== 0 && (
                    <span style={{ color: alt.costDeltaFromSelected > 0 ? "#f87171" : "#4ade80" }}>
                      {" "}{alt.costDeltaFromSelected > 0 ? "+" : ""}{alt.savingsPercentage}%
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
