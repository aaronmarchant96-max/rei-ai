/**
 * HingeScore Calibration — test suite.
 *
 * Does NOT make live API calls. Verifies pool integrity, router scoring,
 * bucketing structure, and report format. The debate-call step is mocked.
 */

import {
  buildPool,
  computeRouterScores,
  bucketAndCorrelate,
  formatReport,
} from "./hingeCalibrationDebate.js";

describe("HingeScore Calibration Pool", () => {
  let pool;

  beforeAll(() => {
    pool = buildPool();
  });

  it("produces ≥100 unique prompts from all sources", () => {
    expect(pool.length).toBeGreaterThanOrEqual(100);
  });

  it("contains no duplicate prompt texts (case-insensitive)", () => {
    const texts = pool.map((e) => e.text.toLowerCase().trim());
    const unique = new Set(texts);
    expect(unique.size).toBe(pool.length);
  });

  it("has representation from all 6 core domains", () => {
    const domains = new Set(pool.map((e) => e.domain));
    expect(domains).toEqual(
      expect.objectContaining(new Set(["greeting", "coding", "genealogy", "creative", "factCheck", "reasoning"]))
    );
  });

  it("has at least 5 prompts per core domain", () => {
    const counts = {};
    pool.forEach((e) => {
      counts[e.domain] = (counts[e.domain] || 0) + 1;
    });
    for (const d of ["greeting", "coding", "genealogy", "creative", "factCheck", "reasoning"]) {
      expect(counts[d]).toBeGreaterThanOrEqual(5);
    }
  });

  it("tags every prompt with a source label", () => {
    pool.forEach((e) => {
      expect(e.source).toMatch(/^(blindDatasetV2|blindV1|blindV3|blindSemantic)$/);
    });
  });

  it("has no overlap between blindDatasetV2 and blindV1 (contamination check)", () => {
    const v2 = new Set(
      pool.filter((e) => e.source === "blindDatasetV2").map((e) => e.text.toLowerCase().trim())
    );
    const v1 = new Set(
      pool.filter((e) => e.source === "blindV1").map((e) => e.text.toLowerCase().trim())
    );
    const overlap = [...v2].filter((t) => v1.has(t));
    expect(overlap).toEqual([]);
  });
});

describe("Router scoring", () => {
  it("computes hingeScore for every pool entry", () => {
    const pool = buildPool();
    const scored = computeRouterScores(pool);
    expect(scored.length).toBe(pool.length);
    scored.forEach((e) => {
      expect(typeof e.hingeScore).toBe("number");
      expect(e.hingeScore).toBeGreaterThanOrEqual(0);
      expect(e.hingeScore).toBeLessThanOrEqual(1);
      expect(typeof e.routedLabel).toBe("string");
    });
  });

  it("normalizes routed labels to domain keys", () => {
    const pool = buildPool();
    const scored = computeRouterScores(pool);
    const validDomains = new Set([
      "greeting", "coding", "genealogy", "creative", "factCheck", "reasoning", "adversarial", "unknown",
    ]);
    scored.forEach((e) => {
      expect(validDomains.has(e.routedLabel)).toBe(true);
    });
  });
});

describe("Bucketing & correlation", () => {
  it("partitions scored pool into 5 hingeScore bands", () => {
    const pool = buildPool();
    const scored = computeRouterScores(pool);
    const report = bucketAndCorrelate(scored);
    const bands = Object.keys(report);
    expect(bands).toEqual(["0.0-0.2", "0.2-0.4", "0.4-0.6", "0.6-0.8", "0.8-1.0"]);
    const total = bands.reduce((s, b) => s + report[b].bucketSampleCount, 0);
    expect(total).toBe(scored.length);
  });

  it("each bucket has non-null sample count, accuracy, and mean hingeScore", () => {
    const pool = buildPool();
    const scored = computeRouterScores(pool);
    const report = bucketAndCorrelate(scored);
    for (const band of Object.keys(report)) {
      const r = report[band];
      expect(typeof r.bucketSampleCount).toBe("number");
      expect(typeof r.routerAccuracy).toBe("number");
      expect(r.routerAccuracy).toBeGreaterThanOrEqual(0);
      expect(r.routerAccuracy).toBeLessThanOrEqual(1);
      expect(typeof r.meanHingeScore).toBe("number");
    }
  });

  it("router accuracy is computable (some correct routing expected)", () => {
    const pool = buildPool();
    const scored = computeRouterScores(pool);
    const report = bucketAndCorrelate(scored);
    const totalCorrect = Object.values(report).reduce((s, r) => s + r.correctCount, 0);
    // We expect SOME correct routing — not all, not none
    expect(totalCorrect).toBeGreaterThan(0);
    expect(totalCorrect).toBeLessThanOrEqual(scored.length);
  });

  it("debate fields are null when no debate results provided", () => {
    const pool = buildPool();
    const scored = computeRouterScores(pool);
    const report = bucketAndCorrelate(scored, null);
    for (const band of Object.keys(report)) {
      expect(report[band].debateDisagreementRate).toBeNull();
      expect(report[band].debateAgreesWithRouter).toBeNull();
      expect(report[band].debateAgreesWithGroundTruth).toBeNull();
    }
  });

  it("debate fields are populated when debate results are provided", () => {
    const pool = buildPool();
    const scored = computeRouterScores(pool);
    // Mock debate results for a few entries
    const debateResults = {};
    const mockResults = [
      { agreement: true, matchesRouter: true, matchesGroundTruth: true },
      { agreement: false, matchesRouter: false, matchesGroundTruth: false },
      { agreement: true, matchesRouter: false, matchesGroundTruth: true },
    ];
    for (let i = 0; i < Math.min(3, scored.length); i++) {
      debateResults[scored[i].id] = mockResults[i];
    }
    const report = bucketAndCorrelate(scored, debateResults);
    // At least one band should have non-null debate fields since we mocked 3 entries
    const hasDebate = Object.values(report).some(
      (r) => r.debateDisagreementRate !== null
    );
    expect(hasDebate).toBe(true);
  });
});

describe("Report formatting", () => {
  it("produces markdown with header table", () => {
    const pool = buildPool();
    const scored = computeRouterScores(pool);
    const report = bucketAndCorrelate(scored);
    const md = formatReport(report, pool.length);

    expect(md).toContain("# HingeScore Calibration Report");
    expect(md).toContain("| hs Band | n | Accuracy");
    expect(md).toContain(String(pool.length));
    expect(md).toContain("Interpretation");
    expect(md).toContain("Expected signal:");
  });
});
