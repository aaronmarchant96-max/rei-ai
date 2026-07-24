import { useState } from "react";
import logo from "./assets/logo_transparent.png";

const REPO_URL = "https://github.com/aaronmarchant96-max/rei-ai";

export const TOOL_CARDS = [
  {
    id: "rei",
    label: "REI.ai Platform",
    category: "FLAGSHIP",
    tagline: "Platform reasoning layer powering budget-respecting AI.",
    description: "Dual-engine intelligence combining CARDO REI hinge logic and the Night Shift Router to deliver senior-level reasoning at up to 78% lower token cost.",
    features: ["CARDO Hinge Logic", "Night Shift Router", "Evidence Tiering", "78% Cost Reduction"],
    icon: "⚡",
    liveHref: "/#rei",
    flagship: true,
  },
  {
    id: "furnace",
    label: "Debate Furnace",
    category: "SPECIALIZED SLICE",
    tagline: "Pressure-test arguments & stress-test logical hinges.",
    description: "Adversarial debate engine that Subjects claims to counter-argument pressure to uncover hidden assumptions and weak evidence.",
    features: ["Counter-argument Generator", "Stress Testing", "Logical Fallacy Detector"],
    icon: "⚔️",
    liveHref: "/#furnace",
  },
  {
    id: "story-forge",
    label: "Story Forge",
    category: "SPECIALIZED SLICE",
    tagline: "Transform archival sources into rich narrative blueprints.",
    description: "Narrative architecture suite converting genealogy records and historical evidence into character-driven story outlines.",
    features: ["Archival Synthesis", "Plot Outlining", "Character Driver Matrix"],
    icon: "📜",
    liveHref: "/#story-forge",
  },
  {
    id: "storm-replay",
    label: "Storm Replay",
    category: "SPECIALIZED SLICE",
    tagline: "Examine storm imagery & meteorological signals.",
    description: "Signal analysis engine tailored for reviewing meteorological observations and environmental storm data.",
    features: ["Signal Review", "Observation Timeline", "Pattern Recognition"],
    icon: "⛈️",
    liveHref: "/#storm-replay",
  },
  {
    id: "cardo-guard",
    label: "CARDO Guard",
    category: "SPECIALIZED SLICE",
    tagline: "Enforce strict cost-versus-confidence model gates.",
    description: "Safety and cost gate controlling when prompts are escalated to premium model tiers versus low-cost local models.",
    features: ["Cost Ceiling Gate", "Escalation Control", "Audit Logging"],
    icon: "🛡️",
    liveHref: "/#cardo-guard",
  },
  {
    id: "tracepoint",
    label: "Tracepoint",
    category: "SPECIALIZED SLICE",
    tagline: "Industrial signal review with evidence-first verification.",
    description: "Evidence-backed telemetry analyzer designed for verifying complex industrial system logs and claims.",
    features: ["Log Verification", "Evidence Mapping", "Trace Analytics"],
    icon: "📡",
    liveHref: "/#tracepoint",
  },
];

export default function ToolsLanding({ onOpenTool }) {
  const [activeTab, setActiveTab] = useState("all");

  const filteredTools = activeTab === "all"
    ? TOOL_CARDS
    : activeTab === "flagship"
    ? TOOL_CARDS.filter(t => t.flagship)
    : TOOL_CARDS.filter(t => !t.flagship);

  return (
    <div className="relume-page">
      {/* ─── Relume Top Navbar ─── */}
      <header className="relume-nav">
        <div className="relume-nav__brand">
          <img src={logo} alt="REI Logo" width="28" height="28" style={{ borderRadius: 6 }} />
          <span className="relume-nav__title">PromptHound Labs</span>
          <span className="relume-nav__badge">REI.ai Flagship</span>
        </div>
        <div className="relume-nav__actions">
          <a href="#modules" className="relume-nav__link">Explore Slices</a>
          <button
            type="button"
            className="relume-nav__btn"
            onClick={() => onOpenTool("rei")}
          >
            Launch REI.ai &rarr;
          </button>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section className="relume-hero">
        <div className="relume-hero__container">
          <div className="relume-badge">
            <span className="relume-badge__dot">●</span>
            PROMPTHOUND LABS &middot; COST-PERFORMANCE LLM ROUTER
          </div>

          <h1 className="relume-hero__title">
            Automatically reduce your LLM costs. <br />
            <span className="relume-hero__title-accent">Intelligence on demand. Zero wasted tokens.</span>
          </h1>

          <p className="relume-hero__subtitle">
            REI.ai automatically minimizes your LLM API spend by intelligently routing every request to the lowest-cost option that meets your target quality—deflecting up to <strong>78% of inference costs</strong> before firing a single token.
          </p>

          <div className="relume-hero__actions">
            <button
              type="button"
              className="relume-btn relume-btn--primary"
              onClick={() => onOpenTool("rei")}
            >
              <img src={logo} alt="REI Logo" className="relume-btn__icon" />
              Launch REI Router Platform &rarr;
            </button>
            <a
              href="#modules"
              className="relume-btn relume-btn--secondary"
            >
              Explore Tool Slices &darr;
            </a>
          </div>

          {/* ─── Interactive Hero Showcase Card ─── */}
          <div className="relume-showcase-card">
            <div className="relume-showcase-card__header">
              <div className="relume-showcase-card__brand">
                <img src={logo} alt="REI" width="24" height="24" style={{ borderRadius: 4 }} />
                <span>REI.ai Reasoning Engine</span>
                <span className="relume-showcase-card__version">v2.0</span>
              </div>
              <div className="relume-showcase-card__telemetry">
                <span className="relume-showcase-card__savings">−78% Cost Saved</span>
              </div>
            </div>

            <div className="relume-showcase-card__body">
              <div className="relume-showcase-sample">
                <div className="relume-showcase-sample__tag">📌 HINGE POINT</div>
                <div className="relume-showcase-sample__text">
                  The primary bottleneck is not model intelligence—it is arbitrary routing to expensive frontier models when a 70B versatille model achieves identical precision at 1/10th the cost.
                </div>

                <div className="relume-showcase-sample__grid">
                  <div className="relume-showcase-sample__col">
                    <span className="relume-showcase-sample__label">📊 KNOWN FACTS</span>
                    <span>Night Shift Router evaluates prompt complexity &amp; routes dynamically.</span>
                  </div>
                  <div className="relume-showcase-sample__col">
                    <span className="relume-showcase-sample__label">💡 INFERRED ASSUMPTIONS</span>
                    <span>Deterministic rules handle simple queries for $0.00.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Flagship Feature Highlight ─── */}
      <section className="relume-section relume-section--highlight">
        <div className="relume-container">
          <div className="relume-section-header">
            <span className="relume-eyebrow">FLAGSHIP SPOTLIGHT</span>
            <h2 className="relume-section-title">Why REI.ai is the core platform layer</h2>
            <p className="relume-section-desc">
              While each specialized slice solves a distinct problem domain, REI.ai acts as the load-bearing reasoning engine for the entire suite.
            </p>
          </div>

          <div className="relume-spotlight-grid">
            <div className="relume-spotlight-card">
              <div className="relume-spotlight-card__icon">⚡</div>
              <h3>Dual-Engine CARDO REI</h3>
              <p>Record, Evaluate, and Iterate using Latin <em>Rei</em> (the load-bearing hinge in reality).</p>
            </div>
            <div className="relume-spotlight-card">
              <div className="relume-spotlight-card__icon">🌙</div>
              <h3>Night Shift Router</h3>
              <p>Dynamic cost-aware routing that evaluates complexity before choosing the optimal model.</p>
            </div>
            <div className="relume-spotlight-card">
              <div className="relume-spotlight-card__icon">🟢</div>
              <h3>Rigorous Evidence Tiering</h3>
              <p>Classifies evidence into Primary Sources, Strong Evidence, Family Memory, and Needs Review.</p>
            </div>
            <div className="relume-spotlight-card">
              <div className="relume-spotlight-card__icon">💰</div>
              <h3>Telemetry &amp; Cost Guards</h3>
              <p>Real-time token cost estimation, ceiling enforcement, and session savings tracking.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Specialized Modules Grid ─── */}
      <section id="modules" className="relume-section">
        <div className="relume-container">
          <div className="relume-section-header">
            <span className="relume-eyebrow">SPECIALIZED TOOL SLICES</span>
            <h2 className="relume-section-title">Explore the PromptHound Labs Suite</h2>
            <p className="relume-section-desc">
              Pick the focused slice you need for specialized tasks, or launch the flagship platform for general reasoning.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="relume-filter-tabs">
            <button
              type="button"
              className={`relume-filter-tab ${activeTab === "all" ? "is-active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All Tools ({TOOL_CARDS.length})
            </button>
            <button
              type="button"
              className={`relume-filter-tab ${activeTab === "flagship" ? "is-active" : ""}`}
              onClick={() => setActiveTab("flagship")}
            >
              Flagship (1)
            </button>
            <button
              type="button"
              className={`relume-filter-tab ${activeTab === "slices" ? "is-active" : ""}`}
              onClick={() => setActiveTab("slices")}
            >
              Specialized Slices ({TOOL_CARDS.length - 1})
            </button>
          </div>

          <div className="relume-grid">
            {filteredTools.map((tool) => (
              <div
                key={tool.id}
                className={`relume-card ${tool.flagship ? "relume-card--flagship" : ""}`}
              >
                <div className="relume-card__header">
                  <span className="relume-card__icon">{tool.icon}</span>
                  <span className="relume-card__category">{tool.category}</span>
                </div>

                <h3 className="relume-card__title">{tool.label}</h3>
                <div className="relume-card__tagline">{tool.tagline}</div>
                <p className="relume-card__desc">{tool.description}</p>

                <div className="relume-card__features">
                  {tool.features.map((feat) => (
                    <span key={feat} className="relume-card__feature-chip">&bull; {feat}</span>
                  ))}
                </div>

                <div className="relume-card__footer">
                  <button
                    type="button"
                    className={`relume-card__btn ${tool.flagship ? "relume-card__btn--gold" : ""}`}
                    onClick={() => onOpenTool(tool.id)}
                  >
                    Launch {tool.label} &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Framework Process Section ─── */}
      <section className="relume-section relume-section--process">
        <div className="relume-container">
          <div className="relume-section-header">
            <span className="relume-eyebrow">THE METHODOLOGY</span>
            <h2 className="relume-section-title">How CARDO REI Operates</h2>
          </div>

          <div className="relume-process-grid">
            <div className="relume-process-step">
              <span className="relume-process-num">01</span>
              <h4>Collect &amp; Record</h4>
              <p>Gather raw evidence, documents, and statements without premature filtering.</p>
            </div>
            <div className="relume-process-step">
              <span className="relume-process-num">02</span>
              <h4>Analyze &amp; Distinguish</h4>
              <p>Separate verbatim facts from inferences, assumptions, and oral traditions.</p>
            </div>
            <div className="relume-process-step">
              <span className="relume-process-num">03</span>
              <h4>Isolate the Hinge</h4>
              <p>Pinpoint the single load-bearing detail that turns the conclusion.</p>
            </div>
            <div className="relume-process-step">
              <span className="relume-process-num">04</span>
              <h4>Evaluate &amp; Iterate</h4>
              <p>Assign explicit confidence tiers and continually update as new evidence arrives.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relume-footer">
        <div className="relume-container relume-footer__inner">
          <div className="relume-footer__brand">
            <img src={logo} alt="REI Logo" width="20" height="20" />
            <span>PromptHound Labs &middot; REI.ai</span>
            <span className="relume-footer__build">v2.0 Production</span>
          </div>

          <div className="relume-footer__links">
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="relume-footer__link">
              GitHub Repository &rarr;
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
