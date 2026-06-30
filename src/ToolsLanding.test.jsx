import { fireEvent, render, screen } from "@testing-library/react";
import ToolsLanding, { TOOL_CARDS } from "./ToolsLanding.jsx";

describe("ToolsLanding", () => {
  it("renders the tools header and a button for each tool", () => {
    render(<ToolsLanding onOpenTool={jest.fn()} />);

    expect(screen.getByRole("heading", { name: /^tools$/i })).toBeInTheDocument();
    TOOL_CARDS.forEach((tool) => {
      expect(screen.getByText(tool.label)).toBeInTheDocument();
      expect(screen.getByText(tool.description)).toBeInTheDocument();
    });
    expect(screen.getByText(/flagship/i)).toBeInTheDocument();
  });

  it("opens the selected tool from the landing page", () => {
    const onOpenTool = jest.fn();
    render(<ToolsLanding onOpenTool={onOpenTool} />);

    // Click the REI.ai button (first / flagship)
    fireEvent.click(screen.getByRole("button", { name: /rei\.ai/i }));
    expect(onOpenTool).toHaveBeenCalledWith("rei");

    // Click the Tracepoint button
    fireEvent.click(screen.getByRole("button", { name: /tracepoint/i }));
    expect(onOpenTool).toHaveBeenCalledWith("tracepoint");
  });
});
