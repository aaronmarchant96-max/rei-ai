import { useState, useRef, useEffect } from "react";

const MAX_RECORD_CHARS = 12000;

const SOURCE_TYPES = [
  { id: "ancestry", label: "Ancestry transcript" },
  { id: "familysearch", label: "FamilySearch record" },
  { id: "findagrave", label: "Find A Grave memorial" },
  { id: "other", label: "Other / unspecified" },
];

const DOMAIN_PROFILES = [
  {
    id: "assistant",
    label: "The Generalist",
    badge: "Active",
    description: "Everyday reasoning, judgment, and decision support.",
    rules: ["Short sentences", "Hinge first", "Facts with sources", "Flag uncertainty"],
    exemplar: "Turning loose thoughts into a clean, usable decision path."
  },
  {
    id: "coding",
    label: "The Hinge Finder",
    badge: "Active",
    description: "Senior coding logic executing CARDO REI methodology.",
    rules: ["Verify API shapes", "Name hinges explicitly", "Stop and ask if underspecified"],
    exemplar: "Decomposing complex requirements into small, testable coding iterations."
  },
  {
    id: "genealogy",
    label: "The Archivist",
    badge: "Active",
    description: "Evidence-tiered genealogy and disambiguating same-name profiles.",
    rules: ["Compare parent-child age limits", "Assign evidence tiers", "Log negative search results"],
    exemplar: "Thomas Ramsey same-name disambiguation and parish register evaluation."
  },
  {
    id: "story",
    label: "The Storyteller",
    badge: "Active",
    description: "Narrative architecture generating story blueprints.",
    rules: ["Establish blueprint structure", "Identify character driver hinges", "Avoid cliché tropes"],
    exemplar: "Expanding historical inspiration seeds into multi-part character outlines."
  }
];

function getAssistantWelcomeCopy() {
  return [
    "REI is live.",
    "Dual-engine active: Latin [Rei: The Matter / Reality / Hinge] and Operational [Record, Evaluate, Iterate].",
    "Bring me the thing you're trying to think through, and we'll pull it apart."
  ].join(" ");
}

function isSimpleGreeting(text = "") {
  return /^(hi|hello|hey|yo|hiya|good (morning|afternoon|evening))[\s!.?]*$/i.test(text.trim());
}

function buildAssistantStyleReply(userText) {
  const clean = userText.trim().replace(/\s+/g, " ");
  if (isSimpleGreeting(clean)) {
    return [
      "Hey.",
      "Say what you want to sort out, and I’ll help pull it apart cleanly."
    ].join(" ");
  }

  return [
    "Hinge:",
    "the part that actually changes the answer.",
    "",
    "Facts:",
    "what you know for sure.",
    "",
    "Assumptions:",
    "what still needs proof.",
    "",
    "Move:",
    "the smallest useful next step."
  ].join("\n");
}

const GENERALIST_PROMPTS = [
  "Help me sort this out",
  "What am I missing here?",
  "What is the real hinge?",
  "Separate facts from assumptions",
  "What would change my mind?"
];

function parseAssistantStyleReply(text = "") {
  const sections = { Hinge: "", Facts: "", Assumptions: "", Move: "", intro: "" };
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  let current = "intro";
  for (const line of lines) {
    if (/^hinge:?$/i.test(line)) {
      current = "Hinge";
      continue;
    }
    if (/^facts:?$/i.test(line)) {
      current = "Facts";
      continue;
    }
    if (/^assumptions:?$/i.test(line)) {
      current = "Assumptions";
      continue;
    }
    if (/^move:?$/i.test(line)) {
      current = "Move";
      continue;
    }
    if (current === "intro") {
      sections.intro = sections.intro ? `${sections.intro} ${line}` : line;
    } else {
      sections[current] = sections[current] ? `${sections[current]} ${line}` : line;
    }
  }
  return sections;
}

// ── Ingest Panel Component ──
function IngestPanel({ selectedDomain, rawRecordText, setRawRecordText, showIngest, setShowIngest, recordSourceType, setRecordSourceType }) {
  if (selectedDomain !== "genealogy") return null;

  const charCount = rawRecordText.length;
  const overLimit = charCount > MAX_RECORD_CHARS;
  const nearLimit = charCount > MAX_RECORD_CHARS * 0.85;

  return (
    <div style={{ width: "100%", marginBottom: "10px" }}>
      <button
        type="button"
        onClick={() => setShowIngest((v) => !v)}
        style={{
          background: "rgba(251,146,60,0.08)",
          border: "1px solid rgba(251,146,60,0.25)",
          color: "#fdba74",
          borderRadius: "8px",
          padding: "8px 12px",
          fontSize: "12.5px",
          fontWeight: 600,
          cursor: "pointer",
          marginBottom: showIngest ? "8px" : "0",
        }}
      >
        {showIngest ? "− Hide Record Ingest" : "+ Paste a Record (Ancestry / FamilySearch / Find A Grave)"}
      </button>

      {showIngest && (
        <div>
          <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
            {SOURCE_TYPES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setRecordSourceType(s.id)}
                style={{
                  fontSize: "11px",
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: recordSourceType === s.id
                    ? "1px solid #f97316"
                    : "1px solid rgba(255,255,255,0.1)",
                  background: recordSourceType === s.id
                    ? "rgba(249,115,22,0.18)"
                    : "rgba(255,255,255,0.02)",
                  color: recordSourceType === s.id ? "#fed7aa" : "#94a3b8",
                  cursor: "pointer",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          <textarea
            value={rawRecordText}
            onChange={(e) => setRawRecordText(e.target.value)}
            placeholder="Paste raw record text here — Ancestry transcript, FamilySearch page text, Find A Grave memorial details, census entry, etc. REI will evaluate and tier it as evidence alongside your question."
            rows={6}
            style={{
              width: "100%",
              background: "rgba(0,0,0,0.25)",
              border: overLimit
                ? "1px solid #ef4444"
                : "1px solid rgba(251,146,60,0.2)",
              borderRadius: "8px",
              color: "#E2E8F0",
              fontSize: "12.5px",
              padding: "10px 12px",
              fontFamily: "monospace",
              resize: "vertical",
            }}
          />

          {charCount > 0 && (
            <div
              style={{
                fontSize: "11px",
                marginTop: "4px",
                color: overLimit ? "#f87171" : nearLimit ? "#fbbf24" : "#94a3b8",
              }}
            >
              {charCount.toLocaleString()} / {MAX_RECORD_CHARS.toLocaleString()} characters
              {overLimit && " — too long, trim before sending"}
              {!overLimit && nearLimit && " — approaching limit"}
              {!overLimit && !nearLimit && " — will attach to your next message, then clear"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
      <circle cx="18" cy="18" r="2.2" fill="#1a0d08" />

      {/* Fixed arm */}
      <path
        d="M18 18 L18 6"
        stroke="#1a0d08"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M18 6 L26 6"
        stroke="#1a0d08"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Swinging arm */}
      <g
        style={
          animated
            ? {
                transformOrigin: "18px 18px",
                animation: "rei-hinge-swing 1.1s ease-in-out infinite",
              }
            : undefined
        }
      >
        <path
          d="M18 18 L18 30"
          stroke="#1a0d08"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M18 30 L26 30"
          stroke="#1a0d08"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>

      {animated && (
        <style>{`
          @keyframes rei-hinge-swing {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(-18deg); }
          }
        `}</style>
      )}
    </svg>
  );
}

export default function REI() {
  // Copy text to clipboard function
  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here if needed
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

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
      
      /* Philosophy Modal Styles */
      .rei-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        backdrop-filter: blur(4px);
      }
      .rei-glass-modal {
        background: rgba(20, 20, 20, 0.75);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(251, 146, 60, 0.25);
        border-radius: 12px;
        padding: 24px;
        max-width: 580px;
        width: 90%;
        color: #e2e8f0;
        font-family: 'JetBrains Mono', 'Fira Code', Courier, monospace;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      }
      .rei-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(251, 146, 60, 0.18);
        padding-bottom: 12px;
        margin-bottom: 18px;
      }
      .rei-modal-header h2 {
        margin: 0;
        font-size: 18px;
        letter-spacing: 0.05em;
        color: #fb923c;
        font-weight: bold;
      }
      .rei-close-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 24px;
        cursor: pointer;
        transition: color 0.2s ease;
        line-height: 1;
      }
      .rei-close-btn:hover {
        color: #ffffff;
      }
      .rei-concept-layer {
        margin-bottom: 18px;
      }
      .rei-concept-layer h3 {
        font-size: 14px;
        color: #fed7aa;
        margin: 0 0 6px 0;
        border-left: 3px solid #fb923c;
        padding-left: 8px;
        font-weight: bold;
      }
      .rei-concept-layer p {
        font-size: 12.5px;
        line-height: 1.5;
        margin: 4px 0;
        padding-left: 11px;
        color: #cbd5e1;
      }
      .rei-tagline {
        font-style: italic;
        color: #fbd5c6;
        opacity: 0.85;
        font-size: 11.5px;
        margin-top: 4px;
        padding-left: 11px;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const [selectedDomain, setSelectedDomain] = useState("assistant");
  const [rawRecordText, setRawRecordText] = useState("");
  const [showIngest, setShowIngest] = useState(false);
  const [recordSourceType, setRecordSourceType] = useState("other");
  const [isPhilosophyOpen, setIsPhilosophyOpen] = useState(false);

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
      text: `System initialized. ${getAssistantWelcomeCopy()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ];
});
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const [assistantPromptIndex, setAssistantPromptIndex] = useState(0);

  const currentDomain = DOMAIN_PROFILES.find((d) => d.id === selectedDomain) || DOMAIN_PROFILES[0];
  const assistantQuickPrompt = GENERALIST_PROMPTS[assistantPromptIndex % GENERALIST_PROMPTS.length];

  // Clear chat and initialize domain-specific context when domain changes
  useEffect(() => {
    const domainSpecificMessage = {
      sender: "rei",
      text: `System initialized. ${currentDomain.id === 'assistant' ? getAssistantWelcomeCopy() : `Welcome to REI.AI ${currentDomain.label}. ${currentDomain.description} Let's begin our ${currentDomain.id === 'coding' ? 'coding session' : currentDomain.id === 'genealogy' ? 'research analysis' : 'story building'}!`}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages([domainSpecificMessage]);
    if (typeof window !== "undefined") {
      localStorage.setItem(`rei_chat_history_${selectedDomain}`, JSON.stringify([domainSpecificMessage]));
    }

    // Prevent a pasted record from leaking into a different domain
    setRawRecordText("");
    setShowIngest(false);
    setRecordSourceType("other");
  }, [selectedDomain]);

  // Auto scroll to bottom of chat only when messages length changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Sync to local storage (domain-specific)
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`rei_chat_history_${selectedDomain}`, JSON.stringify(messages));
    }
  }, [messages, selectedDomain]);

  const handleClearHistory = () => {
    const domainSpecificMessage = {
      sender: "rei",
      text: `System initialized. ${currentDomain.id === 'assistant' ? getAssistantWelcomeCopy() : `Welcome to REI.AI ${currentDomain.label}. ${currentDomain.description} Let's begin our ${currentDomain.id === 'coding' ? 'coding session' : currentDomain.id === 'genealogy' ? 'research analysis' : 'story building'}!`}`,
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

    const ingestedRecord = rawRecordText.trim();

    // Pre-send guard — fail fast, locally, instead of round-tripping to the backend only to get rejected there.
    if (ingestedRecord.length > MAX_RECORD_CHARS) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "rei",
          text: `That pasted record is ${ingestedRecord.length.toLocaleString()} characters — over the ${MAX_RECORD_CHARS.toLocaleString()} limit. Trim it to the relevant section (e.g. just the entry for the person in question) and try again.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSystemNotice: true,
        },
      ]);
      return; // don't clear the textarea — let them edit and resend
    }

    const userMsg = {
      sender: "user",
      text: inputMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachedRecord: ingestedRecord
        ? { charCount: ingestedRecord.length, sourceType: recordSourceType }
        : null,
    };

    setIsTyping(true);

    // Capture and clear ingest state up front, so it can't accidentally attach to a later, unrelated message.
    setRawRecordText("");
    setShowIngest(false);
    setRecordSourceType("other");

    try {
      // Build domain-specific prompt
      let systemContext =
        "You are REI, a careful reasoning assistant. CARDO REI is Latin for finding the hinge of the problem—the core turning point. Dissect the problem to find this point of leverage and build the solution on it. Default to plain language over jargon.";

      if (selectedDomain === "assistant") {
        systemContext =
          "You are REI, The Generalist: a distinct everyday reasoning model for ordinary conversation, judgment, and decision support. CARDO REI is the practice of finding the hinge of the problem—the exact turning point that changes the answer. Speak in a signature pattern: short opener, hinge label, facts, assumptions, move. Keep the tone warm but not bland, sharp but not hostile, and concrete rather than corporate. For simple greetings such as hello, hi, or hey, answer in one short human sentence, then invite a real topic. For actual problems, name the hinge first, separate facts from assumptions, and show the fewest useful moves to get to a decision. Prefer plain English, tight structure, and directness. If the user is uncertain, help them reduce the problem instead of filling space.";
      } else if (selectedDomain === "coding") {
        systemContext =
          "You are REI.AI, a senior software engineer executing the CARDO REI methodology. CARDO REI is Latin for finding the hinge of the problem—the core turning point. Dissect codebases and requirements to locate the single point of pivot (the Hinge) before proposing any change. Default stance: write code that is obvious, testable, and boring; prefer clarity over cleverness; fix root causes, not symptoms. Keep functions single-responsibility, name things by intent, comment the why not the what.";
      } else if (selectedDomain === "genealogy") {
        systemContext =
          "You are REI.AI, a genealogical research assistant executing the CARDO REI evidence-evaluation methodology. CARDO REI is Latin for finding the hinge of the problem—the core turning point (such as a disputed parentage, a same-name disambiguation, or a key birth record). Dissect records to isolate this pivot. Tier every claim explicitly: 🟢 Primary Source, 🔵 Strong Evidence, 🟠 Needs Review, 🟡 Family Memory. State your tier and reasoning inline with each claim.\n\n" +
          "Your reasoning is grounded in the Marchant Family Archive canonical profiles:\n" +
          "1. **Charles Dyer**: Confirmed direct patriot ancestor. Honorably discharged September 25, 1778 after serving as a soldier in Captain William McKee's company of the 12th Virginia Regiment at Fort Randolph. Father of Jonathan Dyer (b. 1802). Disambiguation note: Not the William Dyer of the 15th Virginia (sick in Eastern Virginia).\n" +
          "2. **William Moore**: Painter of Springwell Street, Ballymena, County Antrim. Married Isabella Law on March 29, 1846. Emigrated to Canada (Hull, Quebec) shortly after, then later to New York City by 1865. Father of James Moore (b. 1860) and Robert Harvey Moore.\n" +
          "3. **Josiah Ramsey Sr.**: Born 1728 in Delaware Colony, died 1811 in Davidson, Tennessee. Confirmed North Carolina Militia Revolutionary War veteran with verified 1782 pay voucher. Married Alice Bower (1744, Delaware). Father of Josiah Ramsey Jr. (1769-1835).\n" +
          "Dissect all queries regarding these lines against these verified facts. Do not allow oral family traditions or same-name duplicates to override these primary sources.";
      } else if (selectedDomain === "story") {
        systemContext =
          "You are REI.AI, a creative story architect using the CARDO REI narrative methodology. CARDO REI is Latin for finding the hinge of the story—the core turning point or character driver hinge (what each character actually wants and fears that pivots the arc). Dissect the narrative blueprint to isolate this hinge before expanding any outline. Speak with direct narrative clarity, avoid cliché tropes, and structure clear structural timelines.";
      }

      // Format previous chat history to send to backend (last 10 messages, filtering out system init messages)
      const historyPayload = messages
        .filter(msg => !msg.text.startsWith("System initialized. Welcome to REI.AI"))
        .slice(-10)
        .map(msg => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text
        }));

      const sourceLabel = SOURCE_TYPES.find((s) => s.id === recordSourceType)?.label || "Other / unspecified";

      const recordBlock = ingestedRecord
        ? `\n\nIngested Source Record (pasted by user, source: ${sourceLabel} — treat as raw, unverified material to evaluate and tier, not as established fact):\n\"\"\"\n${ingestedRecord}\n\"\"\"\n`
        : "";

      // Call route handler API with domain-specific context
      const response = await fetch('/api/cfai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: 'score',
          input: `${systemContext}\n\nDomain: ${currentDomain.label}\nRules: ${currentDomain.rules.join(", ")}${recordBlock}\n\nUser Query: ${userMsg.text}`,
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
        userMsg,
        {
          sender: "rei",
          text: data.result,
          timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          rawJson: {
            engine: "REI-Hinge-Core v0.3",
            domain: selectedDomain,
            command: "score",
            model: data.model || "Local cfai CLI Executable",
            timestamp: data.timestamp || new Date().toISOString(),
            hadIngestedRecord: Boolean(ingestedRecord),
            recordSourceType: ingestedRecord ? recordSourceType : null,
          }
        }
      ]);
    } catch (error) {
      console.error('REI.AI API error:', error);
      
      // Fallback: local evaluation if Vercel serverless function throws
      const fallbackText = `[REI.ai FALLBACK RESPONSE]
Confidence Score: 75%
Decision Hinge: Whether context boundaries explicitly justify the assertions.

Unverified Claims:
• Verification fallback active (Backend execution error: ${error.message}).

Limitations:
• Direct Groq backend not reachable. Running simulated local evaluation.`;

      setMessages((prev) => [
        ...prev,
        userMsg,
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
      setInputMessage("");
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
              <HingeMark size={28} animated={true} />
            </div>
            <div>
              <h1 className="rei-logo-title" style={{ margin: 0, lineHeight: 1.1 }}>REI.AI</h1>
              <p className="rei-logo-sub" style={{ margin: 0, fontSize: "11px", color: "#94a3b8" }}>
                Latin: <em>Rei</em> (The Matter / Hinge) &nbsp;|&nbsp; Loop: <strong>Record • Evaluate • Iterate</strong>
              </p>
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
            <button
              type="button"
              onClick={() => setIsPhilosophyOpen(true)}
              style={{
                background: "rgba(251,146,60,0.1)",
                color: "#fb923c",
                border: "1px solid rgba(251,146,60,0.3)",
                padding: "9px 14px",
                borderRadius: "9px",
                fontSize: "12.5px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.2s ease",
                marginLeft: "8px"
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "rgba(251, 146, 60, 0.2)"}
              onMouseOut={(e) => e.currentTarget.style.background = "rgba(251,146,60,0.1)"}
            >
              (?) Philosophy
            </button>
          </div>
        </header>

        {/* Active Domain Info Banner (Custom Card Style) */}
        <div className="rei-custom-card">
          <div style={{ fontSize: "10.5px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "#fb923c", marginBottom: "6px" }}>
            Active Voice
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", fontSize: "13px", color: "#cbd5e1" }}>
            <div style={{ flex: 1, minWidth: "250px" }}>
              <span style={{ color: "#FFB300", fontWeight: "bold", marginRight: "6px" }}>Mode:</span>
              <span>{currentDomain.description}</span>
            </div>
            <div>
              <span style={{ color: "#FFB300", fontWeight: "bold", marginRight: "6px" }}>Voice cues:</span>
              <span style={{ color: "#94A3B8" }}>{currentDomain.rules.join(" | ")}</span>
            </div>
          </div>
          {selectedDomain === "assistant" && (
            <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {["Collect", "Analyze", "Record", "Distinguish", "Organize", "Review", "Evaluate", "Iterate"].map((step) => (
                <span
                  key={step}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "999px",
                    border: "1px solid rgba(251,146,60,0.18)",
                    background: "rgba(255,255,255,0.03)",
                    color: "#fed7aa",
                    fontSize: "11px",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase"
                  }}
                >
                  {step}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Ingest Panel - only shown for genealogy domain */}
        <IngestPanel
          selectedDomain={selectedDomain}
          rawRecordText={rawRecordText}
          setRawRecordText={setRawRecordText}
          showIngest={showIngest}
          setShowIngest={setShowIngest}
          recordSourceType={recordSourceType}
          setRecordSourceType={setRecordSourceType}
        />

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
                {msg.sender === "user" && msg.attachedRecord && (
                  <div style={{
                    fontSize: "10.5px",
                    color: "#fdba74",
                    marginBottom: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}>
                    📋 Record attached — {msg.attachedRecord.sourceType} ({msg.attachedRecord.charCount.toLocaleString()} chars)
                  </div>
                )}
                <div
                  style={{
                    background: msg.sender === "user" ? "rgba(255,255,255,0.06)" : "rgba(251,146,60,0.08)",
                    color: "#E2E8F0",
                    border: msg.sender === "user" ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(251,146,60,0.18)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    fontFamily: msg.sender === "rei" ? "JetBrains Mono, Fira Code, monospace" : "inherit",
                    fontSize: "14.5px",
                    whiteSpace: "pre-wrap",
                    lineHeight: "1.4",
                    position: "relative"
                  }}
                >
                  {selectedDomain === "assistant" && msg.sender === "rei" && !msg.rawJson?.fallback ? (
                    (() => {
                      const sections = parseAssistantStyleReply(msg.text);
                      return sections.intro ? (
                        <div style={{ display: "grid", gap: "10px" }}>
                          <div>{sections.intro}</div>
                          {sections.Hinge && (
                            <div>
                              <div style={{ color: "#fb923c", fontSize: "0.85em", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Hinge</div>
                              <div>{sections.Hinge}</div>
                            </div>
                          )}
                          {sections.Facts && (
                            <div>
                              <div style={{ color: "#fb923c", fontSize: "0.85em", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Facts</div>
                              <div>{sections.Facts}</div>
                            </div>
                          )}
                          {sections.Assumptions && (
                            <div>
                              <div style={{ color: "#fb923c", fontSize: "0.85em", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Assumptions</div>
                              <div>{sections.Assumptions}</div>
                            </div>
                          )}
                          {sections.Move && (
                            <div>
                              <div style={{ color: "#fb923c", fontSize: "0.85em", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Move</div>
                              <div>{sections.Move}</div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>{msg.text}</div>
                      );
                    })()
                  ) : (
                    msg.text
                  )}

                  {/* Raw JSON details drawer */}
                  {msg.rawJson && (
                    <details style={{ marginTop: "12px", borderTop: "1px dashed rgba(251,146,60,0.18)", paddingTop: "8px" }}>
                      <summary style={{ color: "#94A3B8", fontSize: "0.85em", cursor: "pointer", outline: "none" }}>Raw JSON</summary>
                      <pre style={{ fontSize: "0.85em", color: "#94A3B8", overflowX: "auto", marginTop: "6px", background: "rgba(0,0,0,0.3)", padding: "8px", borderRadius: "4px" }}>
                        <code>{JSON.stringify(msg.rawJson, null, 2)}</code>
                      </pre>
                    </details>
                  )}
                  <button
                    onClick={() => copyText(msg.text)}
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      background: "rgba(251,146,60,0.15)",
                      border: "1px solid rgba(251,146,60,0.3)",
                      borderRadius: "4px",
                      color: "#fb923c",
                      cursor: "pointer",
                      fontSize: "0.75em",
                      padding: "2px 6px",
                      opacity: 0.7,
                      transition: "opacity 0.2s"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                    onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
                    title="Copy message"
                  >
                    Copy
                  </button>
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
                <span>REI is shaping the reply...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input form area */}
          <form onSubmit={handleSendMessage} style={{ borderTop: "1px solid rgba(251,146,60,0.15)", background: "rgba(0,0,0,0.3)", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {selectedDomain === "assistant" && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {GENERALIST_PROMPTS.map((prompt, index) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      setInputMessage(prompt);
                      setAssistantPromptIndex(index);
                    }}
                    style={{
                      border: "1px solid rgba(251,146,60,0.18)",
                      background: "rgba(255,255,255,0.03)",
                      color: "#fed7aa",
                      borderRadius: "999px",
                      padding: "6px 10px",
                      fontSize: "11px",
                      cursor: "pointer"
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={selectedDomain === "assistant" ? assistantQuickPrompt : "Type proof context or statements to evaluate..."}
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
            </div>
          </form>
        </div>
      </div>
      
      {/* Philosophy Modal Overlay */}
      {isPhilosophyOpen && (
        <div className="rei-modal-overlay" onClick={() => setIsPhilosophyOpen(false)}>
          <div className="rei-glass-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rei-modal-header">
              <h2>SYSTEM PHILOSOPHY: R.E.I.</h2>
              <button className="rei-close-btn" onClick={() => setIsPhilosophyOpen(false)} aria-label="Close Modal">
                &times;
              </button>
            </div>

            <div className="rei-concept-layer">
              <h3>1. Latin: Rei (The Matter / Reality / Hinge)</h3>
              <p><strong>The Concept:</strong> Genitive form of <em>Res</em>, meaning "thing," "fact," or "reality."</p>
              <p><strong>The Connection:</strong> In <em>CARDO REI</em>, it represents "The Hinge of the Matter." Dissecting the core pivot where the reality of a problem turns.</p>
              <p className="rei-tagline">"Investigating the matter, not the person."</p>
            </div>

            <div className="rei-concept-layer">
              <h3>2. Operational: R-E-I (Record • Evaluate • Iterate)</h3>
              <p><strong>The Concept:</strong> The engineering process loop that keeps development structured and safe.</p>
              <p><strong>The Connection:</strong> <strong>Record</strong> the facts (TDD/Citations), <strong>Evaluate</strong> the boundaries (Scoring/Tiers), and <strong>Iterate</strong> in modular steps.</p>
              <p className="rei-tagline">"Building tiny houses until you get a neighborhood."</p>
            </div>

            <div className="rei-concept-layer">
              <h3>3. Physics: Refractive Index (R.I.)</h3>
              <p><strong>The Concept:</strong> Optical measure of how much light bends when entering a new medium.</p>
              <p><strong>The Connection:</strong> REI acts as a refractive lens for thoughts. Bending raw arguments to filter out the glare (smoke, bias) and find clear direction.</p>
              <p className="rei-tagline">"Shaping raw light into structured clarity."</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
