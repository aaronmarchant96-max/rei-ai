import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AppShell from "./AppShell.jsx";

describe("AppShell", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    document.title = "";
  });

  it("defaults to REI.ai and shows the breadcrumb", async () => {
    render(<AppShell />);

    expect(screen.getByRole("button", { name: /PromptHound Labs/i })).toBeInTheDocument();
    expect(document.querySelector(".shell-tool-bar__current")?.textContent).toBe("REI.ai");
    await waitFor(() => {
      expect(document.title).toBe("PromptHound Labs | REI.ai");
    });
  });

  it("navigates back to Tools landing from a tool", async () => {
    render(<AppShell />);

    fireEvent.click(screen.getByRole("button", { name: /PromptHound Labs/i }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/tools");
    });
    await waitFor(() => {
      expect(document.title).toBe("PromptHound Labs | Tools");
    });
    expect(screen.getByRole("heading", { name: /^tools$/i })).toBeInTheDocument();
  });

  it("opens a tool from the Tools landing page", async () => {
    render(<AppShell />);

    fireEvent.click(screen.getByRole("button", { name: /PromptHound Labs/i }));
    await waitFor(() => {
      expect(window.location.pathname).toBe("/tools");
    });

    fireEvent.click(screen.getByRole("button", { name: /Old sources into story blueprints/i }));

    await waitFor(() => {
      expect(window.location.hash).toBe("#story-forge");
    });
    await waitFor(() => {
      expect(document.title).toBe("PromptHound Labs | Story Forge");
    });
  });

  it("respects the initial hash on load", () => {
    window.history.replaceState({}, "", "/#storm-replay");

    render(<AppShell />);

    expect(document.querySelector(".shell-tool-bar__current")?.textContent).toBe("Storm Replay");
    expect(document.title).toBe("PromptHound Labs | Storm Replay");
  });

  it("loads CARDO GUARD from the hash", () => {
    window.history.replaceState({}, "", "/#cardo-guard");

    render(<AppShell />);

    expect(document.querySelector(".shell-tool-bar__current")?.textContent).toBe("CARDO GUARD");
    expect(document.title).toBe("PromptHound Labs | CARDO GUARD");
  });

  it("loads Tracepoint from the hash", () => {
    window.history.replaceState({}, "", "/#tracepoint");

    render(<AppShell />);

    expect(document.querySelector(".shell-tool-bar__current")?.textContent).toBe("Tracepoint");
    expect(document.title).toBe("PromptHound Labs | Tracepoint");
  });

  it("loads REI.ai from the /tools pathname", () => {
    window.history.replaceState({}, "", "/tools");

    render(<AppShell />);

    expect(document.querySelector(".shell-tool-bar__current")?.textContent).toBe("REI.ai");
    expect(document.title).toBe("PromptHound Labs | REI.ai");
  });
});
