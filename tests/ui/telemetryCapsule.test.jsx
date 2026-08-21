import React from "react";
import { render, screen } from "@testing-library/react";
import TelemetryCapsule from "../../src/modules/rei/components/TelemetryCapsule.jsx";
import TraceStepper from "../../src/modules/rei/components/TraceStepper.jsx";
import { buildRequestEvidence } from "../../src/lib/evidenceEngine";

describe("TelemetryCapsule.jsx & TraceStepper.jsx (Evidence Invariant Tests)", () => {
  it("renders route label, formatted cost, and Inspect button when evidence has cost", () => {
    const evidence = buildRequestEvidence({
      routerDecision: { model: "llama-3.1-8b-instant", label: "The Engineer", estimatedCost: 0.00007 },
      usage: { prompt_tokens: 1000, completion_tokens: 200, cached_prompt_tokens: 800 },
    });

    render(<TelemetryCapsule evidence={evidence} />);

    expect(screen.getByText("The Engineer")).toBeInTheDocument();
    expect(screen.getByText(/\$0\.0000\d+/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Inspect decision for The Engineer/i })).toBeInTheDocument();
  });

  it("hides cost segment when cost is unavailable and never renders $0.00", () => {
    const evidence = buildRequestEvidence({
      routerDecision: { model: "llama-3.3-70b-versatile", label: "Story Architect" },
      usage: null, // missing token counts
    });

    render(<TelemetryCapsule evidence={evidence} />);

    expect(screen.getByText("Story Architect")).toBeInTheDocument();
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
    expect(screen.queryByText("$0.0000")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Inspect decision for Story Architect/i })).toBeInTheDocument();
  });

  it("TraceStepper renders only recorded stages and marks unrecorded rules explicitly", () => {
    const routeTrace = [
      { stageId: "stage-1", stage: "Red Team Guard", timestamp: "2026-08-17T09:00:00Z", passed: true, decision: "Passed scan" },
      { stageId: "stage-2", stage: "Intent Classifier", timestamp: "2026-08-17T09:00:01Z", passed: true, decision: "Engineer", rule: "DAS-RULE-42" }
    ];

    render(<TraceStepper routeTrace={routeTrace} />);

    expect(screen.getByText("Red Team Guard")).toBeInTheDocument();
    expect(screen.getByText("Intent Classifier")).toBeInTheDocument();
    expect(screen.getByText("Rule: DAS-RULE-42")).toBeInTheDocument();
    expect(screen.getByText("Rule: Not recorded in trace")).toBeInTheDocument();
  });

  it("ADVERSARIAL/PATHOLOGICAL SCENARIO: Degrades gracefully with zero manufactured values", () => {
    const pathologicalEvidence = buildRequestEvidence({
      requestId: "pathological-001",
      routerDecision: { model: "unknown-custom-model", label: "Default Fallback" },
      rawTrace: [],
      usage: null,
      responseText: null,
      redTeamResult: null,
    });

    // Directly override routeTrace to simulate completely empty trace stream
    pathologicalEvidence.routeTrace = [];

    render(<TelemetryCapsule evidence={pathologicalEvidence} />);

    // 1. Route is displayed truthfully
    expect(screen.getByText("Default Fallback")).toBeInTheDocument();

    // 2. Cost segment is hidden and NEVER renders $0.00
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
    expect(screen.queryByText("0.00%")).not.toBeInTheDocument();

    // 3. TraceStepper with empty trace displays graceful fallback
    render(<TraceStepper routeTrace={[]} />);
    expect(screen.getByText("No runtime trace recorded for this request.")).toBeInTheDocument();
  });
});
