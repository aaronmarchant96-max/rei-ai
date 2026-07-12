import { useState, useRef, useEffect } from "react";
import { useMobile, useKeyboardVisible } from "./useMobile.js";
import { useChatHistory } from "./hooks/useChatHistory.js";
import { useSessionTracker } from "./hooks/useSessionTracker.js";
import { useThriftyMode } from "./hooks/useThriftyMode.js";
import { useDomainHint } from "./hooks/useDomainHint.js";
import { buildRouterDecision, estimateTokens } from "./lib/nightShiftRouter.js";
import { computeMsgCost, formatCostDisplay, estimateInputTokens, nextMessageId } from "./lib/contracts.js";
import { getModelCostRate } from "./lib/costHelpers.js";
import PhilosophyModal from "./components/PhilosophyModal.jsx";
import SessionSummary from "./components/SessionSummary.jsx";
import IngestPanel, { MAX_RECORD_CHARS, SOURCE_TYPES } from "./components/IngestPanel.jsx";
import ChatMessage from "./components/ChatMessage.jsx";
import ContextPanel from "./components/ContextPanel.jsx";
import { parseEvidenceTiers } from "./components/EvidenceCard.jsx";
import { parseAssistantStyleReply } from "./lib/replyParser.js";
import "./rei.css";

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
    "the turning point that changes the answer.",
    "",
    "Facts:",
    "what is known and why it matters.",
    "",
    "Assumptions:",
    "what is still inferred or uncertain.",
    "",
    "Evaluation:",
    "how strong the case is and where the real risk sits.",
    "",
    "What would change my mind:",
    "the evidence that would flip the conclusion.",
    "",
    "Move:",
    "the smallest useful next step."
  ].join("\n");
}

function buildDomainSystemMessage(domainId, currentDomain) {
  const domainLabel = currentDomain?.label || "REI.ai";
  const domainDescription = currentDomain?.description || "reasoning assistant";

  if (domainId === "assistant") {
    return `System initialized. ${getAssistantWelcomeCopy()}`;
  }

  return `System initialized. Welcome to REI.ai ${domainLabel}. ${domainDescription} Let's begin our ${domainId === 'coding' ? 'coding session' : domainId === 'genealogy' ? 'research analysis' : 'story building'}!`;
}

function formatCost(totalTokens, model) {
  const rate = getModelCostRate(model);
  return formatCostDisplay(computeMsgCost(totalTokens, rate));
}

const GENERALIST_PROMPTS = [
  "Help me sort this out",
  "What am I missing here?",
  "What is the real hinge?",
  "Separate facts from assumptions",
  "What would change my mind?"
];

const REASONING_LOOP_STEPS = [
  { id: "facts", label: "Facts", detail: "What is known" },
  { id: "assumptions", label: "Assumptions", detail: "What remains uncertain" },
  { id: "evaluation", label: "Evaluation", detail: "How strong the case is" },
  { id: "change", label: "What changes it", detail: "What would flip the answer" },
  { id: "move", label: "Next move", detail: "Smallest useful step" },
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

/**
 * REI Core Component - Fortis et Liber Implementation:
 * 
 * 1. Leverage - Domain-specific reasoning:
 *    - Assistant: CARDO REI structured reasoning
 *    - Coding: Verification-first development
 *    - Genealogy: Evidence-tiered analysis
 *    - Story: Narrative architecture
 * 
 * 2. Surface Area - Minimal interfaces:
 *    - Focused domain selection
 *    - Clear input boundaries
 *    - Explicit state management
 * 
 * 3. Recoil - Managed challenges:
 *    - Input validation
 *    - Error fallbacks
 *    - Clear user feedback
 * 
 * 4. Enumeration - Tracked decisions:
 *    - Routing metadata
 *    - Model selection
 *    - Performance characteristics
 * 
 * 5. Parity - Balanced interactions:
 *    - Equal treatment of domains
 *    - Consistent UX patterns
 *    - Fair resource allocation
 * 
 * 6. Solvency - Guaranteed completion:
 *    - Local fallback generation
 *    - Clean error states
 *    - Persistent history
 * 
 * 7. Conservation - Efficient operation:
 *    - Optimized renders
 *    - Right-sized responses
 *    - Minimal re-renders
 */
// Named exports for testing
export { parseAssistantStyleReply, buildDomainSystemMessage, getAssistantWelcomeCopy };

export default function REI() {
  // Mobile detection
  const mobile = useMobile();
  const keyboardVisible = useKeyboardVisible();
  const inputRows = mobile ? 3 : 5;

  const inputRef = useRef(null);

  // Scroll input into view when keyboard opens
  useEffect(() => {
    if (keyboardVisible && inputRef.current) {
      setTimeout(() => {
        inputRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end'
        });
      }, 100);
    }
  }, [keyboardVisible]);

  // Copy text to clipboard function
  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const retryMessage = (msgIndex) => {
    const userMsg = messages[msgIndex - 1];
    if (userMsg?.sender !== "user") return;
    setInputMessage(userMsg.text);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  };

  const [isPhilosophyOpen, setIsPhilosophyOpen] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);

  const [selectedDomain, setSelectedDomain] = useState("assistant");
  const [rawRecordText, setRawRecordText] = useState("");
  const [showIngest, setShowIngest] = useState(false);
  const [recordSourceType, setRecordSourceType] = useState("other");

  const [inputMessage, setInputMessage] = useState("");

  const {
    messages, setMessages, isTyping, setIsTyping,
    chatEndRef, assistantPromptIndex, setAssistantPromptIndex,
    handleClearHistory,
  } = useChatHistory(selectedDomain, buildDomainSystemMessage, DOMAIN_PROFILES);

  const { thriftyMode, toggleThriftyMode } = useThriftyMode();

  const {
    sessionTokens, sessionMessages, sessionCost, modelBreakdown,
    showSessionSummary, setShowSessionSummary,
    trackMessage, resetSession, savingsVsPremium, escalationCount,
  } = useSessionTracker();

  const { domainHint, updateDomainHint, dismissDomainHint, switchDomain } = useDomainHint(selectedDomain);

  const currentDomain = DOMAIN_PROFILES.find((d) => d.id === selectedDomain) || DOMAIN_PROFILES[0];

  let lastReiMessage = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.sender === "rei" && !messages[i]?.isSystemNotice && !messages[i]?.fallback) {
      lastReiMessage = messages[i];
      break;
    }
  }

  // Prevent a pasted record from leaking into a different domain
  useEffect(() => {
    setRawRecordText("");
    setShowIngest(false);
    setRecordSourceType("other");
  }, [selectedDomain]);

  function handleInputChange(value) {
    setInputMessage(value);
    updateDomainHint(value);
  }

  /**
   * Handles message sending with Fortis et Liber exit strategies:
   * 1. Early rejection of empty input
   * 2. Record length validation
   * 3. Fallback response on API failure
   * 4. Clean state maintenance
   */
  async function handleSendMessage(e) {
    e.preventDefault();
    // Principle of Surface Area: Minimal input validation
    if (!inputMessage.trim()) {
      setMessages(prev => [...prev, {
        sender: "rei",
        text: "Empty input rejected per minimum effective contact principle",
        timestamp: new Date().toLocaleTimeString(),
        isSystemNotice: true
      }]);
      return;
    }

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
      id: nextMessageId(),
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
      const systemContext = selectedDomain;

      // Format previous chat history to send to backend (last 10 messages, filtering out system init messages)
      const historyPayload = messages
        .filter(msg => !msg.text.startsWith("System initialized"))
        .slice(-10)
        .map(msg => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text
        }));

      const sourceLabel = SOURCE_TYPES.find((s) => s.id === recordSourceType)?.label || "Other / unspecified";

      const recordBlock = ingestedRecord
        ? `\n\nIngested Source Record (pasted by user, source: ${sourceLabel} — treat as raw, unverified material to evaluate and tier, not as established fact):\n"""\n${ingestedRecord}\n"""\n`
        : "";

      const routerDecision = buildRouterDecision({
        input: userMsg.text,
        domain: selectedDomain,
        history: historyPayload,
        attachedRecord: ingestedRecord,
        thrifty: thriftyMode,
      });

      if (routerDecision.deterministicLayer) {
        trackMessage(0, "deterministic", 0, routerDecision.premiumCost, false);

        setMessages((prev) => [
          ...prev,
          userMsg,
          {
            id: nextMessageId(),
            sender: "rei",
            text: routerDecision.deterministicResponse,
            timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
            usage: { total_tokens: 0 },
            model: "deterministic",
            cost: 0,
            routerDecision,
          }
        ]);

        setIsTyping(false);
        setInputMessage("");
        return;
      }

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
          domain: selectedDomain,
          domainLabel: currentDomain.label,
          domainRules: currentDomain.rules,
          recordBlock,
          history: historyPayload,
          routerDecision,
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Server returned failure response status');
      }

      const usage = data.usage || null;
      const responseModel = data.model || "Local cfai CLI Executable";
      const totalTokens = usage?.total_tokens || 0;
      const modelRate = getModelCostRate(responseModel);
      const msgCost = computeMsgCost(totalTokens, modelRate);

      trackMessage(totalTokens, responseModel, msgCost, routerDecision.premiumCost, routerDecision.pathway === "premium");

      const evidence = selectedDomain === "genealogy"
        ? parseEvidenceTiers(data.result)
        : [];

      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          id: nextMessageId(),
          sender: "rei",
          text: data.result,
          timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          usage,
          model: responseModel,
          cost: msgCost,
          routerDecision: data.routerDecision || routerDecision,
          evidence: evidence.length > 0 ? evidence : undefined,
        }
      ]);
    } catch (error) {
      console.error('REI.ai API error:', error);

      const isNetworkError = error.message.includes('fetch') || error.message.includes('NetworkError') || error.message.includes('Failed to fetch');
      const errorType = isNetworkError ? 'Network error' : 'Server error';

      const fallbackText = `[Backend unavailable — ${errorType}]
${error.message}

${isNetworkError ? 'Check your connection and try again.' : 'The server encountered an issue. Please try again.'}`;

      const fallbackMsg = {
        id: nextMessageId(),
        sender: "rei",
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        fallback: true,
        error: error.message,
        errorType,
      };

      setMessages((prev) => [...prev, userMsg, fallbackMsg]);
    } finally {
      setIsTyping(false);
      setInputMessage("");
    }
  }

  return (
    <div className="rei-shell">
      <header className="rei-header">
          <div className="rei-header__brand">
            <div className="rei-logo-mark">
              <HingeMark size={20} animated={true} />
            </div>
            <h1 className="rei-logo-title">REI</h1>
          </div>

          <div className="rei-domain-tabs">
            {DOMAIN_PROFILES.map((dom) => (
              <button
                key={dom.id}
                type="button"
                onClick={() => setSelectedDomain(dom.id)}
                className={`rei-domain-tab ${selectedDomain === dom.id ? "is-active" : ""}`}
              >
                {dom.id === "assistant" ? "Generalist" :
                 dom.id === "coding" ? "Coding" :
                 dom.id === "genealogy" ? "Research" :
                 "Stories"}
              </button>
            ))}
            <button
              type="button"
              onClick={toggleThriftyMode}
              className={`rei-action-btn ${thriftyMode ? "rei-action-btn--thrifty" : ""}`}
              title="Thrifty"
            >
              💰
            </button>
            <button
              type="button"
              onClick={handleClearHistory}
              className="rei-action-btn rei-action-btn--danger"
              title="Clear"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Scrollable Main Content with keyboard space */}
        <main className="rei-main-content">

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

        {/* Domain Hint Banner — detects input mismatch */}
        {domainHint && (
          <div className="rei-domain-hint">
            <span>
              This looks like a <strong>{domainHint}</strong> question.
              Switch to{' '}
              <strong>{DOMAIN_PROFILES.find(d => d.id === domainHint)?.label || domainHint}</strong>?
            </span>
            <div className="rei-domain-hint__actions">
              <button
                type="button"
                onClick={() => {
                  setSelectedDomain(switchDomain(domainHint));
                }}
                className="rei-domain-hint__switch-btn"
              >
                Switch
              </button>
              <button
                type="button"
                onClick={dismissDomainHint}
                className="rei-domain-hint__dismiss-btn"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Chat Interface Container */}
        <div className="rei-chat-container">
          
          {/* Chat History Area */}
          <div className="rei-chat-history" role="log" aria-live="polite" aria-label="Chat messages">
            {messages.map((msg, index) => (
              <ChatMessage
                key={msg.id || index}
                msg={msg}
                index={index}
                selectedDomain={selectedDomain}
                onCopy={copyText}
                onRetry={retryMessage}
              />
            ))}

            {isTyping && (
              <div className="rei-typing-indicator" aria-live="polite" aria-label="REI is replying">
                <span>●</span>
                <span>REI is shaping the reply...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
        </main>

        <SessionSummary
          sessionTokens={sessionTokens}
          sessionMessages={sessionMessages}
          sessionCost={sessionCost}
          modelBreakdown={modelBreakdown}
          showSessionSummary={showSessionSummary}
          setShowSessionSummary={setShowSessionSummary}
          formatCost={formatCost}
          selectedDomain={selectedDomain}
          currentDomain={currentDomain}
          thriftyMode={thriftyMode}
          savingsVsPremium={savingsVsPremium}
          escalationCount={escalationCount}
          resetSession={resetSession}
        />

        {/* Fixed Input Area at Bottom with safe area */}
        <div className="rei-input-shell">
          <form className="rei-input-form" onSubmit={handleSendMessage}>
            {selectedDomain === "assistant" && (
              <div className="rei-quick-prompts">
                {GENERALIST_PROMPTS.map((prompt, index) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      setInputMessage(prompt);
                      setAssistantPromptIndex(index);
                    }}
                    className="rei-quick-prompt"
                    aria-pressed={assistantPromptIndex === index}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            <div className="rei-input-row">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={selectedDomain === "assistant" ? "What are you thinking through? ~12 tok" : "Type proof context or statements to evaluate..."}
                className="rei-input-area"
              />
              <button
                type="submit"
                className="rei-touch-button"
              >
                Send
              </button>
            </div>
            {inputMessage.trim() && (
              <div className="rei-budget-row">
                <span>
                  ~{estimateInputTokens(inputMessage)} tok &rarr;{" "}
                  {buildRouterDecision({ input: inputMessage, domain: selectedDomain, thrifty: thriftyMode }).label}
                  {" · "}
                  {formatCost(estimateInputTokens(inputMessage), "llama-3.3-70b-versatile")}
                </span>
                <span>Budget: {sessionTokens.toLocaleString()}/5K</span>
              </div>
            )}
          </form>
        </div>
      
      {isPhilosophyOpen && <PhilosophyModal onClose={() => setIsPhilosophyOpen(false)} />}
      <button
        className="rei-context-toggle"
        onClick={() => setIsContextOpen((v) => !v)}
        aria-label="Toggle context panel"
        aria-expanded={isContextOpen}
      >
        Context
      </button>
      <ContextPanel
        message={lastReiMessage}
        isOpen={isContextOpen}
        onClose={() => setIsContextOpen(false)}
      />
    </div>
  );
}
