import { logRoutingDecision, getLogs, updateLatestLogEntry, clearLogs } from "./routingLog";

describe("routingLog", () => {
  beforeEach(() => {
    clearLogs();
  });

  it("logs an entry and reads it back", () => {
    logRoutingDecision({ domain: "coding", routeId: "coding-hinge", model: "gemini-flash-latest" });
    const logs = getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].routeId).toBe("coding-hinge");
  });

  it("unshifts newest entries to the front", () => {
    logRoutingDecision({ routeId: "first" });
    logRoutingDecision({ routeId: "second" });
    const logs = getLogs();
    expect(logs[0].routeId).toBe("second");
    expect(logs[1].routeId).toBe("first");
  });

  it("caps at MAX_ENTRIES (500)", () => {
    for (let i = 0; i < 520; i++) {
      logRoutingDecision({ routeId: `entry-${i}` });
    }
    expect(getLogs()).toHaveLength(500);
  });

  it("updateLatestLogEntry patches the newest entry only", () => {
    logRoutingDecision({ routeId: "old", model: "deepseek-chat" });
    logRoutingDecision({ routeId: "new", model: "gemini-flash-latest" });
    updateLatestLogEntry({ provider: "gemini", rescue: true, truncated: false });
    const logs = getLogs();
    expect(logs[0].provider).toBe("gemini");
    expect(logs[0].rescue).toBe(true);
    expect(logs[0].truncated).toBe(false);
    // old entry untouched
    expect(logs[1].provider).toBeUndefined();
    expect(logs[1].routeId).toBe("old");
  });

  it("updateLatestLogEntry is a no-op on empty log", () => {
    expect(() => updateLatestLogEntry({ provider: "groq" })).not.toThrow();
    expect(getLogs()).toHaveLength(0);
  });

  it("clearLogs empties the store", () => {
    logRoutingDecision({ routeId: "x" });
    clearLogs();
    expect(getLogs()).toHaveLength(0);
  });

  it("survives corrupted storage (returns empty array)", () => {
    localStorage.setItem("rei_routing_log", "{{not json");
    expect(getLogs()).toEqual([]);
  });
});
