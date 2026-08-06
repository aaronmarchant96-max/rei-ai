import { render, screen } from "@testing-library/react";
import ProgressBar from "./ProgressBar.jsx";

describe("ProgressBar", () => {
  const entries = [["deepseek-chat", 14], ["gemini-flash-latest", 7], ["llama-3.1-8b-instant", 5]];

  it("renders each entry label and count", () => {
    render(<ProgressBar entries={entries} />);
    expect(screen.getByText("deepseek-chat")).toBeInTheDocument();
    expect(screen.getByText("gemini-flash-latest")).toBeInTheDocument();
    expect(screen.getByText("llama-3.1-8b-instant")).toBeInTheDocument();
  });

  it("renders custom labels via labelFn", () => {
    render(<ProgressBar entries={entries} labelFn={function (m) { return m.toUpperCase(); }} />);
    expect(screen.getByText("DEEPSEEK-CHAT")).toBeInTheDocument();
  });

  it("has 3 bars", () => {
    const { container } = render(<ProgressBar entries={entries} />);
    const bars = container.querySelectorAll("[style*=\"height: 100%\"]");
    expect(bars.length).toBe(3);
  });
});
