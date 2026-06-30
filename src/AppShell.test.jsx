import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AppShell from "./AppShell.jsx";

describe("AppShell", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    document.title = "";
  });

  it("defaults to REI.ai and updates the hash and title when switching tools", async () => {
    render(<AppShell />);

    expect(screen.getByText("PromptHound Labs")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /rei\.ai/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(document.title).toBe("PromptHound Labs | REI.ai");

    fireEvent.click(screen.getByRole("button", { name: /story forge/i }));

    await waitFor(() => {
      expect(window.location.hash).toBe("#story-forge");
    });
    await waitFor(() => {
      expect(document.title).toBe("PromptHound Labs | Story Forge");
    });
    expect(screen.getByRole("button", { name: /story forge/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByText("Find the real pattern. Forge a new story.")).toBeInTheDocument();
  });

  it("routes to the Tools landing page", async () => {
    render(<AppShell />);

    fireEvent.click(screen.getByRole("button", { name: /^tools/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/tools");
    });
    await waitFor(() => {
      expect(document.title).toBe("PromptHound Labs | Tools");
    });
    expect(screen.getByRole("button", { name: /^tools/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: /^tools$/i })).toBeInTheDocument();
  });

  it("respects the initial hash on load", () => {
    window.history.replaceState({}, "", "/#storm-replay");

    render(<AppShell />);

    expect(screen.getByRole("button", { name: /storm replay/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(document.title).toBe("PromptHound Labs | Storm Replay");
  });

  it("loads CARDO GUARD from the hash", () => {
    window.history.replaceState({}, "", "/#cardo-guard");

    render(<AppShell />);

    expect(screen.getByRole("button", { name: /cardo guard/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(document.title).toBe("PromptHound Labs | CARDO GUARD");
  });

  it("loads Tracepoint from the hash", () => {
    window.history.replaceState({}, "", "/#tracepoint");

    render(<AppShell />);

    expect(screen.getByRole("button", { name: /tracepoint/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(document.title).toBe("PromptHound Labs | Tracepoint");
  });

  it("loads REI.ai from the /tools pathname", () => {
    window.history.replaceState({}, "", "/tools");

    render(<AppShell />);

    expect(screen.getByRole("button", { name: /rei\.ai/i })).toHaveAttribute("aria-pressed", "true");
    expect(document.title).toBe("PromptHound Labs | REI.ai");
    expect(screen.getByRole("heading", { name: /^rei\.ai$/i })).toBeInTheDocument();
  });
});
