export default function InstrumentRail({
  sessionTokens,
  sessionMessages,
  sessionCost,
  savingsVsPremium,
  escalationCount,
  modelBreakdown,
  formatCost,
}) {
  const savingsPercent = sessionCost > 0
    ? Math.round((savingsVsPremium / (sessionCost + savingsVsPremium)) * 100)
    : 0;

  return (
    <aside className="rei-instrument-rail" aria-label="Session instrumentation">
      <div className="rei-instrument-rail__section">
        <div className="rei-instrument-rail__label">Session</div>
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
        <div className="rei-instrument-rail__row">
          <span>Est. Cost</span>
          <span className="rei-instrument-rail__value">
            {sessionCost < 0.0001 ? "< $0.0001" : `$${sessionCost.toFixed(4)}`}
          </span>
        </div>
      </div>

      <div className="rei-instrument-rail__section">
        <div className="rei-instrument-rail__label">Savings vs Premium</div>
        <div className="rei-instrument-rail__row">
          <span>Saved</span>
          <span className="rei-instrument-rail__value rei-instrument-rail__value--success">
            ${savingsVsPremium.toFixed(4)}
          </span>
        </div>
        <div className="rei-instrument-rail__row">
          <span>Efficiency</span>
          <span className="rei-instrument-rail__value rei-instrument-rail__value--success">
            {savingsPercent}%
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
        <div className="rei-instrument-rail__label">Model Breakdown</div>
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

      <div className="rei-instrument-rail__section">
        <div className="rei-instrument-rail__label">REI.ai</div>
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
