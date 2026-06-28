import { fireEvent, render, screen } from "@testing-library/react";
import ToolsLanding, { TOOL_CARDS } from "./ToolsLanding.jsx";

describe("ToolsLanding", () => {
  it("renders a card for each PromptHound tool", () => {
    render(<ToolsLanding onOpenTool={jest.fn()} />);

    expect(screen.getByRole("heading", { name: /^tools$/i })).toBeInTheDocument();
    TOOL_CARDS.forEach((tool) => {
      expect(screen.getByText(tool.label)).toBeInTheDocument();
      expect(screen.getByText(tool.description)).toBeInTheDocument();
    });
    expect(screen.getByText(/does the scoring logic make sense for your use case\?/i)).toBeInTheDocument();
  });

  it("opens the selected tool from the landing page", () => {
    const onOpenTool = jest.fn();
    render(<ToolsLanding onOpenTool={onOpenTool} />);

    // Click the Hinge Meter link (index 4)
    fireEvent.click(screen.getAllByRole("link", { name: /open demo/i })[4]);
    expect(onOpenTool).toHaveBeenCalledWith("hinge-meter");

    // Click the REI link (index 5)
    fireEvent.click(screen.getAllByRole("link", { name: /open demo/i })[5]);
    expect(onOpenTool).toHaveBeenCalledWith("rei");

    // Click the Tracepoint link (index 6)
    fireEvent.click(screen.getAllByRole("link", { name: /open demo/i })[6]);
    expect(onOpenTool).toHaveBeenCalledWith("tracepoint");
  });
});
