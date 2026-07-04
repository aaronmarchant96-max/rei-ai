import { getCostBadgeLabel } from "../lib/costHelpers.js";

export default function RouterBadge({ routerDecision, usage }) {
  if (!routerDecision) return null;

  const totalTokens = usage?.total_tokens || routerDecision.estimatedInputTokens || 0;

  return (
    <div className="rei-router-badge" role="status" aria-label={`Routed via ${routerDecision.label} to ${routerDecision.model}`}>
      <span className="rei-router-badge__icon">🌙</span>
      <span>{routerDecision.label}</span>
      <span className="rei-router-badge__model">{routerDecision.model}</span>
      <span className="rei-router-badge__cost">
        {getCostBadgeLabel(routerDecision.model, totalTokens)}
      </span>
    </div>
  );
}
