import {
  buildTracepointRows,
  buildTracepointReviewPacket,
  calculateTracepointDecision,
  calculateTracepointReview,
  getTracepointDecisionInputsFromScore,
  getTracepointDecisionReadout,
  getTracepointScenarioById,
  getTracepointStatus
} from "./tracepoint.js";

describe("tracepoint", () => {
  it("builds a deterministic 7-day hourly dataset for Pump Station P-204", () => {
    const rows = buildTracepointRows();
    const rowsAgain = buildTracepointRows();

    expect(rows).toHaveLength(168);
    expect(rows[0].asset_id).toBe("P-204");
    expect(rows[0].synthetic_truth_label).toBe("normal");
    expect(rows[167].synthetic_truth_label).toBe("pressure_instability");
    expect(rows.every((row) => row.asset_id === "P-204")).toBe(true);
    expect(rowsAgain).toEqual(rows);
  });

  it("builds a deterministic alternate dataset for Compressor C-118", () => {
    const rows = buildTracepointRows("compressor-c-118");

    expect(rows).toHaveLength(168);
    expect(rows[0].asset_id).toBe("C-118");
    expect(rows[0].synthetic_truth_label).toBe("normal");
    expect(rows.some((row) => row.synthetic_truth_label === "seal_wear_plus_pressure_ripple")).toBe(true);
    expect(rows[167].operating_state).toBe("Running");
  });

  it("labels the combined score using the visible thresholds", () => {
    expect(getTracepointStatus(0)).toBe("Normal");
    expect(getTracepointStatus(33.9)).toBe("Normal");
    expect(getTracepointStatus(34)).toBe("Watch");
    expect(getTracepointStatus(66.9)).toBe("Watch");
    expect(getTracepointStatus(67)).toBe("Review Recommended");
  });

  it("scores the synthetic scenario as review recommended and identifies the main driver", () => {
    const review = calculateTracepointReview(buildTracepointRows());

    expect(review.combinedScore).toBeGreaterThanOrEqual(67);
    expect(review.status).toBe("Review Recommended");
    expect(review.mainDriver).toBe("vibration_rms");
    expect(review.summary.totalWindows).toBe(168);
    expect(review.summary.knownSyntheticWearWindows).toBe(126);
    expect(review.summary.reviewFlagsRaised).toBe(110);
    expect(review.summary.truePositiveWindows).toBe(110);
    expect(review.summary.falseAlarms).toBe(0);
    expect(review.summary.missedSyntheticAnomalyWindows).toBe(16);
    expect(review.summary.leadTimeHours).toBe(76);
    expect(review.summary.reviewFlagsRaised).toBeGreaterThan(0);
    expect(review.summary.knownSyntheticWearWindows).toBe(
      review.summary.truePositiveWindows + review.summary.missedSyntheticAnomalyWindows
    );
    expect(review.summary.reviewFlagsRaised).toBe(
      review.summary.truePositiveWindows + review.summary.falseAlarms
    );
    expect(review.summary.leadTimeHours).not.toBeNull();
  });

  it("matches the live UI snapshot for the last review window", () => {
    const review = calculateTracepointReview(buildTracepointRows());

    expect(review.combinedScore).toBeCloseTo(100, 1);
    expect(review.sensorMap.vibration_rms.ewmaCurrent).toBeCloseTo(2.903, 3);
    expect(review.sensorMap.bearing_temperature.ewmaCurrent).toBeCloseTo(75.391, 3);
    expect(review.sensorMap.pressure.ewmaCurrent).toBeCloseTo(101.153, 3);
    expect(review.sensorMap.flow_rate.ewmaCurrent).toBeCloseTo(233.85, 2);
    expect(review.sensorMap.vibration_rms.robustZ).toBeCloseTo(17.56, 2);
    expect(review.sensorMap.bearing_temperature.robustZ).toBeCloseTo(87.35, 2);
    expect(Math.abs(review.sensorMap.pressure.robustZ)).toBeCloseTo(8.32, 2);
    expect(Math.abs(review.sensorMap.flow_rate.robustZ)).toBeCloseTo(9.49, 2);
    expect(review.sensorMap.vibration_rms.persistenceCount).toBe(12);
    expect(review.sensorMap.bearing_temperature.persistenceCount).toBe(12);
    expect(review.sensorMap.pressure.persistenceCount).toBe(2);
    expect(review.sensorMap.flow_rate.persistenceCount).toBe(12);
  });

  it("scores the alternate scenario independently", () => {
    const review = calculateTracepointReview(buildTracepointRows("compressor-c-118"));

    expect(review.combinedScore).toBeGreaterThan(34);
    expect(["Watch", "Review Recommended"]).toContain(review.status);
    expect(review.summary.totalWindows).toBe(168);
    expect(review.summary.knownSyntheticWearWindows).toBeGreaterThan(0);
  });

  it("calculates expected costs with the requested breakeven logic", () => {
    const decision = calculateTracepointDecision({
      inspectionCost: 91900,
      missCost: 163900,
      calibratedProbability: 0.83,
      detectionRate: 0.934,
      followThroughRate: 0.937,
      harmReduction: 0.49
    });

    expect(decision.expectedCostAct).toBeCloseTo(
      91900 + 0.83 * 163900 * (1 - 0.934 * 0.937 * 0.49),
      2
    );
    expect(decision.expectedCostAct).toBeCloseTo(169601, 0);
    expect(decision.expectedCostNoAct).toBeCloseTo(136037, 0);
    expect(decision.effectiveHarmReduction).toBeCloseTo(0.934 * 0.937 * 0.49, 6);
    expect(decision.economicallyJustified).toBe(false);
    expect(decision.expectedGap).toBeLessThan(0);
  });

  it("builds a packet with the expected export fields", () => {
    const scenario = getTracepointScenarioById("pump-station-p-204");
    const rows = buildTracepointRows();
    const review = calculateTracepointReview(rows);
    const inputs = getTracepointDecisionInputsFromScore(review.combinedScore);
    const decision = calculateTracepointDecision({
      inspectionCost: 9200,
      missCost: 180000,
      calibratedProbability: inputs.calibratedProbability,
      harmReduction: inputs.harmReduction
    });
    const packet = buildTracepointReviewPacket({
      scenario,
      review,
      decision,
      reviewerMark: "valid concern",
      reviewerNotes: "Check bearing housing and confirm pressure transmitter calibration.",
      exportTimestamp: "2026-06-22T00:00:00.000Z"
    });

    expect(packet.scenario_metadata.asset_id).toBe("P-204");
    expect(packet.current_scores.status).toBe(review.status);
    expect(packet.reviewer_mark).toBe("valid concern");
    expect(packet.cost_inputs.calibrated_probability_issue_is_real).toBe(inputs.calibratedProbability);
    expect(packet.limitation_statement).toMatch(/synthetic calibration demo only/i);
    expect(packet.export_timestamp).toBe("2026-06-22T00:00:00.000Z");
  });

  it("summarizes the signal and economics readout for the decision card", () => {
    const review = calculateTracepointReview(buildTracepointRows());
    const inputs = getTracepointDecisionInputsFromScore(review.combinedScore);
    const decision = calculateTracepointDecision({
      inspectionCost: 91900,
      missCost: 163900,
      calibratedProbability: inputs.calibratedProbability,
      detectionRate: inputs.detectionRate,
      followThroughRate: inputs.followThroughRate,
      harmReduction: inputs.harmReduction
    });

    const readout = getTracepointDecisionReadout(review, decision);

    expect(readout.signalSummary).toBe("High signal");
    expect(readout.economicSummary).toBe("Economics lean against acting");
    expect(readout.reviewNote).toMatch(/review is justified on the evidence signal/i);
  });

  it("keeps the calibration summary consistent with rolling review flags", () => {
    const rows = buildTracepointRows();
    const review = calculateTracepointReview(rows);
    const rollingFlags = rows.reduce((count, _, index) => {
      const prefixReview = calculateTracepointReview(rows.slice(0, index + 1));
      return prefixReview.status === "Review Recommended" ? count + 1 : count;
    }, 0);

    expect(review.summary.totalWindows).toBe(168);
    expect(review.summary.knownSyntheticWearWindows).toBe(126);
    expect(review.summary.reviewFlagsRaised).toBe(rollingFlags);
    expect(review.summary.falseAlarms).toBe(0);
    expect(review.summary.missedSyntheticAnomalyWindows).toBe(16);
    expect(review.summary.leadTimeHours).toBe(76);
  });
});
