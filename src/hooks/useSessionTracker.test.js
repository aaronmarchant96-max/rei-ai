import { renderHook, act } from "@testing-library/react";
import { useSessionTracker } from "./useSessionTracker.js";

describe("useSessionTracker", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("correctly tracks message stats from object payload without NaN", () => {
    const { result } = renderHook(() => useSessionTracker());

    act(() => {
      result.current.trackMessage({
        cost: 0.0015,
        premiumCost: 0.05,
        tokens: 1200,
        model: "deepseek-chat",
        chunks: 1,
        escalation: false,
      });
    });

    expect(result.current.sessionMessages).toBe(1);
    expect(result.current.sessionTokens).toBe(1200);
    expect(result.current.sessionCost).toBeCloseTo(0.0015, 4);
    expect(result.current.savingsVsPremium).toBeCloseTo(0.0485, 4);
    expect(result.current.modelBreakdown).toEqual({
      "deepseek-chat": 1200,
    });
  });

  it("correctly tracks message stats from positional arguments without NaN", () => {
    const { result } = renderHook(() => useSessionTracker());

    act(() => {
      result.current.trackMessage(800, "gemini-3.6-flash", 0.0003, 0.004, false, 1);
    });

    expect(result.current.sessionMessages).toBe(1);
    expect(result.current.sessionTokens).toBe(800);
    expect(result.current.sessionCost).toBeCloseTo(0.0003, 4);
    expect(result.current.savingsVsPremium).toBeCloseTo(0.0037, 4);
    expect(result.current.modelBreakdown).toEqual({
      "gemini-3.6-flash": 800,
    });
  });
});
