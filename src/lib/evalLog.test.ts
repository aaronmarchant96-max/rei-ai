import { logEval, getEvals, clearEvals } from "./evalLog";

beforeEach(() => {
  localStorage.clear();
});

describe("evalLog", () => {
  it("writes and reads an evaluation entry", () => {
    logEval({
      requestId: "req-1",
      domain: "assistant",
      routeId: "adversarial-validation",
      model: "deepseek-v4-flash",
      evaluator: "deterministic",
      evaluatorVersion: "red-team-v1",
      evaluation: {
        qualityScore: 100,
        safetyVerdict: "clean",
        routeExpected: true,
        routeCorrect: true,
        evaluatedAt: new Date().toISOString(),
      },
    });

    const evals = getEvals();
    expect(evals).toHaveLength(1);
    expect(evals[0].id).toMatch(/^eval:/);
    expect(evals[0].requestId).toBe("req-1");
    expect(evals[0].evaluator).toBe("deterministic");
    expect(evals[0].evaluation.routeCorrect).toBe(true);
  });

  it("caps entries at 500", () => {
    for (let i = 0; i < 510; i++) {
      logEval({
        requestId: `req-${i}`,
        evaluator: "deterministic",
        evaluation: { evaluatedAt: new Date().toISOString() },
      });
    }
    expect(getEvals()).toHaveLength(500);
  });

  it("filters by requestId", () => {
    logEval({ requestId: "a", evaluator: "deterministic", evaluation: { evaluatedAt: "x" } });
    logEval({ requestId: "b", evaluator: "deterministic", evaluation: { evaluatedAt: "x" } });
    expect(getEvals({ requestId: "a" })).toHaveLength(1);
    expect(getEvals({ requestId: "a" })[0].requestId).toBe("a");
  });

  it("filters by evaluator provenance", () => {
    logEval({ requestId: "a", evaluator: "deterministic", evaluation: { evaluatedAt: "x" } });
    logEval({ requestId: "b", evaluator: "human", evaluation: { evaluatedAt: "x" } });
    expect(getEvals({ evaluator: "human" })).toHaveLength(1);
    expect(getEvals({ evaluator: "human" })[0].requestId).toBe("b");
  });

  it("clearEvals removes all entries", () => {
    logEval({ requestId: "a", evaluator: "deterministic", evaluation: { evaluatedAt: "x" } });
    clearEvals();
    expect(getEvals()).toHaveLength(0);
    expect(localStorage.getItem("rei_eval_log")).toBeNull();
  });

  it("survives corrupted storage (returns empty array)", () => {
    localStorage.setItem("rei_eval_log", "{{not json");
    expect(getEvals()).toEqual([]);
  });
});
