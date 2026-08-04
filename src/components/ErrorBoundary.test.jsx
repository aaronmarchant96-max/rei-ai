import { render, screen } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary.jsx";

function Broken() {
  throw new Error("test crash");
}

function Fine() {
  return <p>all good</p>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // Suppress React error boundary logging in test output
    jest.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders children normally when nothing crashes", () => {
    render(<ErrorBoundary toolName="Test"><Fine /></ErrorBoundary>);
    expect(screen.getByText("all good")).toBeInTheDocument();
  });

  it("shows fallback UI when a child throws", () => {
    render(<ErrorBoundary toolName="REI.ai"><Broken /></ErrorBoundary>);
    expect(screen.getByText("Dashboard Unavailable")).toBeInTheDocument();
    expect(screen.getByText("REI.ai hit an error. The rest of the app is still working.")).toBeInTheDocument();
    expect(screen.getByText("test crash")).toBeInTheDocument();
  });
});
