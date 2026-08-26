import { handleExecution } from "../../src/lib/executionController";

describe("PR D Execution Controller — Shadow Mode Invariant Suite", () => {
  it("enforces requestedModel authority in shadow mode with zero execution override", () => {
    const result = handleExecution({
      requestId: "req_shadow_001",
      requestedModel: "gpt-4o",
      promptText: "Say hello",
      mode: "shadow",
    });

    expect(result.mode).toBe("shadow");
    // Invariant: Production requested model is authoritative to execute
    expect(result.targetModelToExecute).toBe("gpt-4o");
    expect(result.shadowDecision).toBeDefined();
    expect(result.shadowDecision?.requestedModel).toBe("gpt-4o");
    expect(result.shadowDecision?.executedModel).toBe("gpt-4o");
    expect(result.shadowDecision?.executionMode).toBe("shadow");
    expect(result.shadowDecision?.recommendedRouteId).toBeDefined();
  });

  it("handles replay mode without mutating provider model choice", () => {
    const result = handleExecution({
      requestId: "req_replay_002",
      requestedModel: "claude-3-5-sonnet",
      promptText: "Summarize log",
      mode: "replay",
    });

    expect(result.mode).toBe("replay");
    expect(result.targetModelToExecute).toBe("claude-3-5-sonnet");
    expect(result.shadowDecision).toBeUndefined();
  });

  it("allows recommended model override only in live mode", () => {
    const result = handleExecution({
      requestId: "req_live_003",
      requestedModel: "gpt-4o",
      promptText: "hello", // Low-complexity greeting query
      mode: "live",
    });

    expect(result.mode).toBe("live");
    expect(result.targetModelToExecute).not.toBe("gpt-4o"); // Route decision chooses lower-cost greeting route
  });
});
