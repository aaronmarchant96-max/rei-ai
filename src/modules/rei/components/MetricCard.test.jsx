import { render, screen } from "@testing-library/react";
import MetricCard from "./MetricCard.jsx";

describe("MetricCard", () => {
  it("renders label and children", () => {
    render(<MetricCard label="Requests">{42}</MetricCard>);
    expect(screen.getByText("Requests")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders subtext", () => {
    render(<MetricCard label="Cost" subtext="per 1K tokens">$0.00</MetricCard>);
    expect(screen.getByText("per 1K tokens")).toBeInTheDocument();
  });

  it("applies animation delay style attribute", () => {
    const { container } = render(<MetricCard label="A" delay={200}>X</MetricCard>);
    const card = container.firstChild;
    expect(card.style.animationDelay).toBe("200ms");
  });
});
