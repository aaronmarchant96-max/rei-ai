export const CARDO_GUARD_SCENARIOS = [
  {
    id: "road-closure-reroute",
    label: "Road closure reroute",
    summary:
      "A route disruption threatens a fuel delivery. Rerouting is expensive, but missing the closure could stall work on site.",
    defaultConfidence: 89,
    defaultCostToAct: 17000,
    defaultCostToMiss: 1465000
  },
  {
    id: "compressor-anomaly",
    label: "Compressor anomaly",
    summary:
      "A vibration spike suggests a compressor may need a planned shutdown. Acting early is cheaper than an unplanned failure.",
    defaultConfidence: 91,
    defaultCostToAct: 42000,
    defaultCostToMiss: 850000
  },
  {
    id: "routine-inspection-nudge",
    label: "Routine inspection nudge",
    summary:
      "A lower-stakes reminder suggests an inspection, but the real-world consequence of missing it is limited.",
    defaultConfidence: 78,
    defaultCostToAct: 80000,
    defaultCostToMiss: 90000
  }
];

export function getScenarioById(id) {
  return CARDO_GUARD_SCENARIOS.find((scenario) => scenario.id === id) || CARDO_GUARD_SCENARIOS[0];
}

export function getSyntheticFalseAlarmRate(confidence) {
  const numericConfidence = Number(confidence);

  if (numericConfidence >= 94) return 0.09;
  if (numericConfidence >= 88) return 0.15;
  if (numericConfidence >= 80) return 0.31;
  if (numericConfidence >= 70) return 0.44;
  return 0.57;
}

export function getConfidenceBand(confidence) {
  const numericConfidence = Number(confidence);

  if (numericConfidence >= 94) return "very high";
  if (numericConfidence >= 88) return "high";
  if (numericConfidence >= 80) return "moderate";
  if (numericConfidence >= 70) return "low";
  return "very low";
}

function toMoneyNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
}

export function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(toMoneyNumber(value));
}

export function calculateCardoGuardReview({
  scenarioId,
  confidence,
  costToAct,
  costToMiss
}) {
  const scenario = getScenarioById(scenarioId);
  const numericConfidence = Math.max(0, Math.min(100, Number(confidence) || 0));
  const numericCostToAct = toMoneyNumber(costToAct);
  const numericCostToMiss = toMoneyNumber(costToMiss);
  const falseAlarmRate = getSyntheticFalseAlarmRate(numericConfidence);
  const calibratedEventLikelihood = 1 - falseAlarmRate;
  const confidenceBand = getConfidenceBand(numericConfidence);
  const expectedActionWaste = numericCostToAct * falseAlarmRate;
  const expectedMissLoss = numericCostToMiss * calibratedEventLikelihood;
  const recommendation = expectedMissLoss > expectedActionWaste ? "ACT" : "DO NOT ACT";
  const margin = Math.abs(expectedMissLoss - expectedActionWaste);
  const shouldAct = recommendation === "ACT";

  return {
    scenario,
    confidence: numericConfidence,
    confidenceBand,
    costToAct: numericCostToAct,
    costToMiss: numericCostToMiss,
    falseAlarmRate,
    calibratedEventLikelihood,
    expectedActionWaste,
    expectedMissLoss,
    recommendation,
    margin,
    shouldAct,
    explanation: shouldAct
      ? `Acting clears the gate because the risk-adjusted cost of missing it is higher than the expected waste of acting.`
      : `Do not act because the expected waste of acting is higher than the risk-adjusted cost of missing it.`
  };
}

export function buildCardoGuardComparison(review) {
  if (review.shouldAct) {
    return [
      "Raise the cost of acting.",
      "Show a higher calibrated false-alarm band.",
      "Prove the miss cost is smaller than assumed.",
      "Show that the disruption impact is smaller or less likely than assumed."
    ];
  }

  return [
    "Lower the cost of acting.",
    "Show a lower calibrated false-alarm band.",
    "Prove the miss cost is larger than assumed.",
    "Narrow the action so the response is cheaper."
  ];
}

export function buildCardoGuardWhyThisVerdict(review) {
  return [
    `Action waste = ${formatMoney(review.costToAct)} × ${Math.round(review.falseAlarmRate * 100)}% = ${formatMoney(review.expectedActionWaste)}`,
    `Miss loss = ${formatMoney(review.costToMiss)} × ${Math.round(review.calibratedEventLikelihood * 100)}% = ${formatMoney(review.expectedMissLoss)}`
  ];
}
