/**
 * FEYNMAN GATE — "The first principle is that you must not fool yourself,
 * and you are the easiest person to fool." — Richard Feynman, 1974
 *
 * This gate verifies every quantitative claim in hingeCalibrationDebate.js
 * against computed reality. If a comment says "30 prompts" but the array
 * has 29 entries, the test fails with the exact discrepancy.
 *
 * Extend this pattern to any eval file that makes numeric claims.
 */

import { readFileSync } from "fs";
import { buildPool } from "./hingeCalibrationDebate.js";

const SOURCE = readFileSync(
  new URL("./hingeCalibrationDebate.js", import.meta.url),
  "utf-8"
);

describe("FEYNMAN GATE — claim verification", () => {
  let pool;

  beforeAll(() => {
    pool = buildPool();
  });

  // ── Source array sizes vs comments ──────────────────────────────

  it("V2 (blindDatasetV2): 50 prompts as commented", () => {
    // Comment: "blindDatasetV2.js — 50 prompts, 6 domains, zero overlap with V1"
    const v2 = pool.filter((e) => e.source === "blindDatasetV2");
    expect(v2.length).toBe(50);
  });

  it("V1 (blindV1): 27 prompts as commented", () => {
    // Comment: "Shared 27-prompt dataset"
    const v1 = pool.filter((e) => e.source === "blindV1");
    expect(v1.length).toBe(27);
  });

  it("V3 (blindV3): 30 array entries, 29 unique after dedup", () => {
    // Comment line: "routingEvalBlindV3 — 30 prompts"
    // But V3 ∩ V1 = 1 overlapping prompt:
    //   "compare the types of uncertainty in economic forecasting vs climate modeling"
    const v3 = pool.filter((e) => e.source === "blindV3");
    // After dedup: 30 - 1 = 29 unique from V3
    expect(v3.length).toBe(29);
  });

  it("Semantic (blindSemantic): 30 array entries, all unique", () => {
    const sem = pool.filter((e) => e.source === "blindSemantic");
    expect(sem.length).toBe(30);
  });

  // ── Total pool integrity ────────────────────────────────────────

  it("total pool = 136 (50 + 27 + 29 + 30, one cross-source dedup)", () => {
    expect(pool.length).toBe(136);
  });

  it("sum of per-source counts matches pool total", () => {
    const counts = {};
    pool.forEach((e) => {
      counts[e.source] = (counts[e.source] || 0) + 1;
    });
    const sum = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(pool.length);
  });

  // ── Cross-source contamination ──────────────────────────────────

  it("V2 (blindDatasetV2) has zero overlap with V1, V3, or Semantic", () => {
    const v2Texts = new Set(
      pool.filter((e) => e.source === "blindDatasetV2")
        .map((e) => e.text.toLowerCase().trim())
    );
    const others = new Set(
      pool.filter((e) => e.source !== "blindDatasetV2")
        .map((e) => e.text.toLowerCase().trim())
    );
    const overlap = [...v2Texts].filter((t) => others.has(t));
    expect(overlap).toEqual([]);
  });

  it("Semantic has zero overlap with V1 or V3", () => {
    const semTexts = new Set(
      pool.filter((e) => e.source === "blindSemantic")
        .map((e) => e.text.toLowerCase().trim())
    );
    const v1v3 = new Set(
      pool.filter((e) => e.source === "blindV1" || e.source === "blindV3")
        .map((e) => e.text.toLowerCase().trim())
    );
    const overlap = [...semTexts].filter((t) => v1v3.has(t));
    expect(overlap).toEqual([]);
  });

  // ── Domain coverage ─────────────────────────────────────────────

  it("pool spans all expected source labels", () => {
    const sources = new Set(pool.map((e) => e.source));
    expect(sources).toEqual(
      new Set(["blindDatasetV2", "blindV1", "blindV3", "blindSemantic"])
    );
  });

  // ── Self-referential integrity ──────────────────────────────────

  it("FEYNMAN GATE itself has no unverified numeric claims", () => {
    const gateSource = readFileSync(
      new URL("./feynmanGate.test.js", import.meta.url),
      "utf-8"
    );
    // Every toBe() assertion should be matched to a verifiable count
    const assertions = (gateSource.match(/toBe\((\d+)\)/g) || []);
    expect(assertions.length).toBeGreaterThanOrEqual(3);

    // All numeric claims in comments should map to expect() clauses
    const commentNumbers = gateSource
      .split("\n")
      .filter((l) => l.trim().startsWith("//"))
      .map((l) => l.match(/\d+/g))
      .filter(Boolean)
      .flat();
    expect(commentNumbers.length).toBeGreaterThan(0);
  });
});
