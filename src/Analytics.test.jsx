import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import Analytics from "./Analytics.jsx";

describe("Analytics", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders empty state when there are no logs", () => {
    render(<Analytics />);
    expect(screen.getByText(/Routing Analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/No routing data yet/i)).toBeInTheDocument();
  });

  it("renders summary cards with legacy + new-format log entries", async () => {
    const oldEntry = { timestamp: "2026-08-04T01:00:00.000Z", domain: "legal", model: "deepseek-chat", estimatedCost: 0.0006 };
    const newEntry = {
      timestamp: "2026-08-04T01:00:00.000Z", domain: "coding", model: "deepseek-chat",
      estimatedCost: 0.0005, premiumCost: 0.006, hingeScore: 0.73, routingMs: 3.2,
      rationale: "Coding language detected", matchedTerms: ["react", "api"],
    };
    window.localStorage.setItem("rei_routing_log", JSON.stringify([newEntry, oldEntry]));
    window.localStorage.setItem("rei_lifetime_premium", "0.05");
    window.localStorage.setItem("rei_lifetime_cost", "0.012");

    render(<Analytics />);

    // AnimatedCounter starts at 0 — wait for it to tick up
    await waitFor(() => expect(screen.getByText("2")).toBeInTheDocument(), { timeout: 1200 });
    // Baseline transparency: Without / With must both render (regression: totalPremium was missing from aggregates)
    expect(screen.getByText(/Without:/i)).toBeInTheDocument();
    expect(screen.getByText(/With:/i)).toBeInTheDocument();
    // Complexity badge label + matched term chip (router logs lowercase terms)
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("react")).toBeInTheDocument();
    // Lifetime Saved derives from the log itself: premium 0.006 - actual (0.0005 + 0.0006) = 0.0049
    expect(screen.getByText("$0.0049")).toBeInTheDocument();
  });

  it("shows rescue and truncation rates from post-response outcomes", () => {
    const entries = [
      { timestamp: "2026-08-04T01:00:00.000Z", domain: "coding", model: "gemini-flash-latest (fallback)", estimatedCost: 0.0005, premiumCost: 0.006, hingeScore: 0.73, rescue: true, truncated: false },
      { timestamp: "2026-08-04T01:00:00.000Z", domain: "story", model: "llama-3.3-70b", estimatedCost: 0.0008, premiumCost: 0.006, hingeScore: 0.2, rescue: false, truncated: true },
    ];
    window.localStorage.setItem("rei_routing_log", JSON.stringify(entries));

    render(<Analytics />);

    // Rescue rate: 1 of 2 = 50% (both rates are 50% -> expect two occurrences)
    expect(screen.getAllByText(/50%/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/1 of 2/i).length).toBeGreaterThanOrEqual(2);
    // Truncation rate: 1 of 2 = 50%
    expect(screen.getByText(/Truncation rate/i)).toBeInTheDocument();
    // HingeScore band chips: >= 0.8 has 0, 0.3-0.55 has 1... verify band labels exist
    expect(screen.getByText(/HingeScore distribution/i)).toBeInTheDocument();
    expect(screen.getByText(/< 0.3/i)).toBeInTheDocument();
    // footnote explaining free-tier providers + paid-only routing savings split
    expect(screen.getByText(/not free-tier cost avoidance/i)).toBeInTheDocument();
  });

  it("renders Routing savings (paid-only) excluding free-tier cost avoidance", () => {
    // One free-tier (llama) + one genuinely paid (deepseek-v4-flash) request.
    const entries = [
      { timestamp: "2026-08-04T01:00:00.000Z", domain: "coding", model: "llama-3.3-70b-versatile", estimatedCost: 0.0, premiumCost: 0.006 },
      { timestamp: "2026-08-04T02:00:00.000Z", domain: "legal", model: "deepseek-v4-flash", estimatedCost: 0.0004, premiumCost: 0.006 },
    ];
    window.localStorage.setItem("rei_routing_log", JSON.stringify(entries));

    render(<Analytics />);

    // paid-only card surfaces the paid rows: card label + footnote both mention
    // it. With provider-based classification the llama (Groq/free-tier) row is
    // EXCLUDED and only the deepseek (paid) row is counted → exactly 1 paid.
    expect(screen.getAllByText(/Routing savings \(paid-only\)/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("1 paid requests · non-free providers only")).toBeInTheDocument();
  });

  it("renders adversarial route adherence from the deterministic eval log", async () => {
    // 2 escalated requests, 1 reached the adversarial route → 50% adherence.
    window.localStorage.setItem("rei_routing_log", JSON.stringify([
      { timestamp: "2026-08-04T01:00:00.000Z", domain: "assistant", model: "llama-3.3-70b-versatile", estimatedCost: 0.0005, premiumCost: 0.006 },
    ]));
    window.localStorage.setItem("rei_eval_log", JSON.stringify([
      {
        requestId: "a", domain: "assistant", routeId: "adversarial-validation", model: "deepseek-v4-flash",
        evaluator: "deterministic", evaluation: { routeExpected: true, routeCorrect: true, safetyVerdict: "clean", evaluatedAt: "2026-08-04T01:00:00.000Z" },
      },
      {
        requestId: "b", domain: "assistant", routeId: "structured-reasoning", model: "llama-3.3-70b-versatile",
        evaluator: "deterministic", evaluation: { routeExpected: true, routeCorrect: false, safetyVerdict: "high-risk", evaluatedAt: "2026-08-04T01:00:00.000Z" },
      },
    ]));

    render(<Analytics />);

    await waitFor(() => {
      expect(screen.getByText(/Adversarial route adherence/i)).toBeInTheDocument();
    }, { timeout: 1200 });
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText(/1 missed of 2 escalated/i)).toBeInTheDocument();
  });

  it("shows actual-vs-estimate and real savings when actualCost is present", () => {
    const entries = [
      { timestamp: "2026-08-04T01:00:00.000Z", domain: "coding", model: "deepseek-chat", estimatedCost: 0.001, premiumCost: 0.006, hingeScore: 0.9, actualCost: 0.0008, actualTokens: 300 },
    ];
    window.localStorage.setItem("rei_routing_log", JSON.stringify(entries));

    render(<Analytics />);

    // estimate 0.001 vs actual 0.0008 -> 125% of estimate
    expect(screen.getByText(/Actual vs estimate/i)).toBeInTheDocument();
    expect(screen.getByText(/real spend/i)).toBeInTheDocument();
    // real savings: (0.006 - 0.0008)/0.006 = 86.67 -> 87%
    expect(screen.getByText(/87%/i)).toBeInTheDocument();
  });

  it("shows em-dash instead of null% when actuals are tracked but sum to zero", () => {
    const entries = [
      { timestamp: "2026-08-04T01:00:00.000Z", domain: "story", model: "llama-3.3-70b-versatile (fallback)", estimatedCost: 0.002, premiumCost: 0.006, hingeScore: 0.3, rescue: true, truncated: false, actualCost: 0, actualTokens: 899 },
    ];
    window.localStorage.setItem("rei_routing_log", JSON.stringify(entries));

    render(<Analytics />);

    // estimateVsActualPct is null when totalActual === 0 -> must render "—", never "null%"
    expect(screen.getByText(/Actual vs estimate/i)).toBeInTheDocument();
    expect(screen.queryByText(/null%/i)).not.toBeInTheDocument();
    // real savings = (0.006 - 0)/0.006 = 100% — genuinely zero spend via free fallback
    expect(screen.getAllByText(/100%/i).length).toBeGreaterThanOrEqual(1);
  });

  it("filters logs by date range toggle", async () => {
    const now = Date.now();
    const oldTs = new Date(now - 40 * 24 * 60 * 60 * 1000).toISOString(); // 40 days ago
    const recentTs = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days ago
    const entries = [
      { timestamp: oldTs, domain: "coding", model: "deepseek-chat", estimatedCost: 0.0005, premiumCost: 0.006 },
      { timestamp: recentTs, domain: "story", model: "llama-3.3-70b", estimatedCost: 0.0008, premiumCost: 0.006 },
    ];
    window.localStorage.setItem("rei_routing_log", JSON.stringify(entries));

    const { getByText, getAllByText, queryAllByText } = render(<Analytics />);
    await waitFor(() => expect(getByText("2")).toBeInTheDocument(), { timeout: 1200 });

    // Switch to 7 days — the 40-day-old entry should drop out
    fireEvent.click(getByText("7 days"));
    // Wait for the filtered view to settle: deepseek-chat (the old entry) must vanish
    await waitFor(() => expect(queryAllByText("deepseek-chat").length).toBe(0), { timeout: 2000 });
    expect(getAllByText("llama-3.3-70b").length).toBeGreaterThanOrEqual(1);
  });

  it("renders Cost trend section with cumulative savings points", () => {
    const entries = [
      { timestamp: "2026-08-04T01:00:00.000Z", domain: "coding", model: "deepseek-chat", estimatedCost: 0.0005, premiumCost: 0.006 },
      { timestamp: "2026-08-05T01:00:00.000Z", domain: "story", model: "llama-3.3-70b", estimatedCost: 0.0008, premiumCost: 0.006 },
    ];
    window.localStorage.setItem("rei_routing_log", JSON.stringify(entries));

    render(<Analytics />);
    expect(screen.getByText(/Cumulative Savings Trend/i)).toBeInTheDocument();
  });

  it("renders Model Health section with per-model stats", () => {
    const entries = [
      { timestamp: "2026-08-04T01:00:00.000Z", domain: "coding", model: "deepseek-chat", estimatedCost: 0.0005, premiumCost: 0.006, routingMs: 3.2, rescue: false },
      { timestamp: "2026-08-04T02:00:00.000Z", domain: "coding", model: "deepseek-chat", estimatedCost: 0.0007, premiumCost: 0.006, routingMs: 4.1, rescue: false },
      { timestamp: "2026-08-04T03:00:00.000Z", domain: "story", model: "llama-3.3-70b", estimatedCost: 0.0008, premiumCost: 0.006, routingMs: 5.0, rescue: true },
    ];
    window.localStorage.setItem("rei_routing_log", JSON.stringify(entries));

    render(<Analytics />);
    expect(screen.getByText(/Model Health/i)).toBeInTheDocument();
    // deepseek-chat: 2 reqs, 0 rescues -> 100% ok
    expect(screen.getAllByText(/deepseek-chat/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/100% ok/i)).toBeInTheDocument();
    // llama-3.3-70b: 1 req, 1 rescue -> 0% ok
    expect(screen.getAllByText(/llama-3.3-70b/i).length).toBeGreaterThanOrEqual(1);
  });

  it("shows No routing data yet empty state when no logs exist", () => {
    render(<Analytics />);
    expect(screen.getByText(/No routing data yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/Cumulative Savings Trend/i)).not.toBeInTheDocument();
  });

  it("renders Policy Proposals from seeded eval evidence", async () => {
    // Seed a missed escalation: scanner escalated but router went elsewhere.
    window.localStorage.setItem("rei_eval_log", JSON.stringify([
      {
        requestId: "req-miss",
        domain: "assistant",
        routeId: "structured-reasoning",
        model: "deepseek-v4-flash",
        evaluator: "deterministic",
        evaluatorVersion: "red-team-v1",
        evaluation: {
          qualityScore: 86,
          safetyVerdict: "high-risk",
          routeExpected: true,
          routeCorrect: false,
          evaluatedAt: "2026-08-04T01:00:00.000Z",
        },
      },
    ]));
    window.localStorage.setItem("rei_routing_log", JSON.stringify([
      {
        requestId: "req-miss",
        timestamp: "2026-08-04T01:00:00.000Z",
        domain: "assistant",
        routeId: "structured-reasoning",
        model: "deepseek-v4-flash",
        estimatedCost: 0.0005,
        premiumCost: 0.006,
        hingeScore: 0.4,
      },
    ]));

    render(<Analytics />);

    await waitFor(() => expect(screen.getByText(/Policy Proposals/i)).toBeInTheDocument(), { timeout: 1200 });
    // The missed-escalation proposal must appear with its evidence.
    expect(screen.getAllByText(/Missed escalation/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Copy proposal/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Dismiss/i).length).toBeGreaterThanOrEqual(1);
    // Human disposition buttons exist (the boundary: machine proposes, human disposes).
    expect(screen.getAllByText(/Mark accepted/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Mark rejected/i).length).toBeGreaterThanOrEqual(1);
    // But there is NO apply/modify control — the engine never mutates policy.
    expect(screen.queryByText(/Apply/i)).not.toBeInTheDocument();
  });

  it("records human disposition and renders proposal usefulness metrics", async () => {
    window.localStorage.setItem("rei_eval_log", JSON.stringify([
      {
        requestId: "req-miss",
        domain: "assistant",
        routeId: "structured-reasoning",
        model: "deepseek-v4-flash",
        evaluator: "deterministic",
        evaluatorVersion: "red-team-v1",
        evaluation: {
          qualityScore: 86,
          safetyVerdict: "high-risk",
          routeExpected: true,
          routeCorrect: false,
          evaluatedAt: "2026-08-04T01:00:00.000Z",
        },
      },
    ]));
    window.localStorage.setItem("rei_routing_log", JSON.stringify([
      {
        requestId: "req-miss",
        timestamp: "2026-08-04T01:00:00.000Z",
        domain: "assistant",
        routeId: "structured-reasoning",
        model: "deepseek-v4-flash",
        estimatedCost: 0.0005,
        premiumCost: 0.006,
        hingeScore: 0.4,
      },
    ]));

    render(<Analytics />);

    await waitFor(() => expect(screen.getByText(/Policy Proposals/i)).toBeInTheDocument(), { timeout: 1200 });
    // Metrics line renders with null-safe precision (nothing reviewed yet).
    const metricsBefore = screen.getByTestId("proposal-metrics").textContent;
    expect(metricsBefore).toMatch(/0 of \d+ reviewed/);
    expect(metricsBefore).toContain("precision —");
    expect(metricsBefore).toContain("realization —");
    expect(metricsBefore).toContain("0 implemented");

    // Human clicks "Mark accepted" — status flips, precision becomes 100%.
    fireEvent.click(screen.getAllByText(/Mark accepted/i)[0]);
    const metricsAccepted = screen.getByTestId("proposal-metrics").textContent;
    expect(metricsAccepted).toMatch(/1 of \d+ reviewed/);
    expect(metricsAccepted).toContain("precision 100%");
    expect(metricsAccepted).toContain("realization 0%");

    // Human clicks "Mark implemented" with a value note — realization updates.
    const promptSpy = jest.spyOn(window, "prompt").mockReturnValue("baseline 0.006 → post 0.0005");
    fireEvent.click(screen.getAllByText(/Mark implemented/i)[0]);
    const metricsImpl = screen.getByTestId("proposal-metrics").textContent;
    expect(metricsImpl).toContain("realization 100%");
    expect(metricsImpl).toContain("1 implemented");
    promptSpy.mockRestore();
  });
});
