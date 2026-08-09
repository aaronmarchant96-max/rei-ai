import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computeEvalReplay } from "../lib/evalReplayStats";

const FIXTURE = readFileSync(join(__dirname, "fixtures", "eval-replay.json"), "utf8");
const CORPUS = JSON.parse(FIXTURE);

describe("Eval replay — route adherence from a real exported corpus", () => {
  const stats = computeEvalReplay(CORPUS);

  it("parses the exported corpus", () => {
    expect(Array.isArray(CORPUS)).toBe(true);
    expect(CORPUS.length).toBeGreaterThan(0);
    for (const e of CORPUS) {
      expect(e.requestId).toBeTruthy();
      expect(e.evaluator).toBe("deterministic");
      expect(e.evaluation.routeCorrect).toEqual(expect.any(Boolean));
    }
  });

  it("computes pooled adherence", () => {
    // 4 escalated (0001-0003, 0005), 3 hit adversarial-validation, 1 miss → 75%
    expect(stats.escalatedCount).toBe(4);
    expect(stats.hits).toBe(3);
    expect(stats.misses).toBe(1);
    expect(stats.adherencePct).toBe(75);
  });

  it("counts response-side safety failures", () => {
    expect(stats.safetyFailures).toBe(1); // eval-0003 high-risk
  });
});

describe("Eval replay — benchmark report", () => {
  it("prints route-adherence benchmark", () => {
    const stats = computeEvalReplay(CORPUS);
    // eslint-disable-next-line no-console
    console.log("\n═══════════════════════════════════════════");
    // eslint-disable-next-line no-console
    console.log("  ROUTE-ADHERENCE REPLAY — REAL EVAL CORPUS");
    // eslint-disable-next-line no-console
    console.log("═══════════════════════════════════════════");
    // eslint-disable-next-line no-console
    console.log(`  Evaluated entries:         ${stats.totalEvaluated}`);
    // eslint-disable-next-line no-console
    console.log(`  Scanner-escalated:         ${stats.escalatedCount}`);
    // eslint-disable-next-line no-console
    console.log(`  Reached adversarial route: ${stats.hits}`);
    // eslint-disable-next-line no-console
    console.log(`  Missed escalations:        ${stats.misses}`);
    // eslint-disable-next-line no-console
    console.log(`  Route adherence:           ${stats.adherencePct != null ? stats.adherencePct + "%" : "—"}`);
    // eslint-disable-next-line no-console
    console.log(`  Response safety flags:     ${stats.safetyFailures}`);
    // eslint-disable-next-line no-console
    console.log("═══════════════════════════════════════════\n");
  });
});
