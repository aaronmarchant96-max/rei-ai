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
    { label: "Find the hinge in a case", prompt: "What is the hinge in Donoghue v Stevenson?", icon: "\u2696\ufe0f" },
    { label: "Compare two precedents", prompt: "Compare Brown v Board with Plessy v Ferguson", icon: "\U0001f4dc" },
    { label: "Find the decisive fact", prompt: "What fact gave Marbury v Madison judicial review?", icon: "\U0001f50d" },
  ],
  coding: [
    { label: "Debug an error", prompt: "Debug this TypeScript type error in my component", icon: "\U0001f41b" },
    { label: "Write a component", prompt: "Write a React hook for form validation", icon: "\u269b\ufe0f" },
    { label: "Refactor code", prompt: "Refactor this function to be more readable and testable", icon: "\U0001f527" },
  ],
  genealogy: [
    { label: "Find a census record", prompt: "Find the 1910 census record for my ancestor in Ohio", icon: "\U0001f4cb" },
    { label: "Evaluate evidence", prompt: "Tier this marriage record as evidence", icon: "\U0001f52c" },
    { label: "Disambiguate names", prompt: "Disambiguate two ancestors with the same name in 1850", icon: "\U0001faaa" },
  ],
  story: [
    { label: "Outline a character arc", prompt: "Outline a redemption arc for a reluctant hero", icon: "\U0001f4d6" },
    { label: "Write a scene", prompt: "Write a scene where two rivals meet after twenty years", icon: "\u270d\ufe0f" },
    { label: "Build a world", prompt: "Build a fantasy world where magic drains memory", icon: "\U0001f30d" },
  ],
};

const GENERIC_STARTERS = [
  { label: "Sort out a decision", prompt: "Help me sort this out", icon: "\U0001f4a1" },
  { label: "Analyze a debate", prompt: "Separate facts from assumptions in this argument", icon: "\u2694\ufe0f" },
  { label: "Test an argument", prompt: "What would change my mind about this?", icon: "\U0001f9ea" },
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
    <div style={{
      padding: "24px", borderRadius: "14px",
      background: "var(--surface)",
      border: "1px solid var(--border)",
      textAlign: "center",
    }}>
      <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--amber-text)", marginBottom: "6px" }}>
        REI.ai — {activeDomain ? "The " + (activeDomain.charAt(0).toUpperCase() + activeDomain.slice(1) + " Specialist") : "The Generalist"}
      </div>
      <div style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.6", marginBottom: "18px", maxWidth: "400px", margin: "0 auto 18px" }}>
        I use the CARDO framework to find the <b style={{ color: "var(--amber-text)" }}>hinge</b> — the single factor that changes the answer.
        {activeDomain ? " Looks like you've been using the " + activeDomain + " domain — here are some relevant starters:" : " Pick a starting point:"}
      </div>

      {recentTopics.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
            Resume recent session
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {recentTopics.map(function (t, i) {
              return (
                <button
                  key={i}
                  type="button"
                  onClick={function () { return onResume && onResume(t.domain); }}
                  style={{
                    padding: "10px 14px", borderRadius: "8px",
                    background: "rgba(240, 201, 101, 0.04)", border: "1px solid rgba(240, 201, 101, 0.08)",
                    color: "var(--text-secondary)", cursor: "pointer",
                    textAlign: "left", fontSize: "12px",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={function (e) {
                    e.currentTarget.style.borderColor = "rgba(240, 201, 101, 0.25)";
                    e.currentTarget.style.background = "rgba(240, 201, 101, 0.08)";
                  }}
                  onMouseLeave={function (e) {
                    e.currentTarget.style.borderColor = "rgba(240, 201, 101, 0.08)";
                    e.currentTarget.style.background = "rgba(240, 201, 101, 0.04)";
                  }}
                >
                  {t.text}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {starters.map(function (s) {
          var Icon = ICON_MAP[s.icon];
          return (
            <button
              key={s.label}
              type="button"
              onClick={function () { return onStart(s.prompt); }}
              style={{
                padding: "12px 16px", borderRadius: "10px",
                background: "var(--page)", border: "1px solid rgba(240, 201, 101, 0.12)",
                color: "var(--text)", cursor: "pointer",
                textAlign: "left", fontSize: "13px",
                transition: "all 0.15s ease",
                display: "flex", alignItems: "center", gap: "10px",
              }}
              onMouseEnter={function (e) {
                e.currentTarget.style.borderColor = "rgba(240, 201, 101, 0.35)";
                e.currentTarget.style.background = "rgba(240, 201, 101, 0.06)";
              }}
              onMouseLeave={function (e) {
                e.currentTarget.style.borderColor = "rgba(240, 201, 101, 0.12)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
              }}
            >
              {Icon && <Icon size={16} style={{ flexShrink: 0 }} />}
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
