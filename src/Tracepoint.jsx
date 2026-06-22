import { useEffect, useMemo, useState } from "react";
import {
  buildTracepointRows,
  buildTracepointReviewPacket,
  calculateTracepointDecision,
  calculateTracepointReview,
  formatTracepointMoney,
  formatTracepointPercent,
  formatTracepointTimestamp,
  getTracepointDecisionInputsFromScore,
  getTracepointDecisionReadout,
  getTracepointScenarioById,
  TRACEPOINT_REVIEW_MARKS,
  TRACEPOINT_SCENARIOS
} from "./lib/tracepoint.js";

const STORAGE_KEY = "prompthound.tracepoint.reviewer";

const DEFAULT_COSTS = {
  inspectionCost: 91900,
  missCost: 163900
};

function safeReadState() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function safeWriteState(value) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function downloadJsonFile(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function buildSparklinePath(values, width = 260, height = 96) {
  if (!values.length) {
    return { path: "", area: "", min: 0, max: 0, latest: 0 };
  }

  const paddingX = 10;
  const paddingY = 10;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((value, index) => {
    const x = paddingX + (index / (values.length - 1 || 1)) * (width - paddingX * 2);
    const y = height - paddingY - ((value - min) / range) * (height - paddingY * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const path = `M ${points.join(" L ")}`;
  const firstPoint = points[0].split(",");
  const lastPoint = points[points.length - 1].split(",");
  const area = `${path} L ${Number(lastPoint[0]).toFixed(2)},${(height - paddingY).toFixed(2)} L ${Number(firstPoint[0]).toFixed(2)},${(height - paddingY).toFixed(2)} Z`;

  return {
    path,
    area,
    min,
    max,
    latest: values[values.length - 1]
  };
}

function formatMetric(value, label) {
  if (label === "pressure") return `${value.toFixed(2)} psi`;
  if (label === "flow") return `${value.toFixed(2)} gpm`;
  if (label === "temp") return `${value.toFixed(2)} °C`;
  if (label === "vibration") return `${value.toFixed(3)} mm/s`;
  if (label === "rpm") return `${Math.round(value)} rpm`;
  if (label === "current") return `${value.toFixed(2)} A`;
  return String(value);
}

function formatRobustZ(value) {
  if (value >= 10) return "10+";
  return value.toFixed(2);
}

function formatScenarioVersion(scenarioId) {
  if (scenarioId === "pump-station-p-204") {
    return "bearing-wear-v1";
  }
  if (scenarioId === "compressor-c-118") {
    return "seal-ripple-v1";
  }
  return "synthetic-review-v1";
}

function ChartCard({ title, values, unitKey, tone, note }) {
  const spark = useMemo(() => buildSparklinePath(values), [values]);
  const minLabel = formatMetric(spark.min, unitKey);
  const maxLabel = formatMetric(spark.max, unitKey);
  const latestLabel = formatMetric(spark.latest, unitKey);

  return (
    <article className={`panel tracepoint-chart tracepoint-chart--${tone}`}>
      <div className="tracepoint-chart__head">
        <div>
          <div className="card-label">{title}</div>
          <div className="tracepoint-chart__value">{latestLabel}</div>
        </div>
        <div className="tracepoint-chart__meta">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      </div>
      <svg viewBox="0 0 260 96" className="tracepoint-chart__svg" aria-hidden="true">
        <defs>
          <linearGradient id={`tracepoint-${tone}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--tracepoint-accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--tracepoint-accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <line x1="10" y1="18" x2="250" y2="18" className="tracepoint-chart__gridline" />
        <line x1="10" y1="48" x2="250" y2="48" className="tracepoint-chart__gridline" />
        <line x1="10" y1="78" x2="250" y2="78" className="tracepoint-chart__gridline" />
        {spark.area ? <path d={spark.area} className="tracepoint-chart__area" fill={`url(#tracepoint-${tone}-fill)`} /> : null}
        {spark.path ? <path d={spark.path} className="tracepoint-chart__line" /> : null}
      </svg>
      {note ? <div className="tracepoint-chart__note">{note}</div> : null}
    </article>
  );
}

function ReviewMarkButton({ active, children, ...props }) {
  return (
    <button type="button" className={active ? "pill tracepoint-pill is-active" : "pill tracepoint-pill"} {...props}>
      {children}
    </button>
  );
}

export default function Tracepoint() {
  const [scenarioId, setScenarioId] = useState(TRACEPOINT_SCENARIOS[0].id);
  const scenario = getTracepointScenarioById(scenarioId);
  const rows = useMemo(() => buildTracepointRows(scenario.id), [scenario.id]);
  const review = useMemo(() => calculateTracepointReview(rows), [rows]);
  const decisionDefaults = useMemo(
    () => getTracepointDecisionInputsFromScore(review.combinedScore),
    [review.combinedScore]
  );

  const [reviewerMark, setReviewerMark] = useState("unmarked");
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [inspectionCost, setInspectionCost] = useState(DEFAULT_COSTS.inspectionCost);
  const [missCost, setMissCost] = useState(DEFAULT_COSTS.missCost);
  const [calibratedProbability, setCalibratedProbability] = useState(decisionDefaults.calibratedProbability);
  const [harmReduction, setHarmReduction] = useState(decisionDefaults.harmReduction);
  const [savedStateLoaded, setSavedStateLoaded] = useState(false);

  useEffect(() => {
    const saved = safeReadState();
    const entry = saved[scenario.id];
    if (entry) {
      setReviewerMark(entry.reviewerMark || "unmarked");
      setReviewerNotes(entry.reviewerNotes || "");
      setInspectionCost(Number(entry.inspectionCost) || DEFAULT_COSTS.inspectionCost);
      setMissCost(Number(entry.missCost) || DEFAULT_COSTS.missCost);
      setCalibratedProbability(Number(entry.calibratedProbability) || decisionDefaults.calibratedProbability);
      setHarmReduction(Number(entry.harmReduction) || decisionDefaults.harmReduction);
    } else {
      setCalibratedProbability(decisionDefaults.calibratedProbability);
      setHarmReduction(decisionDefaults.harmReduction);
    }
    setSavedStateLoaded(true);
  }, [decisionDefaults.calibratedProbability, decisionDefaults.harmReduction, scenario.id]);

  useEffect(() => {
    if (!savedStateLoaded) return;

    const next = {
      ...safeReadState(),
      [scenario.id]: {
        reviewerMark,
        reviewerNotes,
        inspectionCost,
        missCost,
        calibratedProbability,
        harmReduction
      }
    };

    safeWriteState(next);
  }, [calibratedProbability, harmReduction, inspectionCost, missCost, reviewerMark, reviewerNotes, savedStateLoaded, scenario.id]);

  const decision = useMemo(
    () =>
      calculateTracepointDecision({
        inspectionCost,
        missCost,
        calibratedProbability,
        detectionRate: decisionDefaults.detectionRate,
        followThroughRate: decisionDefaults.followThroughRate,
        harmReduction
      }),
    [calibratedProbability, decisionDefaults.detectionRate, decisionDefaults.followThroughRate, harmReduction, inspectionCost, missCost]
  );

  const currentRow = rows[rows.length - 1];
  const scenarioIndex = TRACEPOINT_SCENARIOS.findIndex((item) => item.id === scenario.id);
  const sensorByKey = review.sensorMap || {};
  const vibrationEvidence = sensorByKey.vibration_rms;
  const temperatureEvidence = sensorByKey.bearing_temperature;
  const pressureEvidence = sensorByKey.pressure;
  const flowEvidence = sensorByKey.flow_rate;
  const provenanceVersion = formatScenarioVersion(scenario.id);
  const statusTone = {
    Normal: "muted",
    Watch: "amber",
    "Review Recommended": "red"
  }[review.status];
  const driverLabel = {
    vibration_rms: "vibration deviation",
    bearing_temperature: "bearing temperature trend",
    pressure: "pressure variability",
    flow_rate: "flow rate drift"
  }[review.mainDriver];
  const scoreFill = Math.max(0, Math.min(100, review.combinedScore));
  const limitationStatement =
    "Synthetic calibration demo only. Not operational advice, not a forecasting system, and not a replacement for inspection, maintenance procedures, or safety controls.";
  const decisionReadout = getTracepointDecisionReadout(review, decision);
  const reviewExplainer =
    review.status === "Review Recommended"
      ? `Review recommended. Vibration is ${vibrationEvidence ? vibrationEvidence.driftPercent : 0}% above its baseline median after EWMA smoothing. Bearing temperature is ${temperatureEvidence ? temperatureEvidence.driftPercent : 0}% above baseline and has stayed elevated for ${temperatureEvidence ? temperatureEvidence.persistenceCount : 0} readings. Pressure and flow are moving in the expected direction with ${Math.round((review.concordance || 0) * 100)}% sensor agreement.`
      : review.status === "Watch"
        ? `Watch. The signal is moving away from baseline, but it has not crossed the review threshold yet.`
        : `Normal. The combined signal stays within the conservative threshold band used for this synthetic demo.`;
  const evaluationSummary = review.summary;

  function handleMark(mark) {
    setReviewerMark(mark);
  }

  function exportPacket() {
    const packet = buildTracepointReviewPacket({
      scenario,
      review,
      decision,
      reviewerMark,
      reviewerNotes,
      exportTimestamp: new Date().toISOString()
    });

    downloadJsonFile("tracepoint-p-204-review-packet.json", packet);
  }

  return (
    <section className="tracepoint">
      <header className="panel tracepoint__hero">
        <div className="tracepoint__hero-copy">
          <div className="eyebrow">PromptHound Labs</div>
          <div className="tracepoint__brand">Tracepoint</div>
          <h1>Industrial signal review for costly decisions.</h1>
          <p className="lead">Find the signal. Show the evidence. Keep the decision human.</p>
          <div className="tracepoint__disclaimer">
            <strong>Synthetic calibration demo only.</strong> Not operational advice, not a forecasting system, and
            not a replacement for inspection, maintenance procedures, or safety controls.
          </div>
        </div>

        <div className="tracepoint__hero-side">
          <div className="tracepoint__status-badges">
            <span className={`status-badge status-badge--${statusTone}`}>{review.status}</span>
            <span className="status-badge status-badge--muted">Human review required</span>
            <span className="status-badge status-badge--muted">{scenario.assetId}</span>
          </div>

          <div className="control-group">
            <label className="control-label" htmlFor="tracepoint-scenario">
              Scenario
            </label>
            <select
              id="tracepoint-scenario"
              className="tracepoint__select"
              value={scenario.id}
              onChange={(event) => setScenarioId(event.target.value)}
            >
              {TRACEPOINT_SCENARIOS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <div className="muted tracepoint__scenario-note">
              Scenario {scenarioIndex + 1} of {TRACEPOINT_SCENARIOS.length}. {scenario.subtitle}
            </div>
          </div>
        </div>
      </header>

      <section className="tracepoint__cards">
        <article className="panel tracepoint-card">
          <div className="card-label">Current review status</div>
          <div className="tracepoint-card__value">{review.status}</div>
          <div className="tracepoint-card__note">The score prepares a review. A reviewer decides whether action is justified.</div>
        </article>
        <article className="panel tracepoint-card">
          <div className="card-label">Combined signal score</div>
          <div className="tracepoint-card__value">{review.combinedScore.toFixed(1)}</div>
          <div className="tracepoint-scorebar" aria-hidden="true">
            <span
              className={`tracepoint-scorebar__fill tracepoint-scorebar__fill--${statusTone}`}
              style={{ width: `${scoreFill}%` }}
            />
          </div>
          <div className="tracepoint-card__note">Thresholds: Normal below 34, Watch below 67, Review Recommended at 67+.</div>
        </article>
        <article className="panel tracepoint-card">
          <div className="card-label">Main driver of the flag</div>
          <div className="tracepoint-card__value">{driverLabel}</div>
          <div className="tracepoint-card__note">Highest component score in the current synthetic window.</div>
        </article>
        <article className="panel tracepoint-card">
          <div className="card-label">Current operating state</div>
          <div className="tracepoint-card__value">{currentRow.operating_state}</div>
          <div className="tracepoint-card__note">Synthetic running state from the data, kept separate from the review flag.</div>
        </article>
        <article className="panel tracepoint-card">
          <div className="card-label">Data quality / provenance</div>
          <div className="tracepoint-card__value">Deterministic synthetic generator</div>
          <div className="tracepoint-card__note">
            Baseline window: first 24 stable hours. Missing readings: 0. Scenario version: {provenanceVersion}.
          </div>
        </article>
        <article className="panel tracepoint-card">
          <div className="card-label">Last updated</div>
          <div className="tracepoint-card__value">{formatTracepointTimestamp(currentRow.timestamp)}</div>
          <div className="tracepoint-card__note">Latest hourly reading in the 7-day series.</div>
        </article>
      </section>

      <section className="panel tracepoint__trends">
        <div className="panel__head">
          <div>
            <div className="eyebrow">Sensor trend section</div>
            <h2>Readable time-series review</h2>
          </div>
          <div className="tracepoint__trend-note">
            Seven days of deterministic hourly readings for {scenario.label}.
          </div>
        </div>

        <div className="tracepoint__chart-grid">
          <ChartCard
            title="Vibration RMS"
            values={rows.map((row) => row.vibration_rms)}
            unitKey="vibration"
            tone="amber"
            note={`Recent baseline: ${formatMetric(vibrationEvidence ? vibrationEvidence.baselineMedian : 0, "vibration")} → recent EWMA: ${formatMetric(vibrationEvidence ? vibrationEvidence.ewmaCurrent : 0, "vibration")}`}
          />
          <ChartCard
            title="Bearing temperature"
            values={rows.map((row) => row.bearing_temperature)}
            unitKey="temp"
            tone="red"
            note={`EWMA drift versus baseline: ${(temperatureEvidence ? temperatureEvidence.driftPercent : 0).toFixed(1)}%`}
          />
          <ChartCard
            title="Pressure"
            values={rows.map((row) => row.pressure)}
            unitKey="pressure"
            tone="steel"
            note={`Recent robust z: ${(pressureEvidence ? pressureEvidence.robustZ : 0).toFixed(2)} with ${pressureEvidence ? pressureEvidence.persistenceCount : 0} consecutive elevated readings`}
          />
          <ChartCard
            title="Flow rate"
            values={rows.map((row) => row.flow_rate)}
            unitKey="flow"
            tone="steel"
            note="Flow softens as wear builds and the later pressure event begins to move the system."
          />
        </div>
      </section>

      <section className="tracepoint__review-grid">
        <article className="panel tracepoint__explanation">
          <div className="panel__head">
            <div>
              <div className="eyebrow">Signal review explanation</div>
              <h2>{review.status}</h2>
            </div>
          </div>
          <div className="tracepoint__evidence">
            <p>{reviewExplainer}</p>
          </div>
          <div className="tracepoint__evidence-table">
            {review.sensorDetails.map((detail) => (
              <div key={detail.key} className="tracepoint__evidence-row">
                <div>
                  <div className="card-label">{detail.label}</div>
                  <div className="tracepoint__evidence-value">{detail.ewmaCurrent} EWMA</div>
                </div>
                <div className="tracepoint__evidence-meta">
                  <span>baseline {detail.baselineMedian}</span>
                  <span>robust z {formatRobustZ(detail.robustZ)}</span>
                  <span>persistence {detail.persistenceCount}</span>
                  <span>weight {Math.round(detail.weight * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="tracepoint__alternatives">
            <div className="card-label">Possible alternative explanations</div>
            <ul>
              <li>sensor drift</li>
              <li>calibration issue</li>
              <li>load change</li>
              <li>planned maintenance activity</li>
              <li>pressure transient</li>
              <li>missing or delayed data</li>
            </ul>
          </div>

          <details className="tracepoint__details">
            <summary>How this score was calculated</summary>
            <div className="tracepoint__formula">
              <p>1. Baseline: we use the first steady-state hours to establish a median and MAD for each sensor.</p>
              <p>2. EWMA: we smooth the latest 12 hours so one noisy point does not dominate the review.</p>
              <p>3. Robust deviation: each sensor gets a robust z-score from its EWMA versus baseline.</p>
              <p>4. Weighted evidence: each sensor contributes a visible weight capped so one sensor cannot dominate.</p>
              <p>5. Persistence and concordance: repeated elevated readings and cross-sensor agreement raise the score.</p>
              <p>Thresholds: Normal below 34, Watch below 67, Review Recommended at 67 or above.</p>
            </div>
          </details>
        </article>

        <article className="panel tracepoint__reviewer">
          <div className="panel__head">
            <div>
              <div className="eyebrow">Reviewer workflow</div>
              <h2>Mark the review, keep the judgment human</h2>
            </div>
          </div>
          <div className="tracepoint__reviewer-note">
            The score prepares a review. A reviewer decides whether action is justified.
          </div>

          <div className="button-row tracepoint__mark-row">
            {TRACEPOINT_REVIEW_MARKS.map((mark) => (
              <ReviewMarkButton
                key={mark}
                active={reviewerMark === mark}
                onClick={() => handleMark(mark)}
                aria-pressed={reviewerMark === mark}
              >
                {mark}
              </ReviewMarkButton>
            ))}
          </div>

          <div className="control-group">
            <label className="control-label" htmlFor="tracepoint-notes">
              Add review note
            </label>
            <textarea
              id="tracepoint-notes"
              className="tracepoint__notes"
              value={reviewerNotes}
              onChange={(event) => setReviewerNotes(event.target.value)}
              placeholder="Write what you saw, what else could explain it, and what should be checked next."
            />
          </div>

          <div className="tracepoint__saved">Saved locally for this browser session.</div>
        </article>
      </section>

      <section className="panel tracepoint__decision">
        <div className="panel__head">
          <div>
            <div className="eyebrow">Decision gate</div>
            <h2>Cost-aware review gate</h2>
          </div>
        </div>
        <div className="tracepoint__decision-grid">
          <div className="control-group">
            <label className="control-label" htmlFor="tracepoint-inspection-cost">
              Inspection cost
            </label>
            <input
              id="tracepoint-inspection-cost"
              type="number"
              min="0"
              step="100"
              className="tracepoint__input"
              value={inspectionCost}
              onChange={(event) => setInspectionCost(Number(event.target.value) || 0)}
            />
          </div>
          <div className="control-group">
            <label className="control-label" htmlFor="tracepoint-miss-cost">
              Estimated loss if issue is real and ignored
            </label>
            <input
              id="tracepoint-miss-cost"
              type="number"
              min="0"
              step="100"
              className="tracepoint__input"
              value={missCost}
              onChange={(event) => setMissCost(Number(event.target.value) || 0)}
            />
          </div>
          <div className="control-group">
            <label className="control-label" htmlFor="tracepoint-probability">
              Estimated calibrated probability issue is real
            </label>
            <input
              id="tracepoint-probability"
              type="range"
              min="0.05"
              max="0.95"
              step="0.01"
              className="tracepoint__range"
              value={calibratedProbability}
              onChange={(event) => setCalibratedProbability(Number(event.target.value) || 0)}
            />
            <div className="tracepoint__inline-value">{formatTracepointPercent(calibratedProbability, 0)}</div>
            <div className="tracepoint__range-note">Calibrated from the synthetic review score, not from a live model.</div>
          </div>
          <div className="control-group">
            <label className="control-label" htmlFor="tracepoint-harm-reduction">
              Intervention effectiveness after issue is confirmed
            </label>
            <input
              id="tracepoint-harm-reduction"
              type="range"
              min="0.1"
              max="0.9"
              step="0.01"
              className="tracepoint__range"
              value={harmReduction}
              onChange={(event) => setHarmReduction(Number(event.target.value) || 0)}
            />
            <div className="tracepoint__inline-value">{formatTracepointPercent(harmReduction, 0)}</div>
          </div>
        </div>

        <div className="tracepoint__decision-factors">
          <div className="mini-card">
            <div className="card-label">Inspection finds issue</div>
            <div className="tracepoint-card__value">{formatTracepointPercent(decisionDefaults.detectionRate, 0)}</div>
            <div className="tracepoint-card__note">Synthetic detection rate derived from the current review strength.</div>
          </div>
          <div className="mini-card">
            <div className="card-label">Action follows inspection</div>
            <div className="tracepoint-card__value">{formatTracepointPercent(decisionDefaults.followThroughRate, 0)}</div>
            <div className="tracepoint-card__note">Synthetic follow-through rate derived from the current review strength.</div>
          </div>
            <div className="mini-card">
            <div className="card-label">Combined harm reduction</div>
            <div className="tracepoint-card__value">
              {formatTracepointPercent(
                decisionDefaults.detectionRate * decisionDefaults.followThroughRate * harmReduction,
                2
              )}
            </div>
            <div className="tracepoint-card__note">Detection × follow-through × intervention effectiveness.</div>
          </div>
        </div>

        <div className="tracepoint__cost-summary">
          <div className="mini-card">
            <div className="card-label">Expected cost of acting</div>
            <div className="tracepoint-card__value">{formatTracepointMoney(decision.expectedCostAct)}</div>
            <div className="tracepoint-card__note">
              inspection/action cost + probability × miss cost × residual harm after action
            </div>
          </div>
          <div className="mini-card">
            <div className="card-label">Expected cost of not acting</div>
            <div className="tracepoint-card__value">{formatTracepointMoney(decision.expectedCostNoAct)}</div>
            <div className="tracepoint-card__note">probability × miss cost</div>
          </div>
          <div className="mini-card mini-card--wide">
            <div className="card-label">Decision read</div>
            <div className="tracepoint__decision-flag">
              {decisionReadout.signalSummary} / {decisionReadout.economicSummary}
            </div>
            <div className="tracepoint__decision-line">
              {decision.economicallyJustified ? "Inspection is economically justified." : "Inspection is not economically justified."}
            </div>
            <div className="muted">
              Estimated gap: {formatTracepointMoney(Math.abs(decision.expectedGap))} in favor of{" "}
              {decision.economicallyJustified ? "acting" : "not acting"}.
            </div>
            <div className="tracepoint__decision-note">{decisionReadout.reviewNote}</div>
            <div className="tracepoint__decision-formula">
              <div>
                Acting: {formatTracepointMoney(inspectionCost)} +{" "}
                {formatTracepointPercent(calibratedProbability, 2)} × {formatTracepointMoney(missCost)} ×{" "}
                {formatTracepointPercent(1 - decision.effectiveHarmReduction, 2)} ={" "}
                {formatTracepointMoney(decision.expectedCostAct)}
              </div>
              <div>
                Not acting: {formatTracepointPercent(calibratedProbability, 2)} × {formatTracepointMoney(missCost)} ={" "}
                {formatTracepointMoney(decision.expectedCostNoAct)}
              </div>
              <div className="tracepoint__precision-note">
                Figures may differ slightly because calculations use unrounded values.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel tracepoint__limits">
        <div className="panel__head">
          <div>
            <div className="eyebrow">Calibration findings and limits</div>
            <h2>What this prototype can and cannot say</h2>
          </div>
        </div>
        <div className="tracepoint__summary-strip">
          <div className="mini-card">
            <div className="card-label">Review flags raised</div>
            <div className="tracepoint-card__value">{evaluationSummary.reviewFlagsRaised}</div>
          </div>
          <div className="mini-card">
            <div className="card-label">Missed anomaly windows</div>
            <div className="tracepoint-card__value">{evaluationSummary.missedSyntheticAnomalyWindows}</div>
          </div>
          <div className="mini-card">
            <div className="card-label">Lead time before escalation</div>
            <div className="tracepoint-card__value">
              {evaluationSummary.leadTimeHours === null ? "n/a" : `${evaluationSummary.leadTimeHours}h`}
            </div>
          </div>
        </div>
        <div className="tracepoint__limits-grid">
          <ul className="tracepoint__limits-list">
            <li>synthetic scenario only</li>
            <li>current thresholds may create false positives or false negatives</li>
            <li>sensor patterns can have non-failure explanations</li>
            <li>site-specific calibration would be required in real use</li>
            <li>the tool does not confirm equipment failure</li>
            <li>inspection and operating procedures remain authoritative</li>
          </ul>
          <div className="mini-card tracepoint__summary-card">
            <div className="card-label">Synthetic evaluation summary</div>
            <div className="tracepoint__summary-grid">
              <div>
                <span>Total data windows</span>
                <strong>{evaluationSummary.totalWindows}</strong>
              </div>
              <div>
                <span>Known synthetic wear windows</span>
                <strong>{evaluationSummary.knownSyntheticWearWindows}</strong>
              </div>
              <div>
                <span>Review flags raised</span>
                <strong>{evaluationSummary.reviewFlagsRaised}</strong>
              </div>
              <div>
                <span>False alarms</span>
                <strong>{evaluationSummary.falseAlarms}</strong>
              </div>
              <div>
                <span>Missed synthetic anomaly windows</span>
                <strong>{evaluationSummary.missedSyntheticAnomalyWindows}</strong>
              </div>
              <div>
                <span>Lead time before synthetic escalation point</span>
                <strong>{evaluationSummary.leadTimeHours === null ? "n/a" : `${evaluationSummary.leadTimeHours}h`}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="tracepoint__footer">
        <div className="tracepoint__footer-copy">{limitationStatement}</div>
        <button type="button" className="pill pill--primary" onClick={exportPacket}>
          Export Review Packet
        </button>
      </footer>
    </section>
  );
}
