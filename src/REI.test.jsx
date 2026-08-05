import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import REI, { fetchWithTimeout } from "./REI.jsx";

describe("REI", () => {
  beforeEach(() => {
    window.localStorage.clear();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        headers: { get: () => "application/json" },
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

    expect(screen.getByText(/Hey! I'm REI/i)).toBeInTheDocument();
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

  it("sends a short prompt (not the full domain prompt) for simple greetings", async () => {
    render(<REI />);

    const input = screen.getByPlaceholderText(/what are you trying to think through/i);
    fireEvent.change(input, { target: { value: "hello" } });

    const sendButton = screen.getByRole("button", { name: /send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      const calls = global.fetch.mock.calls;
      const lastCall = calls[calls.length - 1];
      const body = JSON.parse(lastCall[1].body);
      expect(body.systemPrompt).toBe("You are REI. Reply in one short, friendly sentence.");
      // input must not carry the full 6K-char Generalist prompt for a greeting
      expect(body.input).toBe("hello");
    }, { timeout: 3000 });
  });

  it("switches domain when clicking a domain tab", async () => {
    render(<REI />);

    expect(screen.getByText(/Hey! I'm REI/i)).toBeInTheDocument();

    // Click "Coding" domain tab — it shows "The Hinge Finder"
    const codingTab = screen.getByText("The Engineer");
    fireEvent.click(codingTab);

    await waitFor(() => {
      expect(screen.getByText(/System initialized. Welcome to REI.ai The Engineer/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("toggles theme when clicking the theme button", () => {
    render(<REI />);

    const shell = document.querySelector("[data-theme]");
    expect(shell.getAttribute("data-theme")).toBe("dark");

    fireEvent.click(screen.getByTitle("Toggle light / dark theme"));

    expect(shell.getAttribute("data-theme")).toBe("light");

    fireEvent.click(screen.getByTitle("Toggle light / dark theme"));

    expect(shell.getAttribute("data-theme")).toBe("dark");
  });

  it("opens and closes the philosophy modal", () => {
    render(<REI />);

    fireEvent.click(screen.getByText(/Philosophy/i));

    expect(screen.getByText("SYSTEM PHILOSOPHY: R.E.I.")).toBeInTheDocument();

    // Close via the × button
    fireEvent.click(screen.getByLabelText("Close Modal"));

    expect(screen.queryByText("SYSTEM PHILOSOPHY: R.E.I.")).not.toBeInTheDocument();
  });

  it('pre-fills legal domain and input when "Try a Case" is clicked', async () => {
    render(<REI />);

    fireEvent.click(screen.getByText(/Try a Case/i));

    await waitFor(() => {
      expect(screen.getByText(/System initialized. Welcome to REI.ai The Precedent Engine/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByText("What is the hinge in Donoghue v Stevenson?")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("clears chat history and shows only the welcome message", async () => {
    render(<REI />);

    const input = screen.getByPlaceholderText(/what are you trying to think through/i);
    fireEvent.change(input, { target: { value: "hello world" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText("hello world")).toBeInTheDocument();
    }, { timeout: 3000 });

    fireEvent.click(screen.getByText("Clear Chat"));

    await waitFor(() => {
      expect(screen.queryByText("hello world")).not.toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText(/Hey! I'm REI/i)).toBeInTheDocument();
  });

  it("shows fallback text when the API call fails", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn(() => Promise.reject(new Error("Network failure")));

    try {
      render(<REI />);

      const input = screen.getByPlaceholderText(/what are you trying to think through/i);
      fireEvent.change(input, { target: { value: "test fallback" } });
      fireEvent.click(screen.getByRole("button", { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText("test fallback")).toBeInTheDocument();
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(screen.getByText(/can't reach a reasoning backend/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("rejects with a timeout message when the fetch hangs", async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn((url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        const err = new Error("The operation was aborted");
        err.name = "AbortError";
        reject(err);
      });
    }));
    const assertion = expect(fetchWithTimeout("/api/cfai", {}, 1000)).rejects.toThrow(/timed out after 1s/i);
    jest.advanceTimersByTime(1001);
    await assertion;
    jest.useRealTimers();
  });

  it("resolves with the response when fetch completes in time", async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
    const response = await fetchWithTimeout("/api/cfai", {}, 1000);
    expect(response.ok).toBe(true);
  });
});
