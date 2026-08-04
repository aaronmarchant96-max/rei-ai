import { useState, useRef, useEffect, useMemo, useLayoutEffect } from "react";
import { useMobile, useKeyboardVisible } from "./useMobile.js";
import { buildRouterDecision } from "./lib/nightShiftRouter.js";
import { getModelCosts, computeActualCost } from "./lib/costHelpers.js";
import { readChatHistoryHCM, saveChatHistoryHCM } from "./lib/persistentContextEngine.js";
import { buildDecisionReport } from "./lib/buildDecisionReport.js";
import { logRoutingDecision } from "./lib/routingLog.js";
import "./styles/reiTheme.css";
import { GENERALIST_PROMPTS, REASONING_LOOP_STEPS } from "./data/promptConfig.js";
import { parseAssistantStyleReply } from "./lib/replyParser.js";
import HingeMark from "./modules/rei/components/HingeMark.jsx";
import { isSimpleGreeting } from "./lib/routingConstants.js";
import { getDomainProfiles, getDomainPrompt, getDomain } from "./domains/_index.js";
import IngestPanel from "./modules/rei/components/IngestPanel.jsx";
import DomainBanner from "./modules/rei/components/DomainBanner.jsx";
import ChatHistory from "./modules/rei/components/ChatHistory.jsx";
import ChatInput from "./modules/rei/components/ChatInput.jsx";
import PhilosophyModal from "./modules/rei/components/PhilosophyModal.jsx";
import { useSessionTracker } from "./hooks/useSessionTracker.js";
import InstrumentRail from "./components/InstrumentRail.jsx";
import WelcomePanel from "./modules/rei/components/WelcomePanel.jsx";
import ReiContext from "./modules/rei/ReiContext.js";

const DOMAIN_PROFILES = getDomainProfiles();

export { parseAssistantStyleReply };

const MAX_RECORD_CHARS = 12000;

const SOURCE_TYPES = [
  { id: "ancestry", label: "Ancestry transcript" },
  { id: "familysearch", label: "FamilySearch record" },
  { id: "findagrave", label: "Find A Grave memorial" },
  { id: "other", label: "Other / unspecified" },
];

export function getAssistantWelcomeCopy() {
  return [
    "REI is live.",
    "Dual-engine active: Latin [Rei: The Matter / Reality / Hinge] and Operational [Record, Evaluate, Iterate].",
    "Bring me the thing you're trying to think through, and we'll pull it apart."
  ].join(" ");
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

export function buildDomainSystemMessage(domainId, currentDomain) {
  const domainLabel = currentDomain?.label || "REI.ai";
  const domainDescription = currentDomain?.description || "reasoning assistant";

  if (domainId === "assistant") {
    return "Hey! I'm REI — The Generalist. I use the CARDO framework to help you think through problems, separate facts from assumptions, and find the hinge that changes the answer. What's on your mind?";
  }

  const domainConfig = getDomain(domainId);
  const sessionLabel = domainConfig?.sessionLabel || "session";
  return `System initialized. Welcome to REI.ai ${domainLabel}. ${domainDescription} Let's begin our ${sessionLabel}!`;
}

function readStoredMessages(selectedDomain) {
  const currentDomain = DOMAIN_PROFILES.find((domain) => domain.id === selectedDomain) || DOMAIN_PROFILES[0];
  const welcomeText = buildDomainSystemMessage(selectedDomain, currentDomain);
  return readChatHistoryHCM(selectedDomain, welcomeText);
}

export default function REI({ initialPrompt } = {}) {
  // Mobile detection
  const mobile = useMobile();
  const keyboardVisible = useKeyboardVisible();
  const inputRef = useRef(null);

  // Scroll input into view when keyboard opens
  useEffect(() => {
    if (keyboardVisible && inputRef.current) {
      setTimeout(() => {
        inputRef.current.scrollIntoView({
          behavior: "smooth",
          block: "end"
        });
      }, 100);
    }
  }, [keyboardVisible]);

  // Copy text to clipboard function
  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here if needed
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const handleExport = async (exportData) => {
    try {
      const currentDomain = getDomain(selectedDomain);
      const report = buildDecisionReport(exportData.sections, {
        domainLabel: currentDomain?.label || selectedDomain,
        routerDecision: exportData.routerDecision,
        timestamp: exportData.timestamp,
      });
      const blob = new Blob([report.markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = report.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export decision document:", err);
    }
  };

  // Add fade-in animation style
  const fadeInStyle = {
    animation: "fadeIn 0.3s ease-in-out forwards",
    opacity: 0
  };

  const [themeMode, setThemeMode] = useState(() => {
    try {
      return localStorage.getItem("rei_theme_mode") || "dark";
    } catch (e) {
      return "dark";
    }
  });

  useLayoutEffect(() => {
    try {
      localStorage.setItem("rei_theme_mode", themeMode);
    } catch (e) {}
  }, [themeMode]);

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

  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState(() => {
    const storedMessages = readStoredMessages(selectedDomain);
    if (storedMessages) {
      return storedMessages;
    }

    return [
      {
        sender: "rei",
        text: buildDomainSystemMessage(selectedDomain, DOMAIN_PROFILES.find((domain) => domain.id === selectedDomain) || DOMAIN_PROFILES[0]),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ];
  });
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const [assistantPromptIndex, setAssistantPromptIndex] = useState(0);
  const [showRecap, setShowRecap] = useState(true);

  const currentDomain = DOMAIN_PROFILES.find((d) => d.id === selectedDomain) || DOMAIN_PROFILES[0];


  const sessionRecap = useMemo(() => {
    if (messages.length < 3) return null;
    const decisions = messages.filter(m => m?.sender === "rei" && (m?.rawJson?.routerDecision?.hingeScore || 0) > 0.3).length;
    return decisions > 0 ? { decisions } : null;
  }, [messages]);
  const { sessionCost, modelBreakdown, savingsVsPremium, sessionTokens, sessionMessages, escalationCount, trackMessage, lifetimeCost, lifetimeSavings, resetSession } = useSessionTracker();

  // Pre-fill input when navigated from landing page with a prompt
  useEffect(() => {
    if (initialPrompt) {
      setInputMessage(initialPrompt);
      setSelectedDomain("legal");
    }
  }, [initialPrompt]);

  // Clear chat and initialize domain-specific context when domain changes
  useEffect(() => {
    const domainSpecificMessage = {
      sender: "rei",
      text: buildDomainSystemMessage(selectedDomain, currentDomain),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    
    setMessages([domainSpecificMessage]);
    if (typeof window !== "undefined") {
      saveChatHistoryHCM(selectedDomain, [domainSpecificMessage]);
    }

    // Prevent a pasted record from leaking into a different domain
    setRawRecordText("");
    setShowIngest(false);
    setRecordSourceType("other");
  }, [selectedDomain]);

  // Auto scroll to bottom of chat only when messages length changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages.length]);

  // Sync to local storage (domain-specific)
  useEffect(() => {
    if (typeof window !== "undefined") {
      saveChatHistoryHCM(selectedDomain, messages);
    }
  }, [messages, selectedDomain]);

  const handleClearHistory = () => {
    resetSession();
    const domainSpecificMessage = {
      sender: "rei",
      text: buildDomainSystemMessage(selectedDomain, currentDomain),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([domainSpecificMessage]);
    if (typeof window !== "undefined") {
      saveChatHistoryHCM(selectedDomain, [domainSpecificMessage]);
    }
  };

  async function handleSendMessage(e) {
    e?.preventDefault?.();
    if (!inputMessage.trim()) return;

    const ingestedRecord = rawRecordText.trim();

    // Pre-send guard — fail fast, locally, instead of round-tripping to the backend only to get rejected there.
    if (ingestedRecord.length > MAX_RECORD_CHARS) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "rei",
          text: `That pasted record is ${ingestedRecord.length.toLocaleString()} characters — over the ${MAX_RECORD_CHARS.toLocaleString()} limit. Trim it to the relevant section (e.g. just the entry for the person in question) and try again.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isSystemNotice: true,
        },
      ]);
      return; // don't clear the textarea — let them edit and resend
    }

    const userMsg = {
      sender: "user",
      text: inputMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      attachedRecord: ingestedRecord
        ? { charCount: ingestedRecord.length, sourceType: recordSourceType }
        : null,
    };

    // Optimistically render user message and clear input field for instant responsiveness
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsTyping(true);

    // Capture and clear ingest state up front, so it can't accidentally attach to a later, unrelated message.
    setRawRecordText("");
    setShowIngest(false);
    setRecordSourceType("other");

    try {
      let systemContext = getDomainPrompt(selectedDomain);

      // Format previous chat history to send to backend (last 10 messages, filtering out system init messages)
      const historyPayload = messages
        .filter(msg => !msg.text.startsWith("System initialized. Welcome to REI.ai"))
        .slice(-10)
        .map(msg => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text
        }));

      const sourceLabel = SOURCE_TYPES.find((s) => s.id === recordSourceType)?.label || "Other / unspecified";

      const recordBlock = ingestedRecord
        ? `\n\nIngested Source Record (pasted by user, source: ${sourceLabel} — treat as raw, unverified material to evaluate and tier, not as established fact):\n\"\"\"\n${ingestedRecord}\n\"\"\"\n`
        : "";

      const routerStart = performance.now();
      const routerDecision = buildRouterDecision({
        input: userMsg.text,
        domain: selectedDomain,
        history: historyPayload,
        attachedRecord: ingestedRecord,
      });
      const routingMs = Math.round((performance.now() - routerStart) * 100) / 100;

      logRoutingDecision({
        domain: selectedDomain,
        routeId: routerDecision.id,
        model: routerDecision.model,
        hingeScore: routerDecision.hingeScore || 0,
        estimatedCost: routerDecision.estimatedCost || 0,
        premiumCost: routerDecision.premiumCost || 0,
        tokenCount: routerDecision.maxTokens || 0,
        rationale: routerDecision.rationale,
        matchedTerms: routerDecision.routingSignals?.matchedTerms || [],
        routingMs: routingMs,
        inputPreview: userMsg.text.slice(0, 80),
      });


      // Call route handler API with domain-specific context
      const response = await fetch("/api/cfai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          command: "score",
          input: `${systemContext}\n\nDomain: ${currentDomain.label}\nRules: ${currentDomain.rules.join(", ")}${recordBlock}\n\nUser Query: ${userMsg.text}`,
          systemPrompt: systemContext,
          history: historyPayload,
          routerDecision,
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Server returned failure response status");
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: "rei",
          text: data.result,
          timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
          rawJson: {
            engine: "REI-Hinge-Core v0.3",
            domain: selectedDomain,
            command: "score",
            model: data.model || "Local cfai CLI Executable",
            timestamp: data.timestamp || new Date().toISOString(),
            hadIngestedRecord: Boolean(ingestedRecord),
            recordSourceType: ingestedRecord ? recordSourceType : null,
            routerDecision: { ...(data.routerDecision || routerDecision), model: data.model || routerDecision?.model },
            truncated: data.truncated || false,
          }
        }
      ]);

      const usage = data.usage;
      const actualTokens = usage
        ? (usage.total_tokens || (usage.prompt_tokens || 0) + (usage.completion_tokens || 0))
        : (routerDecision?.maxTokens || 0);

      const modelName = data.model || routerDecision?.model || "deepseek-chat";
      const rates = getModelCosts(modelName);
      const PREMIUM_RATES = { input: 0.0025, output: 0.0100 };

      const actualCost = usage
        ? computeActualCost(usage.prompt_tokens || 0, usage.completion_tokens || 0, rates.input, rates.output)
        : (routerDecision?.estimatedCost || 0);

      const actualPremium = usage
        ? computeActualCost(usage.prompt_tokens || 0, usage.completion_tokens || 0, PREMIUM_RATES.input, PREMIUM_RATES.output)
        : (routerDecision?.premiumCost || 0);

      trackMessage(
        actualTokens,
        modelName,
        actualCost,
        actualPremium,
        modelName === "gpt-4o"
      );
    } catch (error) {
      console.error("REI.ai API error:", error);
      
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
        {
          sender: "rei",
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
    <ReiContext.Provider value={{
      inputMessage, setInputMessage, selectedDomain, setSelectedDomain,
      handleSendMessage, inputRef, mobile, generalistPrompts: GENERALIST_PROMPTS,
      assistantPromptIndex, setAssistantPromptIndex,
    }}>
    <div
      data-theme={themeMode} className="mobile-container safe-area rei-shell"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}
    >
      {/* Sticky Header with safe area top */}
      <header className="safe-top rei-header">
        {/* Domain selection tab strip */}
        <div className="rei-domain-tabs">
          {DOMAIN_PROFILES.map((dom) => (
            <button
              key={dom.id}
              type="button"
              onClick={() => setSelectedDomain(dom.id)}
              className={`rei-domain-tab ${selectedDomain === dom.id ? "is-active" : ""}`}
            >
              <span>{dom.label}</span>
              <span style={{ fontSize: "10px", fontWeight: 400, opacity: 0.7, textTransform: "none", marginTop: "1px" }}>
                {getDomain(dom.id)?.subtitle || ""}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setThemeMode((m) => (m === "light" ? "dark" : "light"))}
            className="rei-action-btn"
            title="Toggle light / dark theme"
          >
              {themeMode === "light" ? "🌙 Dark" : "☀️ Light"}
          </button>
          <button
            type="button"
            onClick={handleClearHistory}
            className="rei-action-btn rei-action-btn--danger"
          >
              Clear Chat
          </button>
          <button
            type="button"
            onClick={() => setIsPhilosophyOpen(true)}
            className="rei-action-btn rei-action-btn--accent"
          >
              (?) Philosophy
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedDomain("legal");
              setInputMessage("What is the hinge in Donoghue v Stevenson?");
            }}
            className="rei-action-btn"
            style={{ color: "#F59E0B", borderColor: "rgba(245, 158, 11, 0.25)" }}
          >
              ⚖️ Try a Case
          </button>
        </div>
      </header>

      {/* Scrollable Main Content with keyboard space */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
      <main className="flex-1 overflow-y-auto pb-32 rei-main-content">
        <DomainBanner currentDomain={currentDomain} selectedDomain={selectedDomain} reasoningLoopSteps={REASONING_LOOP_STEPS} />

        <IngestPanel
          selectedDomain={selectedDomain}
          rawRecordText={rawRecordText}
          setRawRecordText={setRawRecordText}
          showIngest={showIngest}
          setShowIngest={setShowIngest}
          recordSourceType={recordSourceType}
          setRecordSourceType={setRecordSourceType}
          maxRecordChars={MAX_RECORD_CHARS}
          sourceTypes={SOURCE_TYPES}
        />

        {selectedDomain === "assistant" && messages.length <= 1 && !isTyping && (
          <WelcomePanel
            onResume={(domainId) => {
              setSelectedDomain(domainId);
            }}
            onStart={(prompt) => {
            setInputMessage(prompt);
            handleSendMessage({ preventDefault: () => {} });
          }} />
        )}


        {showRecap && sessionRecap && (
          <div className="rei-session-recap" style={{
            padding: "10px 14px", borderRadius: "8px",
            background: "rgba(240, 201, 101, 0.04)", border: "1px solid rgba(240, 201, 101, 0.12)",
            margin: "0 16px 8px", display: "flex", justifyContent: "space-between", alignItems: "center",
            fontSize: "12px", color: "var(--text-secondary)",
          }}>
            <span>{sessionRecap.decisions} {sessionRecap.decisions === 1 ? "decision" : "decisions"} • saved ${savingsVsPremium.toFixed(4)} vs premium</span>
            <button onClick={() => setShowRecap(false)} style={{
              background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer",
              fontSize: "16px", lineHeight: 1, padding: "0 2px",
            }}>×</button>
          </div>
        )}
        <ChatHistory messages={messages} selectedDomain={selectedDomain} isTyping={isTyping} chatEndRef={chatEndRef} mobile={mobile} onCopy={copyText} onExport={handleExport} domainLabel={currentDomain?.label || "REI.ai"} />
      </main>
      {!mobile && (
        <InstrumentRail
          sessionTokens={sessionTokens}
          sessionMessages={sessionMessages}
          sessionCost={sessionCost}
          savingsVsPremium={savingsVsPremium}
          escalationCount={escalationCount}
          modelBreakdown={modelBreakdown}
          lifetimeCost={lifetimeCost}
          lifetimeSavings={lifetimeSavings}
        />
      )}
      </div>

      <ChatInput />
      
      <PhilosophyModal isOpen={isPhilosophyOpen} onClose={() => setIsPhilosophyOpen(false)} />
    </div>
    </ReiContext.Provider>
  );
}
