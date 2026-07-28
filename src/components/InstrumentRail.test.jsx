import { fireEvent, render, screen } from "@testing-library/react";
import InstrumentRail from "./InstrumentRail.jsx";

describe("InstrumentRail", () => {
  const defaultProps = {
    sessionTokens: 12000,
    sessionMessages: 15,
    sessionCost: 0.0024,
    savingsVsPremium: 0.0076,
    escalationCount: 2,
    modelBreakdown: {
      "llama-3.3-70b-versatile": 8000,
      "llama-3.1-8b-instant": 4000
    }
  };

  it("renders all session stats when expanded", () => {
    render(<InstrumentRail {...defaultProps} />);

    // Total premium cost = 0.0024 + 0.0076 = 0.0100
    // Savings percentage = 0.0076 / 0.0100 = 76%
    expect(screen.getByText("76%")).toBeInTheDocument();
    expect(screen.getByText(/\$0\.0076/)).toBeInTheDocument();
    expect(screen.getByText(/\$0\.0024/)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // Escalations
    expect(screen.getByText("12,000")).toBeInTheDocument(); // Tokens
    expect(screen.getByText("15")).toBeInTheDocument(); // Messages

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

    // Click collapse
    fireEvent.click(toggleBtn);

    // Sidebar should have is-collapsed class
    const collapsedToggleBtn = screen.getByRole("button", { name: /expand sidebar/i });
    expect(collapsedToggleBtn).toBeInTheDocument();
    expect(screen.getByText(/EFFICIENCY:\s*76%/)).toBeInTheDocument();

    // Expanded detail rows should be hidden
    expect(screen.queryByText("$0.0076")).not.toBeInTheDocument();
    expect(screen.queryByText("12,000")).not.toBeInTheDocument();

    // Click expand
    fireEvent.click(collapsedToggleBtn);

    // Expanded detail rows should be visible again
    expect(screen.getByText(/\$0\.0076/)).toBeInTheDocument();
    expect(screen.getByText("12,000")).toBeInTheDocument();
  });

  it("handles empty or zero stats gracefully", () => {
    render(
      <InstrumentRail
        sessionTokens={0}
        sessionMessages={0}
        sessionCost={0}
        savingsVsPremium={0}
        escalationCount={0}
        modelBreakdown={{}}
      />
    );

    // Efficiency should fallback to em-dash when no premium cost exists
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.getByText("< $0.0001")).toBeInTheDocument();
    expect(screen.queryByText("Escalations")).not.toBeInTheDocument();
  });
});
