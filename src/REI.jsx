import { useState, useRef, useEffect } from "react";

const DOMAIN_PROFILES = [
  {
    id: "genealogy",
    label: "Genealogy",
    badge: "Active",
    description: "Family Archive data pipeline managing 117 profiles and 73 documents.",
    rules: ["Parent age min: 13", "Mother age max: 55", "Father age max: 80"],
    exemplar: "Thomas Ramsey same-name disambiguation profile separation."
  },
  {
    id: "llm",
    label: "LLM Arena",
    badge: "Active",
    description: "Adversarial testing harness probing prompt injections and semantic leakage.",
    rules: ["Control/poison run isolation", "Verbatim snippet extraction checks"],
    exemplar: "Case 006 poisoned context resistance analysis."
  },
  {
    id: "debate",
    label: "Debate Furnace",
    badge: "Active",
    description: "Orchestration layer evaluating arguments under custom heat profiles.",
    rules: ["Verdict compass mapping", "Decision path classification"],
    exemplar: "Balanced/Aggressive topic profile weight comparisons."
  },
  {
    id: "risk",
    label: "CARDO GUARD",
    badge: "Active",
    description: "Expected cost evaluator gating action on model confidence scores.",
    rules: ["Action Waste = Cost * False Alarm Rate", "Miss Loss = Cost * (1 - False Alarm)"],
    exemplar: "Reroute decision expected cost margin analysis."
  }
];

export default function REI() {
  const [selectedDomain, setSelectedDomain] = useState("genealogy");
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      sender: "rei",
      text: "System initialized. Welcome to REI.ai methodology engine. Select a domain profile from the header, then submit raw evidence or claims to evaluate under the CARDO REI framework.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const currentDomain = DOMAIN_PROFILES.find((d) => d.id === selectedDomain) || DOMAIN_PROFILES[0];

  // Auto scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsg = {
      sender: "user",
      text: inputMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsTyping(true);

    try {
      // Build domain-specific prompt rules
      let systemContext = "You are a CARDO REI methodology assistant. Apply rigorous evidence evaluation.";
      if (selectedDomain === "genealogy") {
        systemContext = "You are a genealogical research assistant using CARDO REI methodology. Evaluate evidence with 🟢🔵🟠🟡 tier tags.";
      } else if (selectedDomain === "llm") {
        systemContext = "You are an LLM adversarial testing assistant. Apply CARDO REI to evaluate prompt injections and semantic leakage.";
      } else if (selectedDomain === "debate") {
        systemContext = "You are a debate analysis assistant. Find the hinge and flag logical gaps.";
      } else if (selectedDomain === "risk") {
        systemContext = "You are a decision cost evaluator. Compare expected action waste vs miss loss.";
      }

      // Call route handler API
      const response = await fetch('/api/cfai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: 'score',
          input: `${systemContext}\n\nUser Query: ${userMsg.text}`
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
    <section className="rei-dashboard-wrapper" style={{ background: "#05161C", color: "#E2E8F0", fontFamily: "Inter, sans-serif", minHeight: "100vh", padding: "20px", display: "flex", flexDirection: "column" }}>
      
      {/* 4A. Minimalist Header */}
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

        {/* Domain selection badge strip */}
        <div style={{ display: "flex", gap: "8px" }}>
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
                transition: "all 0.2s ease"
              }}
            >
              {dom.label}
            </button>
          ))}
        </div>
      </header>

      {/* Active Domain Info Banner */}
      <div style={{ background: "#0B2B36", border: "1px solid #1A4B5C", padding: "10px 14px", borderRadius: "6px", marginBottom: "20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", fontSize: "0.85em" }}>
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
      <div className="rei-chat-container" style={{ flex: 1, background: "#0B2B36", border: "1px solid #1A4B5C", borderRadius: "8px", display: "flex", flexDirection: "column", minHeight: "450px", overflow: "hidden" }}>
        
        {/* Chat History Area */}
        <div className="rei-chat-history" style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
          {messages.map((msg, index) => (
            <div
              key={index}
              style={{
                alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                maxWidth: "80%",
                display: "flex",
                flexDirection: "column",
                alignItems: msg.sender === "user" ? "flex-end" : "flex-start"
              }}
            >
              <div
                style={{
                  background: "#05161C",
                  color: "#E2E8F0",
                  border: msg.sender === "user" ? "1px solid #1A4B5C" : "1px solid #FFB300",
                  borderRadius: "6px",
                  padding: "12px 16px",
                  fontFamily: msg.sender === "rei" ? "JetBrains Mono, Fira Code, monospace" : "inherit",
                  fontSize: msg.sender === "rei" ? "0.9em" : "0.95em",
                  whiteSpace: "pre-wrap",
                  boxShadow: msg.sender === "rei" ? "0 0 10px rgba(255, 179, 0, 0.05)" : "none"
                }}
              >
                {msg.text}

                {/* Raw JSON details drawer */}
                {msg.rawJson && (
                  <details style={{ marginTop: "12px", borderTop: "1px dashed #1A4B5C", paddingTop: "8px" }}>
                    <summary style={{ color: "#94A3B8", fontSize: "0.85em", cursor: "pointer", outline: "none" }}>Raw JSON</summary>
                    <pre style={{ fontSize: "0.8em", color: "#94A3B8", overflowX: "auto", marginTop: "6px", background: "rgba(0,0,0,0.2)", padding: "6px", borderRadius: "4px" }}>
                      <code>{JSON.stringify(msg.rawJson, null, 2)}</code>
                    </pre>
                  </details>
                )}
              </div>
              <span style={{ fontSize: "0.75em", color: "#94A3B8", marginTop: "4px" }}>
                {msg.sender === "user" ? "You" : "REI.AI"} • {msg.timestamp}
              </span>
            </div>
          ))}

          {isTyping && (
            <div style={{ alignSelf: "flex-start", color: "#FFB300", fontFamily: "JetBrains Mono, Fira Code, monospace", fontSize: "0.9em" }}>
              REI.AI is thinking...
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
              fontSize: "0.95em",
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

    </section>
  );
}
