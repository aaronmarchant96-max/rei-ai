import { useState, useEffect } from "react";
import { Scale, Bug, ClipboardList, BookOpen, PenLine, Globe, Lightbulb, Swords, FlaskConical, Atom, Wrench, Microscope, Fingerprint, Search, ScrollText } from "lucide-react";

const ICON_MAP = {
  "\u2696\ufe0f": Scale,
  "\U0001f41b": Bug,
  "\U0001f4cb": ClipboardList,
  "\U0001f4d6": BookOpen,
  "\u270d\ufe0f": PenLine,
  "\U0001f30d": Globe,
  "\U0001f4a1": Lightbulb,
  "\u2694\ufe0f": Swords,
  "\U0001f9ea": FlaskConical,
  "\u269b\ufe0f": Atom,
  "\U0001f527": Wrench,
  "\U0001f52c": Microscope,
  "\U0001faaa": Fingerprint,
  "\U0001f50d": Search,
  "\U0001f4dc": ScrollText,
};

const DOMAIN_STARTERS = {
  legal: [
    { label: "Find the hinge in a case", sub: "Donoghue v Stevenson", prompt: "What is the hinge in Donoghue v Stevenson?", icon: "\u2696\ufe0f" },
    { label: "Compare two precedents", sub: "Brown v Board vs Plessy", prompt: "Compare Brown v Board with Plessy v Ferguson", icon: "\U0001f4dc" },
    { label: "Find the decisive fact", sub: "Marbury v Madison", prompt: "What fact gave Marbury v Madison judicial review?", icon: "\U0001f50d" },
  ],
  coding: [
    { label: "Debug an error", sub: "Find & fix the root cause", prompt: "Debug this TypeScript type error in my component", icon: "\U0001f41b" },
    { label: "Write a component", sub: "Production-quality React", prompt: "Write a React hook for form validation", icon: "\u269b\ufe0f" },
    { label: "Refactor code", sub: "Cleaner, testable, idiomatic", prompt: "Refactor this function to be more readable and testable", icon: "\U0001f527" },
  ],
  genealogy: [
    { label: "Find a census record", sub: "1910 census, Ohio", prompt: "Find the 1910 census record for my ancestor in Ohio", icon: "\U0001f4cb" },
    { label: "Evaluate evidence", sub: "Tier this marriage record", prompt: "Tier this marriage record as evidence", icon: "\U0001f52c" },
    { label: "Disambiguate names", sub: "Same name, 1850", prompt: "Disambiguate two ancestors with the same name in 1850", icon: "\U0001faaa" },
  ],
  story: [
    { label: "Outline a character arc", sub: "Redemption arc for a reluctant hero", prompt: "Outline a redemption arc for a reluctant hero", icon: "\U0001f4d6" },
    { label: "Write a scene", sub: "Two rivals, twenty years apart", prompt: "Write a scene where two rivals meet after twenty years", icon: "\u270d\ufe0f" },
    { label: "Build a world", sub: "Magic that costs memory", prompt: "Build a fantasy world where magic drains memory", icon: "\U0001f30d" },
  ],
};

const GENERIC_STARTERS = [
  { label: "Sort out a decision", sub: "Weigh options against what you actually know", prompt: "Help me sort this out", icon: "\U0001f4a1" },
  { label: "Analyze a debate", sub: "See where two sides genuinely disagree", prompt: "Separate facts from assumptions in this argument", icon: "\u2694\ufe0f" },
  { label: "Test an argument", sub: "Find the assumption it depends on", prompt: "What would change my mind about this?", icon: "\U0001f9ea" },
];

export default function WelcomePanel({ onStart, onResume }) {
  const [activeDomain, setActiveDomain] = useState(null);
  const [recentTopics, setRecentTopics] = useState([]);

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
            const userMsgs = msgs.filter(function (m) { return m.role === "user" || m.sender === "user"; });
            recent = userMsgs.slice(-2).map(function (m) {
              var t = (m.content || m.text || "");
              return {
                text: t.slice(0, 80) + (t.length > 80 ? "\u2026" : ""),
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
      <div className="rei-chat-intro">
        <h1 className="rei-chat-intro__headline">
          REI<span className="rei-chat-intro__suffix">.ai</span> &mdash; {activeDomain ? "The " + (activeDomain.charAt(0).toUpperCase() + activeDomain.slice(1) + " Specialist") : "The Generalist"}
        </h1>
        <p className="rei-chat-intro__text">
          I use the CARDO framework to find the <span className="rei-chat-intro__hinge">hinge</span> &mdash; the single factor that changes the answer.
        </p>
      </div>

      {recentTopics.length > 0 && (
        <div className="rei-recent-section">
          <div className="rei-recent-section__label">Resume recent session</div>
          <div className="rei-recent-section__rows">
            {recentTopics.map(function (t, i) {
              return (
                <button
                  key={i}
                  type="button"
                  onClick={function () { return onResume && onResume(t.domain); }}
                  className="rei-recent-row"
                >
                  {t.text}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="rei-starters">
        <div className="rei-starters__label">Pick a starting point</div>
        {starters.map(function (s) {
          var Icon = ICON_MAP[s.icon];
          return (
            <button
              key={s.label}
              type="button"
              onClick={function () { return onStart(s.prompt); }}
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
    </div>
  );
}
