import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import TelemetryCapsule from "../../src/modules/rei/components/TelemetryCapsule.jsx";
import TraceStepper from "../../src/modules/rei/components/TraceStepper.jsx";
import { buildRequestEvidence } from "../../src/lib/evidenceEngine";

describe("TelemetryCapsule.jsx & TraceStepper.jsx (Evidence Invariant Tests)", () => {
  it("renders observed cost and modeled counterfactual with explicit provenance", () => {
    const evidence = buildRequestEvidence({
      routerDecision: { model: "llama-3.1-8b-instant", label: "The Engineer" },
      usage: { prompt_tokens: 1000, completion_tokens: 200, cached_prompt_tokens: 800 },
    });

    render(<TelemetryCapsule evidence={evidence} />);

    expect(screen.getByText("llama-3.1-8b-instant")).toBeInTheDocument();
    expect(screen.getByText("(Observed)")).toBeInTheDocument();
    expect(screen.getByText("(Modeled)")).toBeInTheDocument();
    expect(screen.getByText("(Derived)")).toBeInTheDocument();
    expect(screen.getByText(/80% Cache Hit/i)).toBeInTheDocument();
  });

  it("never renders missing cost as $0.00 (displays 'Cost unavailable')", () => {
    const evidence = buildRequestEvidence({
      routerDecision: { model: "llama-3.3-70b-versatile" },
      usage: null, // missing token counts
    });

    render(<TelemetryCapsule evidence={evidence} />);

    expect(screen.getByText("Cost unavailable")).toBeInTheDocument();
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
    expect(screen.queryByText("$0.0000")).not.toBeInTheDocument();
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
      routerDecision: { model: "unknown-custom-model" },
      rawTrace: [],
      usage: null,
      responseText: null,
      redTeamResult: null,
    });

    // Directly override routeTrace to simulate completely empty trace stream
    pathologicalEvidence.routeTrace = [];

    render(<TelemetryCapsule evidence={pathologicalEvidence} />);

    // 1. Model is displayed truthfully
    expect(screen.getByText("unknown-custom-model")).toBeInTheDocument();

    // 2. Cost displays "Cost unavailable" and NEVER $0.00
    expect(screen.getByText("Cost unavailable")).toBeInTheDocument();
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
    expect(screen.queryByText("0.00%")).not.toBeInTheDocument();

    // 3. No bogus Flagship Equivalent or Savings rendered
    expect(screen.queryByText(/Flagship equiv:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Saved/i)).not.toBeInTheDocument();

    // 4. No bogus Cache Hit badge rendered
    expect(screen.queryByText(/Cache Hit/i)).not.toBeInTheDocument();

    // 5. TraceStepper with empty trace displays graceful fallback
    const { container: stepperContainer } = render(<TraceStepper routeTrace={[]} />);
    expect(screen.getByText("No runtime trace recorded for this request.")).toBeInTheDocument();
  });
});
