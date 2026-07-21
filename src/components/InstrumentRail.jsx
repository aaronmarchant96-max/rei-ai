export default function InstrumentRail({
  sessionTokens,
  sessionMessages,
  sessionCost,
  savingsVsPremium,
  escalationCount,
  modelBreakdown,
  formatCost,
}) {
  const totalPremiumCost = sessionCost + savingsVsPremium;
  const savingsPercent = totalPremiumCost > 0
    ? Math.round((savingsVsPremium / totalPremiumCost) * 100)
    : 0;

  return (
    <aside className="rei-instrument-rail" aria-label="Session instrumentation">
      <div className="rei-instrument-rail__section rei-instrument-rail__section--hero">
        <div className="rei-instrument-rail__hero-label">Efficiency</div>
        <div className="rei-instrument-rail__hero-value">
          {savingsPercent}%
        </div>
      </div>

      <div className="rei-instrument-rail__section">
        <div className="rei-instrument-rail__row">
          <span>Saved</span>
          <span className="rei-instrument-rail__value rei-instrument-rail__value--success">
            ${savingsVsPremium.toFixed(4)}
          </span>
        </div>
        <div className="rei-instrument-rail__row">
          <span>Cost</span>
          <span className="rei-instrument-rail__value">
            {sessionCost < 0.0001 ? "< $0.0001" : `$${sessionCost.toFixed(4)}`}
          </span>
        </div>
        {escalationCount > 0 && (
          <div className="rei-instrument-rail__row">
            <span>Escalations</span>
            <span className="rei-instrument-rail__value rei-instrument-rail__value--accent">
              {escalationCount}
            </span>
          </div>
        )}
      </div>

      <div className="rei-instrument-rail__section">
        <div className="rei-instrument-rail__row">
          <span>Tokens</span>
          <span className="rei-instrument-rail__value">
            {sessionTokens.toLocaleString()}
          </span>
        </div>
        <div className="rei-instrument-rail__row">
          <span>Messages</span>
          <span className="rei-instrument-rail__value">{sessionMessages}</span>
        </div>
      </div>

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

      <div className="rei-instrument-rail__section rei-instrument-rail__section--muted">
        <div className="rei-instrument-rail__row">
          <span>Build</span>
          <span className="rei-instrument-rail__value">v2.0</span>
        </div>
        <div className="rei-instrument-rail__row">
          <span>Router</span>
          <span className="rei-instrument-rail__value">Night Shift</span>
        </div>
        <div className="rei-instrument-rail__row">
          <span>Gateway</span>
          <span className="rei-instrument-rail__value">CARDO GUARD</span>
        </div>
      </div>
    </aside>
  );
}
