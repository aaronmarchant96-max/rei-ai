import { useEffect, useMemo, useState } from "react";
import {
  calculateCardoGuardReview,
  formatMoney,
  getScenarioById,
  CARDO_GUARD_SCENARIOS
} from "./lib/cardoGuard.js";

function getInitialState() {
  const scenario = CARDO_GUARD_SCENARIOS[0];
  return {
    scenarioId: scenario.id,
    confidence: scenario.defaultConfidence,
    costToAct: scenario.defaultCostToAct,
    costToMiss: scenario.defaultCostToMiss
  };
}

function toNumber(value) {
  const next = Number.parseFloat(value);
  return Number.isFinite(next) ? next : 0;
}

export default function HingeMeter() {
  const [inputs, setInputs] = useState(getInitialState);
  const [pulse, setPulse] = useState(false);
  const [hoveredElement, setHoveredElement] = useState(null);

  const selectedScenario = getScenarioById(inputs.scenarioId);

  // Sync inputs if scenario changes
  useEffect(() => {
    const scenario = getScenarioById(inputs.scenarioId);
    setInputs({
      scenarioId: scenario.id,
      confidence: scenario.defaultConfidence,
      costToAct: scenario.defaultCostToAct,
      costToMiss: scenario.defaultCostToMiss
    });
  }, [inputs.scenarioId]);

  const review = useMemo(() => calculateCardoGuardReview(inputs), [inputs]);

  // Pulse when recommendation changes
  const currentRecommendation = review.recommendation;
  useEffect(() => {
    setPulse(true);
    const timer = setTimeout(() => setPulse(false), 600);
    return () => clearTimeout(timer);
  }, [currentRecommendation]);

  function updateInput(field, value) {
    setInputs((curr) => ({ ...curr, [field]: value }));
  }

  function resetToDefault() {
    const scenario = getScenarioById(inputs.scenarioId);
    setInputs({
      scenarioId: scenario.id,
      confidence: scenario.defaultConfidence,
      costToAct: scenario.defaultCostToAct,
      costToMiss: scenario.defaultCostToMiss
    });
  }

  // Calculate needle rotation angle based on ratio of forces
  // Range is -45 degrees (DO NOT ACT) to +45 degrees (ACT)
  const angle = useMemo(() => {
    const waste = review.expectedActionWaste;
    const loss = review.expectedMissLoss;
    if (waste === 0 && loss === 0) return 0;
    
    // Logarithmic scale for better visual balance across huge dollar spreads
    const ratio = Math.log10(loss + 1) / (Math.log10(waste + 1) || 1);
    const diff = loss - waste;
    
    if (diff === 0) return 0;
    
    // Smooth angle interpolation
    const maxAngle = 45;
    const factor = diff > 0 ? (ratio - 1) / (ratio + 1 || 1) : (1 / ratio - 1) / (1 / ratio + 1 || 1);
    const clamped = Math.max(-1, Math.min(1, factor * 2));
    return clamped * maxAngle;
  }, [review]);

  // Normalize heights for left/right weights relative to a maximum value
  const maxVisualCost = Math.max(review.expectedActionWaste, review.expectedMissLoss, 10000);
  const leftBarHeight = (review.expectedActionWaste / maxVisualCost) * 140;
  const rightBarHeight = (review.expectedMissLoss / maxVisualCost) * 140;

  return (
    <section className="cardo-guard panel-stack hinge-meter-page">
      <section className="panel cardo-guard__hero">
        <div className="panel__head">
          <div>
            <div className="card-label">PromptHound Labs</div>
            <div className="muted" style={{ fontSize: "0.85em", marginBottom: 4 }}>CARDO REI Decision Visualization</div>
            <div className="cardo-guard__tool-name">Hinge Meter</div>
            <h2>Visualize the Cost-Weighted Hinge</h2>
            <p className="lede">
              Weighing the force of expected waste against the force of risk-adjusted miss cost.
            </p>
          </div>
          <div className="cardo-guard__status">
            <span className="status-badge status-badge--violet">Interactive Hinge</span>
            <span className="status-badge status-badge--muted">Synthetic Metric Calibration</span>
          </div>
        </div>
      </section>

      <div className="cardo-guard__layout">
        {/* Controls Column */}
        <section className="panel">
          <div className="panel__head">
            <div>
              <div className="card-label">Decision Inputs</div>
              <h2>Adjust Scenario Metrics</h2>
            </div>
          </div>

          <div className="control-group">
            <label className="control-label" htmlFor="hinge-scenario">
              Scenario
            </label>
            <select
              id="hinge-scenario"
              className="cardo-guard__select"
              value={inputs.scenarioId}
              onChange={(e) => updateInput("scenarioId", e.target.value)}
            >
              {CARDO_GUARD_SCENARIOS.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.label}
                </option>
              ))}
            </select>
            <div className="muted cardo-guard__hint">{selectedScenario.summary}</div>
          </div>

          <div className="control-group">
            <div className="control-label">Model Confidence</div>
            <div className="cardo-guard__slider-row">
              <input
                type="range"
                min="55"
                max="97"
                step="1"
                value={inputs.confidence}
                onChange={(e) => updateInput("confidence", toNumber(e.target.value))}
                className="cardo-guard__range"
                aria-label="Model confidence"
              />
              <div className="cardo-guard__range-value">{inputs.confidence}%</div>
            </div>
            <div className="muted">
              Synthetic calibration: false alarm rate is {Math.round(review.falseAlarmRate * 100)}%.
            </div>
          </div>

          <div className="mini-grid cardo-guard__costs">
            <div className="control-group">
              <label className="control-label" htmlFor="hinge-act">
                Cost to Act
                <span className="mobile-label-hint">$</span>
              </label>
              <input
                id="hinge-act"
                type="number"
                inputMode="decimal"
                min="0"
                step="1000"
                value={inputs.costToAct}
                onChange={(e) => updateInput("costToAct", toNumber(e.target.value))}
                className="cardo-guard__input"
              />
            </div>

            <div className="control-group">
              <label className="control-label" htmlFor="hinge-miss">
                Cost of Miss
                <span className="mobile-label-hint">$</span>
              </label>
              <input
                id="hinge-miss"
                type="number"
                inputMode="decimal"
                min="0"
                step="1000"
                value={inputs.costToMiss}
                onChange={(e) => updateInput("costToMiss", toNumber(e.target.value))}
                className="cardo-guard__input"
              />
            </div>
          </div>

          <div className="button-row cardo-guard__actions">
            <button type="button" className="pill pill--primary" onClick={resetToDefault}>
              Reset to Defaults
            </button>
          </div>
        </section>

        {/* Hinge Meter & Decision Output Column */}
        <section className="output-panel cardo-guard__report">
          <div className="output-panel__head">
            <div>
              <div className="card-label">Hinge Analysis</div>
              <h2 className="output-title">Balance Visualization</h2>
            </div>
          </div>

          {/* Interactive Hinge Meter SVG */}
          <div className="panel hinge-visualization-container" style={{ background: "#0c0d16", borderRadius: "8px", border: "1px solid #1e2235", padding: "16px", marginBottom: "20px", display: "flex", justifyContent: "center" }}>
            <svg
              viewBox="0 0 600 300"
              width="100%"
              style={{ maxHeight: "300px" }}
              aria-label="Interactive Hinge Meter force diagram"
            >
              <defs>
                <linearGradient id="gradient-left" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#1e2235" />
                  <stop offset="100%" stopColor="#c85858" />
                </linearGradient>
                <linearGradient id="gradient-right" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#1e2235" />
                  <stop offset="100%" stopColor="#5b8dd9" />
                </linearGradient>
                <linearGradient id="needle-gradient" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor={review.shouldAct ? "#5b8dd9" : "#c85858"} />
                </linearGradient>
                <radialGradient id="pivot-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={review.shouldAct ? "#5b8dd9" : "#c85858"} stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0c0d16" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* IMMOVABLE HINGE AXIS */}
              <line x1="300" y1="20" x2="300" y2="240" stroke="#1e2235" strokeWidth="2" strokeDasharray="4 4" />

              {/* UNCERTAINTY ZONE */}
              <rect
                x="200"
                y="195"
                width="200"
                height="10"
                rx="5"
                fill="rgba(255,255,255,0.06)"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1"
              />
              <rect
                x="270"
                y="195"
                width="60"
                height="10"
                rx="5"
                fill="rgba(184,148,58,0.25)"
                title="Uncertainty Zone"
                onMouseEnter={() => setHoveredElement("uncertainty")}
                onMouseLeave={() => setHoveredElement(null)}
                style={{ cursor: "help" }}
              />

              {/* SIDE LABELS */}
              <text x="70" y="40" fill="#c85858" fontSize="12" fontWeight="bold" opacity="0.8">DO NOT ACT</text>
              <text x="470" y="40" fill="#5b8dd9" fontSize="12" fontWeight="bold" opacity="0.8">ACT</text>

              {/* LEFT WEIGHT (Expected Action Waste) */}
              <rect
                x="120"
                y={200 - leftBarHeight}
                width="60"
                height={Math.max(2, leftBarHeight)}
                fill="url(#gradient-left)"
                rx="3"
                onMouseEnter={() => setHoveredElement("leftWeight")}
                onMouseLeave={() => setHoveredElement(null)}
                style={{ transition: "all 0.3s ease", cursor: "help" }}
              />
              <text x="150" y="225" fill="#7a8098" fontSize="11" textAnchor="middle">Action Waste</text>
              <text x="150" y="242" fill="#c85858" fontSize="12" fontWeight="bold" textAnchor="middle">
                {formatMoney(review.expectedActionWaste)}
              </text>

              {/* RIGHT WEIGHT (Risk-Adjusted Miss Loss) */}
              <rect
                x="420"
                y={200 - rightBarHeight}
                width="60"
                height={Math.max(2, rightBarHeight)}
                fill="url(#gradient-right)"
                rx="3"
                onMouseEnter={() => setHoveredElement("rightWeight")}
                onMouseLeave={() => setHoveredElement(null)}
                style={{ transition: "all 0.3s ease", cursor: "help" }}
              />
              <text x="450" y="225" fill="#7a8098" fontSize="11" textAnchor="middle">Miss Loss</text>
              <text x="450" y="242" fill="#5b8dd9" fontSize="12" fontWeight="bold" textAnchor="middle">
                {formatMoney(review.expectedMissLoss)}
              </text>

              {/* NEEDLE / SWINGING BEAM */}
              <g transform={`rotate(${angle}, 300, 200)`} style={{ transition: "transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)" }}>
                {/* Pointer */}
                <line x1="300" y1="200" x2="300" y2="60" stroke="url(#needle-gradient)" strokeWidth="4" strokeLinecap="round" />
                <polygon points="296,65 300,50 304,65" fill={review.shouldAct ? "#5b8dd9" : "#c85858"} />
              </g>

              {/* HINGE PIVOT (Interactive Center) */}
              {pulse && <circle cx="300" cy="200" r="30" fill="url(#pivot-glow)" className="pulse-animation" />}
              <circle
                cx="300"
                cy="200"
                r="12"
                fill="#0f0f1a"
                stroke={review.shouldAct ? "#5b8dd9" : "#c85858"}
                strokeWidth="4"
                style={{ transition: "stroke 0.4s ease" }}
              />
              <circle cx="300" cy="200" r="4" fill="#ffffff" />
            </svg>
          </div>

          {/* Context Tooltip area */}
          <div className="mini-card info-box" style={{ minHeight: "60px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "center", borderColor: "#1e2235", background: "rgba(255,255,255,0.02)" }}>
            <span style={{ fontSize: "0.9em", textAlign: "center", color: "#d8dce8" }}>
              {hoveredElement === "leftWeight" && "Expected Action Waste: Loss of acting if the threat is false alarm."}
              {hoveredElement === "rightWeight" && "Expected Miss Loss: Risk-adjusted damage of ignoring a real threat."}
              {hoveredElement === "uncertainty" && "Uncertainty zone: Represents confidence bounds where the decision could flip."}
              {!hoveredElement && "Hover over elements in the diagram to inspect details."}
            </span>
          </div>

          {/* Decision recommendation bar */}
          <div className="output-anchor cardo-guard__decision">
            <div className="card-label">Recommendation</div>
            <div className={`cardo-guard__decision-line ${review.shouldAct ? 'act' : 'dont-act'}`}>
              {review.recommendation}
            </div>
            <div className="muted">{review.explanation}</div>
          </div>

          {/* Key Stats */}
          <div className="mini-grid" style={{ marginBottom: "20px" }}>
            <div className="mini-card">
              <div className="card-label">Decision strength</div>
              <div style={{ fontSize: "1.25em", fontWeight: "bold" }}>{review.decisionStrength}</div>
              <div className="muted">{review.decisionMarginRatio.toFixed(1)}× margin</div>
            </div>
            <div className="mini-card">
              <div className="card-label">Breakeven miss cost</div>
              <div style={{ fontSize: "1.25em", fontWeight: "bold" }}>{formatMoney(review.breakevenMissCost)}</div>
              <div className="muted">Threshold to flip verdict</div>
            </div>
          </div>

          {/* Detailed analysis summary card */}
          <div className="cardo-guard__hinge mini-card">
            <div className="card-label">The decision hinge</div>
            <div>
              {review.shouldAct
                ? `Risk-adjusted miss loss (${formatMoney(review.expectedMissLoss)}) outweighs expected action waste (${formatMoney(review.expectedActionWaste)}).`
                : `Expected action waste (${formatMoney(review.expectedActionWaste)}) outweighs risk-adjusted miss loss (${formatMoney(review.expectedMissLoss)}).`}
            </div>
            <div className="muted" style={{ marginTop: 8 }}>
              {review.breakevenMissCost > 0 && (
                review.shouldAct
                  ? `The cost of missing must fall below ${formatMoney(review.breakevenMissCost)} to flip the decision to DO NOT ACT.`
                  : `The cost of missing must rise above ${formatMoney(review.breakevenMissCost)} to flip the decision to ACT.`
              )}
            </div>
          </div>

        </section>
      </div>
    </section>
  );
}
