import { useState, useEffect } from "react";

const DOMAIN_STARTERS = {
  legal: [
    { label: "Find the hinge in a case", prompt: "What is the hinge in Donoghue v Stevenson?", icon: "⚖️" },
    { label: "Compare two precedents", prompt: "Compare Brown v Board with Plessy v Ferguson", icon: "📜" },
    { label: "Find the decisive fact", prompt: "What fact gave Marbury v Madison judicial review?", icon: "🔍" },
  ],
  coding: [
    { label: "Debug an error", prompt: "Debug this TypeScript type error in my component", icon: "🐛" },
    { label: "Write a component", prompt: "Write a React hook for form validation", icon: "⚛️" },
    { label: "Refactor code", prompt: "Refactor this function to be more readable and testable", icon: "🔧" },
  ],
  genealogy: [
    { label: "Find a census record", prompt: "Find the 1910 census record for my ancestor in Ohio", icon: "📋" },
    { label: "Evaluate evidence", prompt: "Tier this marriage record as evidence", icon: "🔬" },
    { label: "Disambiguate names", prompt: "Disambiguate two ancestors with the same name in 1850", icon: "🪪" },
  ],
  story: [
    { label: "Outline a character arc", prompt: "Outline a redemption arc for a reluctant hero", icon: "📖" },
    { label: "Write a scene", prompt: "Write a scene where two rivals meet after twenty years", icon: "✍️" },
    { label: "Build a world", prompt: "Build a fantasy world where magic drains memory", icon: "🌍" },
  ],
};

const GENERIC_STARTERS = [
  { label: "Sort out a decision", prompt: "Help me sort this out", icon: "💡" },
  { label: "Analyze a debate", prompt: "Separate facts from assumptions in this argument", icon: "⚔️" },
  { label: "Test an argument", prompt: "What would change my mind about this?", icon: "🧪" },
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
        const raw = localStorage.getItem(`rei_chat_history_${key}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          const msgs = parsed.messages || [];
          if (msgs.length > bestLen) {
            bestLen = msgs.length;
            best = key;
            // Extract last 2 user messages for resume cards
            const userMsgs = msgs.filter(m => m.role === "user" || m.sender === "user");
            recent = userMsgs.slice(-2).map(m => ({
              text: (m.content || m.text || "").slice(0, 80) + ((m.content || m.text || "").length > 80 ? "…" : ""),
              domain: key,
            }));
          }
        }
      }
      setActiveDomain(bestLen > 2 ? best : null);
      setRecentTopics(bestLen > 2 ? recent : []);
    } catch {
      setActiveDomain(null);
      setRecentTopics([]);
    }
  }, []);

  const starters = activeDomain ? (DOMAIN_STARTERS[activeDomain] || GENERIC_STARTERS) : GENERIC_STARTERS;

  return (
    <div style={{
      padding: "24px", borderRadius: "14px",
      background: "linear-gradient(135deg, rgba(240, 201, 101, 0.06) 0%, rgba(15, 20, 32, 0.8) 100%)",
      border: "1px solid rgba(240, 201, 101, 0.15)",
      textAlign: "center",
    }}>
      <div style={{ fontSize: "18px", fontWeight: 700, color: "#f0c965", marginBottom: "6px" }}>
        REI.ai — {activeDomain ? `The ${activeDomain.charAt(0).toUpperCase() + activeDomain.slice(1)} Specialist` : "The Generalist"}
      </div>
      <div style={{ fontSize: "13px", color: "#94a3b8", lineHeight: "1.6", marginBottom: "18px", maxWidth: "400px", margin: "0 auto 18px" }}>
        I use the CARDO framework to find the <b style={{ color: "#f0c965" }}>hinge</b> — the single factor that changes the answer.
        {activeDomain ? ` Looks like you've been using the ${activeDomain} domain — here are some relevant starters:` : " Pick a starting point:"}
      </div>

      {recentTopics.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "11px", color: "rgba(148, 163, 184, 0.6)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
            Resume recent session
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {recentTopics.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onResume && onResume(t.domain)}
                style={{
                  padding: "10px 14px", borderRadius: "8px",
                  background: "rgba(240, 201, 101, 0.04)", border: "1px solid rgba(240, 201, 101, 0.08)",
                  color: "#cbd5e1", cursor: "pointer",
                  textAlign: "left", fontSize: "12px",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(240, 201, 101, 0.25)";
                  e.currentTarget.style.background = "rgba(240, 201, 101, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(240, 201, 101, 0.08)";
                  e.currentTarget.style.background = "rgba(240, 201, 101, 0.04)";
                }}
              >
                {t.text}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {starters.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onStart(s.prompt)}
            style={{
              padding: "12px 16px", borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(240, 201, 101, 0.12)",
              color: "#e2e8f0", cursor: "pointer",
              textAlign: "left", fontSize: "13px",
              transition: "all 0.15s ease",
              display: "flex", alignItems: "center", gap: "10px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(240, 201, 101, 0.35)";
              e.currentTarget.style.background = "rgba(240, 201, 101, 0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(240, 201, 101, 0.12)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
            }}
          >
            <span style={{ fontSize: "16px" }}>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
