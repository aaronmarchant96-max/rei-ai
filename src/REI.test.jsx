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
