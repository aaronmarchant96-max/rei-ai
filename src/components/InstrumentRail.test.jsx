import { fireEvent, render, screen } from "@testing-library/react";
import InstrumentRail from "./InstrumentRail.jsx";

describe("InstrumentRail", () => {
  const defaultProps = {
    sessionTokens: 12000,
    sessionMessages: 15,
    sessionCost: 0.0024,
    sessionChunks: 15,
    savingsVsPremium: 0.0076,
    escalationCount: 2,
    lifetimeCost: 0.05,
    lifetimeSavings: 0.02,
    modelBreakdown: {
      "llama-3.3-70b-versatile": 8000,
      "llama-3.1-8b-instant": 4000
    }
  };

  it("renders all session stats when expanded", () => {
    render(<InstrumentRail {...defaultProps} />);

    expect(screen.getByText(/\$0\.0076/)).toBeInTheDocument();
    expect(screen.getByText(/\$0\.0024/)).toBeInTheDocument();
    expect(screen.getByText("12,000")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();

    // Model breakdown
    expect(screen.getByText("llama-3.3-70b-versa...")).toBeInTheDocument();
    expect(screen.getByText(/8,000\s*tok/)).toBeInTheDocument();
    expect(screen.getByText("llama-3.1-8b-instant")).toBeInTheDocument();
    expect(screen.getByText(/4,000\s*tok/)).toBeInTheDocument();
  });

  it("allows collapsing the sidebar panel to narrow strip", () => {
    render(<InstrumentRail {...defaultProps} />);

    const toggleBtn = screen.getByRole("button", { name: /collapse sidebar/i });
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn);

    const collapsedToggleBtn = screen.getByRole("button", { name: /expand sidebar/i });
    expect(collapsedToggleBtn).toBeInTheDocument();
    expect(screen.getByText(/EFFICIENCY:\s*76%/)).toBeInTheDocument();

    expect(screen.queryByText("$0.0076")).not.toBeInTheDocument();
    expect(screen.queryByText("12,000")).not.toBeInTheDocument();

    fireEvent.click(collapsedToggleBtn);

    expect(screen.getByText(/\$0\.0076/)).toBeInTheDocument();
    expect(screen.getByText("12,000")).toBeInTheDocument();
  });

  it("handles empty or zero stats gracefully", () => {
    render(
      <InstrumentRail
        sessionTokens={0}
        sessionMessages={0}
        sessionCost={0}
        sessionChunks={0}
        savingsVsPremium={0}
        escalationCount={0}
        modelBreakdown={{}}
      />
    );

    expect(screen.getByText(/REI chooses a model that fits each job/i)).toBeTruthy();
    expect(screen.getByText(/which model answered, why it was chosen, and what it cost/i)).toBeTruthy();
    expect(screen.queryByText("Escalations")).not.toBeInTheDocument();
  });

  it("shows inference chunks only when chunks exceed messages", () => {
    const { rerender } = render(
      <InstrumentRail
        {...defaultProps}
        sessionMessages={3}
        sessionChunks={7}
      />
    );

    expect(screen.getByText("Inference chunks")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    rerender(<InstrumentRail {...defaultProps} />);
    expect(screen.queryByText("Inference chunks")).not.toBeInTheDocument();
  });
});
