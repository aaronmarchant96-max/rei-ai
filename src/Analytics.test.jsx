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
    // Confidence badge label + matched term chip (router logs lowercase terms)
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("react")).toBeInTheDocument();
  });
});
