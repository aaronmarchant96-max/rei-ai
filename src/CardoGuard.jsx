import { useEffect, useMemo, useState } from "react";
import {
  buildCardoGuardComparison,
  buildCardoGuardWhyThisVerdict,
  calculateCardoGuardReview,
  formatMoney,
  getScenarioById,
  CARDO_GUARD_SCENARIOS
} from "./lib/cardoGuard.js";

function getInitialDraft() {
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

function Metric({ label, value, note }) {
  return (
    <div className="mini-card cardo-guard__metric">
      <div className="card-label">{label}</div>
      <div className="cardo-guard__metric-value">{value}</div>
      {note ? <div className="muted">{note}</div> : null}
    </div>
  );
}

export default function CardoGuard() {
  const [draft, setDraft] = useState(getInitialDraft);
  const [submitted, setSubmitted] = useState(getInitialDraft);

  const selectedScenario = getScenarioById(draft.scenarioId);

  useEffect(() => {
    const scenario = getScenarioById(draft.scenarioId);
    setDraft((current) => ({
      ...current,
      confidence: scenario.defaultConfidence,
      costToAct: scenario.defaultCostToAct,
      costToMiss: scenario.defaultCostToMiss
    }));
    setSubmitted({
      scenarioId: scenario.id,
      confidence: scenario.defaultConfidence,
      costToAct: scenario.defaultCostToAct,
      costToMiss: scenario.defaultCostToMiss
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.scenarioId]);

  const review = useMemo(() => calculateCardoGuardReview(submitted), [submitted]);
  const comparison = useMemo(() => buildCardoGuardComparison(review), [review]);
  const whyThisVerdict = useMemo(() => buildCardoGuardWhyThisVerdict(review), [review]);

  const confidenceBandLabel =
    review.confidenceBand === "low" ? "cautious synthetic band" : `${review.confidenceBand} calibration band`;

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function runGuardCheck() {
    setSubmitted({
      scenarioId: draft.scenarioId,
      confidence: toNumber(draft.confidence),
      costToAct: toNumber(draft.costToAct),
      costToMiss: toNumber(draft.costToMiss)
    });
  }

  function resetToScenario() {
    const scenario = getScenarioById(draft.scenarioId);
    const nextDraft = {
      scenarioId: scenario.id,
      confidence: scenario.defaultConfidence,
      costToAct: scenario.defaultCostToAct,
      costToMiss: scenario.defaultCostToMiss
    };
    setDraft(nextDraft);
    setSubmitted(nextDraft);
  }

  return (
    <section className="cardo-guard panel-stack">
      <section className="panel cardo-guard__hero">
          <div className="panel__head">
            <div>
              <div className="card-label">PromptHound Labs</div>
              <div className="muted" style={{ fontSize: "0.85em", marginBottom: 4 }}>Structured outputs for messy input.</div>
              <div className="cardo-guard__tool-name">CARDO GUARD</div>
              <h2>Should we act on this AI risk score?</h2>
              <p className="lede">
                A synthetic decision checker that weighs the cost of acting against the cost of ignoring a risk score.
              </p>
            </div>
            <div className="cardo-guard__status">
              <span className="status-badge status-badge--cyan">Synthetic demo only</span>
              <span className="status-badge status-badge--muted">Not operational advice</span>
            </div>
          </div>

          <div className="cardo-guard__intro mini-card">
            <p><strong>AI confidence is not the decision.</strong> Cost-weighted consequence is the decision gate.</p>
          </div>
        </section>

      <div className="cardo-guard__layout">
        <section className="panel">
          <div className="panel__head">
            <div>
              <div className="card-label">Test the decision</div>
              <h2>Start with a synthetic scenario</h2>
            </div>
          </div>
          <div className="muted cardo-guard__panel-note">
            Use fake numbers to test the decision logic before trusting a model score.
          </div>

          <div className="mini-card cardo-guard__steps">
            <div className="card-label">Three steps</div>
            <ol className="cardo-guard__steps-list">
              <li>
                <strong>Start with the score.</strong> Example: 89 percent risk.
              </li>
              <li>
                <strong>Add the cost to act.</strong> Example: acting costs $17,000.
              </li>
              <li>
                <strong>Add the cost of missing it.</strong> Example: missing it could cost $1,465,000.
              </li>
            </ol>
          </div>

          <div className="control-group">
            <label className="control-label" htmlFor="cardo-scenario">
              Scenario
            </label>
            <select
              id="cardo-scenario"
              className="cardo-guard__select"
              value={draft.scenarioId}
              onChange={(event) => updateDraft("scenarioId", event.target.value)}
            >
              {CARDO_GUARD_SCENARIOS.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.label}
                </option>
              ))}
            </select>
            <div className="muted cardo-guard__hint">{selectedScenario.summary}</div>
          </div>

          <div className="control-group">
            <div className="control-label">Model confidence</div>
            <div className="cardo-guard__slider-row">
              <input
                type="range"
                min="55"
                max="97"
                step="1"
                value={draft.confidence}
                onChange={(event) => updateDraft("confidence", Number(event.target.value))}
                className="cardo-guard__range"
                aria-label="Model confidence"
              />
              <div className="cardo-guard__range-value">{Number(draft.confidence)}%</div>
            </div>
            <div className="muted">
              Synthetic calibration band for this demo. In a real deployment, this would come from model evaluation
              logs.
            </div>
          </div>

          <div className="mini-grid cardo-guard__costs">
            <div className="control-group">
              <label className="control-label" htmlFor="cardo-act">
                Cost to act
              </label>
              <input
                id="cardo-act"
                type="number"
                min="0"
                step="1000"
                value={draft.costToAct}
                onChange={(event) => updateDraft("costToAct", toNumber(event.target.value))}
                className="cardo-guard__input"
              />
            </div>

            <div className="control-group">
              <label className="control-label" htmlFor="cardo-miss">
                Cost of missing
              </label>
              <input
                id="cardo-miss"
                type="number"
                min="0"
                step="1000"
                value={draft.costToMiss}
                onChange={(event) => updateDraft("costToMiss", toNumber(event.target.value))}
                className="cardo-guard__input"
              />
            </div>
          </div>

          <div className="button-row cardo-guard__actions">
            <button type="button" className="pill pill--primary" onClick={runGuardCheck}>
              Run guard check
            </button>
            <button type="button" className="pill" onClick={resetToScenario}>
              Reset synthetic example
            </button>
          </div>

          <div className="cardo-guard__rules mini-card">
            <div className="card-label">Guardrails</div>
            <div className="muted">Synthetic demo. Costs and hinge stay visible. Not operational advice.</div>
          </div>
        </section>

        <section className="output-panel cardo-guard__report">
          <div className="output-panel__head">
            <div>
              <div className="card-label">Decision report</div>
              <h2 className="output-title">Act or do not act</h2>
            </div>
          </div>

          <p className="output-summary">
            The numbers show whether cost-weighted consequence clears the gate under these inputs.
          </p>

          <div className="output-anchor cardo-guard__decision">
            <div className="card-label">Recommendation</div>
            <div className="cardo-guard__decision-line">{review.recommendation}</div>
            <div className="muted">{review.explanation}</div>
          </div>

          <div className="mini-grid">
            <Metric label="Confidence" value={`${review.confidence}%`} note={confidenceBandLabel} />
            <Metric
              label="How often this score band is wrong"
              value={`${Math.round(review.falseAlarmRate * 100)}%`}
              note="Synthetic band"
            />
            <Metric
              label="Adjusted chance this risk is real"
              value={`${Math.round(review.calibratedEventLikelihood * 100)}%`}
              note="100% - false alarm rate"
            />
            <Metric
              label="Expected wasted cost if we act"
              value={formatMoney(review.expectedActionWaste)}
            />
            <Metric
              label="Risk-adjusted cost of ignoring it"
              value={formatMoney(review.expectedMissLoss)}
            />
          </div>

          <div className="cardo-guard__hinge mini-card">
            <div className="card-label">The decision hinge</div>
            <div>
              {review.shouldAct
                ? `Risk-adjusted miss loss ${formatMoney(review.expectedMissLoss)} is higher than expected action waste ${formatMoney(review.expectedActionWaste)}.`
                : `Expected action waste ${formatMoney(review.expectedActionWaste)} is higher than risk-adjusted miss loss ${formatMoney(review.expectedMissLoss)}.`}
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              {review.decisionStrength} decision ({review.decisionMarginRatio.toFixed(1)}× margin)
            </div>
          </div>

          <div className="mini-card">
            <div className="card-label">How the gate is checked</div>
            <div className="stacked-list cardo-guard__plain-check">
              <span>If the model is wrong: acting may waste money.</span>
              <span>If the risk is real: ignoring it may cost more.</span>
              <span>CARDO GUARD compares those two numbers before turning a score into a decision.</span>
            </div>
            <div className="cardo-guard__math">
              <div>Action waste = cost to act × false alarm rate</div>
              <div>Miss loss = cost of missing × adjusted chance the risk is real</div>
            </div>
          </div>

          <div className="mini-card">
            <div className="card-label">Why this verdict?</div>
            <div className="cardo-guard__why-list">
              {whyThisVerdict.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          </div>

          <div className="mini-grid">
            <div className="mini-card">
              <div className="card-label">Scenario</div>
              <div>{review.scenario.label}</div>
              <div className="muted">{review.scenario.summary}</div>
            </div>
            <div className="mini-card">
              <div className="card-label">Checks</div>
              <div className="stacked-list">
                <span>Synthetic inputs only</span>
                <span>Decision tradeoff visible</span>
                <span>No claim of model accuracy gain</span>
              </div>
            </div>
            <div className="mini-card">
              <div className="card-label">What this is useful for</div>
              <ul className="cardo-guard__list">
                <li>Checking whether a model score justifies action.</li>
                <li>Explaining why a decision did or did not clear the gate.</li>
                <li>Separating confidence from business impact.</li>
                <li>Keeping synthetic assumptions visible.</li>
              </ul>
            </div>
          </div>

          <div className="mini-card">
            <div className="card-label">What would change the verdict</div>
            <ul className="cardo-guard__list">
              {review.breakevenMissCost > 0 && (
                <li>
                  {review.shouldAct
                    ? `The cost of missing would need to drop below ${formatMoney(review.breakevenMissCost)} for the recommendation to flip.`
                    : `The cost of missing would need to rise above ${formatMoney(review.breakevenMissCost)} for the recommendation to flip.`}
                </li>
              )}
              <li>
                If the false alarm rate for this confidence band was {review.shouldAct ? "higher" : "lower"} than assumed, the decision could reverse.
              </li>

              {comparison.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="mini-card">
            <div className="card-label">What this is not</div>
            <div className="muted">Not a prediction model or expert replacement. Synthetic demo only.</div>
          </div>
        </section>
      </div>
    </section>
  );
}
