import { useEffect, useState } from "react";
import DebateFurnace from "./DebateFurnace.jsx";
import CreativeEngine from "./CreativeEngine.jsx";
import StormReplay from "./StormReplay.jsx";
import CardoGuard from "./CardoGuard.jsx";
import HingeMeter from "./HingeMeter.jsx";
import REI from "./REI.jsx";
import Tracepoint from "./Tracepoint.jsx";
import ToolsLanding from "./ToolsLanding.jsx";

const TOP_LEVEL = [
  {
    id: "tools",
    label: "Tools",
    subtitle: "Pick the slice you need."
  },
  {
    id: "furnace",
    label: "Debate Furnace",
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
    id: "hinge-meter",
    label: "Hinge Meter",
    subtitle: "Visualize balance & decision flips."
  },
  {
    id: "rei",
    label: "REI",
    subtitle: "Methodology engine overview."
  },
  {
    id: "tracepoint",
    label: "Tracepoint",
    subtitle: "Industrial signals stay evidence-first."
  },
  {
    id: "cfai",
    label: "Hinge AI",
    subtitle: "CARDO REI genealogy research assistant."
  }
];

function getInitialTool() {
  if (typeof window === "undefined") return "furnace";
  if (window.location.pathname === "/tools" || window.location.pathname === "/tools/") return "tools";
  if (window.location.hash === "#story-forge") return "story-forge";
  if (window.location.hash === "#storm-replay") return "storm-replay";
  if (window.location.hash === "#cardo-guard") return "cardo-guard";
  if (window.location.hash === "#hinge-meter") return "hinge-meter";
  if (window.location.hash === "#rei") return "rei";
  if (window.location.hash === "#tracepoint") return "tracepoint";
  if (window.location.hash === "#cfai") return "cfai";
  return "furnace";
}

function getToolPath(tool) {
  if (tool === "tools") return "/tools";
  if (tool === "story-forge") return "/#story-forge";
  if (tool === "storm-replay") return "/#storm-replay";
  if (tool === "cardo-guard") return "/#cardo-guard";
  if (tool === "hinge-meter") return "/#hinge-meter";
  if (tool === "rei") return "/#rei";
  if (tool === "tracepoint") return "/#tracepoint";
  if (tool === "cfai") return "/#cfai";
  return "/";
}

export default function AppShell() {
  const [tool, setTool] = useState(getInitialTool);

  useEffect(() => {
    if (typeof window === "undefined") return;
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
            : tool === "hinge-meter"
              ? "PromptHound Labs | Hinge Meter"
              : tool === "rei"
                ? "PromptHound Labs | REI"
                : tool === "tracepoint"
                  ? "PromptHound Labs | Tracepoint"
                  : tool === "cfai"
                    ? "PromptHound Labs | Hinge AI (CFai)"
                    : "PromptHound Labs | Debate Furnace";
  }, [tool]);

  return (
    <div className="app-shell">
      <header className="shell-header">
        <div className="shell-brand">
          <div className="shell-brand__eyebrow">AI tools lab</div>
          <div className="shell-brand__title">PromptHound Labs</div>
          <div className="shell-brand__sub">Structured outputs for messy input.</div>
          <div className="shell-brand__method">Bring the hard question. We’ll find the hinge.</div>
          <div className="shell-brand__method shell-brand__method--sub">CARDO REI loop: build the slice, test what holds, keep the limits visible.</div>
        </div>

        <nav className="top-tabs" aria-label="Top-level tools">
          {TOP_LEVEL.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tool === item.id ? "top-tab is-active" : "top-tab"}
              onClick={() => setTool(item.id)}
              aria-pressed={tool === item.id}
            >
              <span className="top-tab__label">{item.label}</span>
              <span className="top-tab__sub">{item.subtitle}</span>
            </button>
          ))}
        </nav>
      </header>
      <main className="shell-main">
        {tool === "tools" ? (
          <ToolsLanding onOpenTool={setTool} />
        ) : tool === "story-forge" ? (
          <CreativeEngine />
        ) : tool === "storm-replay" ? (
          <StormReplay />
        ) : tool === "cardo-guard" ? (
          <CardoGuard />
        ) : tool === "hinge-meter" ? (
          <HingeMeter />
        ) : tool === "rei" ? (
          <REI />
        ) : tool === "tracepoint" ? (
          <Tracepoint />
        ) : tool === "cfai" ? (
          <REI />
        ) : (
          <DebateFurnace />
        )}
      </main>
    </div>
  );
}
