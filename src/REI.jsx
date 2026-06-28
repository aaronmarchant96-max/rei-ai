import { useState, useRef, useEffect } from "react";

const DOMAIN_PROFILES = [
  {
    id: "assistant",
    label: "The Generalist",
    badge: "Active",
    description: "Everyday reasoning using natural dialogue. Help the user clarify evidence, distinguish assumptions, and locate decision hinges.",
    rules: ["Clear and friendly replies", "Constructive, natural dialogue", "Brevity by default"],
    exemplar: "Conversing naturally on various everyday subjects."
  },
  {
    id: "coding",
    label: "The Hinge Finder",
    badge: "Active",
    description: "Senior coding logic executing CARDO REI coding methodology. obv, testable, and boring code.",
    rules: ["Verify API shapes before coding", "Name hinges explicitly", "Stop and ask if underspecified"],
    exemplar: "Decomposing complex requirements into small, testable coding iterations."
  },
  {
    id: "genealogy",
    label: "The Archivist",
    badge: "Active",
    description: "Evidence-tiered genealogy and disambiguating same-name profiles.",
    rules: ["Compare parent-child age limits", "Assign primary/strong evidence tiers", "Log negative search query results"],
    exemplar: "Thomas Ramsey same-name disambiguation and parish register evaluation."
  },
  {
    id: "story",
    label: "The Storyteller",
    badge: "Active",
    description: "Narrative architecture assistant generating story blueprints and narrative arcs.",
    rules: ["Establish clear blueprint structure", "Identify core character driver hinges", "Avoid cliché tropes by default"],
    exemplar: "Expanding historical inspiration seeds into multi-part character outlines."
  }
];

// ── HingeMark Logo Component ──
function HingeMark({ size = 36, animated = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Pivot pin */}
      <circle cx="18" cy="18" r="2.2" fill="#fde047" />

      {/* Fixed arm (amber) */}
      <path
        d="M18 18 L18 6"
        stroke="#fb923c"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M18 6 L26 6"
        stroke="#fb923c"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Swinging arm (gold) — open-angle by default */}
      <g
        style={
          animated
            ? {
                transformOrigin: "18px 18px",
                animation: "rei-hinge-swing 1s ease-in-out infinite",
              }
            : undefined
        }
      >
        <path
          d="M18 18 L29 25"
          stroke="#fde047"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M29 25 L29 33"
          stroke="#fde047"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.5"
        />
      </g>

      {animated && (
        <style>{`
          @keyframes rei-hinge-swing {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(-12deg); }
          }
        `}</style>
      )}
    </svg>
  );
}

export default function REI() {
  // Add fade-in animation style
  const fadeInStyle = {
    animation: "fadeIn 0.3s ease-in-out forwards",
    opacity: 0
  };

  // Inject CSS animation definition
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
      @keyframes pulse-ring {
        0%, 100% { opacity: 0.4; transform: scale(1); }
        50% { opacity: 0.9; transform: scale(1.04); }
      }
      @keyframes swing {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(-18deg); }
      }
      
      /* Theme styles override */
      .rei-dashboard-wrapper {
        background: #0a0505 !important;
      }
      .rei-custom-container {
        background: radial-gradient(circle at 30% 15%, #4a1d0f 0%, #1a0d08 45%, #08050a 100%) !important;
        position: relative;
        overflow: hidden;
        border: 1px solid rgba(251,146,60,0.15) !important;
        border-radius: 16px !important;
      }
      .rei-custom-container::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(251,146,60,0.1), transparent 55%);
        pointer-events: none;
      }
      .rei-custom-container::after {
        content: '';
        position: absolute;
        top: -40%;
        right: -20%;
        width: 60%;
        height: 60%;
        background: radial-gradient(circle, rgba(249,115,22,0.18), transparent 70%);
        pointer-events: none;
      }
      .rei-logo-mark {
        width: 52px;
        height: 52px;
        border-radius: 14px;
        background: linear-gradient(135deg, #f97316, #fbbf24);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 24px rgba(249,115,22,0.4), inset 0 1px 0 rgba(255,255,255,0.3);
        flex-shrink: 0;
        position: relative;
      }
      .rei-logo-mark::after {
        content: '';
        position: absolute;
        inset: -2px;
        border-radius: 16px;
        border: 1px solid rgba(251,191,36,0.5);
        animation: pulse-ring 2.4s ease-in-out infinite;
      }
      .rei-logo-title {
        font-weight: 800;
        font-size: 22px;
        letter-spacing: -0.01em;
        background: linear-gradient(90deg, #fb923c, #fde047);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .rei-logo-sub {
        font-size: 12.5px;
        color: #d6a98a;
        letter-spacing: 0.03em;
        margin-top: 2px;
      }
      .rei-custom-tab {
        padding: 9px 14px;
        border-radius: 9px;
        font-size: 12.5px;
        font-weight: 600;
        border: 1px solid rgba(255,255,255,0.08);
        color: #94a3b8;
        background: rgba(255,255,255,0.02);
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        flex-direction: column;
        gap: 1px;
        line-height: 1.3;
      }
      .rei-custom-tab:hover {
        border-color: rgba(251,146,60,0.4);
        color: #fdba74;
        transform: translateY(-1px);
      }
      .rei-custom-tab-active {
        background: linear-gradient(135deg, rgba(249,115,22,0.22), rgba(251,191,36,0.14)) !important;
        border-color: #f97316 !important;
        color: #fed7aa !important;
        box-shadow: 0 0 18px rgba(249,115,22,0.15);
      }
      .rei-custom-card {
        width: 100%;
        border-radius: 12px;
        padding: 16px 18px;
        background: rgba(0,0,0,0.2);
        border: 1px solid rgba(251,146,60,0.15);
        position: relative;
        z-index: 1;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const [selectedDomain, setSelectedDomain] = useState("assistant");

  // Clear legacy chat history key on first load (pre‑v2 storage)
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("rei_chat_history_v2")) {
      console.info("Removing legacy chat history key 'rei_chat_history_v2' to reset chat");
      localStorage.removeItem("rei_chat_history_v2");
    }
  }, []);

  // Clear any existing domain‑specific chat history entries on first load to ensure a fresh start
  useEffect(() => {
    if (typeof window !== "undefined") {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith("rei_chat_history_")) {
          console.info(`Removing stale chat history key '${key}'`);
          localStorage.removeItem(key);
        }
      });
    }
  }, []);


  // Clear legacy chat history key on first load (pre‑v2 storage)
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("rei_chat_history_v2")) {
      console.info("Removing legacy chat history key 'rei_chat_history_v2' to reset chat");
      localStorage.removeItem("rei_chat_history_v2");
    }
  }, []);
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState(() => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(`rei_chat_history_${selectedDomain}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved chat history:", e);
      }
    }
  }
  return [
    {
      sender: "rei",
      text: `System initialized. Welcome to REI.AI ${selectedDomain}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ];
});
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const currentDomain = DOMAIN_PROFILES.find((d) => d.id === selectedDomain) || DOMAIN_PROFILES[0];

  // Clear chat and initialize domain-specific context when domain changes
  useEffect(() => {
    const domainSpecificMessage = {
      sender: "rei",
      text: `System initialized. Welcome to REI.AI ${currentDomain.label}. ${currentDomain.description} Let's begin our ${currentDomain.id === 'coding' ? 'coding session' : currentDomain.id === 'genealogy' ? 'research analysis' : currentDomain.id === 'story' ? 'story building' : 'conversation'}!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages([domainSpecificMessage]);
    if (typeof window !== "undefined") {
      localStorage.setItem(`rei_chat_history_${selectedDomain}`, JSON.stringify([domainSpecificMessage]));
    }
  }, [selectedDomain]);

  // Auto scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Sync to local storage (domain-specific)
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`rei_chat_history_${selectedDomain}`, JSON.stringify(messages));
    }
  }, [messages, selectedDomain]);

  const handleClearHistory = () => {
    const domainSpecificMessage = {
      sender: "rei",
      text: `System initialized. Welcome to REI.AI ${currentDomain.label}. ${currentDomain.description} Let's begin our ${currentDomain.id === 'coding' ? 'coding session' : currentDomain.id === 'genealogy' ? 'research analysis' : currentDomain.id === 'story' ? 'story building' : 'conversation'}!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([domainSpecificMessage]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(`rei_chat_history_${selectedDomain}`);
    }
  };

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsg = {
      sender: "user",
      text: inputMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputMessage("");
    setIsTyping(true);

    try {
      // Build domain-specific prompt
      let systemContext =
        "You are REI, a careful reasoning assistant. Help the user clarify reasoning, find the real point of leverage (the 'hinge') in their problem, and verify claims before accepting them. Default to plain language over jargon.";

      if (selectedDomain === "assistant") {
        systemContext =
          "You are REI, a friendly, direct general-purpose assistant. Answer naturally and briefly by default — no preamble, no over-explaining. You're built on the CARDO REI methodology, but in this mode that only means: don't guess when something's unclear, and keep reasoning honest. Don't narrate the methodology or use terms like 'hinge,' 'CARDO,' or 'evidence tiers' unless the user brings up something where structured reasoning genuinely helps — and even then, use it quietly, in plain language, not as branded vocabulary.";
      } else if (selectedDomain === "coding") {
        systemContext =
          "You are REI.AI, a senior software engineer executing the CARDO REI coding methodology. Default stance: write code that is obvious, testable, and boring; prefer clarity over cleverness; fix root causes, not symptoms. " +
          "Before writing code for any non-trivial request, silently check: what's the real problem, who uses this, what are the failure modes, what existing code does this touch, is there a simpler existing solution. If you can't answer two or more of these from the request as given, ask a clarifying question instead of writing code — do not guess and present it as confident. " +
          "Name the Hinge explicitly (the smallest surface area your change touches) before proposing code. Classify risk as High/Medium/Low and state blast radius for High-risk changes. Never present a guessed API shape as verified — flag it as an assumption if you can't confirm it. Keep functions single-responsibility, name things by intent, comment the why not the what.";
      } else if (selectedDomain === "genealogy") {
        systemContext =
          "You are REI.AI, a genealogical research assistant executing the CARDO REI evidence-evaluation methodology. Tier every claim explicitly: 🟢 Primary Source (original record, e.g. parish register, census, vital record), 🔵 Strong Evidence (secondary source with clear sourcing), 🟠 Needs Review (plausible but unverified or conflicting), 🟡 Family Memory (oral history, undocumented tradition). " +
          "Always check for same-name disambiguation risk before accepting an identity match — compare parent-child age plausibility, geographic continuity, and record timing. If a search or record check comes back negative, log that explicitly as a result, not as silence — a negative result is evidence too. State your tier and reasoning inline with each claim, don't bury it in a summary at the end.";
      } else if (selectedDomain === "story") {
        systemContext =
          "You are REI.AI, a creative story architect using the CARDO REI methodology adapted for narrative work: Collect (source material, inspiration, constraints), Analyze (character driver hinges — what each character actually wants and fears), Record (blueprint structure: arc, turning points, stakes), Distinguish (separate canon facts from invented details, especially when working from real historical sources), Organize (clean narrative structure), Iterate (refine based on what's not landing). " +
          "Identify the core character driver hinge explicitly before expanding any outline — the single want/fear that the rest of the arc pivots on. Avoid cliché tropes by default; if a beat is a well-worn trope, name it as such and offer a less expected alternative. When working from real historical or biographical source material, keep a clear line between documented fact and creative invention.";
      }

      // Format previous chat history to send to backend (last 10 messages, filtering out system init messages)
      const historyPayload = messages
        .filter(msg => !msg.text.startsWith("System initialized. Welcome to REI.AI"))
        .slice(-10)
        .map(msg => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text
        }));

      // Call route handler API with domain-specific context
      const response = await fetch('/api/cfai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: 'score',
          input: userMsg.text,
          systemPrompt: systemContext,
          history: historyPayload
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Server returned failure response status');
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: "rei",
          text: data.result,
          timestamp: new Date().toLocaleTimeString([], { hour: 'digit', minute: '2-digit' }),
          rawJson: {
            engine: "REI-Hinge-Core v0.3",
            domain: selectedDomain,
            command: "score",
            model: data.model || "Local cfai CLI Executable",
            timestamp: data.timestamp || new Date().toISOString()
          }
        }
      ]);
    } catch (error) {
      console.error('REI.AI API error:', error);
      
      // Fallback: local evaluation if Vercel serverless function throws
      const fallbackText = `[REI.ai FALLBACK RESPONSE]
Confidence Score: 75%
Decision Hinge: Whether context boundaries explicitly justify the assertions.

Unburned Claims:
• Verification fallback active (Backend execution error: ${error.message}).

Limitations:
• Direct Groq backend not reachable. Running simulated local evaluation.`;

      setMessages((prev) => [
        ...prev,
        {
          sender: "rei",
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          rawJson: {
            engine: "REI-Fallback v0.3",
            domain: selectedDomain,
            error: error.message,
            fallback: true
          }
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <section className="rei-dashboard-wrapper" style={{ color: "#E2E8F0", fontFamily: "Inter, sans-serif", minHeight: "100vh", padding: "30px", display: "flex", justifyContent: "center" }}>
      <div className="rei-custom-container" style={{ width: "100%", maxWidth: "960px", padding: "28px", display: "flex", flexDirection: "column", gap: "18px" }}>
        
        {/* Header */}
        <header className="rei-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(251,146,60,0.15)", paddingBottom: "16px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {/* Logo Mark */}
            <div className="rei-logo-mark">
              <HingeMark size={28} animated={isTyping} />
            </div>
            <div>
              <h1 className="rei-logo-title" style={{ margin: 0, lineHeight: 1.1 }}>REI.AI</h1>
              <p className="rei-logo-sub" style={{ margin: 0 }}>CARDO REI Methodology Engine</p>
            </div>
          </div>

          {/* Domain selection tab strip */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            {DOMAIN_PROFILES.map((dom) => (
              <button
                key={dom.id}
                type="button"
                onClick={() => setSelectedDomain(dom.id)}
                className={`rei-custom-tab ${selectedDomain === dom.id ? "rei-custom-tab-active" : ""}`}
              >
                <span>{dom.label}</span>
                <span style={{ fontSize: "10px", fontWeight: 400, opacity: 0.7, textTransform: "none", marginTop: "1px" }}>
                  {dom.id === "assistant" ? "Everyday reasoning" :
                   dom.id === "coding" ? "Senior coding logic" :
                   dom.id === "genealogy" ? "Evidence-tiered genealogy" :
                   "Narrative architecture"}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={handleClearHistory}
              style={{
                background: "transparent",
                color: "#EF4444",
                border: "1px dashed #EF4444",
                padding: "9px 14px",
                borderRadius: "9px",
                fontSize: "12.5px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.2s ease",
                marginLeft: "8px"
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
              onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
            >
              Clear Chat
            </button>
          </div>
        </header>

        {/* Active Domain Info Banner (Custom Card Style) */}
        <div className="rei-custom-card">
          <div style={{ fontSize: "10.5px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "#fb923c", marginBottom: "6px" }}>
            Active Domain Focus
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", fontSize: "13px", color: "#cbd5e1" }}>
            <div style={{ flex: 1, minWidth: "250px" }}>
              <span style={{ color: "#FFB300", fontWeight: "bold", marginRight: "6px" }}>Scope:</span>
              <span>{currentDomain.description}</span>
            </div>
            <div>
              <span style={{ color: "#FFB300", fontWeight: "bold", marginRight: "6px" }}>Rules:</span>
              <span style={{ color: "#94A3B8" }}>{currentDomain.rules.join(" | ")}</span>
            </div>
          </div>
        </div>

        {/* Chat Interface Container */}
        <div className="rei-chat-container" style={{ flex: 1, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(251,146,60,0.15)", borderRadius: "12px", display: "flex", flexDirection: "column", minHeight: "500px", overflow: "hidden" }}>
          
          {/* Chat History Area */}
          <div className="rei-chat-history" style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "18px" }}>
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: msg.sender === "user" ? "flex-end" : "flex-start",
                  animation: "fadeIn 0.3s ease-in-out forwards",
                  opacity: 0
                }}
                onAnimationEnd={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                <div
                  style={{
                    background: msg.sender === "user" ? "rgba(255,255,255,0.06)" : "rgba(251,146,60,0.08)",
                    color: "#E2E8F0",
                    border: msg.sender === "user" ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(251,146,60,0.18)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    fontFamily: msg.sender === "rei" ? "JetBrains Mono, Fira Code, monospace" : "inherit",
                    fontSize: "13px",
                    whiteSpace: "pre-wrap",
                    lineHeight: "1.4"
                  }}
                >
                  {msg.text}

                  {/* Raw JSON details drawer */}
                  {msg.rawJson && (
                    <details style={{ marginTop: "12px", borderTop: "1px dashed rgba(251,146,60,0.18)", paddingTop: "8px" }}>
                      <summary style={{ color: "#94A3B8", fontSize: "0.85em", cursor: "pointer", outline: "none" }}>Raw JSON</summary>
                      <pre style={{ fontSize: "0.85em", color: "#94A3B8", overflowX: "auto", marginTop: "6px", background: "rgba(0,0,0,0.3)", padding: "8px", borderRadius: "4px" }}>
                        <code>{JSON.stringify(msg.rawJson, null, 2)}</code>
                      </pre>
                    </details>
                  )}
                </div>
                <span style={{ fontSize: "0.78em", color: "#94A3B8", marginTop: "4px" }}>
                  {msg.sender === "user" ? "You" : "REI.AI"} • {msg.timestamp}
                </span>
              </div>
            ))}

            {isTyping && (
              <div style={{ 
                alignSelf: "flex-start", 
                color: "#FFB300", 
                fontFamily: "JetBrains Mono, Fira Code, monospace", 
                fontSize: "1.02em",
                animation: "pulse 1.5s ease-in-out infinite",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <span>●</span>
                <span>REI.ai is thinking...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input form area */}
          <form onSubmit={handleSendMessage} style={{ borderTop: "1px solid rgba(251,146,60,0.15)", background: "rgba(0,0,0,0.3)", padding: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type proof context or statements to evaluate..."
              style={{
                flex: 1,
                background: "rgba(0,0,0,0.2)",
                color: "#E2E8F0",
                border: "1px solid rgba(251,146,60,0.15)",
                borderRadius: "6px",
                padding: "12px 16px",
                fontFamily: "inherit",
                fontSize: "1.05em",
                outline: "none"
              }}
            />
            <button
              type="submit"
              style={{
                background: "#f97316",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "6px",
                padding: "12px 24px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "background 0.2s ease"
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#fb923c"}
              onMouseOut={(e) => e.currentTarget.style.background = "#f97316"}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
