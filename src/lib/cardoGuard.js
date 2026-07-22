/**
 * CARDO GUARD - Cost decision engine for LLM routing
 * 
 * Implements thermodynamic trade-off analysis: Expected Miss Loss > Expected Action Waste
 * Uses confidence bands to determine false alarm rates and make escalation decisions.
 */
export const CARDO_GUARD_SCENARIOS = [
  {
    id: "road-closure-reroute",
    label: "Road closure reroute",
    summary:
      "A route disruption threatens a fuel delivery. Rerouting is expensive, but missing the closure could stall work on site.",
    defaultConfidence: 89,
    defaultCostToAct: 17000,
    defaultCostToMiss: 1465000,
  },
  {
    id: "compressor-anomaly",
    label: "Compressor anomaly",
    summary:
      "A vibration spike suggests a compressor may need a planned shutdown. Acting early is cheaper than an unplanned failure.",
    defaultConfidence: 91,
    defaultCostToAct: 42000,
    defaultCostToMiss: 850000,
  },
  {
    id: "routine-inspection-nudge",
    label: "Routine inspection nudge",
    summary:
      "A lower-stakes reminder suggests an inspection, but the real-world consequence of missing it is limited.",
    defaultConfidence: 78,
    defaultCostToAct: 80000,
    defaultCostToMiss: 90000,
  },
];

/**
 * getScenarioById — Retrieves a CARDO GUARD scenario by its ID.
 * @param {string} id - Scenario identifier
 * @returns {Object} Matching scenario or the first scenario as default
 */
export function getScenarioById(id) {
  return CARDO_GUARD_SCENARIOS.find((scenario) => scenario.id === id) || CARDO_GUARD_SCENARIOS[0];
}

/**
 * @param {number} confidence
 * @returns {number} false alarm rate between 0.09 and 0.57
 */
export function getSyntheticFalseAlarmRate(confidence) {
  const numericConfidence = Number(confidence);

  if (numericConfidence >= 95) return 0.09;
  if (numericConfidence >= 90) return 0.15;
  if (numericConfidence >= 85) return 0.31;
  if (numericConfidence >= 75) return 0.44;
  return 0.57;
}

/**
 * @param {number} confidence
 * @returns {"very high"|"high"|"moderate"|"low"|"very low"}
 */
export function getConfidenceBand(confidence) {
  const numericConfidence = Number(confidence);

  if (numericConfidence >= 95) return "very high";
  if (numericConfidence >= 90) return "high";
  if (numericConfidence >= 85) return "moderate";
  if (numericConfidence >= 75) return "low";
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
    maximumFractionDigits: 0,
  }).format(toMoneyNumber(value));
}

/**
 * Calculates the miss-cost threshold at which expected miss loss equals expected action waste.
 *
 * Formula: (costToAct × falseAlarmRate) / (1 - falseAlarmRate)
 * Returns 0 if falseAlarmRate is exactly 1 (defensive edge case).
 *
 * This is the exact hinge point: below it (for the current recommendation), one side wins;
 * above it, the other side wins.
 */
export function calculateBreakevenMissCost(costToAct, falseAlarmRate) {
  const numericCost = toMoneyNumber(costToAct);
  const rate = Number(falseAlarmRate);

  if (rate === 1) return 0;
  return (numericCost * rate) / (1 - rate);
}

export function calculateCardoGuardReview({ scenarioId, confidence, costToAct, costToMiss }) {
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

  // New: How many times stronger is the winning side compared to the losing side?
  const decisionMarginRatio =
    expectedActionWaste === 0 && expectedMissLoss === 0
      ? 1
      : expectedActionWaste === 0
        ? Infinity
        : Math.max(expectedMissLoss, expectedActionWaste) /
          Math.min(expectedMissLoss, expectedActionWaste);

  // Decision strength label
  let decisionStrength = "Very Close";
  if (decisionMarginRatio >= 5) decisionStrength = "Very Strong";
  else if (decisionMarginRatio >= 2.5) decisionStrength = "Strong";
  else if (decisionMarginRatio >= 1.5) decisionStrength = "Moderate";
  else if (decisionMarginRatio >= 1.1) decisionStrength = "Weak";

  // New: What would the cost of missing need to be for the recommendation to flip?
  const breakevenMissCost = calculateBreakevenMissCost(numericCostToAct, falseAlarmRate);

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
    decisionMarginRatio,
    breakevenMissCost,
    decisionStrength,
    shouldAct,
    explanation: shouldAct
      ? `Acting clears the gate because the risk-adjusted cost of missing it is higher than the expected waste of acting.`
      : `Do not act because the expected waste of acting is higher than the risk-adjusted cost of missing it.`,
  };
}

export function buildCardoGuardComparison(review) {
  if (review.shouldAct) {
    return [
      "Make acting more expensive.",
      "Show this score band is wrong more often than assumed.",
      "Prove the miss cost is smaller than assumed.",
      "Show that the disruption impact is smaller or less likely than assumed.",
    ];
  }

  return [
    "Make acting cheaper.",
    "Show this score band is wrong less often than assumed.",
    "Prove the miss cost is larger than assumed.",
    "Narrow the action so the response costs less.",
  ];
}

export function buildCardoGuardWhyThisVerdict(review) {
  const lines = [
    `Action waste = ${formatMoney(review.costToAct)} × ${Math.round(review.falseAlarmRate * 100)}% = ${formatMoney(review.expectedActionWaste)}`,
    `Miss loss = ${formatMoney(review.costToMiss)} × ${Math.round(review.calibratedEventLikelihood * 100)}% = ${formatMoney(review.expectedMissLoss)}`,
  ];

  // Add breakeven insight when useful
  if (review.breakevenMissCost > 0) {
    lines.push(
      `Breakeven miss cost = ${formatMoney(review.breakevenMissCost)}. At this point, miss loss and action waste are equal.`
    );
  }

  return lines;
}

/**
 * CARDO GUARD as cost-governor. Determines whether expensive inference
 * is justified for a given routing decision.
 *
 * @param {Object} params
 * @param {number} params.confidence - routing confidence (0-1)
 * @param {string} params.pathway - current pathway tier
 * @param {number} params.estimatedCost - cost of current pathway
 * @param {number} params.premiumCost - cost of premium pathway
 * @param {string} params.qualityGate - quality requirements
 * @returns {{ escalate: boolean, reason: string }}
 */
/**
 * shouldEscalateToRemote — Determines if a request should escalate to a premium model.
 * Uses CARDO GUARD logic: escalates if Expected Miss Loss > Expected Action Waste.
 * @param {Object} options - Escalation options
 * @param {number} options.confidence - Routing confidence (0-1)
 * @param {string} options.pathway - Current pathway tier (deterministic/cheap/medium/premium)
 * @param {number} options.estimatedCost - Cost of current pathway
 * @param {number} options.premiumCost - Cost of premium pathway
 * @param {string} options.qualityGate - Quality requirements
 * @returns {Object} Escalation decision with reason
 */
export function shouldEscalateToRemote({
  confidence = 0,
  pathway = "medium",
  estimatedCost = 0,
  premiumCost = 0,
  qualityGate = "",
}) {
  if (pathway === "deterministic") {
    return {
      escalate: false,
      reason: "Deterministic pathway has maximum confidence (1.0). No escalation needed.",
    };
  }

  if (pathway === "premium") {
    return {
      escalate: false,
      reason: "Already using premium pathway. No higher tier available.",
    };
  }

  if (pathway === "cheap" && confidence < 0.5) {
    return {
      escalate: true,
      reason: `Cheap pathway confidence (${(confidence * 100).toFixed(0)}%) below quality threshold. Escalate to medium or premium.`,
      expectedQuality: confidence * 100,
      expectedCost: premiumCost,
    };
  }

  if (pathway === "medium" && confidence < 0.3) {
    return {
      escalate: true,
      reason: `Medium pathway confidence (${(confidence * 100).toFixed(0)}%) below threshold. Consider premium pathway.`,
      expectedQuality: confidence * 100,
      expectedCost: premiumCost,
    };
  }

  return {
    escalate: false,
    reason: `Confidence (${(confidence * 100).toFixed(0)}%) meets pathway quality threshold. Remote inference justified.`,
    expectedQuality: confidence * 100,
    expectedCost: estimatedCost,
  };
}
