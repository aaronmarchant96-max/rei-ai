import { useEffect, useState, lazy, Suspense } from "react";
import { useMobile, useSwipe } from "./useMobile.js";
import HingeMark from "./modules/rei/components/HingeMark.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

const DebateFurnace = lazy(() => import("./DebateFurnace.jsx"));
const CreativeEngine = lazy(() => import("./CreativeEngine.jsx"));
const StormReplay = lazy(() => import("./StormReplay.jsx"));
const CardoGuard = lazy(() => import("./CardoGuard.jsx"));
const REI = lazy(() => import("./REI.jsx"));
const Tracepoint = lazy(() => import("./Tracepoint.jsx"));
const ToolsLanding = lazy(() => import("./ToolsLanding.jsx"));
const Analytics = lazy(() => import("./Analytics.jsx"));
const RedTeam = lazy(() => import("./RedTeam.jsx"));

function LoadingShell() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px" }}>
      <div style={{ color: "#fb923c", fontSize: "14px", fontWeight: 600 }}>Loading…</div>
    </div>
  );
}

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

function getInitialTool() {
  if (typeof window === "undefined") return "tools";
  const hash = window.location.hash;
  if (hash && hash !== "") {
    if (hash === "#story-forge") return "story-forge";
    if (hash === "#storm-replay") return "storm-replay";
    if (hash === "#cardo-guard") return "cardo-guard";
    if (hash === "#tracepoint") return "tracepoint";
    if (hash === "#analytics") return "analytics";
    if (hash === "#red-team") return "red-team";
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
  if (tool === "analytics") return "/#analytics";
  if (tool === "red-team") return "/#red-team";
  return "/";
}

function getToolLabel(tool) {
  if (tool === "tools") return "Tools";
  if (tool === "story-forge") return "Story Forge";
  if (tool === "storm-replay") return "Storm Replay";
  if (tool === "cardo-guard") return "CARDO GUARD";
  if (tool === "rei" || tool === "cfai") return "REI.ai";
  if (tool === "tracepoint") return "Tracepoint";
  if (tool === "analytics") return "Analytics";
  if (tool === "red-team") return "Red Team";
  return "The Furnace";
}

export default function AppShell() {
  const [tool, setTool] = useState(getInitialTool);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [reiInitialPrompt, setReiInitialPrompt] = useState(null);
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
                : tool === "analytics"
                  ? "PromptHound Labs | Analytics"
                  : tool === "red-team"
                    ? "PromptHound Labs | Red Team"
                    : "PromptHound Labs | The Furnace";
  }, [tool]);

  const currentToolLabel = getToolLabel(tool);

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
            }} className="rei-header-nav__link">Ecosystem</button>
            <div className="w-px h-4 bg-gray-700 mx-1"></div>
            <a href="https://x.com/PromptHound96" target="_blank" rel="noreferrer" className="rei-header-nav__link">X (Twitter)</a>
            <a href="https://github.com/aaronmarchant96-max/rei-ai" target="_blank" rel="noreferrer" className="rei-header-nav__link">GitHub</a>
          </nav>
        )}
      </header>

      <main className="shell-main" style={mobile && drawerOpen ? { opacity: 0.3 } : {}}>
        <Suspense fallback={<LoadingShell />}>
          {tool === "tools" ? (
            <ErrorBoundary toolName="Tools">
              <ToolsLanding onOpenTool={({ tool: t, prompt }) => {
                setReiInitialPrompt(prompt || null);
                setTool(t);
              }} />
            </ErrorBoundary>
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
