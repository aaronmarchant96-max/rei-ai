import { render, screen } from "@testing-library/react";
import InstrumentRail from "../../src/components/InstrumentRail.jsx";
import { buildRequestEvidence, isValidObservedTelemetry } from "../../src/lib/evidenceEngine";
import { useSessionTracker } from "../../src/hooks/useSessionTracker.js";
import { renderHook, act } from "@testing-library/react";

describe("P0 Measurement Integrity & Epistemic Telemetry Contract", () => {
  it("rejects non-finite, negative, or malformed observed telemetry", () => {
    expect(isValidObservedTelemetry({ inputTokens: NaN, outputTokens: 100, cost: 0.001, model: "deepseek-chat" })).toBe(false);
    expect(isValidObservedTelemetry({ inputTokens: 100, outputTokens: undefined, cost: 0.001, model: "deepseek-chat" })).toBe(false);
    expect(isValidObservedTelemetry({ inputTokens: 100, outputTokens: 100, cost: NaN, model: "deepseek-chat" })).toBe(false);
    expect(isValidObservedTelemetry({ inputTokens: -10, outputTokens: 100, cost: 0.001, model: "deepseek-chat" })).toBe(false);
    expect(isValidObservedTelemetry({ inputTokens: 100, outputTokens: 100, cost: 0.001, model: undefined })).toBe(false);
    expect(isValidObservedTelemetry({ inputTokens: 100, outputTokens: 100, cost: 0.001, model: "[object Object]" })).toBe(false);
    expect(isValidObservedTelemetry({ inputTokens: 100, outputTokens: 100, cost: 0.001, model: "deepseek-chat" })).toBe(true);
  });

  it("marks economics as unavailable and does not manufacture savings when token data is missing", () => {
    const evidence = buildRequestEvidence({
      routerDecision: { model: "deepseek-chat", estimatedCost: 0.002 },
      usage: null, // missing provider usage
    });

    expect(evidence.tokens.provenance).toBe("unavailable");
    expect(evidence.economics.observedCostUsd).toBeNull();
    expect(evidence.economics.savings.amountUsd).toBeNull();
  });

  it("renders Model unavailable instead of undefined when model is missing", () => {
    render(
      <InstrumentRail
        isInspectOpen={true}
        focusedDecision={{
          id: "story-architect",
          model: undefined,
          cost: null,
          isObservedCost: false,
        }}
        sessionCost={0}
        sessionTokens={0}
        sessionMessages={0}
        savingsVsPremium={0}
      />
    );

    expect(screen.getByText("Model unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
  });

  it("renders 'Cost unavailable · Provider usage telemetry missing' instead of $NaN or $0.0000", () => {
    render(
      <InstrumentRail
        isInspectOpen={true}
        focusedDecision={{
          id: "story-architect",
          model: "deepseek-chat",
          cost: null,
          isObservedCost: false,
        }}
        sessionCost={-1} // invalid
        sessionTokens={-1}
        sessionMessages={1}
        savingsVsPremium={0}
      />
    );

    expect(screen.getAllByText("Cost unavailable · Provider usage telemetry missing").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/\$NaN/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\[object Object\]/i)).not.toBeInTheDocument();
  });

  it("accumulates session cost exactly as sum of valid request costs without NaN pollution", () => {
    const { result } = renderHook(() => useSessionTracker());

    act(() => {
      // 1. Valid DeepSeek request
      result.current.trackMessage({
        cost: 0.0015,
        premiumCost: 0.0500,
        tokens: 1200,
        model: "deepseek-chat",
      });
      // 2. Malformed request (should be safely coerced to 0, not pollute with NaN)
      result.current.trackMessage({
        cost: NaN,
        tokens: undefined,
        model: undefined,
      });
      // 3. Valid Gemini request
      result.current.trackMessage({
        cost: 0.0005,
        premiumCost: 0.0100,
        tokens: 500,
        model: "gemini-3.6-flash",
      });
    });

    expect(result.current.sessionMessages).toBe(3);
    expect(result.current.sessionTokens).toBe(1700);
    expect(result.current.sessionCost).toBeCloseTo(0.0020, 4);
    expect(result.current.savingsVsPremium).toBeCloseTo(0.0580, 4);
    expect(result.current.modelBreakdown).toEqual({
      "deepseek-chat": 1200,
      "unknown": 0,
      "gemini-3.6-flash": 500,
    });
  });

  it("renders valid models in breakdown and filters out invalid [object Object] or undefined keys", () => {
    render(
      <InstrumentRail
        isInspectOpen={true}
        sessionCost={0.002}
        sessionTokens={1700}
        sessionMessages={2}
        savingsVsPremium={0.05}
        modelBreakdown={{
          "deepseek-chat": 1200,
          "gemini-3.6-flash": 500,
          "undefined": 0,
          "[object Object]": 0,
        }}
      />
    );

    expect(screen.getByText("deepseek-chat")).toBeInTheDocument();
    expect(screen.getByText("1,200 tok")).toBeInTheDocument();
    expect(screen.getByText("gemini-3.6-flash")).toBeInTheDocument();
    expect(screen.getByText("500 tok")).toBeInTheDocument();
    expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });
});
