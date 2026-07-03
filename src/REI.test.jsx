/**
 * REI Tests - Fortis et Liber Verification:
 * 1. Leverage - Tests core failure points
 * 2. Surface Area - Minimal test cases
 * 3. Recoil - Verifies error recovery
 * 4. Enumeration - Explicit test states
 * 5. Parity - Balanced coverage
 * 6. Solvency - Guaranteed assertions
 * 7. Conservation - Efficient test runs
 */

import { render, screen } from "@testing-library/react";
import REI from "./REI.jsx";

describe("REI", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("recovers gracefully when stored chat history is corrupted", () => {
    window.localStorage.setItem("rei_chat_history_assistant", "{bad json");

    render(<REI />);

    expect(screen.getByText(/REI is live/i)).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem("rei_chat_history_assistant") || "[]"))
      .toEqual(expect.any(Array));
  });
});
