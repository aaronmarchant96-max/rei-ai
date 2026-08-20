import { useState, useEffect } from "react";
import { Scale, Bug, ClipboardList, BookOpen, PenLine, Globe, Lightbulb, Swords, FlaskConical, Atom, Wrench, Microscope, Fingerprint, Search, ScrollText, Shield, BarChart3 } from "lucide-react";
import EvidenceLedgerModal from "./EvidenceLedgerModal.jsx";

const ICON_MAP = {
  "⚖️": Scale,
  "🐛": Bug,
  "📋": ClipboardList,
  "📖": BookOpen,
  "✍️": PenLine,
  "🌍": Globe,
  "💡": Lightbulb,
  "⚔️": Swords,
  "🧪": FlaskConical,
  "⚛️": Atom,
  "🔧": Wrench,
  "🔬": Microscope,
  "🪪": Fingerprint,
  "🔍": Search,
  "📜": ScrollText,
  "🛡️": Shield,
};

const DOMAIN_STARTERS = {
  legal: [
    { label: "Find the hinge in a case", sub: "Donoghue v Stevenson", prompt: "What is the hinge in Donoghue v Stevenson?", icon: "⚖️" },
    { label: "Compare two precedents", sub: "Brown v Board vs Plessy", prompt: "Compare Brown v Board with Plessy v Ferguson", icon: "📜" },
    { label: "Find the decisive fact", sub: "Marbury v Madison", prompt: "What fact gave Marbury v Madison judicial review?", icon: "🔍" },
  ],
  coding: [
    { label: "Debug an error", sub: "Find & fix the root cause", prompt: "Debug this TypeScript type error in my component", icon: "🐛" },
    { label: "Write a component", sub: "Production-quality React", prompt: "Write a React hook for form validation", icon: "⚛️" },
    { label: "Refactor code", sub: "Cleaner, testable, idiomatic", prompt: "Refactor this function to be more readable and testable", icon: "🔧" },
  ],
  genealogy: [
    { label: "Find a census record", sub: "1910 census, Ohio", prompt: "Find the 1910 census record for my ancestor in Ohio", icon: "📋" },
    { label: "Evaluate evidence", sub: "Tier this marriage record", prompt: "Tier this marriage record as evidence", icon: "🔬" },
    { label: "Disambiguate names", sub: "Same name, 1850", prompt: "Disambiguate two ancestors with the same name in 1850", icon: "🪪" },
  ],
  story: [
    { label: "Outline a character arc", sub: "Redemption arc for a reluctant hero", prompt: "Outline a redemption arc for a reluctant hero", icon: "📖" },
    { label: "Write a scene", sub: "Two rivals, twenty years apart", prompt: "Write a scene where two rivals meet after twenty years", icon: "✍️" },
    { label: "Build a world", sub: "Magic that costs memory", prompt: "Build a fantasy world where magic drains memory", icon: "🌍" },
  ],
};

const GENERIC_STARTERS = [
  { label: "Sort out a decision", sub: "Weigh options against what you actually know", prompt: "Help me sort this out", icon: "💡" },
  { label: "Analyze a debate", sub: "See where two sides genuinely disagree", prompt: "Separate facts from assumptions in this argument", icon: "⚔️" },
  { label: "Test an argument", sub: "Find the assumption it depends on", prompt: "What would change my mind about this?", icon: "🧪" },
  { label: "Scan for prompt injections", sub: "Detect injection attacks before they reach a model", prompt: "Take me to the red team scanner — I want to test a prompt for adversarial patterns.", icon: "🛡️" },
];

export default function WelcomePanel({ onStart, onResume }) {
  const [activeDomain, setActiveDomain] = useState(null);
  const [recentTopics, setRecentTopics] = useState([]);
  const [showLedger, setShowLedger] = useState(false);

  useEffect(() => {
    try {
      const keys = ["legal", "coding", "genealogy", "story"];
      let best = null;
      let bestLen = 0;
      let recent = [];

      for (const key of keys) {
        const raw = localStorage.getItem("rei_chat_history_" + key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const msgs = parsed.messages || [];
          if (msgs.length > bestLen) {
            bestLen = msgs.length;
            best = key;
            const userMsgs = msgs.filter((m) => m.role === "user" || m.sender === "user");
            recent = userMsgs.slice(-2).map((m) => {
              const t = m.content || m.text || "";
              return {
                text: t.slice(0, 80) + (t.length > 80 ? "…" : ""),
                domain: key,
              };
            });
          }
        }
      }
      setActiveDomain(bestLen > 2 ? best : null);
      setRecentTopics(bestLen > 2 ? recent : []);
    } catch (e) {
      setActiveDomain(null);
      setRecentTopics([]);
    }
  }, []);

  const starters = activeDomain ? (DOMAIN_STARTERS[activeDomain] || GENERIC_STARTERS) : GENERIC_STARTERS;

  return (
    <div className="rei-chat-card">
      <div className="rei-chat-intro" style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <h1 className="rei-chat-intro__headline" style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px" }}>
              REI<span className="rei-chat-intro__suffix">.ai</span> Cognitive Engine
            </h1>
            <p className="rei-chat-intro__text" style={{ fontSize: "13.5px", color: "var(--text-secondary, #cbd5e1)", margin: "0 0 8px" }}>
              Deterministic inference routing, prompt-cache optimization, and evidence-verified reasoning.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowLedger(true)}
            style={{
              background: "rgba(240, 201, 101, 0.12)",
              border: "1px solid rgba(240, 201, 101, 0.3)",
              color: "var(--amber-text, #f0c965)",
              borderRadius: "6px",
              padding: "5px 12px",
              fontSize: "11.5px",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <BarChart3 size={13} />
            Evidence Ledger
          </button>
        </div>
      </div>

      {recentTopics.length > 0 && (
        <div className="rei-recent-section">
          <div className="rei-recent-section__label">Resume recent session</div>
          <div className="rei-recent-section__rows">
            {recentTopics.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onResume && onResume(t.domain)}
                className="rei-recent-row"
              >
                {t.text}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rei-starters">
        <div className="rei-starters__label">Pick a starting point</div>
        {starters.map((s) => {
          const Icon = ICON_MAP[s.icon];
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => onStart(s.prompt)}
              className="rei-starter-row"
            >
              <div className="rei-starter-row__glyph">{Icon && <Icon size={15} />}</div>
              <div className="rei-starter-row__body">
                <div className="rei-starter-row__txt">{s.label}</div>
                <div className="rei-starter-row__sub">{s.sub}</div>
              </div>
            </button>
          );
        })}
      </div>

      {showLedger && <EvidenceLedgerModal onClose={() => setShowLedger(false)} />}
    </div>
  );
}
