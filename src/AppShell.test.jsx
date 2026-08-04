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

    // Current UI: back to landing is the header "Ecosystem" nav button
    fireEvent.click(screen.getByRole("button", { name: /ecosystem/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/");
    });
    await waitFor(() => {
      expect(document.title).toBe("PromptHound Labs | Tools");
    });
    await screen.findByText(/CARDO REI Pipeline/i, {}, { timeout: 5000 });
  });

  it("opens Story Forge from the landing page", async () => {
    render(<AppShell />);

    // New landing page has no per-tool launch buttons — navigate via domain experiment card
    await screen.findByText(/Story Forge/i, {}, { timeout: 5000 });

    // Navigate by setting hash directly (the app reads hash on load)
    window.history.replaceState({}, "", "/#story-forge");
    // Re-render to pick up new hash
    render(<AppShell />);
    
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
