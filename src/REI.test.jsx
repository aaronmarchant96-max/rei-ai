import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import REI from "./REI.jsx";

describe("REI", () => {
  beforeEach(() => {
    window.localStorage.clear();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          result: "Here is a direct answer to your question.\n\nHinge: The core pivot point.\nFacts: What is known.\nMove: Next step.",
          model: "llama-3.1-8b-instant",
          routerDecision: { id: "simple-greeting", label: "Simple Greeting", model: "llama-3.1-8b-instant" },
          timestamp: new Date().toISOString(),
        }),
      })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("recovers gracefully when stored chat history is corrupted", () => {
    window.localStorage.setItem("rei_chat_history_assistant", "{bad json");

    render(<REI />);

    expect(screen.getByText(/REI is live/i)).toBeInTheDocument();
    const stored = JSON.parse(window.localStorage.getItem("rei_chat_history_assistant") || "{}");
    expect(stored.version).toBe("hcm_v1");
    expect(stored.domainId).toBe("assistant");
  });

  it("sends a message and displays the user bubble and assistant reply", async () => {
    render(<REI />);

    const input = screen.getByPlaceholderText(/what are you trying to think through/i);
    fireEvent.change(input, { target: { value: "hello world" } });

    const sendButton = screen.getByRole("button", { name: /send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText("hello world")).toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByText(/here is a direct answer/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
