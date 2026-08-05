import { fireEvent, render, screen } from "@testing-library/react";
import BackendUnavailablePanel from "./BackendUnavailablePanel.jsx";

describe("BackendUnavailablePanel", () => {
  const baseRouterDecision = {
    id: "structured-reasoning",
    label: "Structured Reasoning",
    model: "llama-3.3-70b-versatile",
    routingSignals: {
      matchedTerms: ["pump", "vibration", "shutdown"],
    },
    hingeScore: 0.72,
  };

  it("renders headline when backends are down", () => {
    render(<BackendUnavailablePanel routerDecision={baseRouterDecision} errorMessage="Network failure" />);
    expect(screen.getByText(/can't reach a reasoning backend/i)).toBeInTheDocument();
    expect(screen.getByText(/here's what i can still tell you locally/i)).toBeInTheDocument();
  });

  it("renders routing card with route, model, matched terms, and hinge", () => {
    render(<BackendUnavailablePanel routerDecision={baseRouterDecision} errorMessage="Network failure" />);
    expect(screen.getByText(/Structured Reasoning/)).toBeInTheDocument();
    expect(screen.getByText(/llama-3.3-70b-versatile/)).toBeInTheDocument();
    expect(screen.getByText("pump, vibration, shutdown")).toBeInTheDocument();
    expect(screen.getByText("0.72")).toBeInTheDocument();
  });

  it("shows 'no specific keywords matched' when matchedTerms is empty", () => {
    const noTerms = {
      ...baseRouterDecision,
      routingSignals: { matchedTerms: [] },
    };
    render(<BackendUnavailablePanel routerDecision={noTerms} errorMessage="Network failure" />);
    expect(screen.getByText("no specific keywords matched")).toBeInTheDocument();
  });

  it("omits hinge line when hingeScore is 0", () => {
    const noHinge = { ...baseRouterDecision, hingeScore: 0 };
    render(<BackendUnavailablePanel routerDecision={noHinge} errorMessage="Network failure" />);
    expect(screen.queryByText("Hinge:")).not.toBeInTheDocument();
  });

  it("omits hinge line when hingeScore is undefined", () => {
    const noHinge = { ...baseRouterDecision, hingeScore: undefined };
    render(<BackendUnavailablePanel routerDecision={noHinge} errorMessage="Network failure" />);
    expect(screen.queryByText("Hinge:")).not.toBeInTheDocument();
  });

  it("omits routing card entirely when routerDecision is null", () => {
    render(<BackendUnavailablePanel routerDecision={null} errorMessage="Network failure" />);
    expect(screen.queryByText("Routing (computed client‑side)")).not.toBeInTheDocument();
  });

  it("renders error detail in a collapsed <details> element", () => {
    render(<BackendUnavailablePanel routerDecision={baseRouterDecision} errorMessage="Backend request failed: HTTP 500" />);
    const details = screen.getByText("Error details");
    expect(details.closest("details")).toBeInTheDocument();
    expect(screen.getByText("Backend request failed: HTTP 500")).toBeInTheDocument();
  });

  it("'Retry' button calls onRetry when clicked", () => {
    const onRetry = jest.fn();
    render(<BackendUnavailablePanel routerDecision={baseRouterDecision} errorMessage="err" onRetry={onRetry} />);
    fireEvent.click(screen.getByText("Retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not render Retry button when onRetry is not provided", () => {
    render(<BackendUnavailablePanel routerDecision={baseRouterDecision} errorMessage="err" />);
    expect(screen.queryByText("Retry")).not.toBeInTheDocument();
  });

  it("'Copy diagnostic' copies JSON to clipboard via navigator.clipboard", async () => {
    const writeText = jest.fn().mockResolvedValue();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    render(<BackendUnavailablePanel routerDecision={baseRouterDecision} errorMessage="Network failure" />);
    fireEvent.click(screen.getByText("Copy diagnostic"));
    expect(writeText).toHaveBeenCalledTimes(1);
    const copiedJson = writeText.mock.calls[0][0];
    const parsed = JSON.parse(copiedJson);
    expect(parsed.route).toBe("structured-reasoning");
    expect(parsed.model).toBe("llama-3.3-70b-versatile");
    expect(parsed.matchedTerms).toEqual(["pump", "vibration", "shutdown"]);
    expect(parsed.error).toBe("Network failure");
    expect(parsed.timestamp).toBeDefined();
  });

  it("dismiss button calls onDismiss when clicked", () => {
    const onDismiss = jest.fn();
    render(<BackendUnavailablePanel routerDecision={baseRouterDecision} errorMessage="err" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByLabelText("Dismiss"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
