import { fireEvent, render, screen } from "@testing-library/react";
import CardoGuard from "./CardoGuard.jsx";

describe("CardoGuard", () => {
  it("runs a synthetic guard check from the default scenario", () => {
    render(<CardoGuard />);

    expect(screen.getByText(/should we act on this ai risk score/i)).toBeInTheDocument();
    expect(
      screen.getByText(/cardo guard/i, { selector: ".cardo-guard__tool-name" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/synthetic demo only/i, { selector: ".status-badge--cyan" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/not operational advice/i, { selector: ".status-badge--muted" })
    ).toBeInTheDocument();
    expect(screen.getByText(/test the decision/i, { selector: ".card-label" })).toBeInTheDocument();
    expect(screen.getByText(/start with a synthetic scenario/i)).toBeInTheDocument();
    expect(
      screen.getByText(/use fake numbers to test the decision logic before trusting a model score/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/start with the score\./i, { selector: "strong" })).toBeInTheDocument();
    expect(
      screen.getByText(/route disruption threatens a fuel delivery/i, {
        selector: ".cardo-guard__hint",
      })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/model confidence/i), {
      target: { value: "95" },
    });
    fireEvent.change(screen.getByLabelText(/cost to act/i), {
      target: { value: "5000" },
    });
    fireEvent.change(screen.getByLabelText(/cost of missing/i), {
      target: { value: "10000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run guard check/i }));

    expect(screen.getByText(/^ACT$/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /acting clears the gate because the risk-adjusted cost of missing it is higher than the expected waste of acting\./i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(/adjusted chance this risk is real/i, { selector: ".card-label" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/how often this score band is wrong/i, { selector: ".card-label" })
    ).toBeInTheDocument();
    expect(screen.getByText(/the decision hinge/i)).toBeInTheDocument();
    expect(screen.getByText(/how the gate is checked/i)).toBeInTheDocument();
    expect(screen.getByText(/why this verdict\?/i)).toBeInTheDocument();
    expect(screen.getByText(/action waste = \$5,000 × 9% = \$450/i)).toBeInTheDocument();
    expect(screen.getByText(/miss loss = \$10,000 × 91% = \$9,100/i)).toBeInTheDocument();
    expect(
      screen.getByText(/what would change the verdict/i, { selector: ".card-label" })
    ).toBeInTheDocument();
    expect(screen.getByText(/make acting more expensive\./i)).toBeInTheDocument();
    expect(
      screen.getByText(/show this score band is wrong more often than assumed\./i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/synthetic demo only/i, { selector: ".status-badge--cyan" })
    ).toBeInTheDocument();
    expect(screen.getByText(/Synthetic demo. Costs and hinge stay visible/i)).toBeInTheDocument();
    expect(screen.getByText(/Not a prediction model or expert replacement/i)).toBeInTheDocument();
    expect(screen.getByText(/what this is useful for/i)).toBeInTheDocument();
    expect(screen.getByText(/AI confidence is not the decision/i)).toBeInTheDocument();
    expect(screen.getByText(/cost-weighted consequence is the decision gate/i)).toBeInTheDocument();
    expect(
      screen.getByText(/weighs the cost of acting against the cost of ignoring a risk score/i)
    ).toBeInTheDocument();
  });

  it("resets to the selected synthetic example", () => {
    render(<CardoGuard />);

    fireEvent.change(screen.getByLabelText(/scenario/i), {
      target: { value: "routine-inspection-nudge" },
    });
    fireEvent.change(screen.getByLabelText(/model confidence/i), {
      target: { value: "95" },
    });
    fireEvent.change(screen.getByLabelText(/cost to act/i), {
      target: { value: "5000" },
    });
    fireEvent.change(screen.getByLabelText(/cost of missing/i), {
      target: { value: "10000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run guard check/i }));

    expect(screen.getByText(/^ACT$/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /reset synthetic example/i }));

    expect(
      screen.getByText(
        /acting clears the gate because the risk-adjusted cost of missing it is higher than the expected waste of acting\./i
      )
    ).toBeInTheDocument();
  });

  it("coerces invalid numeric input to zero", () => {
    render(<CardoGuard />);

    fireEvent.change(screen.getByLabelText(/cost to act/i), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run guard check/i }));

    expect(
      screen.getByText(/expected wasted cost if we act/i, { selector: ".card-label" })
    ).toBeInTheDocument();
    expect(screen.getByText(/\$0/, { selector: ".cardo-guard__metric-value" })).toBeInTheDocument();
  });

  it("shows the cautious synthetic band for low-confidence scenarios", () => {
    render(<CardoGuard />);

    fireEvent.change(screen.getByLabelText(/model confidence/i), {
      target: { value: "70" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run guard check/i }));

    expect(screen.getByText(/cautious synthetic band/i)).toBeInTheDocument();
  });

  it("renders the alternate hinge text and advice when recommendation is DO NOT ACT", () => {
    render(<CardoGuard />);

    // Drive a clear DO NOT ACT outcome using high act cost + modest miss cost
    fireEvent.change(screen.getByLabelText(/scenario/i), {
      target: { value: "routine-inspection-nudge" },
    });
    fireEvent.change(screen.getByLabelText(/model confidence/i), {
      target: { value: "78" },
    });
    fireEvent.change(screen.getByLabelText(/cost to act/i), {
      target: { value: "120000" },
    });
    fireEvent.change(screen.getByLabelText(/cost of missing/i), {
      target: { value: "80000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run guard check/i }));

    expect(screen.getByText(/^DO NOT ACT$/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /expected waste of acting is higher than the risk-adjusted cost of missing it/i
      )
    ).toBeInTheDocument();
    // Covers the "lower than assumed" branch in "what would change"
    expect(
      screen.getByText(/false alarm rate for this confidence band was lower than assumed/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/make acting cheaper\./i)).toBeInTheDocument();
  });
});
