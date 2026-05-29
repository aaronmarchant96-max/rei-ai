import { fireEvent, render, screen } from "@testing-library/react";
import CardoGuard from "./CardoGuard.jsx";

describe("CardoGuard", () => {
  it("runs a synthetic guard check from the default scenario", () => {
    render(<CardoGuard />);

    expect(screen.getByText(/should we act on this ai risk score/i)).toBeInTheDocument();
    expect(screen.getByText(/cardo guard/i, { selector: ".cardo-guard__tool-name" })).toBeInTheDocument();
    expect(screen.getByText(/synthetic demo only/i, { selector: ".status-badge--cyan" })).toBeInTheDocument();
    expect(screen.getByText(/not operational advice/i, { selector: ".status-badge--muted" })).toBeInTheDocument();
    expect(screen.getByText(/test the decision/i, { selector: ".card-label" })).toBeInTheDocument();
    expect(screen.getByText(/start with a synthetic scenario/i)).toBeInTheDocument();
    expect(screen.getByText(/use fake numbers to test the decision logic before trusting a model score/i)).toBeInTheDocument();
    expect(screen.getByText(/the model gives a score\./i, { selector: "strong" })).toBeInTheDocument();
    expect(
      screen.getByText(/route disruption threatens a fuel delivery/i, { selector: ".cardo-guard__hint" })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/model confidence/i), {
      target: { value: "95" }
    });
    fireEvent.change(screen.getByLabelText(/cost to act/i), {
      target: { value: "5000" }
    });
    fireEvent.change(screen.getByLabelText(/cost of missing/i), {
      target: { value: "10000" }
    });
    fireEvent.click(screen.getByRole("button", { name: /run guard check/i }));

    expect(screen.getByText(/^ACT$/i)).toBeInTheDocument();
    expect(
      screen.getByText(/acting clears the gate because the risk-adjusted cost of missing it is higher than the expected waste of acting\./i)
    ).toBeInTheDocument();
    expect(screen.getByText(/adjusted chance the risk is real/i, { selector: ".card-label" })).toBeInTheDocument();
    expect(screen.getByText(/how often this confidence band is wrong/i, { selector: ".card-label" })).toBeInTheDocument();
    expect(screen.getByText(/the decision hinge/i)).toBeInTheDocument();
    expect(screen.getByText(/how the gate is checked/i)).toBeInTheDocument();
    expect(screen.getByText(/why this verdict\?/i)).toBeInTheDocument();
    expect(screen.getByText(/action waste = \$5,000 × 9% = \$450/i)).toBeInTheDocument();
    expect(screen.getByText(/miss loss = \$10,000 × 91% = \$9,100/i)).toBeInTheDocument();
    expect(screen.getByText(/what would change the verdict/i, { selector: ".card-label" })).toBeInTheDocument();
    expect(screen.getByText(/raise the cost of acting\./i)).toBeInTheDocument();
    expect(screen.getByText(/show a higher calibrated false-alarm band\./i)).toBeInTheDocument();
    expect(screen.getByText(/synthetic demo only/i, { selector: ".status-badge--cyan" })).toBeInTheDocument();
    expect(screen.getByText(/not a prediction model/i, { selector: ".cardo-guard__rules li" })).toBeInTheDocument();
    expect(screen.getByText(/what this is useful for/i)).toBeInTheDocument();
  });

  it("resets to the selected synthetic example", () => {
    render(<CardoGuard />);

    fireEvent.change(screen.getByLabelText(/scenario/i), {
      target: { value: "routine-inspection-nudge" }
    });
    fireEvent.change(screen.getByLabelText(/model confidence/i), {
      target: { value: "95" }
    });
    fireEvent.change(screen.getByLabelText(/cost to act/i), {
      target: { value: "5000" }
    });
    fireEvent.change(screen.getByLabelText(/cost of missing/i), {
      target: { value: "10000" }
    });
    fireEvent.click(screen.getByRole("button", { name: /run guard check/i }));

    expect(screen.getByText(/^ACT$/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /reset synthetic example/i }));

    expect(
      screen.getByText(/acting clears the gate because the risk-adjusted cost of missing it is higher than the expected waste of acting\./i)
    ).toBeInTheDocument();
  });

  it("coerces invalid numeric input to zero", () => {
    render(<CardoGuard />);

    fireEvent.change(screen.getByLabelText(/cost to act/i), {
      target: { value: "" }
    });
    fireEvent.click(screen.getByRole("button", { name: /run guard check/i }));

    expect(
      screen.getByText(/expected cost if we act and the model is wrong/i, { selector: ".card-label" })
    ).toBeInTheDocument();
    expect(screen.getByText(/\$0/, { selector: ".cardo-guard__metric-value" })).toBeInTheDocument();
  });
});
