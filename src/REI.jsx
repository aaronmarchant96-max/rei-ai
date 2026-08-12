import { useState, useRef, useEffect, useMemo, useLayoutEffect } from "react";
import { useMobile, useKeyboardVisible } from "./useMobile.js";
import { buildRouterDecision } from "./lib/nightShiftRouter";
import { getModelCosts, computeActualCost } from "./lib/costHelpers";
import { readChatHistoryHCM, saveChatHistoryHCM } from "./lib/persistentContextEngine.js";
import { buildDecisionReport } from "./lib/buildDecisionReport.js";
import { logDecision } from "./lib/decisionStore";
import { logRoutingDecision, updateLatestLogEntry } from "./lib/routingLog";
import { shouldEscalateToRemote } from "./lib/cardoGuard.js";
import { isAdversarialRequest } from "./lib/nightShiftRouter";
import { buildSelfAuditContext } from "./lib/selfAuditContext";
import { buildSourceContext } from "./lib/sourceContext";
import { deriveProvider } from "./lib/provider";
import { scanRedTeamInput } from "./lib/redTeamScanner";
import { logEval } from "./lib/evalLog";
import "./__eval__/claimRegistry";
import "./styles/reiTheme.css";
import { GENERALIST_PROMPTS, REASONING_LOOP_STEPS } from "./data/promptConfig.js";
import { parseAssistantStyleReply } from "./lib/replyParser.js";
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
import BackendUnavailablePanel from "./modules/rei/components/BackendUnavailablePanel.jsx";
import ReiContext from "./modules/rei/ReiContext.js";

const DOMAIN_PROFILES = getDomainProfiles();

// Stable per-request correlation key. crypto.randomUUID when available; a
// timestamp+random fallback for non-secure contexts.
function generateRequestId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch (_) {}
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Forgiving-but-bounded self-improvement intent gate (cheap string match, not a
// classifier). Only queries matching these trigger injecting the live self-audit
// block. Keep short — the block is a targeted signal, not a universal footer.
const SELF_IMPROVE_HINTS = [
  "improve",
  "get better",
  "do better",
  "be better",
  "better at",
  "self improve",
  "self-improve",
  "prioritize development",
  "what should i work on",
  "work on next",
  "make me better",
  "how can i improve",
  "how could i improve",
];

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

const API_TIMEOUT_MS = 120000; // generous: LLM completions can legitimately take 60-120s

export async function fetchWithTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s. The backend may be cold-starting or overloaded — try again.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
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
  const retryPayloadRef = useRef(null);

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

  // Copy text to clipboard function — returns true on success, false on failure
  const copyText = async (text) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch (err) {
      console.error("Failed to copy: ", err);
      return false;
    }
  };

  const handleExport = (exportData) => {
    try {
      const currentDomain = getDomain(selectedDomain);
      const report = buildDecisionReport({
        sections: exportData.sections,
        routerDecision: exportData.routerDecision,
        domainLabel: exportData.domainLabel || currentDomain?.label || "REI.ai",
        sourceText: exportData.sourceText || "",
        createdAt: exportData.createdAt || exportData.timestamp || new Date(),
      });
      const blob = new Blob([report.markdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = report.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export decision document:", err);
      // Fallback: open a print-ready window when the download path fails
      try {
        if (typeof window !== "undefined" && window.open) {
          const printWindow = window.open("", "_blank", "width=800,height=900");
          if (printWindow) {
            printWindow.document.write(buildDecisionReport({
              sections: exportData.sections,
              routerDecision: exportData.routerDecision,
              domainLabel: exportData.domainLabel || getDomain(selectedDomain)?.label || "REI.ai",
              createdAt: exportData.createdAt || exportData.timestamp || new Date(),
            }).html);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
          }
        }
      } catch (printErr) {
        console.error("Print fallback also failed:", printErr);
      }
    }
  };

  function mapTierToPathway(tier) {
    // All tiers map to "cheap" — the cheapRouteConfidence (1−hs) drives
    // the escalation decision. Deterministic/premium pathways short-circuit
    // to escalation=false, so we never use those here.
    return "cheap";
  }

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
  const [backendError, setBackendError] = useState(null);
  const [attachedFiles, setAttachedFiles] = useState([]);

  const currentDomain = DOMAIN_PROFILES.find((d) => d.id === selectedDomain) || DOMAIN_PROFILES[0];


  const sessionRecap = useMemo(() => {
    if (messages.length < 3) return null;
    const decisions = messages.filter(m => m?.sender === "rei" && (m?.rawJson?.routerDecision?.hingeScore || 0) > 0.3).length;
    return decisions > 0 ? { decisions } : null;
  }, [messages]);
  const { sessionCost, modelBreakdown, savingsVsPremium, sessionTokens, sessionMessages, sessionChunks, escalationCount, trackMessage, lifetimeCost, lifetimeSavings, resetSession } = useSessionTracker();

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

  async function processApiResponse(response, routerDecision, ingestedRecord, recordSourceType, userText, requestId, inputScan) {
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      let errorDetail = "";
      try {
        const text = await response.text();
        errorDetail = text.startsWith("<")
          ? "HTTP " + response.status + " — server error page (" + text.slice(0, 150).trim().replace(/\n/g, " ") + "...)"
          : text.slice(0, 300);
      } catch (_) {
        errorDetail = "HTTP " + response.status;
      }
      throw new Error("Backend request failed: " + errorDetail);
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      throw new Error("Backend returned non-JSON response (content-type: " + (contentType || "unknown") + ")");
    }

    if (!data.success) {
      throw new Error(data.error || "Server returned failure response status");
    }

    const parsedSections = parseAssistantStyleReply(data.result);
    const isStructured = Object.keys(parsedSections).some((k) => k !== "intro" && parsedSections[k].trim());
    const pendingDecision = {
      id: `${Date.now()}-${selectedDomain.slice(0, 8)}-${Math.random().toString(36).slice(2, 6)}`,
      requestId,
      sections: parsedSections,
      routerDecision: {
        label: routerDecision?.label,
        model: data.model || routerDecision?.model,
        matchedTerms: routerDecision?.matchedTerms,
        hingeScore: routerDecision?.hingeScore,
      },
      domainLabel: currentDomain?.label || "REI.ai",
      inputPreview: (userText || "").slice(0, 200),
      createdAt: new Date().toISOString(),
      actualTokens: null,
      actualCost: null,
    };

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

    const modelName = data.model || routerDecision?.model || "deepseek-v4-flash";
    const rates = getModelCosts(modelName);
    const PREMIUM_RATES = { input: 0.0025, output: 0.0100 };

    const isGroqFreeTier = deriveProvider(modelName) === "groq";

    const actualCost = usage
      ? isGroqFreeTier ? 0 : computeActualCost(usage.prompt_tokens || 0, usage.completion_tokens || 0, rates.input, rates.output)
      : (routerDecision?.estimatedCost || 0);

    const actualPremium = usage
      ? computeActualCost(usage.prompt_tokens || 0, usage.completion_tokens || 0, PREMIUM_RATES.input, PREMIUM_RATES.output)
      : (routerDecision?.premiumCost || 0);

    trackMessage(
      actualTokens,
      modelName,
      actualCost,
      actualPremium,
      modelName === "gpt-4o",
      data.continuation?.chunks || 1
    );

    try {
      logDecision({
        ...pendingDecision,
        actualTokens,
        actualCost,
      });
    } catch (e) {
      console.warn("Failed to log decision:", e);
    }

    // Patch the pre-API routing log entry with post-API actuals
    // (provider, rescue flag, truncation) for the evidence dashboard.
    try {
      updateLatestLogEntry({
        provider: deriveProvider(modelName),
        rescue: String(modelName || "").includes("(fallback)"),
        truncated: Boolean(data.truncated),
        continuations: data.continuation?.attempted ? (data.continuation.chunks - 1) : 0,
        totalChunks: data.continuation?.chunks || 1,
        finalTruncated: data.continuation?.finalTruncated ?? Boolean(data.truncated),
        structured: isStructured,
        actualCost,
        actualTokens,
      }, requestId);
    } catch (e) {
      console.warn("Failed to patch routing log:", e);
    }

    // Deterministic evaluation of the live request: response-side safety scan
    // plus routing-policy adherence. Stored separately from the routing event
    // so the log keeps "what happened" distinct from "what we judged about it".
    try {
      const responseText = data?.result || "";
      const responseScan = responseText ? scanRedTeamInput(responseText) : null;
      const wasAdversarialRoute = routerDecision?.id === "adversarial-validation";
      const routeExpected = Boolean(inputScan?.escalateToD2);
      const routeCorrect = routeExpected === wasAdversarialRoute;
      logEval({
        requestId,
        domain: selectedDomain,
        routeId: routerDecision?.id,
        model: modelName,
        evaluator: "deterministic",
        evaluatorVersion: "red-team-v1",
        evaluation: {
          qualityScore: inputScan?.score ?? null,
          safetyVerdict: responseScan?.verdict,
          routeExpected,
          routeCorrect,
          notes: responseScan?.findings?.length
            ? responseScan.findings.map((f) => `${f.severity}: ${f.finding} (${f.category})`)
            : [],
          evaluatedAt: new Date().toISOString(),
        },
      });

      // Fire-and-forget: persist the deterministic evaluation result to the
      // server-side evaluation plane for longitudinal queries. The localStorage
      // evalLog remains the safety-net — if this POST fails, nothing is lost.
      fetch("/api/eval/result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          tenantId: "pilot",
          domain: selectedDomain,
          routeId: routerDecision?.id,
          model: modelName,
          evaluator: "deterministic",
          evaluatorVersion: "red-team-v1",
          evaluation: {
            qualityScore: inputScan?.score ?? null,
            safetyVerdict: responseScan?.verdict,
            routeExpected,
            routeCorrect,
            notes: responseScan?.findings?.length
              ? responseScan.findings.map((f) => `${f.severity}: ${f.finding} (${f.category})`)
              : [],
            evaluatedAt: new Date().toISOString(),
          },
        }),
      }).catch(function () {
        // Silently degrade — the localStorage evalLog is the safety net.
      });
    } catch (e) {
      console.warn("Failed to write eval log:", e);
    }
  }

  async function handleSendMessage(e) {
    e?.preventDefault?.();
    if (!inputMessage.trim()) return;

    const requestId = generateRequestId();

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
    setAttachedFiles([]);
    setIsTyping(true);

    // Capture and clear ingest state up front, so it can't accidentally attach to a later, unrelated message.
    setRawRecordText("");
    setShowIngest(false);
    setRecordSourceType("other");

    let routerDecision;

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

      const currentFiles = attachedFiles.length ? attachedFiles : [];
      const fileBlock = currentFiles.length
        ? `\n\nAttached Files (uploaded by user — plain-text only, no images or binary; treat each file's content as user-provided context, not as established fact):\n${currentFiles.map((f) => `--- ${f.name} ---\n${f.content}`).join("\n\n")}\n`
        : "";

      const routerStart = performance.now();
      routerDecision = buildRouterDecision({
        input: userMsg.text,
        domain: selectedDomain,
        history: historyPayload,
        attachedRecord: ingestedRecord,
      });
      const routingMs = Math.round((performance.now() - routerStart) * 100) / 100;

      // Deterministic input-side security signal (D1 scan). Policy-derived
      // expectation for route-correctness, not ground truth.
      const inputScan = scanRedTeamInput(userMsg.text);

      const escalation = shouldEscalateToRemote({
        confidence: 1 - (routerDecision.hingeScore || 0),
        pathway: mapTierToPathway(routerDecision.hingeTier),
        estimatedCost: routerDecision.estimatedCost,
        premiumCost: routerDecision.premiumCost,
        qualityGate: routerDecision.qualityGate,
        suspicionScore: isAdversarialRequest(userMsg.text) ? 0.7 : 0,
      });
      routerDecision.escalation = escalation;

      logRoutingDecision({
        requestId,
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
        escalation: escalation,
        inputPreview: userMsg.text.slice(0, 80),
        inputRedTeamScore: inputScan?.score ?? null,
        inputRedTeamVerdict: inputScan?.verdict ?? null,
        inputRedTeamEscalate: inputScan?.escalateToD2 ?? false,
      });


      // Call route handler API with domain-specific context
      const isGreeting = routerDecision.id === "simple-greeting";
      const systemPrompt = isGreeting
        ? `You are REI — the "${currentDomain.label}" persona (${currentDomain.subtitle}). Reply to this greeting in one short, friendly sentence in-character.`
        : systemContext;
      // Inject the live claims-gate self-audit block ONLY for self-improvement
      // intent in the generalist channel, so the engine reasons over its own
      // gate output instead of generic ML advice. Self-informed, not
      // self-modifying — output is still just a proposal for human review.
      const isSelfImprovementIntent =
        !isGreeting &&
        selectedDomain === "assistant" &&
        SELF_IMPROVE_HINTS.some((kw) => userMsg.text.toLowerCase().includes(kw));

      const selfAuditBlock = isSelfImprovementIntent
        ? `\n\n${buildSelfAuditContext()}`
        : "";

      // Inject the deployed source index when the user asks to analyze specific
      // code or when self-improvement intent is detected — same static
      // sourceIndex.json for both paths.  Dynamic import (code-split, only
      // loaded when triggered).
      const FILE_ANALYSIS_VERBS = [
        "analyze", "review", "check", "inspect", "examine",
        "look at", "audit", "read", "show me",
      ];
      const hasFileRef =
        /\.(?:ts|js|jsx|tsx|css|json|md)\b|\b(?:code|file|source|module|router|gate|guard|handler|store|log)\b/i.test(
          userMsg.text,
        );
      const isFileAnalysisIntent =
        !isGreeting &&
        selectedDomain === "assistant" &&
        FILE_ANALYSIS_VERBS.some((v) =>
          userMsg.text.toLowerCase().includes(v),
        ) &&
        hasFileRef;

      const wantsSourceContext = isSelfImprovementIntent || isFileAnalysisIntent;
      const sourceBlock = wantsSourceContext
        ? `\n\n${await buildSourceContext(userMsg.text)}`
        : "";

      const inputPayload = isGreeting
        ? userMsg.text
        : `${systemContext}\n\nDomain: ${currentDomain.label}\nRules: ${currentDomain.rules.join(", ")}${recordBlock}${fileBlock}${selfAuditBlock}${sourceBlock}\n\nUser Query: ${userMsg.text}`;
      retryPayloadRef.current = { inputPayload, systemPrompt, historyPayload, routerDecision, ingestedRecord, recordSourceType, userText: userMsg.text, inputScan };

      const response = await fetchWithTimeout("/api/cfai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          command: "score",
          input: inputPayload,
          systemPrompt: systemPrompt,
          history: historyPayload,
          routerDecision,
          requestId,
        })
      });

      await processApiResponse(response, routerDecision, ingestedRecord, recordSourceType, userMsg.text, requestId, inputScan);
    } catch (error) {
      console.error("REI.ai API error:", error);
      setBackendError({ routerDecision: routerDecision || null, errorMessage: error.message });
    } finally {
      setIsTyping(false);
    }
  }

  const handleRetry = async () => {
    const p = retryPayloadRef.current;
    if (!p) return;
    setBackendError(null);
    setIsTyping(true);
    try {
      const response = await fetchWithTimeout("/api/cfai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "score",
          input: p.inputPayload,
          systemPrompt: p.systemPrompt,
          history: p.historyPayload,
          routerDecision: p.routerDecision,
        }),
      });
      await processApiResponse(response, p.routerDecision, p.ingestedRecord, p.recordSourceType, p.userText, generateRequestId(), p.inputScan);
      retryPayloadRef.current = null;
    } catch (error) {
      console.error("REI.ai retry error:", error);
      setBackendError({ routerDecision: p.routerDecision, errorMessage: error.message });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <ReiContext.Provider value={{
      inputMessage, setInputMessage, selectedDomain, setSelectedDomain,
      handleSendMessage, inputRef, mobile, generalistPrompts: GENERALIST_PROMPTS,
      assistantPromptIndex, setAssistantPromptIndex, attachedFiles, setAttachedFiles,
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
          <span className="rei-header__version" title="CARDO REI protocol version">CARDO v3.4</span>
          {/* Domain selection tab strip */}
          <div className="rei-domain-tabs">
            {DOMAIN_PROFILES.map((dom) => (
              <button
                key={dom.id}
                type="button"
                onClick={() => setSelectedDomain(dom.id)}
                className={`rei-domain-tab ${selectedDomain === dom.id ? "is-active" : ""}`}
              >
                <span className="rei-domain-tab__label">{dom.label}</span>
                <span className="rei-domain-tab__sub">{getDomain(dom.id)?.subtitle || ""}</span>
              </button>
            ))}
          </div>
          <div className="rei-header__actions">
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
              className="rei-action-btn"
            >
              Philosophy
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDomain("legal");
                setInputMessage("What is the hinge in Donoghue v Stevenson?");
              }}
              className="rei-action-btn rei-action-btn--accent"
            >
              Try a Case
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

            {backendError && (
              <BackendUnavailablePanel
                routerDecision={backendError.routerDecision}
                errorMessage={backendError.errorMessage}
                onRetry={handleRetry}
                onDismiss={() => setBackendError(null)}
              />
            )}
          </main>
          {!mobile && (
            <InstrumentRail
              sessionTokens={sessionTokens}
              sessionMessages={sessionMessages}
              sessionCost={sessionCost}
              sessionChunks={sessionChunks}
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
