import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DebateFurnace from "./DebateFurnace.jsx";

const HISTORY_KEY = "rei_furnace_history_v1";

describe("DebateFurnace", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    window.localStorage.clear();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("runs a starter debate from question selection through the final report", async () => {
    render(<DebateFurnace />);

    fireEvent.click(screen.getByRole("button", { name: /gun control/i }));
    fireEvent.click(screen.getByRole("button", { name: /ignite debate/i }));

    expect(await screen.findByText(/question analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/opening arguments/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /begin round 1/i }));

    for (let i = 0; i < 3; i += 1) {
      const stokeButton = screen.queryByRole("button", { name: /stoke the furnace/i });
      if (!stokeButton) break;
      fireEvent.click(stokeButton);
    }

    await waitFor(() => {
      expect(screen.getByText(/what survived the heat/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText(/^THE HINGE$/i)).toHaveLength(1);
    expect(screen.getByRole("button", { name: /copy full report/i })).toBeInTheDocument();
  });

  it("persists completed debates to history and reloads them on a fresh mount", async () => {
    const { unmount } = render(<DebateFurnace />);

    fireEvent.click(screen.getByRole("button", { name: /gun control/i }));
    fireEvent.click(screen.getByRole("button", { name: /ignite debate/i }));

    await screen.findByText(/question analysis/i);
    fireEvent.click(screen.getByRole("button", { name: /begin round 1/i }));

    for (let i = 0; i < 3; i += 1) {
      const stokeButton = screen.queryByRole("button", { name: /stoke the furnace/i });
      if (!stokeButton) break;
      fireEvent.click(stokeButton);
    }

    await waitFor(() => {
      expect(screen.getByText(/what survived the heat/i)).toBeInTheDocument();
    });

    const history = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || "[]");
    expect(history).toHaveLength(1);
    expect(history[0]).toEqual(
      expect.objectContaining({
        question: "Does gun control reduce harm?",
        result: expect.any(String),
        payload: expect.objectContaining({
          question: "Does gun control reduce harm?",
          intensity: "balanced",
          debate: expect.any(Object),
        }),
      })
    );

    unmount();
    window.history.replaceState({}, "", "/");

    render(<DebateFurnace />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /my debates/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /my debates/i }));
    const savedEntry = screen
      .getAllByRole("button", { name: /does gun control reduce harm\?/i })
      .find((button) => button.textContent?.includes("Policy Debate"));
    expect(savedEntry).toBeTruthy();
    fireEvent.click(savedEntry);

    await waitFor(() => {
      expect(screen.getByText(/what survived the heat/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /copy full report/i })).toBeInTheDocument();
  });
});
