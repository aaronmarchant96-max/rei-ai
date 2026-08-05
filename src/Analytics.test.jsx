import { render, screen } from "@testing-library/react";
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

  it("renders summary cards with legacy + new-format log entries", () => {
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

    expect(screen.getByText("2")).toBeInTheDocument(); // Requests
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
    // footnote explaining free-tier providers and deploy date
    expect(screen.getByText(/free-tier math/i)).toBeInTheDocument();
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
});
