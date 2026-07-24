import { fireEvent, render, screen } from "@testing-library/react";
import ToolsLanding from "./ToolsLanding.jsx";

describe("ToolsLanding", () => {
  it("renders the tools header and section titles", () => {
    render(<ToolsLanding onOpenTool={jest.fn()} />);

    expect(screen.getByRole("heading", { name: /A structured reasoning framework/i })).toBeInTheDocument();
    expect(screen.getByText(/The CARDO Framework/i)).toBeInTheDocument();
    expect(screen.getAllByText(/REI\.ai/i).length).toBeGreaterThan(0);
  });

  it("opens the selected tool from the landing page", () => {
    const onOpenTool = jest.fn();
    render(<ToolsLanding onOpenTool={onOpenTool} />);

    // Click the REI Platform button
    fireEvent.click(screen.getAllByRole("button", { name: /Launch REI Platform/i })[0]);
    expect(onOpenTool).toHaveBeenCalledWith("rei");

    // Click the Tracepoint button
    fireEvent.click(screen.getAllByRole("button", { name: /Launch Tracepoint/i })[0]);
    expect(onOpenTool).toHaveBeenCalledWith("tracepoint");
  });
});
