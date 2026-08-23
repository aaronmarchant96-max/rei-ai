import {
  logDecision,
  getDecisions,
  deleteDecision,
  clearDecisions,
} from "./decisionStore";

const baseEntry = () => ({
  id: "test-" + Math.random().toString(36).slice(2, 6),
  sections: {
    Hinge: "Does the reading trigger a shutdown?",
    Facts: "Vibration at 4.2 mm/s.",
    Assumptions: "Sensor is calibrated.",
    Evaluation: "Margin is thin.",
    ChangeMind: "Calibration evidence.",
    Move: "Shut down for inspection.",
  },
  routerDecision: {
    label: "Structured Reasoning",
    model: "llama-3.3-70b",
    matchedTerms: ["sensor", "vibration"],
    hingeScore: 0.72,
  },
  domainLabel: "assistant",
  inputPreview: "Should I shut down the pump?",
  createdAt: new Date().toISOString(),
});

beforeEach(() => {
  localStorage.clear();
});

describe("decisionStore", () => {
  it("logs and retrieves decisions (newest first)", () => {
    const a = { ...baseEntry(), id: "id-a", createdAt: "2026-01-01T00:00:00Z" };
    const b = { ...baseEntry(), id: "id-b", createdAt: "2026-01-02T00:00:00Z" };

    logDecision(a);
    logDecision(b);

    const store = getDecisions();
    expect(store).toHaveLength(2);
    expect(store[0].id).toBe("id-b");
    expect(store[1].id).toBe("id-a");
  });

  it("evicts oldest entry beyond MAX_ENTRIES (200)", () => {
    const MAX = 200;
    for (let i = 0; i < MAX + 5; i++) {
      logDecision({ ...baseEntry(), id: `entry-${i}` });
    }
    const store = getDecisions();
    expect(store).toHaveLength(MAX);
    // Oldest (entry-0 through entry-4) should be evicted
    const ids = store.map((e) => e.id);
    expect(ids).not.toContain("entry-0");
    expect(ids).not.toContain("entry-4");
    expect(ids).toContain("entry-5");
  });

  it("deletes a decision by id", () => {
    logDecision({ ...baseEntry(), id: "keep" });
    logDecision({ ...baseEntry(), id: "remove" });
    logDecision({ ...baseEntry(), id: "also-keep" });

    deleteDecision("remove");

    const store = getDecisions();
    expect(store).toHaveLength(2);
    expect(store.map((e) => e.id)).toEqual(["also-keep", "keep"]);
  });

  it("clears all decisions", () => {
    logDecision({ ...baseEntry(), id: "a" });
    logDecision({ ...baseEntry(), id: "b" });

    clearDecisions();

    expect(getDecisions()).toHaveLength(0);
    expect(localStorage.getItem("rei_decision_store")).toBeNull();
  });

  it("filters decisions by domain", () => {
    logDecision({ ...baseEntry(), id: "assist-1", domainLabel: "assistant" });
    logDecision({ ...baseEntry(), id: "code-1", domainLabel: "coding" });
    logDecision({ ...baseEntry(), id: "assist-2", domainLabel: "assistant" });

    const assistant = getDecisions({ domain: "assistant" });
    expect(assistant).toHaveLength(2);
    expect(assistant.map((e) => e.id)).toEqual(["assist-2", "assist-1"]);

    const coding = getDecisions({ domain: "coding" });
    expect(coding).toHaveLength(1);
    expect(coding[0].id).toBe("code-1");
  });

  it("returns empty array for unknown domain filter", () => {
    logDecision({ ...baseEntry(), id: "a" });
    expect(getDecisions({ domain: "nonexistent" })).toHaveLength(0);
  });

  it("survives corrupted localStorage data", () => {
    localStorage.setItem("rei_decision_store", "not-valid-json{{{");
    const store = getDecisions();
    expect(store).toEqual([]);
  });

  it("filters legacy routing telemetry that does not satisfy the decision contract", () => {
    const valid = { ...baseEntry(), id: "valid-decision" };
    const malformed = {
      domain: "assistant",
      routeId: "generalist",
      model: "llama-3.1-8b-instant",
      hingeScore: 0.42,
      estimatedCost: 0,
      tokenCount: 120,
      rationale: "Auto-routed by CARDO",
    };
    localStorage.setItem("rei_decision_store", JSON.stringify([malformed, valid]));

    expect(getDecisions()).toEqual([valid]);
  });

  it("refuses to persist malformed decisions at runtime", () => {
    logDecision({ domain: "assistant", routeId: "generalist" });

    expect(getDecisions()).toEqual([]);
    expect(localStorage.getItem("rei_decision_store")).toBeNull();
  });

  it("does not throw when routerDecision is omitted", () => {
    const entry = { ...baseEntry(), id: "no-router", routerDecision: undefined };
    logDecision(entry);
    const store = getDecisions();
    expect(store[0].id).toBe("no-router");
    expect(store[0].routerDecision).toBeUndefined();
  });
});
