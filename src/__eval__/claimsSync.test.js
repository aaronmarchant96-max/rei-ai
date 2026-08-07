/**
 * CLAIMS SYNC GATE — the landing page claims "60–80% Deterministic Accuracy".
 * This gate recomputes accuracy over the canonical pooled eval dataset and
 * fails if the measured number drifts outside the claimed range. If the
 * router genuinely improves past 80% (or regresses below 60%), the badge
 * claim must be updated — this test forces that decision.
 *
 * Philosophy: the claim must match computed reality, and reality is
 * re-measured here on every CI run.
 */

import { buildPool, computeRouterScores } from "./hingeCalibrationDebate.js";

// The claimed range on ToolsLanding.jsx stat badge ("60–80% Deterministic Accuracy")
const CLAIMED_MIN = 60;
const CLAIMED_MAX = 80;

describe("CLAIMS SYNC GATE — accuracy claim verification", () => {
  let scored;

  beforeAll(() => {
    scored = computeRouterScores(buildPool());
  });

  it("scores the full pooled dataset", () => {
    expect(scored.length).toBeGreaterThanOrEqual(100);
  });

  it("measured deterministic accuracy stays within the claimed 60–80% range", () => {
    const correct = scored.filter((e) => e.routedLabel === e.domain).length;
    const accuracy = (correct / scored.length) * 100;
    // eslint-disable-next-line no-console
    console.log(
      `CLAIMS SYNC: pooled accuracy = ${accuracy.toFixed(1)}% (${correct}/${scored.length})`
    );
    expect(accuracy).toBeGreaterThanOrEqual(CLAIMED_MIN);
    expect(accuracy).toBeLessThanOrEqual(CLAIMED_MAX);
  });
});
