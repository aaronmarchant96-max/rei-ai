import { logRoutingDecision, getLogs, clearLogs } from "./routingLog.js";

function makeEntry(domain) {
  return {
    domain,
    routeId: domain + "-hinge",
    model: "deepseek-chat",
    hingeScore: 0.72,
    estimatedCost: 0.0005,
    premiumCost: 0.002,
    tokenCount: 420,
    rationale: "Test rationale for " + domain,
    matchedTerms: ["react", "api"],
    routingMs: 1.24,
    inputPreview: "Test input " + domain,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("routingLog", () => {
  it("writes and reads entries with timestamps", () => {
    logRoutingDecision(makeEntry("coding"));
    logRoutingDecision(makeEntry("story"));

    const logs = getLogs();
    expect(logs).toHaveLength(2);
    expect(logs[0].domain).toBe("story"); // newest first
    expect(logs[1].domain).toBe("coding");
    expect(logs[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("caps entries at 500", () => {
    for (let i = 0; i < 510; i++) {
      logRoutingDecision(makeEntry("coding"));
    }

    const logs = getLogs();
    expect(logs).toHaveLength(500);
  });

  it("clearLogs removes all entries", () => {
    logRoutingDecision(makeEntry("coding"));
    logRoutingDecision(makeEntry("genealogy"));
    expect(getLogs()).toHaveLength(2);

    clearLogs();
    expect(getLogs()).toHaveLength(0);
    expect(localStorage.getItem("rei_routing_log")).toBeNull();
  });

  it("getLogs returns empty array when no data", () => {
    expect(getLogs()).toEqual([]);
  });

  it("preserves extra fields on entries", () => {
    logRoutingDecision(makeEntry("legal"));
    const logs = getLogs();
    const entry = logs[0];
    expect(entry.domain).toBe("legal");
    expect(entry.hingeScore).toBe(0.72);
    expect(entry.estimatedCost).toBe(0.0005);
    expect(entry.tokenCount).toBe(420);
  });

  it("round-trips rationale, matchedTerms, and routingMs", () => {
    logRoutingDecision(makeEntry("coding"));
    const entry = getLogs()[0];
    expect(entry.rationale).toBe("Test rationale for coding");
    expect(entry.matchedTerms).toEqual(["react", "api"]);
    expect(entry.routingMs).toBe(1.24);
  });

  it("handles legacy entries without new fields", () => {
    localStorage.setItem(
      "rei_routing_log",
      JSON.stringify([{ domain: "legal", routeId: "legal-hinge", model: "deepseek-chat", hingeScore: 0.3 }])
    );
    const entry = getLogs()[0];
    expect(entry.rationale).toBeUndefined();
    expect(Array.isArray(entry.matchedTerms)).toBe(false);
    expect(entry.routingMs).toBeUndefined();
  });
});
