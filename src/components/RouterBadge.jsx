import { getCostBadgeLabel } from "../lib/costHelpers";

// Complexity tier → token counter color
const COMPLEXITY_COLORS = {
  low:    "#4ade80", // green
  medium: "#facc15", // amber
  high:   "#f87171", // red
  ultra:  "#c084fc", // purple
};

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

  // ── Sprint 4: Glass Box enhancements ─────────────────────────────────────
  const isHybrid = routerDecision.hybridMode === true;
  const suspicionScore = routerDecision.routingSignals?.suspicionScore ?? 0;
  const complexityTier = routerDecision.routingComplexity?.tier ?? "low";
  const isUltra = complexityTier === "ultra";
  const tokColor = COMPLEXITY_COLORS[complexityTier] || COMPLEXITY_COLORS.low;
  const isFinance = routerDecision.id === "finance-analyst";
  const isMeta = routerDecision.id === "meta-routing";
  const isData = routerDecision.id === "structured-data";
  const isSynthesis = routerDecision.id === "multi-turn-synthesis";

  const domainIcon = isDeterministic ? "⚡"
    : isUltra ? "👑"
    : isFinance ? "💰"
    : isMeta ? "🔍"
    : isData ? "🗃️"
    : isSynthesis ? "🧵"
    : "🌙";

  return (
    <div className="rei-router-badge-container">
      <div className="rei-pipeline-trace">
        <span className="rei-pipeline-step">Input Analysis</span>
        <span className="rei-pipeline-arrow">&rarr;</span>
        <span className="rei-pipeline-step">v4 Semantic Router</span>
        <span className="rei-pipeline-arrow">&rarr;</span>
        <span className="rei-pipeline-step rei-pipeline-step--active">{isDeterministic ? "Rule Engine" : "Guard Passed"}</span>
      </div>

      <div className="rei-router-badge" role="status" aria-label={`Routed via ${routerDecision.label} to ${routerDecision.model}`}>
        <span className="rei-router-badge__icon">{domainIcon}</span>

        {/* ── Hybrid collision badge ─────────────────────────────────── */}
        {isHybrid ? (
          <span className="rei-router-badge__label">
            <span style={{ opacity: 0.9 }}>{routerDecision.hybridPrimary?.label}</span>
            <span style={{ margin: "0 4px", color: "#94a3b8" }}>⟷</span>
            <span style={{ opacity: 0.7 }}>{routerDecision.hybridSecondary?.label}</span>
            <span style={{ marginLeft: 6, fontSize: "0.72em", color: "#94a3b8" }}>
              {routerDecision.hybridPrimary?.pct}%/{routerDecision.hybridSecondary?.pct}%
            </span>
          </span>
        ) : (
          <span className="rei-router-badge__label">{routerDecision.label}</span>
        )}

        {dimensionLabel && (
          <span className={`rei-router-badge__dimension rei-router-badge__dimension--${dimensionLabel.toLowerCase()}`}>
            {dimensionLabel}
          </span>
        )}

        <span className="rei-router-badge__model">{routerDecision.model}</span>

        {/* ── Token count with complexity heat color ─────────────────── */}
        <span className="rei-router-badge__cost" style={{ color: tokColor }}>
          {isDeterministic ? "$0 · 0 tok" : getCostBadgeLabel(routerDecision.model, totalTokens, usage)}
        </span>

        {!isDeterministic && savingsPct > 0 && (
          <span className="rei-router-badge__savings">−{savingsPct}% saved</span>
        )}

        {/* ── Ultra complexity crown ─────────────────────────────────── */}
        {isUltra && (
          <span
            title="Ultra complexity — frontier model engaged"
            style={{ marginLeft: 4, fontSize: "0.8em", color: "#c084fc", letterSpacing: 0 }}
          >
            ULTRA
          </span>
        )}
      </div>

      {/* ── Suspicion meter ───────────────────────────────────────────── */}
      {suspicionScore > 0.2 && (
        <div
          className="rei-router-badge__suspicion-bar"
          role="meter"
          aria-label={`Adversarial suspicion: ${Math.round(suspicionScore * 100)}%`}
          title={`Adversarial suspicion score: ${Math.round(suspicionScore * 100)}%`}
          style={{
            marginTop: 3,
            height: 3,
            borderRadius: 2,
            background: `linear-gradient(to right, #f87171 ${Math.round(suspicionScore * 100)}%, #1e293b ${Math.round(suspicionScore * 100)}%)`,
            opacity: 0.85,
          }}
        />
      )}
    </div>
  );
}
