import { useEffect, useState, lazy, Suspense } from "react";
import { useMobile } from "./useMobile.js";
import HingeMark from "./modules/rei/components/HingeMark.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

import ToolsLanding from "./ToolsLanding.jsx";
import REI from "./REI.jsx";

const DebateFurnace = lazy(() => import("./DebateFurnace.jsx"));
const CreativeEngine = lazy(() => import("./CreativeEngine.jsx"));
const StormReplay = lazy(() => import("./StormReplay.jsx"));
const CardoGuard = lazy(() => import("./CardoGuard.jsx"));
const Tracepoint = lazy(() => import("./Tracepoint.jsx"));
const Analytics = lazy(() => import("./Analytics.jsx"));
const RedTeam = lazy(() => import("./RedTeam.jsx"));
const PilotOnboarding = lazy(() => import("./modules/rei/components/PilotOnboarding.jsx"));

function LoadingShell() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", width: "100%" }}>
      <div style={{ color: "#E2A33D", fontSize: "14px", fontWeight: 600, fontFamily: "monospace", letterSpacing: "0.05em" }}>
        Loading…
      </div>
    </div>
  );
}

// Build-time tool inventory contract (validated by scripts/validate-app-shell.mjs).
// Not consumed by render since the mobile drawer was removed — kept for the guard.
/* eslint-disable no-unused-vars */
const TOP_LEVEL = [
  {
    id: "tools",
    label: "Tools",
    subtitle: "Pick the slice you need."
  },
  {
    id: "furnace",
    label: "The Furnace",
    subtitle: "Arguments get pressure-tested here."
  },
  {
    id: "story-forge",
    label: "Story Forge",
    subtitle: "Old sources turn into story blueprints."
  },
  {
    id: "storm-replay",
    label: "Storm Replay",
    subtitle: "Storm imagery gets a careful read."
  },
  {
    id: "cardo-guard",
    label: "CARDO GUARD",
    subtitle: "AI scores get checked against cost."
  },
  {
    id: "rei",
    label: "REI.ai",
    subtitle: "Platform reasoning layer."
  },
  {
    id: "tracepoint",
    label: "Tracepoint",
    subtitle: "Industrial signals stay evidence-first."
  },
  {
    id: "analytics",
    label: "Analytics",
    subtitle: "How decisions played out — rescue rate, savings, audit."
  },
  {
    id: "red-team",
    label: "Red Team",
    subtitle: "Adversarial prompt scanner — D1 keyword surface analysis."
  }
];
/* eslint-enable no-unused-vars */

function getInitialTool() {
  if (typeof window === "undefined") return "tools";
  const hash = (window.location.hash || "").toLowerCase();
  if (hash === "#rei" || hash === "#cfai") return "rei";
  if (hash === "#furnace") return "furnace";
  if (hash === "#story-forge") return "story-forge";
  if (hash === "#storm-replay") return "storm-replay";
  if (hash === "#cardo-guard") return "cardo-guard";
  if (hash === "#tracepoint") return "tracepoint";
  if (hash === "#analytics") return "analytics";
  if (hash === "#red-team") return "red-team";
  return "tools";
}

function getToolPath(tool) {
  if (tool === "tools") return "/";
  if (tool === "story-forge") return "/#story-forge";
  if (tool === "storm-replay") return "/#storm-replay";
  if (tool === "cardo-guard") return "/#cardo-guard";
  if (tool === "rei") return "/#rei";
  if (tool === "furnace") return "/#furnace";
  if (tool === "tracepoint") return "/#tracepoint";
  if (tool === "analytics") return "/#analytics";
  if (tool === "red-team") return "/#red-team";
  return "/";
}

export default function AppShell() {
  const [tool, setTool] = useState(getInitialTool);
  const [reiInitialPrompt, setReiInitialPrompt] = useState(null);
  const mobile = useMobile(45); // 45em = 720px

  // Listen for browser navigation (back/forward and hash changes)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleNav = () => {
      const nextTool = getInitialTool();
      setTool(nextTool);
    };
    window.addEventListener("hashchange", handleNav);
    window.addEventListener("popstate", handleNav);
    return () => {
      window.removeEventListener("hashchange", handleNav);
      window.removeEventListener("popstate", handleNav);
    };
  }, []);

  // Update URL hash, title, and reset window scroll on tool transition
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof window.scrollTo === "function") {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      } catch (_) {
        try {
          window.scrollTo(0, 0);
        } catch (_) {}
      }
    }
    const shellEl = document.querySelector(".shell-main");
    if (shellEl) {
      shellEl.scrollTop = 0;
    }
    const resolvedPath = getToolPath(tool);
    if (`${window.location.pathname}${window.location.hash}` !== resolvedPath) {
      window.history.replaceState({}, "", resolvedPath);
    }
    document.title =
      tool === "tools"
        ? "PromptHound Labs | Tools"
        : tool === "story-forge"
          ? "PromptHound Labs | Story Forge"
          : tool === "storm-replay"
            ? "PromptHound Labs | Storm Replay"
            : tool === "cardo-guard"
              ? "PromptHound Labs | CARDO GUARD"
              : tool === "rei"
                ? "PromptHound Labs | REI.ai"
                : tool === "tracepoint"
                  ? "PromptHound Labs | Tracepoint"
                  : tool === "analytics"
                    ? "PromptHound Labs | Analytics"
                    : tool === "red-team"
                      ? "PromptHound Labs | Red Team"
                      : "PromptHound Labs | The Furnace";
  }, [tool]);

  const isChatWorkspace = tool === "rei" || tool === "cfai";

  return (
    <div className={`app-shell ${isChatWorkspace ? "is-workspace" : ""}`}>
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3 cursor-pointer rei-brand" onClick={(e) => {
          if (window.location.pathname === "/" && !window.location.hash) {
            e.preventDefault();
            setTool("tools");
          }
        }}>
          <div className="rei-cardo-mark">
            <HingeMark size={20} animated={false} color="#E2A33D" />
          </div>
          <div>
            <div className="rei-brand__wordmark">REI<span className="rei-brand__suffix">.ai</span></div>
          </div>
        </a>

        {!mobile && (
          <nav className="flex items-center gap-6" aria-label="Primary navigation">
            <button onClick={() => {
              if (tool !== "tools") setTool("tools");
              setTimeout(() => {
                const el = document.getElementById("ecosystem");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }} className="rei-header-nav__link">Experiments</button>
            <button onClick={() => setTool("pilot")} className="rei-header-nav__link">Developers</button>
            <div className="w-px h-4 bg-gray-700 mx-1"></div>
            <a href="https://x.com/PromptHound96" target="_blank" rel="noreferrer" className="rei-header-nav__link">X (Twitter)</a>
            <a href="https://github.com/aaronmarchant96-max/rei-ai" target="_blank" rel="noreferrer" className="rei-header-nav__link">GitHub</a>
          </nav>
        )}
      </header>

      <main className={`shell-main ${isChatWorkspace ? "shell-main--workspace" : ""}`}>
        <Suspense fallback={<LoadingShell />}>
          {tool === "tools" ? (
            <ErrorBoundary toolName="Tools">
              <ToolsLanding onOpenTool={({ tool: t, prompt }) => {
                setReiInitialPrompt(prompt || null);
                setTool(t);
              }} />
            </ErrorBoundary>
          ) : tool === "pilot" ? (
            <ErrorBoundary toolName="Developers"><PilotOnboarding /></ErrorBoundary>
          ) : tool === "story-forge" ? (
            <ErrorBoundary toolName="Story Forge"><CreativeEngine /></ErrorBoundary>
          ) : tool === "storm-replay" ? (
            <ErrorBoundary toolName="Storm Replay"><StormReplay /></ErrorBoundary>
          ) : tool === "cardo-guard" ? (
            <ErrorBoundary toolName="CARDO GUARD"><CardoGuard /></ErrorBoundary>
          ) : tool === "rei" ? (
            <ErrorBoundary toolName="REI.ai"><REI initialPrompt={reiInitialPrompt} /></ErrorBoundary>
          ) : tool === "tracepoint" ? (
            <ErrorBoundary toolName="Tracepoint"><Tracepoint /></ErrorBoundary>
          ) : tool === "analytics" ? (
            <ErrorBoundary toolName="Analytics"><Analytics /></ErrorBoundary>
          ) : tool === "red-team" ? (
            <ErrorBoundary toolName="Red Team"><RedTeam /></ErrorBoundary>
          ) : tool === "cfai" ? (
            <ErrorBoundary toolName="REI.ai"><REI initialPrompt={reiInitialPrompt} /></ErrorBoundary>
          ) : (
            <ErrorBoundary toolName="The Furnace"><DebateFurnace /></ErrorBoundary>
          )}
        </Suspense>
      </main>
    </div>
  );
}
