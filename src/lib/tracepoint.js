const TRACEPOINT_START = new Date("2026-06-15T08:00:00-06:00");
const HOURS_PER_DAY = 24;
const WINDOW_HOURS = 7 * HOURS_PER_DAY;
const BASELINE_HOURS = 24;
const RECENT_HOURS = 12;
const ESCALATION_HOUR = 128;

export const TRACEPOINT_SCENARIOS = [
  {
    id: "pump-station-p-204",
    label: "Pump Station P-204",
    assetId: "P-204",
    subtitle: "Gradual bearing wear with a later pressure instability event.",
    profile: {
      vibrationBase: 1.95,
      vibrationWearGain: 0.95,
      vibrationPressureCoupling: 0.08,
      temperatureBase: 61.5,
      temperatureWearGain: 3.6,
      temperatureInstabilityGain: 2.8,
      temperatureLateGain: 4.2,
      temperatureFinalGain: 4.8,
      pressureBase: 103.5,
      pressureWearDrop: 0.9,
      pressureInstabilityDrop: 0.7,
      pressureTransientAmplitude: 2.4,
      pressureTransientCycle: 4,
      flowBase: 246.8,
      flowWearDrop: 8.6,
      flowInstabilityDrop: 3.8,
      rpmBase: 1784,
      rpmEscalationBase: 1768,
      currentBase: 37.8,
      currentWearGain: 3.3,
      currentInstabilityGain: 1.6,
      runningStateLabel: "Running",
      wearStartHour: 42,
      pressureInstabilityHour: 120,
      escalationHour: 128,
      lateThermalStartHour: 108,
      lateThermalPeakHour: 156,
      scenarioStatusLabel: "Running",
      steadyStateLabel: "steady",
      wearStateLabel: "reduced efficiency",
      instabilityStateLabel: "loaded",
      truthWearLabel: "bearing_wear",
      truthInstabilityLabel: "pressure_instability",
      truthCombinedLabel: "wear_plus_pressure_instability"
    }
  },
  {
    id: "compressor-c-118",
    label: "Compressor C-118",
    assetId: "C-118",
    subtitle: "Seal heating and discharge pressure ripple after a load change.",
    profile: {
      vibrationBase: 1.62,
      vibrationWearGain: 1.12,
      vibrationPressureCoupling: 0.04,
      temperatureBase: 54.2,
      temperatureWearGain: 2.7,
      temperatureInstabilityGain: 5.4,
      temperatureLateGain: 2.6,
      temperatureFinalGain: 3.2,
      pressureBase: 118.6,
      pressureWearDrop: 1.3,
      pressureInstabilityDrop: 1.8,
      pressureTransientAmplitude: 3.2,
      pressureTransientCycle: 3,
      flowBase: 318.4,
      flowWearDrop: 10.2,
      flowInstabilityDrop: 6.5,
      rpmBase: 3572,
      rpmEscalationBase: 3538,
      currentBase: 49.8,
      currentWearGain: 2.8,
      currentInstabilityGain: 3.9,
      runningStateLabel: "Running",
      wearStartHour: 30,
      pressureInstabilityHour: 102,
      escalationHour: 138,
      lateThermalStartHour: 86,
      lateThermalPeakHour: 146,
      scenarioStatusLabel: "Running",
      steadyStateLabel: "steady",
      wearStateLabel: "seal wear watch",
      instabilityStateLabel: "pressure watch",
      truthWearLabel: "seal_wear",
      truthInstabilityLabel: "pressure_ripple",
      truthCombinedLabel: "seal_wear_plus_pressure_ripple"
    }
  }
];

export const TRACEPOINT_STATUS_THRESHOLDS = {
  normal: 34,
  watch: 67
};

export const TRACEPOINT_REVIEW_MARKS = [
  "valid concern",
  "false alarm",
  "needs more data"
];

export const TRACEPOINT_SENSOR_RULES = [
  {
    key: "vibration_rms",
    label: "Vibration",
    unit: "vibration",
    weight: 0.35,
    expectedDirection: 1
  },
  {
    key: "bearing_temperature",
    label: "Bearing temperature",
    unit: "temp",
    weight: 0.3,
    expectedDirection: 1
  },
  {
    key: "pressure",
    label: "Pressure",
    unit: "pressure",
    weight: 0.2,
    expectedDirection: -1
  },
  {
    key: "flow_rate",
    label: "Flow rate",
    unit: "flow",
    weight: 0.15,
    expectedDirection: -1
  }
];

export function getTracepointScenarioById(id) {
  return TRACEPOINT_SCENARIOS.find((scenario) => scenario.id === id) || TRACEPOINT_SCENARIOS[0];
}

export function getTracepointScenarioByAssetId(assetId) {
  return TRACEPOINT_SCENARIOS.find((scenario) => scenario.assetId === assetId) || TRACEPOINT_SCENARIOS[0];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundTo(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function mad(values) {
  if (!values.length) return 0;
  const center = median(values);
  return median(values.map((value) => Math.abs(value - center)));
}

function formatIsoHour(date) {
  return date.toISOString();
}

function wave(hourIndex, cycle, amplitude = 1) {
  return Math.sin((hourIndex / cycle) * Math.PI * 2) * amplitude;
}

function buildTimestamp(hourIndex) {
  return formatIsoHour(new Date(TRACEPOINT_START.getTime() + hourIndex * 60 * 60 * 1000));
}

export function buildTracepointRows(scenarioId = TRACEPOINT_SCENARIOS[0].id) {
  const scenario = getTracepointScenarioById(scenarioId);
  const profile = scenario.profile;
  const rows = [];

  for (let hourIndex = 0; hourIndex < WINDOW_HOURS; hourIndex += 1) {
    const timestamp = buildTimestamp(hourIndex);
    const isWearWindow = hourIndex >= profile.wearStartHour;
    const isPressureInstabilityWindow = hourIndex >= profile.pressureInstabilityHour;
    const isEscalationWindow = hourIndex >= profile.escalationHour;

    const wearRamp = clamp((hourIndex - profile.wearStartHour) / (profile.escalationHour - profile.wearStartHour), 0, 1);
    const instabilityRamp = clamp((hourIndex - profile.pressureInstabilityHour) / (profile.escalationHour - profile.pressureInstabilityHour), 0, 1);

    const vibrationBase = profile.vibrationBase + wearRamp * profile.vibrationWearGain;
    const vibrationRms = roundTo(
      vibrationBase + wave(hourIndex, 12, 0.07) + wave(hourIndex, 7, 0.04) + wearRamp * profile.vibrationPressureCoupling,
      3
    );

    const thermalRamp = clamp((hourIndex - 72) / 72, 0, 1);
    const lateThermalRamp = clamp((hourIndex - profile.lateThermalStartHour) / (profile.escalationHour - profile.lateThermalStartHour), 0, 1);
    const lateRunUp = clamp((hourIndex - profile.lateThermalPeakHour) / (profile.escalationHour - profile.lateThermalPeakHour || 1), 0, 1);
    const bearingTemperatureBase =
      profile.temperatureBase +
      thermalRamp * profile.temperatureWearGain +
      wearRamp * profile.temperatureWearGain +
      instabilityRamp * profile.temperatureInstabilityGain +
      lateThermalRamp * profile.temperatureLateGain +
      lateRunUp * profile.temperatureFinalGain;
    const bearingTemperature = roundTo(
      bearingTemperatureBase + wave(hourIndex, 24, 0.12) + wave(hourIndex, 9, 0.06) + wearRamp * 0.05,
      2
    );

    const pressureBase = profile.pressureBase - wearRamp * profile.pressureWearDrop - instabilityRamp * profile.pressureInstabilityDrop;
    const pressureTransient = isPressureInstabilityWindow
      ? wave(hourIndex - profile.pressureInstabilityHour, profile.pressureTransientCycle, profile.pressureTransientAmplitude) +
        wave(hourIndex - profile.pressureInstabilityHour, profile.pressureTransientCycle * 2, profile.pressureTransientAmplitude / 2)
      : wave(hourIndex, 18, 0.35);
    const pressure = roundTo(pressureBase + pressureTransient, 2);

    const flowBase = profile.flowBase - wearRamp * profile.flowWearDrop - instabilityRamp * profile.flowInstabilityDrop;
    const flowRate = roundTo(flowBase + wave(hourIndex, 24, 2.1) - wave(hourIndex, 8, 0.8), 2);

    const rpmBase = isEscalationWindow ? profile.rpmEscalationBase : profile.rpmBase;
    const rpm = Math.round(rpmBase + wave(hourIndex, 24, 4.5) - wearRamp * 3);

    const motorCurrent = roundTo(
      profile.currentBase + wearRamp * profile.currentWearGain + instabilityRamp * profile.currentInstabilityGain + wave(hourIndex, 12, 0.55),
      2
    );

    const operatingState = isEscalationWindow
      ? profile.scenarioStatusLabel
      : profile.runningStateLabel;

    const syntheticTruthLabel = isEscalationWindow
      ? profile.truthInstabilityLabel
      : isPressureInstabilityWindow && isWearWindow
        ? profile.truthCombinedLabel
        : isWearWindow
          ? profile.truthWearLabel
          : "normal";

    rows.push({
      timestamp,
      asset_id: scenario.assetId,
      vibration_rms: vibrationRms,
      bearing_temperature: bearingTemperature,
      pressure,
      flow_rate: flowRate,
      rpm,
      motor_current: motorCurrent,
      operating_state: operatingState,
      synthetic_truth_label: syntheticTruthLabel
    });
  }

  return rows;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function latestWindow(rows, key, size) {
  return rows.slice(-size).map((row) => row[key]);
}

function baselineWindow(rows, key) {
  return rows.slice(0, BASELINE_HOURS).map((row) => row[key]);
}

function calculateEwma(values, alpha = 0.25, seed = values[0] || 0) {
  let current = seed;
  for (const value of values) {
    current = alpha * value + (1 - alpha) * current;
  }
  return current;
}

function countConsecutiveAboveThreshold(values, threshold, expectedDirection) {
  let count = 0;
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    const isAbove =
      expectedDirection >= 0 ? value >= threshold : value <= threshold;
    if (isAbove) {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

function getBaselineRows(rows, scenario) {
  const steadyRows = rows.filter((row) => row.operating_state === scenario.profile.steadyStateLabel);
  return steadyRows.length >= BASELINE_HOURS ? steadyRows.slice(0, BASELINE_HOURS) : rows.slice(0, BASELINE_HOURS);
}

export function getTracepointStatus(score) {
  if (score >= TRACEPOINT_STATUS_THRESHOLDS.watch) return "Review Recommended";
  if (score >= TRACEPOINT_STATUS_THRESHOLDS.normal) return "Watch";
  return "Normal";
}

function calculateSensorEvidence(rows, sensor, scenario) {
  const baselineRows = getBaselineRows(rows, scenario);
  const baselineValues = baselineRows.map((row) => row[sensor.key]);
  const recentValues = latestWindow(rows, sensor.key, RECENT_HOURS);
  const baselineMedian = median(baselineValues);
  const baselineMad = mad(baselineValues);
  const scale = 1.4826 * baselineMad + 0.000001;
  const seed = baselineValues[baselineValues.length - 1] ?? baselineMedian;
  const ewmaCurrent = calculateEwma(recentValues, 0.25, seed);
  const signedDelta = (ewmaCurrent - baselineMedian) * sensor.expectedDirection;
  const robustZ = Math.abs(signedDelta) / scale;
  const contribution = roundTo(sensor.weight * clamp(robustZ / 3, 0, 1) * (signedDelta > 0 ? 1 : 0.2) * 100, 1);
  const threshold = baselineMedian + sensor.expectedDirection * scale * 1.15;
  const persistenceCount = countConsecutiveAboveThreshold(recentValues, threshold, sensor.expectedDirection);
  const persistenceBoost = persistenceCount >= 3 ? 1 + Math.min(persistenceCount - 2, 5) * 0.06 : 1;
  const driftPercent = baselineMedian === 0 ? 0 : ((ewmaCurrent - baselineMedian) / baselineMedian) * 100;

  return {
    key: sensor.key,
    label: sensor.label,
    unit: sensor.unit,
    weight: sensor.weight,
    expectedDirection: sensor.expectedDirection,
    baselineMedian: roundTo(baselineMedian, 3),
    baselineMad: roundTo(baselineMad, 3),
    ewmaCurrent: roundTo(ewmaCurrent, 3),
    latestValue: roundTo(recentValues[recentValues.length - 1] ?? 0, 3),
    driftPercent: roundTo(driftPercent, 1),
    signedDelta: roundTo(signedDelta, 3),
    robustZ: roundTo(robustZ, 2),
    persistenceCount,
    persistenceBoost: roundTo(persistenceBoost, 2),
    contribution
  };
}

function calculateConcordance(sensorDetails) {
  const totalPairs = (sensorDetails.length * (sensorDetails.length - 1)) / 2;
  if (!totalPairs) return 0;

  let agreeingPairs = 0;
  for (let left = 0; left < sensorDetails.length; left += 1) {
    for (let right = left + 1; right < sensorDetails.length; right += 1) {
      const a = sensorDetails[left];
      const b = sensorDetails[right];
      const aActive = a.robustZ >= 1;
      const bActive = b.robustZ >= 1;
      const sameDirection = Math.sign(a.signedDelta) === Math.sign(b.signedDelta);
      if (aActive && bActive && sameDirection) {
        agreeingPairs += 1;
      }
    }
  }

  return roundTo(agreeingPairs / totalPairs, 2);
}

function calculateReviewMetrics(rows, scenario) {
  const sensorDetails = TRACEPOINT_SENSOR_RULES.map((sensor) => calculateSensorEvidence(rows, sensor, scenario));
  const sensorMap = Object.fromEntries(sensorDetails.map((detail) => [detail.key, detail]));
  const baseSignalScore = sensorDetails.reduce((sum, detail) => sum + detail.contribution, 0);
  const maxPersistence = Math.max(...sensorDetails.map((detail) => detail.persistenceCount));
  const persistenceMultiplier = 1 + Math.min(Math.max(maxPersistence - 2, 0), 4) * 0.05;
  const concordance = calculateConcordance(sensorDetails);
  const concordanceMultiplier = 0.75 + 0.25 * concordance;
  const combinedScore = roundTo(clamp(baseSignalScore * persistenceMultiplier * concordanceMultiplier, 0, 100), 1);
  const status = getTracepointStatus(combinedScore);
  const mainDriver = [...sensorDetails]
    .sort((a, b) => b.contribution - a.contribution || b.robustZ - a.robustZ)[0];

  return {
    sensorDetails,
    sensorMap,
    baseSignalScore: roundTo(baseSignalScore, 1),
    persistenceMultiplier: roundTo(persistenceMultiplier, 2),
    concordance,
    concordanceMultiplier: roundTo(concordanceMultiplier, 2),
    combinedScore,
    status,
    mainDriver: mainDriver ? mainDriver.key : TRACEPOINT_SENSOR_RULES[0].key
  };
}

export function calculateTracepointReview(rows) {
  const scenario = getTracepointScenarioByAssetId(rows[0]?.asset_id);
  const metrics = calculateReviewMetrics(rows, scenario);
  const latestRow = rows[rows.length - 1];
  const truthPositiveWindows = rows.filter((row) => row.synthetic_truth_label !== "normal");
  const reviewFlagWindows = rows.filter((row, index) => {
    const prefix = rows.slice(0, index + 1);
    return calculateReviewMetrics(prefix, scenario).status === "Review Recommended";
  });
  const truePositiveWindows = reviewFlagWindows.filter((row) => row.synthetic_truth_label !== "normal");
  const falseAlarms = reviewFlagWindows.filter((row) => row.synthetic_truth_label === "normal");
  const missedWindows = truthPositiveWindows.filter((row) =>
    !reviewFlagWindows.includes(row)
  );
  const firstFlagIndex = rows.findIndex((row, index) =>
    calculateReviewMetrics(rows.slice(0, index + 1), scenario).status === "Review Recommended"
  );
  const leadTimeHours = firstFlagIndex >= 0 ? Math.max(0, ESCALATION_HOUR - firstFlagIndex) : null;

  return {
    ...metrics,
    latestRow,
    summary: {
      totalWindows: rows.length,
      knownSyntheticWearWindows: truthPositiveWindows.length,
      reviewFlagsRaised: reviewFlagWindows.length,
      truePositiveWindows: truePositiveWindows.length,
      falseAlarms: falseAlarms.length,
      missedSyntheticAnomalyWindows: missedWindows.length,
      leadTimeHours
    }
  };
}

export function calculateTracepointDecision({
  inspectionCost,
  missCost,
  calibratedProbability,
  detectionRate,
  followThroughRate,
  harmReduction
}) {
  const numericInspectionCost = Math.max(0, Number(inspectionCost) || 0);
  const numericMissCost = Math.max(0, Number(missCost) || 0);
  const probability = clamp(Number(calibratedProbability) || 0, 0, 1);
  const detection = clamp(Number(detectionRate) || 0, 0, 1);
  const followThrough = clamp(Number(followThroughRate) || 0, 0, 1);
  const reduction = clamp(Number(harmReduction) || 0, 0, 0.95);
  const effectiveHarmReduction = detection * followThrough * reduction;
  const residualHarmAfterAction = 1 - effectiveHarmReduction;
  const expectedCostAct = numericInspectionCost + probability * numericMissCost * residualHarmAfterAction;
  const expectedCostNoAct = probability * numericMissCost;
  const economicallyJustified = expectedCostAct <= expectedCostNoAct;

  return {
    inspectionCost: numericInspectionCost,
    missCost: numericMissCost,
    calibratedProbability: probability,
    detectionRate: detection,
    followThroughRate: followThrough,
    harmReduction: reduction,
    effectiveHarmReduction,
    residualHarmAfterAction,
    expectedCostAct: roundTo(expectedCostAct, 2),
    expectedCostNoAct: roundTo(expectedCostNoAct, 2),
    economicallyJustified,
    expectedGap: roundTo(expectedCostNoAct - expectedCostAct, 2)
  };
}

export function getTracepointDecisionInputsFromScore(combinedScore) {
  const probability = clamp(0.15 + combinedScore * 0.0068, 0.15, 0.83);
  const detectionRate = clamp(0.7 + combinedScore * 0.00234, 0.7, 0.934);
  const followThroughRate = clamp(0.78 + combinedScore * 0.00157, 0.78, 0.937);
  const harmReduction = clamp(0.28 + combinedScore * 0.0021, 0.28, 0.49);

  return {
    calibratedProbability: roundTo(probability, 3),
    detectionRate: roundTo(detectionRate, 3),
    followThroughRate: roundTo(followThroughRate, 3),
    harmReduction: roundTo(harmReduction, 3)
  };
}

export function getTracepointDecisionReadout(review, decision) {
  const signalSummary =
    review.status === "Review Recommended"
      ? "High signal"
      : review.status === "Watch"
        ? "Moderate signal"
        : "Low signal";
  const gapSize = Math.abs(Number(decision?.expectedGap) || 0);
  const economicSummary =
    gapSize < 10000
      ? "Thin economics"
      : decision?.economicallyJustified
        ? "Economics support acting"
        : "Economics lean against acting";
  const reviewNote =
    decision?.economicallyJustified
      ? "Inspection is supported by both the signal and the expected-cost check."
      : "Review is justified on the evidence signal even though the expected-dollar case is weak.";

  return {
    signalSummary,
    economicSummary,
    reviewNote
  };
}

export function formatTracepointMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Math.max(0, Number(value) || 0));
}

export function formatTracepointPercent(value, digits = 0) {
  return `${(Number(value) * 100).toFixed(digits)}%`;
}

export function formatTracepointTimestamp(timestamp) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Edmonton"
  }).format(new Date(timestamp));
}

export function buildTracepointReviewPacket({
  scenario,
  review,
  decision,
  reviewerMark,
  reviewerNotes,
  exportTimestamp
}) {
  return {
    scenario_metadata: {
      scenario_id: scenario.id,
      asset_id: scenario.assetId,
      label: scenario.label,
      subtitle: scenario.subtitle,
      data_type: "Synthetic hourly sensor readings over 7 days"
    },
    current_scores: {
      combined_review_score: review.combinedScore,
      base_signal_score: review.baseSignalScore,
      concordance: review.concordance,
      persistence_multiplier: review.persistenceMultiplier,
      status: review.status,
      main_driver: review.mainDriver,
      sensor_evidence: review.sensorDetails
    },
    reviewer_mark: reviewerMark || "unmarked",
    reviewer_notes: reviewerNotes || "",
    cost_inputs: {
      inspection_cost: decision.inspectionCost,
      miss_cost: decision.missCost,
      calibrated_probability_issue_is_real: decision.calibratedProbability,
      inspection_detection_rate: decision.detectionRate,
      action_follow_through_rate: decision.followThroughRate,
      estimated_harm_reduction: decision.harmReduction
    },
    decision_result: {
      economically_justified: decision.economicallyJustified,
      expected_cost_act: decision.expectedCostAct,
      expected_cost_not_act: decision.expectedCostNoAct,
      expected_gap: decision.expectedGap,
      effective_harm_reduction: decision.effectiveHarmReduction,
      residual_harm_after_action: decision.residualHarmAfterAction
    },
    limitation_statement:
      "Synthetic calibration demo only. Not operational advice, not a forecasting system, and not a replacement for inspection, maintenance procedures, or safety controls.",
    export_timestamp: exportTimestamp
  };
}
