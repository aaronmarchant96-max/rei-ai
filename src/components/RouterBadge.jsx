import { getCostBadgeLabel } from "../lib/costHelpers.js";

export default function RouterBadge({ routerDecision, usage }) {
  if (!routerDecision) return null;

  const isDeterministic = routerDecision.model === "deterministic";
  const totalTokens = usage?.total_tokens ?? 0;
  const savings = (routerDecision.premiumCost || 0) - (routerDecision.estimatedCost || 0);
  const savingsPct = routerDecision.premiumCost > 0
    ? Math.round((savings / routerDecision.premiumCost) * 100)
    : 0;

  const isRedTeam = routerDecision.id?.startsWith("red-team");
  const dimensionLabel = isRedTeam
    ? routerDecision.id === "red-team-surface" ? "D1"
      : routerDecision.id === "red-team-semantic" ? "D2"
      : "D3"
    : null;

  return (
    <div className="rei-router-badge" role="status" aria-label={`Routed via ${routerDecision.label} to ${routerDecision.model}`}>
      <span className="rei-router-badge__icon">{isDeterministic ? "⚡" : "🌙"}</span>
      <span className="rei-router-badge__label">{routerDecision.label}</span>
      {dimensionLabel && (
        <span className={`rei-router-badge__dimension rei-router-badge__dimension--${dimensionLabel.toLowerCase()}`}>
          {dimensionLabel}
        </span>
      )}
      <span className="rei-router-badge__model">{routerDecision.model}</span>
      <span className="rei-router-badge__cost">
        {isDeterministic ? "$0 · 0 tok" : getCostBadgeLabel(routerDecision.model, totalTokens, usage)}
      </span>
      {!isDeterministic && savingsPct > 0 && (
        <span className="rei-router-badge__savings">−{savingsPct}%</span>
      )}
    </div>
  );
}
