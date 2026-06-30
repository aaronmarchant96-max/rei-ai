import { useEffect, useState } from "react";
import { useMobile, useSwipe } from "./useMobile.js";
import DebateFurnace from "./DebateFurnace.jsx";
import CreativeEngine from "./CreativeEngine.jsx";
import StormReplay from "./StormReplay.jsx";
import CardoGuard from "./CardoGuard.jsx";
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

function getInitialTool() {
  if (typeof window === "undefined") return "rei";
  const hash = window.location.hash;
  if (hash && hash !== "") {
    if (hash === "#story-forge") return "story-forge";
    if (hash === "#storm-replay") return "storm-replay";
    if (hash === "#cardo-guard") return "cardo-guard";
    if (hash === "#rei" || hash === "#cfai") return "rei";
    if (hash === "#tracepoint") return "tracepoint";
    if (hash === "#hinge-meter") return "rei"; // default unknown hashes to flagship
  }
  // Treat /tools as the flagship entry point; explicit Tools tab still works.
  if (window.location.pathname === "/tools" || window.location.pathname === "/tools/")
    return "rei";
  return "rei";
}

function getToolPath(tool) {
  if (tool === "tools") return "/tools";
  if (tool === "story-forge") return "/#story-forge";
  if (tool === "storm-replay") return "/#storm-replay";
  if (tool === "cardo-guard") return "/#cardo-guard";
  if (tool === "rei") return "/#rei";
  if (tool === "tracepoint") return "/#tracepoint";
  return "/#rei";
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
            ? "PromptHound Labs | CARDO GUARD"
            : tool === "rei"
            ? "PromptHound Labs | REI.ai"
              : tool === "tracepoint"
                ? "PromptHound Labs | Tracepoint"
                : "PromptHound Labs | Debate Furnace";
  }, [tool]);

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
      
      <header className="shell-header">
        <div className="shell-brand">
          <div className="shell-brand__title">PromptHound Labs</div>
          <div className="shell-brand__sub">Structured outputs for messy input.</div>
          {mobile ? null : (
            <>
              <div className="shell-brand__method">REI.ai is the platform layer. PromptHound Labs ships the tools.</div>
              <div className="shell-brand__method shell-brand__method--sub">
                CARDO REI loop: build the slice, test what holds, keep the limits visible.
              </div>
            </>
          )}
        </div>

        {!mobile && (
          <nav className="top-tabs hide-mobile" aria-label="Top-level tools">
            {TOP_LEVEL.map((item) => (
              <button
                key={item.id}
                type="button"
                className={tool === item.id ? "top-tab is-active" : "top-tab touch-target"}
                style={{
                  minWidth: "120px", 
                  minHeight: "60px",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                  margin: "0 4px",
                  position: "relative",
                  overflow: "hidden",
                  ...(tool === item.id && {
                    background: "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(251,191,36,0.1))",
                    border: "1px solid rgba(249,115,22,0.3)",
                    boxShadow: "0 0 12px rgba(249,115,22,0.2)"
                  })
                }}
                onClick={() => setTool(item.id)}
                aria-pressed={tool === item.id}
                onMouseEnter={tool !== item.id ? (e) => {
                  e.currentTarget.style.background = "rgba(251,146,60,0.08)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(251,146,60,0.15)";
                } : undefined}
                onMouseLeave={tool !== item.id ? (e) => {
                  e.currentTarget.style.background = "";
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = "";
                } : undefined}
              >
                <span className="top-tab__label" style={{ fontSize: "14px", fontWeight: "600" }}>{item.label}</span>
                <span className="top-tab__sub" style={{ fontSize: "11px", opacity: "0.8" }}>{item.subtitle}</span>
              </button>
            ))}
          </nav>
        )}
      </header>
      <main className="shell-main" style={mobile && drawerOpen ? { opacity: 0.3 } : {}}>
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
      </main>
    </div>
  );
}
