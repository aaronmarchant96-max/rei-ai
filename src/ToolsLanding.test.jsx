import { fireEvent, render, screen } from "@testing-library/react";
import ToolsLanding from "./ToolsLanding.jsx";

describe("ToolsLanding", () => {
  it("renders hero with REI.ai name and launch button", () => {
    render(<ToolsLanding onOpenTool={jest.fn()} />);

    expect(screen.getByText(/REI\.ai by PromptHound Labs/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /launch rei\.ai/i })).toBeInTheDocument();
  });

  it("renders stats bar with test count", () => {
    render(<ToolsLanding onOpenTool={jest.fn()} />);

    expect(screen.getAllByText(/300 tests passing/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/open source/i)).toBeInTheDocument();
  });

  it("renders CARDO framework with expandable steps", () => {
    render(<ToolsLanding onOpenTool={jest.fn()} />);

    expect(screen.getByText(/the cardo framework/i)).toBeInTheDocument();

    const collectBtn = screen.getByRole("button", { name: /collect/i });
    expect(collectBtn).toBeInTheDocument();

    fireEvent.click(collectBtn);
    expect(screen.getByText(/gather raw inputs/i)).toBeInTheDocument();
  });

  it("renders router demo with scenario buttons", () => {
    render(<ToolsLanding onOpenTool={jest.fn()} />);

    expect(screen.getByText(/cost-aware llm router/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /coding task/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /greeting/i })).toBeInTheDocument();
  });

  it("renders case studies with launch buttons", () => {
    const onOpenTool = jest.fn();
    render(<ToolsLanding onOpenTool={onOpenTool} />);

    expect(screen.getByText(/domain case studies/i)).toBeInTheDocument();
    expect(screen.getByText(/debate furnace/i)).toBeInTheDocument();
    expect(screen.getByText(/story forge/i)).toBeInTheDocument();

    const launchBtns = screen.getAllByRole("button", { name: /launch/i });
    expect(launchBtns.length).toBeGreaterThanOrEqual(5);
    fireEvent.click(launchBtns[1]); // 0=hero, 1=Furnace
    expect(onOpenTool).toHaveBeenCalledWith({ tool: "furnace" });
  });

  it("navigates to REI from hero button", () => {
    const onOpenTool = jest.fn();
    render(<ToolsLanding onOpenTool={onOpenTool} />);

    fireEvent.click(screen.getByRole("button", { name: /launch rei\.ai/i }));
    expect(onOpenTool).toHaveBeenCalledWith({ tool: "rei" });
  });

  it("renders footer", () => {
    render(<ToolsLanding onOpenTool={jest.fn()} />);

    expect(screen.getByText(/github/i)).toBeInTheDocument();
    expect(screen.getAllByText(/prompthound labs/i).length).toBeGreaterThanOrEqual(2);
  });
});
