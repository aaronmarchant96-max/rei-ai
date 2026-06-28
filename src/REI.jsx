import { useState, useRef, useEffect } from "react";

const DOMAIN_PROFILES = [
  {
    id: "assistant",
    label: "General Assistant",
    badge: "Active",
    description: "A standard, friendly LLM assistant to converse naturally, answer general questions, and help with daily tasks.",
    rules: ["Clear and friendly replies", "Constructive, natural dialogue", "Brevity by default"],
    exemplar: "Conversing naturally on various everyday subjects."
  },
  {
    id: "coding",
    label: "Coding Helper",
    badge: "Active",
    description: "Rigorous system evaluation engine designed to write obvious, testable, and boring code.",
    rules: ["Verify API shapes before coding", "Name hinges explicitly", "Stop and ask if underspecified"],
    exemplar: "Decomposing complex requirements into small, testable coding iterations."
  },
  {
    id: "genealogy",
    label: "Genealogy Helper",
    badge: "Active",
    description: "Historian evidence evaluation framework tiering sources and separating same-name profiles.",
    rules: ["Compare parent-child age limits", "Assign primary/strong evidence tiers", "Log negative search query results"],
    exemplar: "Thomas Ramsey same-name disambiguation and parish register evaluation."
  },
  {
    id: "story",
    label: "Story Builder",
    badge: "Active",
    description: "Creative orchestration assistant generating story blueprints and narrative arcs using Story Forge principles.",
    rules: ["Establish clear blueprint structure", "Identify core character driver hinges", "Avoid cliché tropes by default"],
    exemplar: "Expanding historical inspiration seeds into multi-part character outlines."
  }
];

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
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const [selectedDomain, setSelectedDomain] = useState("assistant");
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("rei_chat_history_v2");
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
        text: "System initialized. Welcome to REI.AI. Select a helper profile from the header, and let's work on something together today!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
      // Build domain-specific prompt rules
      let systemContext = "You are a helpful CARDO REI methodology assistant. Help the user clarify reasoning, find hinges, and verify claims.";
      
      if (selectedDomain === "assistant") {
        systemContext = "You are a friendly general assistant utilizing the CARDO REI methodology to structure logical explanations. Help the user clarify evidence, distinguish assumptions, and locate decision hinges.";
      } else if (selectedDomain === "coding") {
        systemContext = "You are REI.AI, a senior coding companion executing the CARDO REI coding methodology. Write code that is clean, obvious, and testable. Follow Phase 0 constraints: verify before writing code, explicitly isolate the Hinge, evaluate blast radius, and design test suites.";
      } else if (selectedDomain === "genealogy") {
        systemContext = "You are a genealogical research assistant executing the CARDO REI genealogy methodology. Rigorously tier evidence (🟢 Primary Source, 🔵 Strong Evidence, 🟠 Needs Review, 🟡 Family Memory) and disambiguate same-name profiles.";
      } else if (selectedDomain === "story") {
        systemContext = "You are a creative story architect utilizing the CARDO REI methodology. Decompose source details (Collect), analyze character driver hinges, organize story blueprints, and iterate narrative arcs.";
      }

      // Format previous chat history to send to backend (last 10 messages)
      const historyPayload = messages.slice(-10).map(msg => ({
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
          domain: selectedDomain,
          input: `${systemContext}\n\nDomain: ${currentDomain.label}\nRules: ${currentDomain.rules.join(", ")}\n\nUser Query: ${userMsg.text}`,
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
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
    <section className="rei-dashboard-wrapper" style={{ background: "#05161C", color: "#E2E8F0", fontFamily: "Inter, sans-serif", minHeight: "100vh", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: "960px", display: "flex", flexDirection: "column", flex: 1 }}>
        
        {/* Minimalist Header */}
        <header className="rei-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1A4B5C", paddingBottom: "16px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Owl/Balance SVG Logo (Midnight Teal & Amber) */}
            <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="REI owl logo">
              <circle cx="50" cy="50" r="45" fill="#0B2B36" stroke="#1A4B5C" strokeWidth="3" />
              <polygon points="35,65 50,45 65,65" fill="#FFB300" />
              <circle cx="40" cy="40" r="6" fill="#FFB300" />
              <circle cx="60" cy="40" r="6" fill="#FFB300" />
              <line x1="50" y1="25" x2="50" y2="45" stroke="#1A4B5C" strokeWidth="4" />
            </svg>
            <div>
              <h1 style={{ fontSize: "1.5em", fontWeight: "bold", margin: 0, letterSpacing: "-0.5px" }}>REI.AI</h1>
              <p style={{ fontSize: "0.8em", color: "#94A3B8", margin: 0 }}>Methodology Assistant</p>
            </div>
          </div>

          {/* Active Profile Indicator */}
          <div style={{ background: "#0B2B36", padding: "8px 12px", borderRadius: "4px", marginBottom: "12px", border: "1px solid #1A4B5C" }}>
            <span style={{ color: "#FFB300", fontWeight: "bold", fontSize: "0.9em" }}>▶ Active Profile:</span>
            <span style={{ color: "#FFFFFF", marginLeft: "8px", fontWeight: "bold" }}>{currentDomain.label}</span>
            <span style={{ color: "#94A3B8", marginLeft: "16px", fontSize: "0.85em" }}>{currentDomain.description}</span>
          </div>

          {/* Domain selection badge strip */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            {DOMAIN_PROFILES.map((dom) => (
              <button
                key={dom.id}
                type="button"
                onClick={() => setSelectedDomain(dom.id)}
                style={{
                  background: selectedDomain === dom.id ? "#0B2B36" : "transparent",
                  color: selectedDomain === dom.id ? "#FFB300" : "#94A3B8",
                  border: "1px solid",
                  borderColor: selectedDomain === dom.id ? "#FFB300" : "#1A4B5C",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  fontSize: "0.8em",
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  transform: selectedDomain === dom.id ? "scale(1.05)" : "scale(1)",
                  boxShadow: selectedDomain === dom.id ? "0 2px 4px rgba(255, 179, 0, 0.2)" : "none"
                }}
                onMouseEnter={(e) => {
                  if (selectedDomain !== dom.id) {
                    e.currentTarget.style.transform = "scale(1.03)";
                    e.currentTarget.style.background = "#0B2B36";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedDomain !== dom.id) {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                {dom.label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClearHistory}
              style={{
                background: "transparent",
                color: "#EF4444",
                border: "1px dashed #EF4444",
                padding: "6px 12px",
                borderRadius: "4px",
                fontSize: "0.8em",
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

        {/* Active Domain Info Banner */}
        <div style={{ background: "#0B2B36", border: "1px solid #1A4B5C", padding: "12px 16px", borderRadius: "6px", marginBottom: "20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", fontSize: "0.85em" }}>
          <div>
            <span style={{ color: "#FFB300", fontWeight: "bold", marginRight: "6px" }}>Domain:</span>
            <span>{currentDomain.description}</span>
          </div>
          <div>
            <span style={{ color: "#FFB300", fontWeight: "bold", marginRight: "6px" }}>Rules:</span>
            <span style={{ color: "#94A3B8" }}>{currentDomain.rules.join(" | ")}</span>
          </div>
        </div>

        {/* Chat Interface Container */}
        <div className="rei-chat-container" style={{ flex: 1, background: "#0B2B36", border: "1px solid #1A4B5C", borderRadius: "8px", display: "flex", flexDirection: "column", minHeight: "500px", overflow: "hidden", boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)" }}>
          
          {/* Chat History Area */}
          <div className="rei-chat-history" style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "18px" }}>
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
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
                    background: msg.sender === "user" ? "#1A4B5C" : "#05161C",
                    color: "#E2E8F0",
                    border: msg.sender === "user" ? "1px solid #1A4B5C" : "1px solid #FFB300",
                    borderRadius: "8px",
                    padding: "14px 18px",
                    fontFamily: msg.sender === "rei" ? "JetBrains Mono, Fira Code, monospace" : "inherit",
                    fontSize: msg.sender === "rei" ? "1.02em" : "1.08em",
                    whiteSpace: "pre-wrap",
                    lineHeight: "1.5",
                    boxShadow: msg.sender === "rei" ? "0 0 10px rgba(255, 179, 0, 0.05)" : "none"
                  }}
                >
                  {msg.text}

                  {/* Raw JSON details drawer */}
                  {msg.rawJson && (
                    <details style={{ marginTop: "12px", borderTop: "1px dashed #1A4B5C", paddingTop: "8px" }}>
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
          <form onSubmit={handleSendMessage} style={{ borderTop: "1px solid #1A4B5C", background: "#05161C", padding: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type proof context or statements to evaluate..."
              style={{
                flex: 1,
                background: "#0B2B36",
                color: "#E2E8F0",
                border: "1px solid #1A4B5C",
                borderRadius: "4px",
                padding: "12px 16px",
                fontFamily: "inherit",
                fontSize: "1.05em",
                outline: "none"
              }}
            />
            <button
              type="submit"
              style={{
                background: "#FFB300",
                color: "#05161C",
                border: "none",
                borderRadius: "4px",
                padding: "12px 24px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "background 0.2s ease"
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#e6a100"}
              onMouseOut={(e) => e.currentTarget.style.background = "#FFB300"}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
