const REPO_URL = "https://github.com/aaronmarchant96-max/debate-furnace";

export const TOOL_CARDS = [
  {
    id: "rei",
    label: "REI.ai",
    description: "Platform reasoning layer.",
    liveHref: "/#rei",
    flagship: true,
  },
  {
    id: "furnace",
    label: "Debate Furnace",
    description: "Pressure-test the hinge.",
    liveHref: "/",
  },
  {
    id: "story-forge",
    label: "Story Forge",
    description: "Old sources into story blueprints.",
    liveHref: "/#story-forge",
  },
  {
    id: "storm-replay",
    label: "Storm Replay",
    description: "Storm imagery, carefully read.",
    liveHref: "/#storm-replay",
  },
  {
    id: "cardo-guard",
    label: "CARDO GUARD",
    description: "Cost beats confidence.",
    liveHref: "/#cardo-guard",
  },
  {
    id: "tracepoint",
    label: "Tracepoint",
    description: "Industrial signal review.",
    liveHref: "/#tracepoint",
  },
];

export default function ToolsLanding({ onOpenTool }) {
  return (
    <section className="tools-page" style={{ padding: "24px 16px" }}>
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "24px",
          borderBottom: "1px solid rgba(251,146,60,0.15)",
          paddingBottom: "16px",
        }}
      >
        <div>
          <div style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "#fb923c" }}>
            PromptHound Labs
          </div>
          <h1 style={{ margin: "4px 0 0", fontSize: "28px", lineHeight: 1.1 }}>Tools</h1>
        </div>
        <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px" }}>
          REI.ai is the platform layer. Each tool is a focused slice.
        </p>
      </header>

      <nav aria-label="PromptHound tools">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          {TOOL_CARDS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => onOpenTool(tool.id)}
              style={{
                flex: "1 1 220px",
                textAlign: "left",
                background: tool.flagship
                  ? "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(251,191,36,0.1))"
                  : "rgba(17, 24, 39, 0.85)",
                border: tool.flagship
                  ? "1px solid rgba(249,115,22,0.35)"
                  : "1px solid rgba(240, 199, 94, 0.12)",
                borderRadius: "12px",
                padding: "16px",
                color: "#E2E8F0",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(249,115,22,0.5)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = tool.flagship
                  ? "rgba(249,115,22,0.35)"
                  : "rgba(240, 199, 94, 0.12)";
                e.currentTarget.style.transform = "";
              }}
            >
              <div style={{ fontWeight: "700", fontSize: "16px", marginBottom: "4px" }}>
                {tool.label}
                {tool.flagship && (
                  <span style={{ marginLeft: "8px", fontSize: "10px", color: "#fb923c", fontWeight: "700" }}>FLAGSHIP</span>
                )}
              </div>
              <div style={{ fontSize: "13px", color: "#94a3b8" }}>{tool.description}</div>
            </button>
          ))}
        </div>
      </nav>

      <footer style={{ marginTop: "32px", textAlign: "center" }}>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          style={{ color: "#94a3b8", fontSize: "13px", textDecoration: "underline" }}
        >
          GitHub repo
        </a>
      </footer>
    </section>
  );
}
