import { useState, useEffect } from "react";
import { Scale, Bug, ClipboardList, BookOpen, PenLine, Globe, Lightbulb, Swords, FlaskConical, Atom, Wrench, Microscope, Fingerprint, Search, ScrollText, Shield, BarChart3, Pencil } from "lucide-react";
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

const DOMAIN_WELCOME = {
  assistant: {
    title: "Cognitive Engine",
    eyebrow: "Evidence-aware reasoning workspace",
    description: "Turn an uncertain question into a clear hinge, an evidence map, and a next move you can defend.",
    signal: "Deterministic routing",
  },
  coding: {
    title: "The Engineer",
    eyebrow: "Architecture · verification · delivery",
    description: "Move from a fuzzy requirement or failing build to the architectural hinge, a tested change, and a clean handoff.",
    signal: "Verification-first code",
  },
  genealogy: {
    title: "The Archivist",
    eyebrow: "Sources · identity · provenance",
    description: "Separate records from inference, resolve conflicting identities, and build a family-history conclusion that shows its work.",
    signal: "Evidence tiering",
  },
  story: {
    title: "The Storyteller",
    eyebrow: "Character · tension · consequence",
    description: "Find the emotional hinge, pressure-test the arc, and shape a story where every major turn earns its place.",
    signal: "Narrative coherence",
  },
  legal: {
    title: "The Precedent Engine",
    eyebrow: "Authority · facts · decisive rule",
    description: "Trace the controlling authority, isolate the fact that changes the rule, and make the legal reasoning auditable.",
    signal: "Precedent mapping",
  },
};

export default function WelcomePanel({ onStart, onEdit, onResume, activeDomain: propDomain }) {
  const [activeDomain, setActiveDomain] = useState(propDomain || null);
  const [recentTopics, setRecentTopics] = useState([]);
  const [showLedger, setShowLedger] = useState(false);

  useEffect(() => {
    if (propDomain) {
      setActiveDomain(propDomain);
      return;
    }
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
  }, [propDomain]);

  const starters = activeDomain ? (DOMAIN_STARTERS[activeDomain] || GENERIC_STARTERS) : GENERIC_STARTERS;
  const currentDomainLabel = activeDomain ? activeDomain.charAt(0).toUpperCase() + activeDomain.slice(1) : "Generalist";
  const welcome = DOMAIN_WELCOME[activeDomain] || DOMAIN_WELCOME.assistant;

  return (
    <div className="rei-chat-card">
      <div className="rei-chat-intro">
        <div className="rei-chat-intro__header">
          <div className="rei-chat-intro__copy">
            <div className="rei-chat-intro__eyebrow">
              <span className="rei-chat-intro__signal" aria-hidden="true" />
              {welcome.eyebrow}
            </div>
            <h1 className="rei-chat-intro__headline">
              REI<span className="rei-chat-intro__suffix">.ai</span> {welcome.title}
            </h1>
            <p className="rei-chat-intro__text">
              {welcome.description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowLedger(true)}
            className="rei-chat-intro__ledger"
          >
            <BarChart3 size={13} />
            Evidence Ledger
          </button>
        </div>
        <div className="rei-chat-intro__trust" aria-label="Workspace capabilities">
          <span>CARDO v3.4</span>
          <span>{welcome.signal}</span>
          <span>Verifiable receipts</span>
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

      <div className={`rei-starters ${starters.length === 3 ? "is-three" : ""}`}>
        <div className="rei-starters__label">Pick a starting point</div>
        {starters.map((s) => {
          const Icon = ICON_MAP[s.icon];
          return (
            <div key={s.label} className="rei-starter-row-container">
              <button
                type="button"
                onClick={() => onStart && onStart(s.prompt)}
                className="rei-starter-row"
                aria-label={`Run ${currentDomainLabel} prompt: ${s.label} — ${s.sub}`}
              >
                <div className="rei-starter-row__glyph">{Icon && <Icon size={15} />}</div>
                <div className="rei-starter-row__body">
                  <div className="rei-starter-row__txt">{s.label}</div>
                  <div className="rei-starter-row__sub">{s.sub}</div>
                </div>
                <span className="rei-starter-row__hint" aria-hidden="true">↵</span>
              </button>
              <button
                type="button"
                onClick={() => onEdit && onEdit(s.prompt)}
                className="rei-starter-row__edit-btn"
                aria-label={`Edit ${currentDomainLabel} prompt: ${s.label}`}
                title={`Edit prompt: "${s.prompt}"`}
              >
                <Pencil size={13} />
              </button>
            </div>
          );
        })}
      </div>

      {showLedger && <EvidenceLedgerModal onClose={() => setShowLedger(false)} />}
    </div>
  );
}
