import { act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AppShell from "./AppShell.jsx";

async function waitForLazySettle() {
  await act(async () => {});
}

describe("AppShell", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    document.title = "";
  });

  it("defaults to REI.ai and shows the breadcrumb", async () => {
    render(<AppShell />);
    await waitForLazySettle();

    expect(screen.getByRole("button", { name: /PromptHound Labs/i })).toBeInTheDocument();
    expect(document.querySelector(".shell-tool-bar__current")?.textContent).toBe("REI.ai");
    await waitFor(() => {
      expect(document.title).toBe("PromptHound Labs | REI.ai");
    });
  });

  it("navigates back to Tools landing from a tool", async () => {
    render(<AppShell />);
    await waitForLazySettle();

    fireEvent.click(screen.getByRole("button", { name: /PromptHound Labs/i }));
    await waitForLazySettle();

    await waitFor(() => {
      expect(window.location.pathname).toBe("/tools");
    });
    await waitFor(() => {
      expect(document.title).toBe("PromptHound Labs | Tools");
    });
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /^tools$/i })).toBeInTheDocument();
    });
  });

  it("opens a tool from the Tools landing page", async () => {
    render(<AppShell />);
    await waitForLazySettle();

    fireEvent.click(screen.getByRole("button", { name: /PromptHound Labs/i }));
    await waitForLazySettle();

    await waitFor(() => {
      expect(window.location.pathname).toBe("/tools");
    });

    fireEvent.click(screen.getByRole("button", { name: /Old sources into story blueprints/i }));
    await waitForLazySettle();

    await waitFor(() => {
      expect(window.location.hash).toBe("#story-forge");
    });
    await waitFor(() => {
      expect(document.title).toBe("PromptHound Labs | Story Forge");
    });
  });

  it("respects the initial hash on load", async () => {
    window.history.replaceState({}, "", "/#storm-replay");

    render(<AppShell />);
    await waitForLazySettle();

    expect(document.querySelector(".shell-tool-bar__current")?.textContent).toBe("Storm Replay");
    expect(document.title).toBe("PromptHound Labs | Storm Replay");
  });

  it("loads CARDO GUARD from the hash", async () => {
    window.history.replaceState({}, "", "/#cardo-guard");

    render(<AppShell />);
    await waitForLazySettle();

    expect(document.querySelector(".shell-tool-bar__current")?.textContent).toBe("CARDO GUARD");
    expect(document.title).toBe("PromptHound Labs | CARDO GUARD");
  });

  it("loads Tracepoint from the hash", async () => {
    window.history.replaceState({}, "", "/#tracepoint");

    render(<AppShell />);
    await waitForLazySettle();

    expect(document.querySelector(".shell-tool-bar__current")?.textContent).toBe("Tracepoint");
    expect(document.title).toBe("PromptHound Labs | Tracepoint");
  });

  it("loads REI.ai from the /tools pathname", async () => {
    window.history.replaceState({}, "", "/tools");

    render(<AppShell />);
    await waitForLazySettle();

    expect(document.querySelector(".shell-tool-bar__current")?.textContent).toBe("REI.ai");
    expect(document.title).toBe("PromptHound Labs | REI.ai");
  });

  it("loads the landing page storefront from the #landing hash", async () => {
    window.history.replaceState({}, "", "/#landing");

    render(<AppShell />);
    await waitForLazySettle();

    expect(screen.getByText(/An Information-Theoretic Routing & Reasoning Engine/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Try the Demo/i })).toBeInTheDocument();
    expect(document.title).toBe("PromptHound Labs | CARDO REI");
  });
});
