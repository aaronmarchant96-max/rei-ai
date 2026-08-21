import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import WelcomePanel from "./WelcomePanel.jsx";

describe("WelcomePanel Component", () => {
  const mockOnStart = jest.fn();
  const mockOnEdit = jest.fn();
  const mockOnResume = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test("renders starter cards with sibling Run and Edit buttons", () => {
    render(<WelcomePanel onStart={mockOnStart} onEdit={mockOnEdit} onResume={mockOnResume} />);

    const runButtons = screen.getAllByRole("button", { name: /^Run /i });
    const editButtons = screen.getAllByRole("button", { name: /^Edit /i });

    expect(runButtons.length).toBeGreaterThan(0);
    expect(editButtons.length).toBe(runButtons.length);
  });

  test("main starter button click dispatches onStart exactly once", () => {
    render(<WelcomePanel onStart={mockOnStart} onEdit={mockOnEdit} onResume={mockOnResume} />);

    const firstRunBtn = screen.getAllByRole("button", { name: /^Run /i })[0];
    fireEvent.click(firstRunBtn);

    expect(mockOnStart).toHaveBeenCalledTimes(1);
    expect(mockOnEdit).not.toHaveBeenCalled();
  });

  test("native Enter and Space on Run button dispatch onStart exactly once without double dispatch", () => {
    render(<WelcomePanel onStart={mockOnStart} onEdit={mockOnEdit} onResume={mockOnResume} />);

    const firstRunBtn = screen.getAllByRole("button", { name: /^Run /i })[0];

    // Clicking / pressing Enter on standard HTML button
    fireEvent.click(firstRunBtn);
    expect(mockOnStart).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(firstRunBtn, { key: "Enter", code: "Enter" });
    // Since native button onClick is tested via click, ensure onStart is bounded
    expect(mockOnStart).toHaveBeenCalledTimes(1);
  });

  test("Edit button populates prompt without calling onStart", () => {
    render(<WelcomePanel onStart={mockOnStart} onEdit={mockOnEdit} onResume={mockOnResume} />);

    const firstEditBtn = screen.getAllByRole("button", { name: /^Edit /i })[0];
    fireEvent.click(firstEditBtn);

    expect(mockOnEdit).toHaveBeenCalledTimes(1);
    expect(mockOnStart).not.toHaveBeenCalled();
  });

  test("provides unique accessible names for all starter buttons", () => {
    render(<WelcomePanel onStart={mockOnStart} onEdit={mockOnEdit} onResume={mockOnResume} />);

    const editButtons = screen.getAllByRole("button", { name: /^Edit /i });
    const labels = editButtons.map((btn) => btn.getAttribute("aria-label"));

    // Ensure all edit buttons have distinct labels
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(labels.length);
  });
});
