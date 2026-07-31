import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AppShell from "./AppShell.jsx";

describe("AppShell", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    document.title = "";
  });

  it("defaults to Tools landing page", async () => {
    render(<AppShell />);
    await waitFor(() => {
      expect(document.title).toBe("PromptHound Labs | Tools");
    });
  });

  it("navigates back to Tools landing from a tool", async () => {
    window.history.replaceState({}, "", "/#story-forge");
    render(<AppShell />);

    await waitFor(() => {
      expect(document.title).toBe("PromptHound Labs | Story Forge");
    });

    const backBtn = document.querySelector(".shell-tool-bar__back");
    if (backBtn) fireEvent.click(backBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe("/");
    });
    await waitFor(() => {
      expect(document.title).toBe("PromptHound Labs | Tools");
    });
    await screen.findByText(/the cardo framework/i, {}, { timeout: 5000 });
  });

  it("opens Story Forge from the landing page", async () => {
    render(<AppShell />);

    await waitFor(() => {
      const btns = screen.queryAllByRole("button", { name: /launch/i });
      expect(btns.length).toBeGreaterThanOrEqual(5);
    });

    const launchBtns = screen.getAllByRole("button", { name: /launch/i });
    fireEvent.click(launchBtns[3]);
    await waitFor(() => {
      expect(window.location.hash).toBe("#story-forge");
    });
    expect(document.title).toBe("PromptHound Labs | Story Forge");
  });

  it("respects the initial hash on load", () => {
    window.history.replaceState({}, "", "/#storm-replay");
    render(<AppShell />);
    expect(document.title).toBe("PromptHound Labs | Storm Replay");
  });

  it("loads CARDO GUARD from the hash", () => {
    window.history.replaceState({}, "", "/#cardo-guard");
    render(<AppShell />);
    expect(document.title).toBe("PromptHound Labs | CARDO GUARD");
  });

  it("loads Tracepoint from the hash", () => {
    window.history.replaceState({}, "", "/#tracepoint");
    render(<AppShell />);
    expect(document.title).toBe("PromptHound Labs | Tracepoint");
  });

  it("loads Tools landing from the /tools pathname", () => {
    window.history.replaceState({}, "", "/tools");
    render(<AppShell />);
    expect(document.title).toBe("PromptHound Labs | Tools");
  });
});
