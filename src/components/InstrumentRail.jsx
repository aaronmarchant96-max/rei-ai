import { useState } from "react";

export default function InstrumentRail({
  sessionTokens,
  sessionMessages,
  sessionCost,
  savingsVsPremium,
  escalationCount,
  modelBreakdown,
  lifetimeCost,
  lifetimeSavings,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const totalPremiumCost = sessionCost + savingsVsPremium;
  const savingsPercent = totalPremiumCost > 0
    ? Math.round((savingsVsPremium / totalPremiumCost) * 100)
    : 0;

  if (isCollapsed) {
    return (
      <aside className="rei-instrument-rail is-collapsed" aria-label="Session instrumentation">
        <button
          onClick={() => setIsCollapsed(false)}
          className="rei-instrument-rail__toggle-btn"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          ‹
        </button>
        <div className="rei-instrument-rail__collapsed-hero" title={`Efficiency: ${savingsPercent}%`}>
          <div className="rei-instrument-rail__collapsed-hero-value">
            EFFICIENCY: {totalPremiumCost > 0 ? `${savingsPercent}%` : "\u2014"}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="rei-instrument-rail" aria-label="Session instrumentation">
      <button
        onClick={() => setIsCollapsed(true)}
        className="rei-instrument-rail__toggle-btn"
        aria-label="Collapse sidebar"
        title="Collapse sidebar"
      >
        ›
      </button>

      {/* ── 2×2 Metric Grid ── */}
      <div className="rei-instrument-rail__grid">
        <div className="rei-instrument-rail__card rei-instrument-rail__card--hero">
          <div className="rei-instrument-rail__card-label">Efficiency</div>
          <div className="rei-instrument-rail__card-value">
            {totalPremiumCost > 0 ? `${savingsPercent}%` : "\u2014"}
          </div>
        </div>
        <div className="rei-instrument-rail__card">
          <div className="rei-instrument-rail__card-label">Session Cost</div>
          <div className="rei-instrument-rail__card-value">
            {sessionCost < 0.0001 ? "< $0.0001" : `$${sessionCost.toFixed(4)}`}
          </div>
        </div>
        <div className="rei-instrument-rail__card">
          <div className="rei-instrument-rail__card-label">Tokens</div>
          <div className="rei-instrument-rail__card-value">
            {sessionTokens.toLocaleString()}
          </div>
        </div>
        <div className="rei-instrument-rail__card">
          <div className="rei-instrument-rail__card-label">Messages</div>
          <div className="rei-instrument-rail__card-value">{sessionMessages}</div>
        </div>
      </div>

      {/* ── Savings + Escalations row ── */}
      <div className="rei-instrument-rail__section">
        <div className="rei-instrument-rail__row">
          <span>Saved</span>
          <span className="rei-instrument-rail__value rei-instrument-rail__value--success">
            ${savingsVsPremium.toFixed(4)}
          </span>
        </div>
        {lifetimeCost > 0 && (
          <div className="rei-instrument-rail__row">
            <span>Lifetime</span>
            <span className="rei-instrument-rail__value">
              ${lifetimeCost.toFixed(4)} / ${lifetimeSavings.toFixed(2)} saved
            </span>
          </div>
        )}
        {escalationCount > 0 && (
          <div className="rei-instrument-rail__row">
            <span>Escalations</span>
            <span className="rei-instrument-rail__value rei-instrument-rail__value--accent">
              {escalationCount}
            </span>
          </div>
        )}
      </div>

      {/* ── Model Breakdown ── */}
      <div className="rei-instrument-rail__section">
        <div className="rei-instrument-rail__label">Models</div>
        {Object.entries(modelBreakdown).map(([model, tokens]) => (
          <div key={model} className="rei-instrument-rail__row">
            <span title={model}>
              {model.length > 22 ? model.slice(0, 19) + "..." : model}
            </span>
            <span className="rei-instrument-rail__value">
              {tokens.toLocaleString()} tok
            </span>
          </div>
        ))}
      </div>

      {/* ── Build Info — pill badges ── */}
      <div className="rei-instrument-rail__section">
        <div className="rei-instrument-rail__label">Build</div>
        <div className="rei-instrument-rail__badges">
          <span className="rei-instrument-rail__badge">v3.0</span>
          <span className="rei-instrument-rail__badge">v3 Keyword</span>
          <span className="rei-instrument-rail__badge rei-instrument-rail__badge--accent">CARDO Guard</span>
        </div>
      </div>
    </aside>
  );
}
