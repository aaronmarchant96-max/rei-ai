import { fireEvent, render, screen } from "@testing-library/react";
import DecisionDetail from "./DecisionDetail.jsx";

const fullEntry = {
  id: "1743660000000-structured-a3f2",
  sections: {
    Hinge: "Does the sensor reading warrant a shutdown?",
    Facts: "Vibration at 4.2 mm/s, threshold is 4.0.",
    Assumptions: "Sensor is calibrated and reading is valid.",
    Evaluation: "Margin is thin; cost to act is low relative to cost of failure.",
    ChangeMind: "A calibration certificate from the last 30 days would change this.",
    Move: "Shut down the pump and perform visual inspection.",
  },
  routerDecision: {
    label: "Structured Reasoning",
    model: "llama-3.3-70b-versatile",
    matchedTerms: ["pump", "vibration", "shutdown"],
    hingeScore: 0.72,
  },
  domainLabel: "The Generalist",
  inputPreview: "Should I shut down the pump if the sensor reading is slightly above threshold?",
  createdAt: "2026-08-05T12:00:00Z",
  actualTokens: 1200,
  actualCost: 0.0004,
  durationMs: 3200,
};

describe("DecisionDetail", () => {
  it("renders all CARDO sections from a full entry", () => {
    render(<DecisionDetail entry={fullEntry} />);
    expect(screen.getByText("CARDO Decision Report")).toBeInTheDocument();
    expect(screen.getByText("Does the sensor reading warrant a shutdown?")).toBeInTheDocument();
    expect(screen.getByText(/Vibration at 4.2/)).toBeInTheDocument();
    expect(screen.getByText("Sensor is calibrated and reading is valid.")).toBeInTheDocument();
    expect(screen.getByText(/Margin is thin/)).toBeInTheDocument();
    expect(screen.getByText(/A calibration certificate/)).toBeInTheDocument();
    expect(screen.getByText("Shut down the pump and perform visual inspection.")).toBeInTheDocument();
  
});

  it("renders router metadata", () => {
    render(<DecisionDetail entry={fullEntry} />);
    expect(screen.getByText(/Structured Reasoning/)).toBeInTheDocument();
    expect(screen.getByText(/llama-3.3-70b-versatile/)).toBeInTheDocument();
    expect(screen.getByText(/0\.720/)).toBeInTheDocument();
    expect(screen.getByText(/pump, vibration, shutdown/)).toBeInTheDocument();
  });

  it("renders domain label and timestamp", () => {
    render(<DecisionDetail entry={fullEntry} />);
    expect(screen.getByText(/The Generalist/)).toBeInTheDocument();
  });

  it("renders input preview in quotation marks", () => {
    render(<DecisionDetail entry={fullEntry} />);
    expect(screen.getByText(/Should I shut down/)).toBeInTheDocument();
  });

  it("shows ellipsis on truncated preview (200+ chars)", () => {
    const longEntry = {
      ...fullEntry,
      inputPreview: "A".repeat(201),
    };
    render(<DecisionDetail entry={longEntry} />);
    expect(screen.getByText(/\u2026/)).toBeInTheDocument();
  });

  it("renders footer with id, tokens, cost, and duration", () => {
    render(<DecisionDetail entry={fullEntry} />);
    expect(screen.getByText(/1743660000000-structured-a3f2/)).toBeInTheDocument();
    expect(screen.getByText("1,200 tokens")).toBeInTheDocument();
    expect(screen.getByText(/\$0\.000400/)).toBeInTheDocument();
    expect(screen.getByText("3.2s")).toBeInTheDocument();
  });

  it("shows close button when onClose is provided", () => {
    const onClose = jest.fn();
    render(<DecisionDetail entry={fullEntry} onClose={onClose} />);
    const btn = screen.getByLabelText("Close detail");
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("omits close button when onClose is not provided", () => {
    render(<DecisionDetail entry={fullEntry} />);
    expect(screen.queryByLabelText("Close detail")).not.toBeInTheDocument();
  });

  it("omits empty sections", () => {
    const sparseEntry = {
      ...fullEntry,
      sections: { Hinge: "Only hinge", Move: "  " },
    };
    render(<DecisionDetail entry={sparseEntry} />);
    expect(screen.getByText("Only hinge")).toBeInTheDocument();
    expect(screen.queryByText("Facts")).not.toBeInTheDocument();
    expect(screen.queryByText("Recommended Move")).not.toBeInTheDocument();
  });

  it("returns null for missing entry", () => {
    const { container } = render(<DecisionDetail entry={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders without crash for an entry with no sections at all", () => {
    const minEntry = {
      id: "abc-123",
      domainLabel: "REI.ai",
      inputPreview: "hello",
      createdAt: new Date().toISOString(),
    };
    render(<DecisionDetail entry={minEntry} />);
    expect(screen.getByText("CARDO Decision Report")).toBeInTheDocument();
    expect(screen.getByText(/REI\.ai/)).toBeInTheDocument();
  });

  it("renders 'Unknown' when routerDecision label is missing", () => {
    const noRoute = { ...fullEntry, routerDecision: null };
    render(<DecisionDetail entry={noRoute} />);
    expect(screen.getByText(/Unknown/)).toBeInTheDocument();
  });

  it("renders footer gracefully when optional fields are absent", () => {
    const minEntry = {
      id: "min-1",
      domainLabel: "REI.ai",
      inputPreview: "hi",
      createdAt: new Date().toISOString(),
    };
    render(<DecisionDetail entry={minEntry} />);
    // Footer should show the id but no token/cost/duration fields
    expect(screen.getByText(/ID: min-1/)).toBeInTheDocument();
    expect(screen.queryByText(/tokens/)).not.toBeInTheDocument();
  });
});
