import { fireEvent, render, screen } from "@testing-library/react";
import ToolsLanding from "./ToolsLanding.jsx";
import claimsData from "./data/claims.json";

describe("ToolsLanding", () => {
  it("renders hero with REI.ai name and launch button", () => {
    render(<ToolsLanding onOpenTool={jest.fn()} />);

    expect(screen.getByText(/REI\.ai by PromptHound Labs/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /launch rei\.ai/i })).toBeInTheDocument();
  });

  it("renders stats badges with accuracy and test count", () => {
    render(<ToolsLanding onOpenTool={jest.fn()} />);

    expect(screen.getByText(`${claimsData.testCount}+`)).toBeInTheDocument();
    expect(screen.getByText("Passing Tests")).toBeInTheDocument();
    expect(screen.getByText("Router Accuracy (implemented routes)")).toBeInTheDocument();
  });

  it("renders CARDO pipeline steps", () => {
    render(<ToolsLanding onOpenTool={jest.fn()} />);

    expect(screen.getByText(/CARDO REI Pipeline/i)).toBeInTheDocument();
    expect(screen.getByText("Collect")).toBeInTheDocument();
    expect(screen.getByText(/gather raw inputs/i)).toBeInTheDocument();
    expect(screen.getByText("Record")).toBeInTheDocument();
    expect(screen.getByText("Evaluate")).toBeInTheDocument();
  });

  it("renders router demo with scenario buttons", () => {
    render(<ToolsLanding onOpenTool={jest.fn()} />);

    expect(screen.getByText(/cost-aware llm router/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /coding task/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Greeting" })).toBeInTheDocument();
  });

  it("renders domain experiments section", () => {
    render(<ToolsLanding onOpenTool={jest.fn()} />);

    expect(screen.getByText(/domain experiments/i)).toBeInTheDocument();
    expect(screen.getByText(/the furnace/i)).toBeInTheDocument();
    expect(screen.getByText(/storm replay/i)).toBeInTheDocument();
  });

  it("navigates to REI from hero button", () => {
    const onOpenTool = jest.fn();
    render(<ToolsLanding onOpenTool={onOpenTool} />);

    fireEvent.click(screen.getByRole("button", { name: /launch rei\.ai/i }));
    expect(onOpenTool).toHaveBeenCalledWith({ tool: "rei" });
  });

  it("surfaces a prominent analytics CTA next to the launch button", () => {
    const onOpenTool = jest.fn();
    render(<ToolsLanding onOpenTool={onOpenTool} />);

    const cta = screen.getByRole("button", { name: /view measured savings analytics/i });
    expect(cta).toBeInTheDocument();
    fireEvent.click(cta);
    expect(onOpenTool).toHaveBeenCalledWith({ tool: "analytics" });
  });

  it("renders footer", () => {
    render(<ToolsLanding onOpenTool={jest.fn()} />);

    expect(screen.getByText(/github/i)).toBeInTheDocument();
    expect(screen.getByText(/rei\.ai by prompthound/i)).toBeInTheDocument();
  });
});
