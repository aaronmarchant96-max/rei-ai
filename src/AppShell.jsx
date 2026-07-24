import { lazy, Suspense, useEffect, useState } from "react";
import { useMobile, useSwipe } from "./useMobile.js";
import { getFlag, setFlag } from "./lib/featureFlags.js";

const ToolsLanding = lazy(() => import("./ToolsLanding.jsx"));
const DebateFurnace = lazy(() => import("./DebateFurnace.jsx"));
const CreativeEngine = lazy(() => import("./CreativeEngine.jsx"));
const StormReplay = lazy(() => import("./StormReplay.jsx"));
const CardoGuard = lazy(() => import("./CardoGuard.jsx"));
const REI = lazy(() => import("./REI.jsx"));
const Tracepoint = lazy(() => import("./Tracepoint.jsx"));

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
    label: "REI.ai Guard",
    subtitle: "Escalation to premium models is controlled by the REI.ai Guard cost gate."
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
  }
];

const isTest = typeof process !== "undefined" && process.env.NODE_ENV === "test";

function getInitialTool() {
  if (typeof window === "undefined") return "tools";
  const hash = window.location.hash;
  if (hash && hash !== "") {
    if (hash === "#story-forge") return "story-forge";
    if (hash === "#storm-replay") return "storm-replay";
    if (hash === "#cardo-guard") return "cardo-guard";
    if (hash === "#rei" || hash === "#cfai" || hash === "#hinge-meter") return "rei";
    if (hash === "#tracepoint") return "tracepoint";
    if (hash === "#tools") return "tools";
  }
  return "tools";
}

function getToolPath(tool) {
  if (tool === "tools") return "/";
  if (tool === "story-forge") return "/#story-forge";
  if (tool === "storm-replay") return "/#storm-replay";
  if (tool === "cardo-guard") return "/#cardo-guard";
  if (tool === "rei") return "/#rei";
  if (tool === "tracepoint") return "/#tracepoint";
  return "/";
}

function getToolLabel(tool) {
  if (tool === "tools") return "Tools";
  if (tool === "story-forge") return "Story Forge";
  if (tool === "storm-replay") return "Storm Replay";
  if (tool === "cardo-guard") return "REI.ai Guard";
  if (tool === "rei" || tool === "cfai") return "REI.ai";
  if (tool === "tracepoint") return "Tracepoint";
  return "Debate Furnace";
}

export default function AppShell() {
  const [tool, setTool] = useState(getInitialTool);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mobile = useMobile(45); // 45em = 720px

  // Swipe handlers for mobile drawer
  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipe(
    () => setDrawerOpen(false), // Swipe left: close drawer
    () => setDrawerOpen(true),   // Swipe right: open drawer
    50
  );

  // Close drawer on tool change
  useEffect(() => {
    if (drawerOpen) setDrawerOpen(false);
  }, [tool]);

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
        ? "PromptHound Labs | REI.ai Guard"
        : tool === "rei"
        ? "PromptHound Labs | REI.ai"
        : tool === "tracepoint"
        ? "PromptHound Labs | Tracepoint"
        : "PromptHound Labs | Debate Furnace";
  }, [tool]);

  const currentToolLabel = getToolLabel(tool);
  const [experimentalLayout, setExperimentalLayout] = useState(() => getFlag("navigation-rail"));

  useEffect(() => {
    setFlag("navigation-rail", experimentalLayout);
  }, [experimentalLayout]);

  return (
    <div className="app-shell" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {mobile && (
        <>
          {/* Mobile drawer overlay */}
          {drawerOpen && (
            <div className="rei-mobile-drawer" onClick={() => setDrawerOpen(false)}>
              <button 
                className="rei-mobile-drawer-close hide-desktop"
                onClick={(e) => { e.stopPropagation(); setDrawerOpen(false); }}
                aria-label="Close menu"
              >
                ✕
              </button>
              <nav className="rei-mobile-drawer-nav" onClick={(e) => e.stopPropagation()}>
                {TOP_LEVEL.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="rei-mobile-nav-item touch-target"
                    onClick={() => setTool(item.id)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      padding: "20px 16px",
                      minWidth: "100%",
                      minHeight: "72px",
                      background: "none",
                      border: "none",
                      color: "#E2E8F0",
                      cursor: "pointer",
                      fontSize: "16px",
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                      textAlign: "left"
                    }}
                  >
                    <span style={{ fontWeight: "bold", fontSize: "16px" }}>{item.label}</span>
                    <span style={{ fontSize: "0.85em", opacity: 0.7, marginTop: "4px" }}>{item.subtitle}</span>
                  </button>
                ))}
              </nav>
            </div>
          )}
          
          {/* Hamburger menu */}
          <button 
            className="rei-hamburger touch-target hide-desktop"
            onClick={() => setDrawerOpen(!drawerOpen)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            style={{
              position: "fixed",
              top: "16px",
              left: "16px",
              zIndex: 1001,
              minWidth: "48px",
              minHeight: "48px",
              background: "rgba(0,0,0,0.8)",
              border: "none",
              borderRadius: "8px",
              color: "#E2E8F0",
              fontSize: "24px",
              cursor: "pointer"
            }}
          >
            ☰
          </button>
        </>
      )}

      {tool !== "tools" && !mobile ? (
        <div className="shell-tool-bar" aria-label="Breadcrumb">
          <button
            type="button"
            className="shell-tool-bar__back"
            onClick={() => setTool("tools")}
          >
            ← PromptHound Labs
          </button>
          <span className="shell-tool-bar__sep" aria-hidden="true">/</span>
          <span className="shell-tool-bar__current">{currentToolLabel}</span>
          <span style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => setExperimentalLayout((v) => !v)}
            style={{
              background: experimentalLayout ? "rgba(214,176,76,0.15)" : "transparent",
              border: experimentalLayout ? "1px solid rgba(214,176,76,0.35)" : "1px solid transparent",
              borderRadius: "4px",
              color: experimentalLayout ? "#d6b04c" : "#697266",
              cursor: "pointer",
              fontSize: "10px",
              padding: "2px 6px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
            title={experimentalLayout ? "Experimental layout active" : "Enable experimental layout"}
          >
            {experimentalLayout ? "🧪 Layout" : "🧪"}
          </button>
        </div>
      ) : null}

      <main className="shell-main" style={mobile && drawerOpen ? { opacity: 0.3 } : {}}>
        <Suspense fallback={<div className="shell-loading" />}>
          {tool === "tools" ? (
            <ToolsLanding onOpenTool={setTool} />
          ) : tool === "story-forge" ? (
            <CreativeEngine />
          ) : tool === "storm-replay" ? (
            <StormReplay />
          ) : tool === "cardo-guard" ? (
            <CardoGuard />
          ) : tool === "rei" ? (
            <REI />
          ) : tool === "tracepoint" ? (
            <Tracepoint />
          ) : tool === "cfai" ? (
            <REI />
          ) : (
            <DebateFurnace />
          )}
        </Suspense>
      </main>
    </div>
  );
}
