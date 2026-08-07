import { logRoutingDecision, getLogs, clearLogs, updateLatestLogEntry, exportLogsJSON } from "./routingLog";

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

  it("updateLatestLogEntry patches the newest entry only", () => {
    logRoutingDecision(makeEntry("old"));
    logRoutingDecision(makeEntry("new"));
    updateLatestLogEntry({ provider: "gemini", rescue: true, truncated: false });
    const logs = getLogs();
    expect(logs[0].provider).toBe("gemini");
    expect(logs[0].rescue).toBe(true);
    expect(logs[0].truncated).toBe(false);
    expect(logs[1].provider).toBeUndefined();
    expect(logs[1].routeId).toContain("old");
  });

  it("updateLatestLogEntry patches actualCost and actualTokens", () => {
    logRoutingDecision(makeEntry("coding"));
    updateLatestLogEntry({ actualCost: 0.00042, actualTokens: 321 });
    const entry = getLogs()[0];
    expect(entry.actualCost).toBe(0.00042);
    expect(entry.actualTokens).toBe(321);
  });

  it("updateLatestLogEntry is a no-op on empty log", () => {
    expect(() => updateLatestLogEntry({ provider: "groq" })).not.toThrow();
    expect(getLogs()).toHaveLength(0);
  });

  it("survives corrupted storage (returns empty array)", () => {
    localStorage.setItem("rei_routing_log", "{{not json");
    expect(getLogs()).toEqual([]);
  });

  it("exportLogsJSON emits an envelope with redacted entries by default", () => {
    logRoutingDecision(makeEntry("coding"));
    const doc = JSON.parse(exportLogsJSON(getLogs()));
    expect(doc.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(doc.entryCount).toBe(1);
    expect(doc.entries).toHaveLength(1);
    expect(doc.entries[0].inputPreview).toBeUndefined();
    expect(doc.entries[0].rationale).toBeUndefined();
    expect(doc.entries[0].domain).toBe("coding");
    expect(doc.entries[0].estimatedCost).toBe(0.0005);
  });

  it("exportLogsJSON retains prompt fields on explicit redact:false", () => {
    logRoutingDecision(makeEntry("story"));
    const doc = JSON.parse(exportLogsJSON(getLogs(), { redact: false }));
    expect(doc.entries[0].inputPreview).toBe("Test input story");
    expect(doc.entries[0].rationale).toBe("Test rationale for story");
  });
});
