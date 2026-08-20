import { useState } from "react";

export default function InstrumentRail({
  sessionTokens,
  sessionMessages,
  sessionCost,
  sessionChunks,
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
          &#8249;
        </button>
        <div className="rei-instrument-rail__collapsed-hero" title={`Rate Advantage: ${savingsPercent}%`}>
          <div className="rei-instrument-rail__collapsed-hero-value">
            EFFICIENCY: {totalPremiumCost > 0 ? `${savingsPercent}%` : "\u2014"}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="rei-instrument-rail" aria-label="Session instrumentation">
      <div className="rei-instrument-rail__header">
        <span className="rei-instrument-rail__title">Live Telemetry</span>
        <button
          onClick={() => setIsCollapsed(true)}
          className="rei-instrument-rail__toggle-btn"
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          &#8250;
        </button>
      </div>

      <div className="rei-side-card">
        <div className="rei-side-card__heading">This Session</div>
        {sessionCost === 0 && sessionTokens === 0 && sessionMessages === 0 ? (
          <div className="rei-side-empty" style={{ border: "none", padding: "8px 0" }}>
            Routing will select the cheapest capable model for each query.
            Typical savings vs. calling GPT-4o directly: ~90%+ (ceiling-based).
            Numbers appear here after your first response.
          </div>
        ) : (
          <>
            <div className="rei-side-stat">
              <span className="rei-side-stat__label">Cost</span>
              <span className={`rei-side-stat__value mono${sessionCost === 0 ? " zero" : ""}`}>
                {sessionCost === 0 ? "\u2014" : sessionCost < 0.0001 ? "< $0.0001" : `$${sessionCost.toFixed(4)}`}
              </span>
            </div>
            <div className="rei-side-stat">
              <span className="rei-side-stat__label">Tokens</span>
              <span className={`rei-side-stat__value mono${sessionTokens === 0 ? " zero" : ""}`}>
                {sessionTokens === 0 ? "\u2014" : sessionTokens.toLocaleString()}
              </span>
            </div>
            <div className="rei-side-stat">
              <span className="rei-side-stat__label">Messages</span>
              <span className={`rei-side-stat__value mono${sessionMessages === 0 ? " zero" : ""}`}>
                {sessionMessages === 0 ? "\u2014" : sessionMessages}
              </span>
            </div>
            {sessionChunks > sessionMessages && (
              <div className="rei-side-stat">
                <span className="rei-side-stat__label" title="Some responses needed more than one inference chunk to finish (continuation).">
                  Inference chunks
                </span>
                <span className="rei-side-stat__value mono">
                  {sessionChunks}
                </span>
              </div>
            )}
            <div className="rei-side-stat">
              <span className="rei-side-stat__label">Saved vs. premium</span>
              <span className="rei-side-stat__value verified mono">
                ${savingsVsPremium.toFixed(4)}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="rei-side-card">
        <div className="rei-side-card__heading">Models</div>
        {Object.keys(modelBreakdown).length === 0 ? (
          <div className="rei-side-empty">
            No model calls yet.<br/>Routing shows up here after your first message.
          </div>
        ) : (
          Object.entries(modelBreakdown).map(([model, tokens]) => (
            <div key={model} className="rei-side-stat">
              <span title={model} className="rei-side-stat__label">
                {model.length > 22 ? model.slice(0, 19) + "..." : model}
              </span>
              <span className="rei-side-stat__value mono">
                {tokens.toLocaleString()} tok
              </span>
            </div>
          ))
        )}
      </div>

      {lifetimeCost > 0 && (
        <div className="rei-side-card">
          <div className="rei-side-card__heading">Lifetime</div>
          <div className="rei-side-stat">
            <span className="rei-side-stat__label">Total cost</span>
            <span className="rei-side-stat__value mono">${lifetimeCost.toFixed(4)}</span>
          </div>
          <div className="rei-side-stat">
            <span className="rei-side-stat__label">Total saved</span>
            <span className="rei-side-stat__value verified mono">${lifetimeSavings.toFixed(2)}</span>
          </div>
          {escalationCount > 0 && (
            <div className="rei-side-stat">
              <span className="rei-side-stat__label">Escalations</span>
              <span className="rei-side-stat__value mono">{escalationCount}</span>
            </div>
          )}
        </div>
      )}

      <div className="rei-side-card">
        <div className="rei-side-card__heading">Build</div>
        <div className="rei-side-chips">
          <span className="rei-side-chip">CARDO v3.4</span>
          <span className="rei-side-chip">v3 Keyword</span>
          <span className="rei-side-chip">CARDO Guard</span>
        </div>
      </div>

      <a href="/#analytics" className="rei-side-dash-link">
        Full dashboard <span className="rei-side-dash-link__arrow">&rarr;</span>
      </a>
    </aside>
  );
}
