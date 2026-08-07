import { render, screen } from "@testing-library/react";
import ClaimsGate from "./ClaimsGate.jsx";
import { defineClaim, resetClaims } from "../lib/claimGateway";

describe("ClaimsGate", () => {
  beforeEach(() => {
    resetClaims();
  });

  it("renders the FEYNMAN GATE header", () => {
    render(<ClaimsGate />);
    expect(screen.getByText(/FEYNMAN GATE/i)).toBeInTheDocument();
  });

  it("renders a passing claim when all claims pass", () => {
    defineClaim({
      id: "test-pass",
      title: "sample claim",
      description: "d",
      category: "test",
      compute: () => 100,
      verify: (v) => v === 100
        ? { pass: true, severity: "info", reason: "within threshold" }
        : { pass: false, severity: "error", reason: "bad" },
    });
    render(<ClaimsGate />);
    expect(screen.getByTestId("claim-test-pass")).toBeInTheDocument();
    expect(screen.getByText("sample claim")).toBeInTheDocument();
    expect(screen.getByText("1/1 claims passing")).toBeInTheDocument();
  });

  it("renders a failing claim with its reason", () => {
    defineClaim({
      id: "test-fail",
      title: "broken claim",
      description: "d",
      category: "test",
      compute: () => 50,
      verify: (v) => v >= 80
        ? { pass: true, severity: "info", reason: "ok" }
        : { pass: false, severity: "error", reason: "dropped below 80%" },
    });
    render(<ClaimsGate />);
    expect(screen.getByText("broken claim")).toBeInTheDocument();
    expect(screen.getByText("dropped below 80%")).toBeInTheDocument();
    expect(screen.getByText("0/1 claims passing")).toBeInTheDocument();
  });

  it("shows a placeholder when no claims are registered", () => {
    render(<ClaimsGate />);
    expect(screen.getByText(/No claims registered yet\./i)).toBeInTheDocument();
  });
});
