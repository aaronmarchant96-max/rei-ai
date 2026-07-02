import { useEffect, useMemo, useState } from "react";
import {
  buildTracepointRows,
  buildTracepointHandoverReport,
  buildTracepointReviewPacket,
  buildTracepointCorrelationSnapshot,
  buildTracepointSensorSeries,
  calculateTracepointDecision,
  calculateTracepointReview,
  formatTracepointMoney,
  formatTracepointPercent,
  formatTracepointTimestamp,
  getTracepointDecisionInputsFromScore,
  getTracepointDecisionReadout,
  getTracepointScenarioById,
  TRACEPOINT_REVIEW_MARKS,
  TRACEPOINT_SCENARIOS,
} from "./lib/tracepoint.js";

const STORAGE_KEY = "prompthound.tracepoint.reviewer";

const DEFAULT_COSTS = {
  inspectionCost: 91900,
  missCost: 163900,
};

const DEFAULT_WORKFLOW = {
  owner: "Reliability tech",
  status: "Queued",
  nextHandoff: "Shift lead review",
  responseSla: "Before next shift handover",
};

const DEFAULT_BASELINE = {
  assetId: "",
  label: "",
  startTimestamp: "",
  endTimestamp: "",
  operator: "local",
  source: "first 24 stable hours",
};

const WORKFLOW_QUEUE = [
  {
    id: "reliability-tech",
    label: "Reliability tech",
    detail: "First pass on the signal and sensors",
    response: "15 min",
    note: "Validate sensors / targeted review",
  },
  {
    id: "shift-lead",
    label: "Shift lead",
    detail: "Operational context and handover",
    response: "Before handover",
    note: "Review the queue and decide next step",
  },
  {
    id: "supervisor",
    label: "Operations supervisor",
    detail: "Escalation if the signal stays elevated",
    response: "As needed",
    note: "Escalate only if the review stays open",
  },
];

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

function downloadTextFile(filename, text, type = "text/markdown;charset=utf-8") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function createAuditEntry(message, timestamp = new Date().toISOString()) {
  return { timestamp, message };
}

function formatAuditStamp(timestamp) {
  return new Intl.DateTimeFormat("en-CA", {
    timeStyle: "short",
    dateStyle: "short",
    timeZone: "America/Edmonton",
  }).format(new Date(timestamp));
}

function formatBaselineStamp(timestamp) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeZone: "America/Edmonton",
  }).format(new Date(timestamp));
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
    latest: values[values.length - 1],
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

function ChartCard({
  title,
  values,
  unitKey,
  tone,
  note,
  evidence,
  series,
  primary,
  markers = [],
}) {
  const spark = useMemo(() => buildSparklinePath(values), [values]);
  const minLabel = formatMetric(spark.min, unitKey);
  const maxLabel = formatMetric(spark.max, unitKey);
  const latestLabel = formatMetric(spark.latest, unitKey);
  const width = 260;
  const height = 128;
  const paddingX = 12;
  const paddingY = 14;
  const range = spark.max - spark.min || 1;
  const valueToY = (value) =>
    height - paddingY - ((value - spark.min) / range) * (height - paddingY * 2);
  const valueToX = (index) =>
    paddingX + (index / (series.length - 1 || 1)) * (width - paddingX * 2);
  const scale = 1.4826 * (evidence?.baselineMad || 0) + 0.000001;
  const direction = evidence?.expectedDirection || 1;
  const baseline = evidence?.baselineMedian || spark.min;
  const normalLimit = baseline + direction * scale * 1.15;
  const watchLimit = baseline + direction * scale * 2.3;
  const bandTop = direction > 0 ? valueToY(watchLimit) : valueToY(normalLimit);
  const bandMiddle = direction > 0 ? valueToY(normalLimit) : valueToY(watchLimit);
  const baselineY = valueToY(baseline);
  const markerEntries = markers.map((marker) => ({
    ...marker,
    x: paddingX + (marker.hour / (series.length - 1 || 1)) * (width - paddingX * 2),
  }));

  return (
    <article
      className={`panel tracepoint-chart tracepoint-chart--${tone} ${primary ? "tracepoint-chart--primary" : ""}`}
    >
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
      <svg viewBox={`0 0 ${width} ${height}`} className="tracepoint-chart__svg" aria-hidden="true">
        <defs>
          <linearGradient id={`tracepoint-${tone}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--tracepoint-accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--tracepoint-accent)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={`tracepoint-${tone}-band-normal`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(134,168,144,0.24)" />
            <stop offset="100%" stopColor="rgba(134,168,144,0.08)" />
          </linearGradient>
          <linearGradient id={`tracepoint-${tone}-band-watch`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(240,199,94,0.22)" />
            <stop offset="100%" stopColor="rgba(240,199,94,0.08)" />
          </linearGradient>
          <linearGradient id={`tracepoint-${tone}-band-review`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(248,113,113,0.22)" />
            <stop offset="100%" stopColor="rgba(248,113,113,0.08)" />
          </linearGradient>
        </defs>
        <rect
          x={paddingX}
          y={14}
          width={width - paddingX * 2}
          height={Math.max(0, bandTop - 14)}
          className="tracepoint-chart__band tracepoint-chart__band--review"
          fill={`url(#tracepoint-${tone}-band-review)`}
        />
        <rect
          x={paddingX}
          y={bandTop}
          width={width - paddingX * 2}
          height={Math.max(0, bandMiddle - bandTop)}
          className="tracepoint-chart__band tracepoint-chart__band--watch"
          fill={`url(#tracepoint-${tone}-band-watch)`}
        />
        <rect
          x={paddingX}
          y={bandMiddle}
          width={width - paddingX * 2}
          height={Math.max(0, height - paddingY - bandMiddle)}
          className="tracepoint-chart__band tracepoint-chart__band--normal"
          fill={`url(#tracepoint-${tone}-band-normal)`}
        />
        <line
          x1={paddingX}
          y1={baselineY}
          x2={width - paddingX}
          y2={baselineY}
          className="tracepoint-chart__gridline tracepoint-chart__gridline--baseline"
        />
        <line
          x1={paddingX}
          y1={bandTop}
          x2={width - paddingX}
          y2={bandTop}
          className="tracepoint-chart__gridline tracepoint-chart__gridline--threshold"
        />
        <line
          x1={paddingX}
          y1={bandMiddle}
          x2={width - paddingX}
          y2={bandMiddle}
          className="tracepoint-chart__gridline tracepoint-chart__gridline--threshold"
        />
        {markerEntries.map((marker) => (
          <g key={marker.label} className="tracepoint-chart__marker">
            <line
              x1={marker.x}
              y1={14}
              x2={marker.x}
              y2={height - paddingY}
              className={`tracepoint-chart__marker-line tracepoint-chart__marker-line--${marker.tone}`}
            />
            <text x={marker.x + 4} y={24} className="tracepoint-chart__marker-label">
              {marker.label}
            </text>
          </g>
        ))}
        {spark.area ? (
          <path
            d={spark.area}
            className="tracepoint-chart__area"
            fill={`url(#tracepoint-${tone}-fill)`}
          />
        ) : null}
        {spark.path ? <path d={spark.path} className="tracepoint-chart__line" /> : null}
        {series.map((point, index) => (
          <g key={`${point.timestamp}-${index}`} className="tracepoint-chart__point-group">
            <circle
              cx={valueToX(index)}
              cy={valueToY(point.value)}
              r="2.4"
              className="tracepoint-chart__point"
            />
            <title>{`${formatTracepointTimestamp(point.timestamp)} | Reading ${formatMetric(point.value, unitKey)} | EWMA ${formatMetric(point.ewma, unitKey)} | Baseline ${formatMetric(point.baseline, unitKey)} | Contribution ${point.contribution}%`}</title>
          </g>
        ))}
      </svg>
      {note ? <div className="tracepoint-chart__note">{note}</div> : null}
    </article>
  );
}

function CorrelationCard({ snapshot, rows }) {
  const tiles = snapshot.correlations.slice(0, 2).map((pair) => {
    const sampleRows = rows.slice(-24);
    const points = sampleRows.map((row) => ({
      x: row[pair.xKey],
      y: row[pair.yKey],
    }));
    const xValues = points.map((point) => point.x);
    const yValues = points.map((point) => point.y);
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;
    const width = 112;
    const height = 86;

    return {
      ...pair,
      points,
      width,
      height,
      xMin,
      yMin,
      xRange,
      yRange,
    };
  });

  return (
    <article className="panel tracepoint-correlation">
      <div className="panel__head">
        <div>
          <div className="card-label">Multi-sensor correlation</div>
          <h2>How the signals move together</h2>
        </div>
        <div className="tracepoint-correlation__flag">{snapshot.crossSensorFlag}</div>
      </div>
      <div className="tracepoint-correlation__grid">
        {tiles.map((tile) => (
          <div key={tile.id} className="tracepoint-correlation__tile">
            <div className="tracepoint-correlation__tile-head">
              <strong>{tile.label}</strong>
              <span>{(tile.recent * 100).toFixed(0)}%</span>
            </div>
            <svg
              viewBox={`0 0 ${tile.width} ${tile.height}`}
              className="tracepoint-correlation__svg"
              aria-hidden="true"
            >
              <line
                x1="10"
                y1={tile.height - 10}
                x2={tile.width - 10}
                y2="10"
                className="tracepoint-correlation__trend"
              />
              {tile.points.map((point, index) => {
                const cx = 10 + ((point.x - tile.xMin) / tile.xRange) * (tile.width - 20);
                const cy =
                  tile.height - 10 - ((point.y - tile.yMin) / tile.yRange) * (tile.height - 20);
                return (
                  <circle
                    key={`${tile.id}-${index}`}
                    cx={cx}
                    cy={cy}
                    r="2.1"
                    className="tracepoint-correlation__point"
                  />
                );
              })}
            </svg>
          </div>
        ))}
      </div>
      <div className="tracepoint-correlation__meta">
        {snapshot.correlations.map((pair) => (
          <div key={pair.id} className="tracepoint-correlation__meta-row">
            <span>{pair.label}</span>
            <strong>{(pair.recent * 100).toFixed(0)}%</strong>
            <em>
              {pair.delta >= 0 ? "+" : ""}
              {(pair.delta * 100).toFixed(0)} vs baseline
            </em>
          </div>
        ))}
      </div>
    </article>
  );
}

function ReviewMarkButton({ active, children, ...props }) {
  return (
    <button
      type="button"
      className={active ? "pill tracepoint-pill is-active" : "pill tracepoint-pill"}
      {...props}
    >
      {children}
    </button>
  );
}

function AssetGlyph({ assetId }) {
  const isPump = assetId.startsWith("P-");
  return (
    <svg viewBox="0 0 72 48" className="tracepoint-asset" aria-hidden="true">
      <defs>
        <linearGradient id="tracepoint-asset-fill" x1="0" x2="1">
          <stop offset="0%" stopColor="#f0c75e" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#9fb3a0" stopOpacity="0.16" />
        </linearGradient>
      </defs>
      <rect x="2" y="33" width="68" height="5" rx="2.5" fill="rgba(255,255,255,0.08)" />
      {isPump ? (
        <>
          <circle
            cx="20"
            cy="24"
            r="10"
            fill="none"
            stroke="url(#tracepoint-asset-fill)"
            strokeWidth="2.5"
          />
          <circle cx="20" cy="24" r="4" fill="none" stroke="rgba(240,199,94,0.8)" strokeWidth="2" />
          <rect
            x="33"
            y="14"
            width="20"
            height="20"
            rx="4"
            fill="rgba(240,199,94,0.1)"
            stroke="rgba(240,199,94,0.45)"
          />
          <path d="M53 18h10v12H53" fill="none" stroke="rgba(159,179,160,0.72)" strokeWidth="2.4" />
          <path
            d="M43 14v-7"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <rect
            x="10"
            y="12"
            width="18"
            height="20"
            rx="4"
            fill="rgba(159,179,160,0.1)"
            stroke="rgba(159,179,160,0.55)"
          />
          <circle
            cx="38"
            cy="25"
            r="8"
            fill="none"
            stroke="rgba(240,199,94,0.85)"
            strokeWidth="2.5"
          />
          <path
            d="M46 25h14"
            stroke="rgba(240,199,94,0.85)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M20 12v-6"
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

function ScoreGauge({ score, status }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const fill = (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const strokeDashoffset = circumference - fill;

  return (
    <div className="tracepoint-gauge">
      <svg viewBox="0 0 124 124" className="tracepoint-gauge__svg" aria-hidden="true">
        <circle cx="62" cy="62" r={radius} className="tracepoint-gauge__track" />
        <circle
          cx="62"
          cy="62"
          r={radius}
          className={`tracepoint-gauge__arc tracepoint-gauge__arc--${status === "Review Recommended" ? "red" : status === "Watch" ? "amber" : "muted"}`}
          strokeDasharray={`${fill} ${circumference - fill}`}
          strokeDashoffset={circumference * 0.25}
        />
      </svg>
      <div className="tracepoint-gauge__body">
        <div className="tracepoint-gauge__score">{score.toFixed(1)}</div>
        <div className="tracepoint-gauge__label">Signal Review Score</div>
      </div>
    </div>
  );
}

function SignalTimeline({ scenario }) {
  const phases = [
    { label: "Stable", hour: 0, tone: "muted" },
    { label: "Drift detected", hour: scenario.profile.wearStartHour, tone: "amber" },
    {
      label: "Persistent elevation",
      hour: scenario.profile.pressureInstabilityHour,
      tone: "amber",
    },
    { label: "Review threshold crossed", hour: scenario.profile.escalationHour, tone: "red" },
  ];

  return (
    <div className="tracepoint-timeline" aria-label="Scenario event timeline">
      {phases.map((phase, index) => (
        <div
          key={phase.label}
          className={`tracepoint-timeline__step tracepoint-timeline__step--${phase.tone}`}
        >
          <div className="tracepoint-timeline__dot" />
          <div className="tracepoint-timeline__label">{phase.label}</div>
          <div className="tracepoint-timeline__hour">h{phase.hour}</div>
          {index < phases.length - 1 ? (
            <div className="tracepoint-timeline__rule" aria-hidden="true" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function SignalStack({ sensorDetails, concordance }) {
  return (
    <div className="tracepoint-stack">
      {sensorDetails.map((detail) => (
        <div key={detail.key} className="tracepoint-stack__row">
          <div className="tracepoint-stack__meta">
            <span className="tracepoint-stack__label">{detail.label}</span>
            <span className="tracepoint-stack__detail">
              {detail.key === "bearing_temperature"
                ? `${detail.persistenceCount} readings elevated`
                : detail.key === "pressure"
                  ? "2-reading instability"
                  : detail.key === "flow_rate"
                    ? "Downward shift"
                    : "Persistent drift"}
            </span>
          </div>
          <div className="tracepoint-stack__bar">
            <span style={{ width: `${Math.max(12, Math.round(detail.contribution))}%` }} />
          </div>
          <div className="tracepoint-stack__score">{Math.round(detail.weight * 100)}%</div>
        </div>
      ))}
      <div className="tracepoint-agreement">
        <div className="tracepoint-agreement__label">Multi-sensor correlation</div>
        <div className="tracepoint-agreement__nodes" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="tracepoint-agreement__text">
          {Math.round(concordance * 100)}% aligned on the drift direction
        </div>
      </div>
    </div>
  );
}

function ActionLadder({ review, decision, recommendation }) {
  const recommendedStep =
    recommendation === "Validate sensors / targeted review before full inspection"
      ? "Validate sensors"
      : recommendation === "Targeted inspection"
        ? "Targeted inspection"
        : recommendation === "Collect more data"
          ? "Collect more data"
          : recommendation === "Monitor"
            ? "Monitor"
            : review.status === "Review Recommended" && Math.abs(decision.expectedGap) < 10000
              ? "Validate sensors"
              : review.status === "Review Recommended" && decision.economicallyJustified
                ? "Targeted inspection"
                : review.status === "Watch"
                  ? "Collect more data"
                  : "Monitor";

  const recommendationNote =
    recommendedStep === "Validate sensors"
      ? "Suggested next move: validate sensors / targeted review before full inspection"
      : recommendedStep === "Targeted inspection"
        ? "Suggested next move: targeted inspection"
        : recommendedStep === "Collect more data"
          ? "Suggested next move: collect more data"
          : "Suggested next move: monitor";

  const steps = [
    "Monitor",
    "Collect more data",
    "Validate sensors",
    "Targeted inspection",
    "Full intervention",
  ];

  return (
    <div className="tracepoint-ladder" aria-label="Action ladder">
      {steps.map((step) => {
        const active = step === recommendedStep;
        return (
          <div
            key={step}
            className={active ? "tracepoint-ladder__step is-active" : "tracepoint-ladder__step"}
          >
            <span>{step}</span>
            {active ? <strong>Recommended</strong> : null}
          </div>
        );
      })}
      <div className="tracepoint-ladder__note">{recommendationNote}</div>
    </div>
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
  const [calibratedProbability, setCalibratedProbability] = useState(
    decisionDefaults.calibratedProbability
  );
  const [harmReduction, setHarmReduction] = useState(decisionDefaults.harmReduction);
  const [workflowOwner, setWorkflowOwner] = useState(DEFAULT_WORKFLOW.owner);
  const [workflowStatus, setWorkflowStatus] = useState(DEFAULT_WORKFLOW.status);
  const [workflowNextHandoff, setWorkflowNextHandoff] = useState(DEFAULT_WORKFLOW.nextHandoff);
  const [workflowResponseSla, setWorkflowResponseSla] = useState(DEFAULT_WORKFLOW.responseSla);
  const [baselineState, setBaselineState] = useState({
    ...DEFAULT_BASELINE,
    assetId: scenario.assetId,
    label: scenario.label,
    startTimestamp: rows[0]?.timestamp || "",
    endTimestamp: rows[23]?.timestamp || rows[0]?.timestamp || "",
    source: "first 24 stable hours",
  });
  const [auditTrail, setAuditTrail] = useState([createAuditEntry("Tracepoint opened for review")]);
  const [savedStateLoaded, setSavedStateLoaded] = useState(false);

  useEffect(() => {
    const saved = safeReadState();
    const entry = saved[scenario.id];
    if (entry) {
      setReviewerMark(entry.reviewerMark || "unmarked");
      setReviewerNotes(entry.reviewerNotes || "");
      setInspectionCost(Number(entry.inspectionCost) || DEFAULT_COSTS.inspectionCost);
      setMissCost(Number(entry.missCost) || DEFAULT_COSTS.missCost);
      setCalibratedProbability(
        Number(entry.calibratedProbability) || decisionDefaults.calibratedProbability
      );
      setHarmReduction(Number(entry.harmReduction) || decisionDefaults.harmReduction);
      setWorkflowOwner(entry.workflowOwner || DEFAULT_WORKFLOW.owner);
      setWorkflowStatus(entry.workflowStatus || DEFAULT_WORKFLOW.status);
      setWorkflowNextHandoff(entry.workflowNextHandoff || DEFAULT_WORKFLOW.nextHandoff);
      setWorkflowResponseSla(entry.workflowResponseSla || DEFAULT_WORKFLOW.responseSla);
      setBaselineState(
        entry.baselineState || {
          ...DEFAULT_BASELINE,
          assetId: scenario.assetId,
          label: scenario.label,
          startTimestamp: rows[0]?.timestamp || "",
          endTimestamp: rows[23]?.timestamp || rows[0]?.timestamp || "",
          source: "first 24 stable hours",
        }
      );
      setAuditTrail(
        Array.isArray(entry.auditTrail) && entry.auditTrail.length
          ? entry.auditTrail
          : [createAuditEntry("Review reopened from saved state")]
      );
    } else {
      setCalibratedProbability(decisionDefaults.calibratedProbability);
      setHarmReduction(decisionDefaults.harmReduction);
      setWorkflowOwner(DEFAULT_WORKFLOW.owner);
      setWorkflowStatus(DEFAULT_WORKFLOW.status);
      setWorkflowNextHandoff(DEFAULT_WORKFLOW.nextHandoff);
      setWorkflowResponseSla(DEFAULT_WORKFLOW.responseSla);
      setBaselineState({
        ...DEFAULT_BASELINE,
        assetId: scenario.assetId,
        label: scenario.label,
        startTimestamp: rows[0]?.timestamp || "",
        endTimestamp: rows[23]?.timestamp || rows[0]?.timestamp || "",
        source: "first 24 stable hours",
      });
      setAuditTrail([createAuditEntry("Tracepoint opened for review")]);
    }
    setSavedStateLoaded(true);
  }, [
    decisionDefaults.calibratedProbability,
    decisionDefaults.harmReduction,
    rows,
    scenario.assetId,
    scenario.id,
    scenario.label,
  ]);

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
        harmReduction,
        workflowOwner,
        workflowStatus,
        workflowNextHandoff,
        workflowResponseSla,
        baselineState,
        auditTrail,
      },
    };

    safeWriteState(next);
  }, [
    auditTrail,
    calibratedProbability,
    harmReduction,
    inspectionCost,
    missCost,
    reviewerMark,
    reviewerNotes,
    savedStateLoaded,
    scenario.id,
    workflowNextHandoff,
    workflowOwner,
    workflowResponseSla,
    workflowStatus,
    baselineState,
  ]);

  const decision = useMemo(
    () =>
      calculateTracepointDecision({
        inspectionCost,
        missCost,
        calibratedProbability,
        detectionRate: decisionDefaults.detectionRate,
        followThroughRate: decisionDefaults.followThroughRate,
        harmReduction,
      }),
    [
      calibratedProbability,
      decisionDefaults.detectionRate,
      decisionDefaults.followThroughRate,
      harmReduction,
      inspectionCost,
      missCost,
    ]
  );

  const currentRow = rows[rows.length - 1];
  const scenarioIndex = TRACEPOINT_SCENARIOS.findIndex((item) => item.id === scenario.id);
  const sensorByKey = review.sensorMap || {};
  const correlationSnapshot = useMemo(() => buildTracepointCorrelationSnapshot(rows), [rows]);
  const seriesByKey = useMemo(
    () => ({
      vibration_rms: buildTracepointSensorSeries(rows, "vibration_rms"),
      bearing_temperature: buildTracepointSensorSeries(rows, "bearing_temperature"),
      pressure: buildTracepointSensorSeries(rows, "pressure"),
      flow_rate: buildTracepointSensorSeries(rows, "flow_rate"),
    }),
    [rows]
  );
  const vibrationEvidence = sensorByKey.vibration_rms;
  const temperatureEvidence = sensorByKey.bearing_temperature;
  const pressureEvidence = sensorByKey.pressure;
  const flowEvidence = sensorByKey.flow_rate;
  const provenanceVersion = formatScenarioVersion(scenario.id);
  const statusTone = {
    Normal: "muted",
    Watch: "amber",
    "Review Recommended": "red",
  }[review.status];
  const driverLabel = {
    vibration_rms: "vibration deviation",
    bearing_temperature: "bearing temperature trend",
    pressure: "pressure variability",
    flow_rate: "flow rate drift",
  }[review.mainDriver];
  const scoreFill = Math.max(0, Math.min(100, review.combinedScore));
  const decisionReadout = getTracepointDecisionReadout(review, decision);
  const actionRecommendation =
    review.status === "Review Recommended" && Math.abs(decision.expectedGap) < 10000
      ? "Validate sensors / targeted review before full inspection"
      : review.status === "Review Recommended" && decision.economicallyJustified
        ? "Targeted inspection"
        : review.status === "Watch"
          ? "Collect more data"
          : "Monitor";
  const workflowQueue = useMemo(
    () =>
      WORKFLOW_QUEUE.map((item) => ({
        ...item,
        active: item.label === workflowOwner,
      })),
    [workflowOwner]
  );
  const reviewExplainer =
    review.status === "Review Recommended"
      ? `Review recommended. Vibration is ${vibrationEvidence ? vibrationEvidence.driftPercent : 0}% above its asset-specific baseline after EWMA smoothing. Bearing temperature is ${temperatureEvidence ? temperatureEvidence.driftPercent : 0}% above baseline and has stayed elevated for ${temperatureEvidence ? temperatureEvidence.persistenceCount : 0} readings. Pressure and flow are moving in the expected direction with ${Math.round((review.concordance || 0) * 100)}% multi-sensor correlation.`
      : review.status === "Watch"
        ? "Watch. The signal is moving away from baseline, but it has not crossed the review threshold yet."
        : "Normal. The combined signal stays within the conservative threshold band used for this synthetic demo.";
  const evaluationSummary = review.summary;

  function handleMark(mark) {
    setReviewerMark(mark);
    setAuditTrail((trail) => [createAuditEntry(`Reviewer marked ${mark}`), ...trail].slice(0, 8));
  }

  function routeWorkflow(item) {
    setWorkflowOwner(item.label);
    setWorkflowStatus(
      item.id === "supervisor"
        ? "Escalated"
        : item.id === "shift-lead"
          ? "Queued for shift review"
          : "Queued"
    );
    setWorkflowNextHandoff(item.note);
    setWorkflowResponseSla(item.response);
    setAuditTrail((trail) => [createAuditEntry(`Queued for ${item.label}`), ...trail].slice(0, 8));
  }

  function saveBaseline() {
    setBaselineState({
      assetId: scenario.assetId,
      label: scenario.label,
      startTimestamp: rows[0]?.timestamp || "",
      endTimestamp: rows[23]?.timestamp || rows[0]?.timestamp || "",
      operator: "local",
      source: "first 24 stable hours",
    });
    setAuditTrail((trail) =>
      [createAuditEntry(`Saved asset baseline for ${scenario.assetId}`), ...trail].slice(0, 8)
    );
  }

  function exportHandoverReport() {
    const report = buildTracepointHandoverReport({
      scenario,
      review,
      decision,
      reviewerMark,
      reviewerNotes,
      baselineState,
      queueState: {
        owner: workflowOwner,
        status: workflowStatus,
        nextHandoff: workflowNextHandoff,
        responseSla: workflowResponseSla,
        recommendedAction: actionRecommendation,
        baseline: baselineState,
      },
      auditTrail,
      exportTimestamp: new Date().toISOString(),
    });

    const markdown = [
      "# Tracepoint shift handover",
      "",
      `- Asset: ${report.scenario_metadata.asset_id} (${report.scenario_metadata.label})`,
      `- Scenario: ${report.scenario_metadata.baseline_scope} / ${report.scenario_metadata.operating_context}`,
      `- Review status: ${report.review_snapshot.status}`,
      `- Signal review score: ${report.review_snapshot.combined_score.toFixed(1)}`,
      `- Multi-sensor correlation: ${(report.review_snapshot.multi_sensor_correlation * 100).toFixed(0)}%`,
      `- Recommended action: ${report.review_snapshot.suggested_action}`,
      `- Queue owner: ${report.queue_state.owner}`,
      `- Queue status: ${report.queue_state.status}`,
      `- Next handoff: ${report.queue_state.next_handoff}`,
      `- Response target: ${report.queue_state.response_sla}`,
      `- Baseline: ${baselineState.assetId || scenario.assetId} / ${baselineState.source} / ${baselineState.startTimestamp ? formatBaselineStamp(baselineState.startTimestamp) : "n/a"} to ${baselineState.endTimestamp ? formatBaselineStamp(baselineState.endTimestamp) : "n/a"}`,
      `- Reviewer mark: ${report.reviewer_mark}`,
      `- Reviewer note: ${report.reviewer_notes || "none"}`,
      "",
      "## Evidence",
      ...review.sensorDetails.map(
        (detail) =>
          `- ${detail.label}: ${formatMetric(detail.latestValue, detail.unit)} | EWMA ${formatMetric(detail.ewmaCurrent, detail.unit)} | baseline ${formatMetric(detail.baselineMedian, detail.unit)} | z ${formatRobustZ(detail.robustZ)}`
      ),
      "",
      "## Audit trail",
      ...(report.audit_trail.length
        ? report.audit_trail.map(
          (entry) => `- ${formatAuditStamp(entry.timestamp)}: ${entry.message}`
        )
        : ["- No workflow actions logged."]),
      "",
      `Limitation: ${report.limitation_statement}`,
      `Exported: ${report.export_timestamp}`,
    ].join("\n");

    downloadTextFile("tracepoint-handover-report.md", markdown);
    setAuditTrail((trail) =>
      [createAuditEntry("Exported shift handover report"), ...trail].slice(0, 8)
    );
  }

  function exportPacket() {
    const packet = buildTracepointReviewPacket({
      scenario,
      review,
      decision,
      reviewerMark,
      reviewerNotes,
      exportTimestamp: new Date().toISOString(),
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
            <strong>Synthetic calibration demo only.</strong> Not operational advice, not a
            forecasting system, and not a replacement for inspection, maintenance procedures, or
            safety controls.
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

      <section className="tracepoint__cockpit">
        <article className="panel tracepoint__cockpit-panel">
          <div className="tracepoint__cockpit-score">
            <div className="tracepoint__cockpit-label">Signal Review Score</div>
            <ScoreGauge score={review.combinedScore} status={review.status} />
          </div>

          <div className="tracepoint__cockpit-copy">
            <div className="tracepoint__cockpit-state">{review.status}</div>
            <div className="tracepoint__cockpit-summary">{decisionReadout.economicSummary}</div>
            <div className="tracepoint__cockpit-move">
              Suggested next move: {actionRecommendation}
            </div>

            <div className="tracepoint__cockpit-strip">
              <div className="tracepoint__cockpit-asset">
                <AssetGlyph assetId={scenario.assetId} />
                <div>
                  <div className="tracepoint__cockpit-asset-id">{scenario.assetId}</div>
                  <div className="tracepoint__cockpit-asset-name">{scenario.label}</div>
                </div>
              </div>
              <div className="tracepoint__cockpit-chip tracepoint__cockpit-chip--state">
                Operating state: {currentRow.operating_state}
              </div>
              <div className="tracepoint__cockpit-chip">Synthetic calibration demo</div>
              <div className="tracepoint__cockpit-chip">Human review required</div>
            </div>
          </div>
        </article>
      </section>

      <section className="tracepoint__cards">
        <article className="panel tracepoint-card">
          <div className="card-label">Main driver of the flag</div>
          <div className="tracepoint-card__value">{driverLabel}</div>
          <div className="tracepoint-card__note">
            Highest component score in the current synthetic window.
          </div>
        </article>
        <article className="panel tracepoint-card">
          <div className="card-label">Current operating state</div>
          <div className="tracepoint-card__value">{currentRow.operating_state}</div>
          <div className="tracepoint-card__note">
            Synthetic running state from the data, kept separate from the review flag.
          </div>
        </article>
        <article className="panel tracepoint-card">
          <div className="card-label">Data quality / provenance</div>
          <div className="tracepoint-provenance" aria-label="Run metadata">
            <div>
              <span>Scenario</span>
              <strong>{provenanceVersion}</strong>
            </div>
            <div>
              <span>Asset</span>
              <strong>{scenario.assetId}</strong>
            </div>
            <div>
              <span>Baseline</span>
              <strong>asset-specific, first 24 stable hours</strong>
            </div>
            <div>
              <span>Windows</span>
              <strong>{rows.length}</strong>
            </div>
            <div>
              <span>Missing</span>
              <strong>0</strong>
            </div>
            <div>
              <span>Generator</span>
              <strong>deterministic-synthetic-v1</strong>
            </div>
          </div>
          <div className="tracepoint-baseline">
            <div className="card-label">Asset-specific baseline</div>
            <div className="tracepoint-baseline__meta">
              <span>{baselineState.assetId || scenario.assetId}</span>
              <strong>{baselineState.source}</strong>
              <span>
                {baselineState.startTimestamp
                  ? formatBaselineStamp(baselineState.startTimestamp)
                  : "n/a"}{" "}
                to{" "}
                {baselineState.endTimestamp
                  ? formatBaselineStamp(baselineState.endTimestamp)
                  : "n/a"}
              </span>
              <span>Operator: {baselineState.operator}</span>
            </div>
            <div className="tracepoint-baseline__actions">
              <button type="button" className="pill" onClick={saveBaseline}>
                Set Baseline
              </button>
            </div>
          </div>
        </article>
        <article className="panel tracepoint-card">
          <div className="card-label">Last updated</div>
          <div className="tracepoint-card__value">
            {formatTracepointTimestamp(currentRow.timestamp)}
          </div>
          <div className="tracepoint-card__note">Latest hourly reading in the 7-day series.</div>
        </article>
      </section>

      <section className="panel tracepoint__trends">
        <div className="panel__head">
          <div>
            <div className="eyebrow">Sensor trend section</div>
            <h2>The chart is the story</h2>
          </div>
          <div className="tracepoint__trend-note">
            Seven days of deterministic hourly readings for {scenario.label}. Hover the points for
            exact values.
          </div>
        </div>

        <SignalTimeline scenario={scenario} />

        <CorrelationCard snapshot={correlationSnapshot} rows={rows} />

        <div className="tracepoint__chart-grid">
          <ChartCard
            title="Vibration RMS"
            values={rows.map((row) => row.vibration_rms)}
            unitKey="vibration"
            tone="amber"
            primary
            markers={[
              { hour: scenario.profile.wearStartHour, label: "Wear starts", tone: "amber" },
              {
                hour: scenario.profile.pressureInstabilityHour,
                label: "Pressure instability",
                tone: "red",
              },
            ]}
            evidence={vibrationEvidence}
            series={seriesByKey.vibration_rms}
            note={`Recent baseline: ${formatMetric(vibrationEvidence ? vibrationEvidence.baselineMedian : 0, "vibration")} → recent EWMA: ${formatMetric(vibrationEvidence ? vibrationEvidence.ewmaCurrent : 0, "vibration")}`}
          />
          <ChartCard
            title="Bearing temperature"
            values={rows.map((row) => row.bearing_temperature)}
            unitKey="temp"
            tone="red"
            evidence={temperatureEvidence}
            series={seriesByKey.bearing_temperature}
            note={`EWMA drift versus baseline: ${(temperatureEvidence ? temperatureEvidence.driftPercent : 0).toFixed(1)}%`}
          />
          <ChartCard
            title="Pressure"
            values={rows.map((row) => row.pressure)}
            unitKey="pressure"
            tone="steel"
            evidence={pressureEvidence}
            series={seriesByKey.pressure}
            note={`Recent robust z: ${(pressureEvidence ? pressureEvidence.robustZ : 0).toFixed(2)} with ${pressureEvidence ? pressureEvidence.persistenceCount : 0} consecutive elevated readings`}
          />
          <ChartCard
            title="Flow rate"
            values={rows.map((row) => row.flow_rate)}
            unitKey="flow"
            tone="steel"
            evidence={flowEvidence}
            series={seriesByKey.flow_rate}
            note="Flow softens as wear builds and the later pressure event begins to move the system."
          />
        </div>
      </section>
      <section className="tracepoint__analysis-grid">
        <article className="panel tracepoint__signal-panel">
          <div className="panel__head">
            <div>
              <div className="eyebrow">What the equipment data suggests</div>
              <h2>{review.status}</h2>
            </div>
          </div>
          <div className="tracepoint__evidence">
            <p>{reviewExplainer}</p>
          </div>
          <SignalStack sensorDetails={review.sensorDetails} concordance={review.concordance} />
          <details className="tracepoint__details tracepoint__details--compact">
            <summary>Raw per-sensor values</summary>
            <div className="tracepoint__raw-grid">
              {review.sensorDetails.map((detail) => (
                <div key={detail.key} className="tracepoint__raw-row">
                  <span>{detail.label}</span>
                  <strong>{formatMetric(detail.latestValue, detail.unit)}</strong>
                  <em>
                    EWMA {formatMetric(detail.ewmaCurrent, detail.unit)} · baseline{" "}
                    {formatMetric(detail.baselineMedian, detail.unit)} · z{" "}
                    {formatRobustZ(detail.robustZ)}
                  </em>
                </div>
              ))}
            </div>
          </details>
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
              <p>
                1. Baseline: we use the first steady-state hours to establish a median and MAD for
                each sensor.
              </p>
              <p>
                2. EWMA: we smooth the latest 12 hours so one noisy point does not dominate the
                review.
              </p>
              <p>
                3. Robust deviation: each sensor gets a robust z-score from its EWMA versus
                baseline.
              </p>
              <p>
                4. Weighted evidence: each sensor contributes a visible weight capped so one sensor
                cannot dominate.
              </p>
              <p>
                5. Persistence and concordance: repeated elevated readings and cross-sensor
                agreement raise the score.
              </p>
              <p>Thresholds: Normal below 34, Watch below 67, Review Recommended at 67 or above.</p>
            </div>
          </details>
        </article>

        <article className="panel tracepoint__decision-panel">
          <div className="panel__head">
            <div>
              <div className="eyebrow">What the business should do</div>
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
              <div className="tracepoint__inline-value">
                {formatTracepointPercent(calibratedProbability, 0)}
              </div>
              <div className="tracepoint__range-note">
                Calibrated from the synthetic review score, not from a live model.
              </div>
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
              <div className="tracepoint__inline-value">
                {formatTracepointPercent(harmReduction, 0)}
              </div>
            </div>
          </div>

          <div className="tracepoint__decision-factors">
            <div className="mini-card">
              <div className="card-label">Inspection finds issue</div>
              <div className="tracepoint-card__value">
                {formatTracepointPercent(decisionDefaults.detectionRate, 0)}
              </div>
              <div className="tracepoint-card__note">
                Synthetic detection rate derived from the current review strength.
              </div>
            </div>
            <div className="mini-card">
              <div className="card-label">Action follows inspection</div>
              <div className="tracepoint-card__value">
                {formatTracepointPercent(decisionDefaults.followThroughRate, 0)}
              </div>
              <div className="tracepoint-card__note">
                Synthetic follow-through rate derived from the current review strength.
              </div>
            </div>
            <div className="mini-card">
              <div className="card-label">Combined harm reduction</div>
              <div className="tracepoint-card__value">
                {formatTracepointPercent(
                  decisionDefaults.detectionRate *
                    decisionDefaults.followThroughRate *
                    harmReduction,
                  2
                )}
              </div>
              <div className="tracepoint-card__note">
                Detection × follow-through × intervention effectiveness.
              </div>
            </div>
          </div>

          <div className="tracepoint__cost-summary">
            <div className="mini-card">
              <div className="card-label">Expected cost of acting</div>
              <div className="tracepoint-card__value">
                {formatTracepointMoney(decision.expectedCostAct)}
              </div>
              <div className="tracepoint-card__note">
                inspection/action cost + probability × miss cost × residual harm after action
              </div>
            </div>
            <div className="mini-card">
              <div className="card-label">Expected cost of not acting</div>
              <div className="tracepoint-card__value">
                {formatTracepointMoney(decision.expectedCostNoAct)}
              </div>
              <div className="tracepoint-card__note">probability × miss cost</div>
            </div>
            <div className="mini-card mini-card--wide">
              <div className="card-label">Decision read</div>
              <div className="tracepoint__decision-flag">
                {decisionReadout.signalSummary} / {decisionReadout.economicSummary}
              </div>
              <div className="tracepoint__decision-line">
                {decision.economicallyJustified
                  ? "Inspection is economically justified."
                  : "Inspection is not economically justified."}
              </div>
              <div className="muted">
                Estimated gap: {formatTracepointMoney(Math.abs(decision.expectedGap))} in favor of{" "}
                {decision.economicallyJustified ? "acting" : "not acting"}.
              </div>
              <div className="tracepoint__decision-note">{decisionReadout.reviewNote}</div>
              <div className="tracepoint__decision-formula">
                <div>
                  Acting: {formatTracepointMoney(inspectionCost)} +{" "}
                  {formatTracepointPercent(calibratedProbability, 2)} ×{" "}
                  {formatTracepointMoney(missCost)} ×{" "}
                  {formatTracepointPercent(1 - decision.effectiveHarmReduction, 2)} ={" "}
                  {formatTracepointMoney(decision.expectedCostAct)}
                </div>
                <div>
                  Not acting: {formatTracepointPercent(calibratedProbability, 2)} ×{" "}
                  {formatTracepointMoney(missCost)} ={" "}
                  {formatTracepointMoney(decision.expectedCostNoAct)}
                </div>
                <div className="tracepoint__precision-note">
                  Figures may differ slightly because calculations use unrounded values.
                </div>
              </div>
            </div>
          </div>
          <ActionLadder review={review} decision={decision} recommendation={actionRecommendation} />
        </article>
      </section>

      <section className="panel tracepoint__reviewer">
        <div className="panel__head">
          <div>
            <div className="eyebrow">Team workflow</div>
            <h2>Keep the review human and the handoff visible</h2>
          </div>
        </div>
        <div className="tracepoint__reviewer-note">
          The score prepares a review. A reviewer decides whether action is justified.
        </div>
        <div className="tracepoint__reviewer-grid">
          <div className="tracepoint__reviewer-main">
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
          </div>

          <div className="tracepoint__workflow-panel">
            <div className="mini-card">
              <div className="card-label">Team queue</div>
              <div className="tracepoint__queue-state">{workflowStatus}</div>
              <div className="tracepoint__queue-meta">
                <span>Owner</span>
                <strong>{workflowOwner}</strong>
              </div>
              <div className="tracepoint__queue-meta">
                <span>Next handoff</span>
                <strong>{workflowNextHandoff}</strong>
              </div>
              <div className="tracepoint__queue-meta">
                <span>Response target</span>
                <strong>{workflowResponseSla}</strong>
              </div>
            </div>

            <div className="tracepoint__queue-list">
              {workflowQueue.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={
                    item.active ? "tracepoint__queue-item is-active" : "tracepoint__queue-item"
                  }
                  onClick={() => routeWorkflow(item)}
                >
                  <span className="tracepoint__queue-item-title">{item.label}</span>
                  <span className="tracepoint__queue-item-detail">{item.detail}</span>
                  <span className="tracepoint__queue-item-response">{item.response}</span>
                </button>
              ))}
            </div>

            <div className="mini-card">
              <div className="card-label">Audit trail</div>
              <div className="tracepoint__audit-trail">
                {auditTrail.slice(0, 4).map((entry) => (
                  <div
                    key={`${entry.timestamp}-${entry.message}`}
                    className="tracepoint__audit-entry"
                  >
                    <span>{formatAuditStamp(entry.timestamp)}</span>
                    <strong>{entry.message}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="tracepoint__workflow-actions">
              <button type="button" className="pill pill--primary" onClick={exportHandoverReport}>
                Export Handover Report
              </button>
              <div className="tracepoint__workflow-note">
                Shift handover captures the current queue, notes, and audit trail for the next
                reviewer.
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
        <details className="tracepoint__details tracepoint__details--compact">
          <summary>Calibration findings and limits</summary>
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
                  <strong>
                    {evaluationSummary.leadTimeHours === null
                      ? "n/a"
                      : `${evaluationSummary.leadTimeHours}h`}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </details>
      </section>

      <footer className="tracepoint__footer">
        <div className="tracepoint__footer-copy">Synthetic calibration demo only.</div>
        <button type="button" className="pill pill--primary" onClick={exportPacket}>
          Export Review Packet
        </button>
      </footer>
    </section>
  );
}
