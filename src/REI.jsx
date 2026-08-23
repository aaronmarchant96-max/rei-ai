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
import { PRODUCT_STORY, getDomainPublicCopy } from "./data/productCopy.js";
import { parseAssistantStyleReply, extractDeliverableAndScaffolding } from "./lib/replyParser.js";
import { detectStrategicSituation } from "./lib/strategic/detectStrategicSituation";
import { extractStrategicEnvelope } from "./lib/strategic/strategicEnvelope";
import { STRATEGIC_OUTPUT_DIRECTIVE } from "./lib/strategic/strategicPrompt.js";
import { projectStoredSessionActivity } from "./lib/activityLedger";
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

function generateRequestId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch (_) {}
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

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

export function buildDomainSystemMessage(domainId, currentDomain) {
  const domainLabel = currentDomain?.label || "REI.ai";
  const domainDescription = getDomainPublicCopy(domainId).description;
  return `You're in REI.ai — ${domainLabel}. ${domainDescription} ${PRODUCT_STORY.workspaceHint}`;
}

function readStoredMessages(selectedDomain) {
  const currentDomain = DOMAIN_PROFILES.find((domain) => domain.id === selectedDomain) || DOMAIN_PROFILES[0];
  const welcomeText = buildDomainSystemMessage(selectedDomain, currentDomain);
  return readChatHistoryHCM(selectedDomain, welcomeText);
}

const API_TIMEOUT_MS = 120000;

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

export default function REI({ initialPrompt } = {}) {
  const mobile = useMobile();
  const keyboardVisible = useKeyboardVisible();
  const inputRef = useRef(null);
  const retryPayloadRef = useRef(null);
  const inspectTriggerRef = useRef(null);

  useEffect(() => {
    if (keyboardVisible && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end"
        });
      }, 100);
    }
  }, [keyboardVisible]);

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
        strategicSituation: exportData.strategicSituation,
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
      try {
        if (typeof window !== "undefined" && window.open) {
          const printWindow = window.open("", "_blank", "width=800,height=900");
          if (printWindow) {
            printWindow.document.write(buildDecisionReport({
              sections: exportData.sections,
              routerDecision: exportData.routerDecision,
              domainLabel: exportData.domainLabel || getDomain(selectedDomain)?.label || "REI.ai",
              createdAt: exportData.createdAt || exportData.timestamp || new Date(),
              strategicSituation: exportData.strategicSituation,
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
    return "cheap";
  }

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

  // Selected domain with fallback to assistant for invalid values
  const [selectedDomain, setSelectedDomain] = useState(() => {
    try {
      const saved = localStorage.getItem("rei_selected_domain");
      if (saved && DOMAIN_PROFILES.some((d) => d.id === saved)) {
        return saved;
      }
    } catch (e) {}
    return "assistant";
  });

  useEffect(() => {
    try {
      localStorage.setItem("rei_selected_domain", selectedDomain);
    } catch (e) {}
  }, [selectedDomain]);

  // Decomposed Telemetry State Machine (Persisted mode vs Transient inspect)
  const [telemetryMode, setTelemetryMode] = useState(() => {
    try {
      const saved = localStorage.getItem("rei-telemetry-mode");
      return saved === "pinned" ? "pinned" : "collapsed";
    } catch (e) {
      return "collapsed";
    }
  });

  const handleToggleTelemetryMode = (mode) => {
    setTelemetryMode(mode);
    try {
      localStorage.setItem("rei-telemetry-mode", mode);
    } catch (e) {}
  };

  const [isInspectOpen, setIsInspectOpen] = useState(false);
  const [focusedDecision, setFocusedDecision] = useState(null);

  const handleInspectDecision = (evidence, originEvent) => {
    if (originEvent && originEvent.currentTarget) {
      inspectTriggerRef.current = originEvent.currentTarget;
    }
    const decision = evidence?.routerDecision || {};
    const cost = evidence?.economics?.observedCostUsd != null
      ? evidence.economics.observedCostUsd
      : (decision?.estimatedCost != null && decision.estimatedCost > 0 ? decision.estimatedCost : null);
    setFocusedDecision({
      ...decision,
      cost,
      isObservedCost: evidence?.economics?.observedProvenance === "observed",
    });
    setIsInspectOpen(true);
  };

  // Accessible Kebab Menu State
  const [isKebabOpen, setIsKebabOpen] = useState(false);
  const kebabBtnRef = useRef(null);
  const kebabMenuRef = useRef(null);

  useEffect(() => {
    if (!isKebabOpen) return;
    const handleKebabKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsKebabOpen(false);
        if (kebabBtnRef.current) kebabBtnRef.current.focus();
      }
    };
    const handleOutsideClick = (e) => {
      if (
        kebabMenuRef.current && !kebabMenuRef.current.contains(e.target) &&
        kebabBtnRef.current && !kebabBtnRef.current.contains(e.target)
      ) {
        setIsKebabOpen(false);
      }
    };
    window.addEventListener("keydown", handleKebabKeyDown);
    window.addEventListener("mousedown", handleOutsideClick);
    return () => {
      window.removeEventListener("keydown", handleKebabKeyDown);
      window.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isKebabOpen]);

  const [rawRecordText, setRawRecordText] = useState("");
  const [showIngest, setShowIngest] = useState(false);
  const [recordSourceType, setRecordSourceType] = useState("other");
  const [isPhilosophyOpen, setIsPhilosophyOpen] = useState(false);

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

  const activityProjections = useMemo(() => {
    return projectStoredSessionActivity();
  }, [messages]);
  const activityCount = useMemo(() => activityProjections.reduce((count, projection) => count + projection.events.length, 0), [activityProjections]);

  const { sessionCost, modelBreakdown, savingsVsPremium, sessionTokens, sessionMessages, sessionChunks, escalationCount, trackMessage, lifetimeCost, lifetimeSavings, resetSession } = useSessionTracker();

  useEffect(() => {
    if (initialPrompt) {
      setInputMessage(initialPrompt);
      setSelectedDomain("legal");
    }
  }, [initialPrompt]);

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

    setRawRecordText("");
    setShowIngest(false);
    setRecordSourceType("other");
  }, [selectedDomain]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages.length]);

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

  const processApiResponse = async (response, routerDecision, ingestedRecord, recordSourceType, promptText, requestId, inputScan) => {
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "The AI routing gateway returned an error. Please try again.");
    }

    const rawAiText = data.result || data.reply || "";
    const strategicEnvelope = extractStrategicEnvelope(rawAiText);
    const { deliverable: aiText, scaffolding: extractedBlueprint } = extractDeliverableAndScaffolding(strategicEnvelope.visibleText);
    let usage = data.usage;
    const modelUsed = data.model || routerDecision?.model || "unknown";
    const routeId = routerDecision?.id || "generalist";

    const costs = getModelCosts(modelUsed);
    const actualCost = usage && typeof usage.prompt_tokens === "number" && typeof usage.completion_tokens === "number"
      ? computeActualCost(usage.prompt_tokens, usage.completion_tokens, costs.input, costs.output)
      : (routerDecision?.estimatedCost || 0);

    const isGreeting = routeId === "simple-greeting";
    const finalRouterDecision = {
      ...(data.routerDecision || routerDecision),
      model: modelUsed,
      estimatedCost: data.routerDecision?.estimatedCost != null ? data.routerDecision.estimatedCost : routerDecision?.estimatedCost,
      blueprint: extractedBlueprint || data.routerDecision?.blueprint || routerDecision?.blueprint || null,
    };

    if (!isGreeting) {
      const sections = parseAssistantStyleReply(aiText);
      logDecision({
        schemaVersion: 1,
        id: `decision:${requestId}`,
        requestId,
        sections,
        routerDecision: {
          label: finalRouterDecision?.label || finalRouterDecision?.id,
          model: modelUsed,
          matchedTerms: finalRouterDecision?.routingSignals?.matchedTerms || finalRouterDecision?.matchedTerms || [],
          hingeScore: finalRouterDecision?.hingeScore || 0,
        },
        domainLabel: currentDomain.label,
        inputPreview: promptText.slice(0, 80),
        createdAt: data.timestamp || new Date().toISOString(),
        actualTokens: (usage?.prompt_tokens || 0) + (usage?.completion_tokens || 0),
        actualCost,
        strategicSituation: strategicEnvelope.strategicSituation || undefined,
      });
      trackMessage({
        cost: actualCost,
        premiumCost: routerDecision?.premiumCost || 0,
        tokens: (usage?.prompt_tokens || 0) + (usage?.completion_tokens || 0),
        model: modelUsed,
        chunks: data.chunks || 1,
        escalation: routerDecision?.escalation || false,
      });
    }

    updateLatestLogEntry({
      actualTokens: (usage?.prompt_tokens || 0) + (usage?.completion_tokens || 0),
      actualCost: actualCost,
      status: "success",
      resolvedModel: modelUsed,
      chunks: data.chunks || 1,
    }, requestId);

    try {
      const responseText = aiText;
      const responseScan = responseText ? scanRedTeamInput(responseText) : null;
      const wasAdversarialRoute = routerDecision?.id === "adversarial-validation";
      const routeExpected = Boolean(inputScan?.escalateToD2);
      const routeCorrect = routeExpected === wasAdversarialRoute;
      logEval({
        requestId,
        domain: selectedDomain,
        routeId: routerDecision?.id,
        model: modelUsed,
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
    } catch (e) {
      console.warn("Failed to log evaluation:", e);
    }

    const aiMsg = {
      sender: "rei",
      text: aiText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      domainLabel: currentDomain.label,
      rawJson: {
        routerDecision: finalRouterDecision,
        usage,
        requestId,
        model: modelUsed,
        timestamp: new Date().toISOString(),
        blueprint: extractedBlueprint,
        redTeamResult: data.redTeamResult || null,
        research: data.research || null,
        rawTrace: data.rawTrace || null,
        strategicMetadataStatus: strategicEnvelope.status,
        strategicSituation: strategicEnvelope.strategicSituation,
      },
    };

    setMessages((prev) => [...prev, aiMsg]);
  };

  const handleSendMessage = async (customPrompt) => {
    const promptText = typeof customPrompt === "string" ? customPrompt : inputMessage;
    if (!promptText.trim() && attachedFiles.length === 0) return;

    setBackendError(null);
    const requestId = generateRequestId();
    const ingestedRecord = rawRecordText.trim();

    if (ingestedRecord.length > MAX_RECORD_CHARS) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "rei",
          text: `That pasted record is ${ingestedRecord.length.toLocaleString()} characters — over the ${MAX_RECORD_CHARS.toLocaleString()} limit. Trim it to the relevant section and try again.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isSystemNotice: true,
        },
      ]);
      return;
    }

    const userMsg = {
      sender: "user",
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      attachedRecord: ingestedRecord
        ? { charCount: ingestedRecord.length, sourceType: recordSourceType }
        : null,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    const currentFiles = [...attachedFiles];
    setAttachedFiles([]);
    setIsTyping(true);

    setRawRecordText("");
    setShowIngest(false);
    setRecordSourceType("other");

    let routerDecision;

    try {
      let systemContext = getDomainPrompt(selectedDomain);
      const historyPayload = messages
        .filter((msg, index) => !(index === 0 && msg.sender === "rei"))
        .slice(-10)
        .map(msg => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text
        }));

      const recordBlock = ingestedRecord
        ? `\n\nIngested Record (${recordSourceType}):\n${ingestedRecord}`
        : "";

      const fileBlock = currentFiles.length
        ? `\n\nAttached Files:\n${currentFiles.map((f) => `--- ${f.name} ---\n${f.content}`).join("\n\n")}\n`
        : "";

      const routerStart = performance.now();
      routerDecision = buildRouterDecision({
        input: userMsg.text,
        domain: selectedDomain,
        history: historyPayload,
        attachedRecord: ingestedRecord,
      });
      const routingMs = Math.round((performance.now() - routerStart) * 100) / 100;

      const inputScan = scanRedTeamInput(userMsg.text);
      const strategicDetection = detectStrategicSituation(userMsg.text);

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

      const isGreeting = routerDecision.id === "simple-greeting";
      const systemPrompt = isGreeting
        ? `You are REI — the "${currentDomain.label}" persona (${currentDomain.subtitle}). Reply to this greeting in one short, friendly sentence in-character.`
        : systemContext;

      const isSelfImprovementIntent =
        !isGreeting &&
        selectedDomain === "assistant" &&
        SELF_IMPROVE_HINTS.some((kw) => userMsg.text.toLowerCase().includes(kw));

      const selfAuditBlock = isSelfImprovementIntent
        ? `\n\n${buildSelfAuditContext()}`
        : "";

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
        : `${recordBlock}${fileBlock}${selfAuditBlock}${sourceBlock}\n\nUser Query: ${userMsg.text}`.trim();
      const effectiveSystemPrompt = systemPrompt + fileBlock + (strategicDetection.detected ? STRATEGIC_OUTPUT_DIRECTIVE : "");

      retryPayloadRef.current = {
        inputPayload,
        prompt: userMsg.text,
        systemPrompt: effectiveSystemPrompt,
        history: historyPayload,
        files: currentFiles,
        routerDecision,
        ingestedRecord,
        recordSourceType,
        userMsg,
        requestId,
        inputScan,
      };

      const response = await fetchWithTimeout("/api/cfai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "score",
          input: inputPayload,
          prompt: userMsg.text,
          systemPrompt: effectiveSystemPrompt,
          history: historyPayload,
          routerDecision,
          requestId,
        }),
      });

      if (!response.ok) {
        throw new Error(`The gateway returned HTTP ${response.status}. Please retry.`);
      }

      await processApiResponse(response, routerDecision, ingestedRecord, recordSourceType, userMsg.text, requestId, inputScan);
    } catch (error) {
      console.error("REI.ai API error:", error);
      setBackendError({ routerDecision: routerDecision || null, errorMessage: error.message, userText: userMsg.text });
    } finally {
      setIsTyping(false);
    }
  };

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
          prompt: p.prompt,
          systemPrompt: p.systemPrompt,
          history: p.history,
          routerDecision: p.routerDecision,
          requestId: p.requestId,
        }),
      });

      if (!response.ok) {
        throw new Error(`The gateway returned HTTP ${response.status}. Please retry.`);
      }

      await processApiResponse(response, p.routerDecision, p.ingestedRecord, p.recordSourceType, p.userMsg.text, p.requestId, p.inputScan);
    } catch (error) {
      console.error("REI.ai retry error:", error);
      setBackendError({ routerDecision: p.routerDecision, errorMessage: error.message, userText: p.userMsg.text });
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
        {/* Top Header with 5 Primary Domain Chips & Secondary Kebab Menu */}
        <header className="safe-top rei-header">
          <div className="rei-header__protocol">
            {!mobile && <span className="rei-header__version" title="CARDO REI protocol version">CARDO v3.4</span>}
          </div>

          {/* Primary Domain Tab Strip */}
          <nav className="rei-domain-tabs" aria-label="Cognitive domain archetypes">
            {DOMAIN_PROFILES.map((dom) => (
              <button
                key={dom.id}
                type="button"
                onClick={() => setSelectedDomain(dom.id)}
                className={`rei-domain-tab ${selectedDomain === dom.id ? "is-active" : ""}`}
                title={getDomain(dom.id)?.subtitle || dom.label}
                aria-current={selectedDomain === dom.id ? "page" : undefined}
              >
                <span className="rei-domain-tab__label">{dom.label}</span>
              </button>
            ))}
          </nav>

          {/* Right Controls: Compact Activity Pill & Accessible Kebab Menu */}
          <div className="rei-header__actions">
            <button
              type="button"
              onClick={(e) => {
                inspectTriggerRef.current = e.currentTarget;
                setFocusedDecision(null);
                setIsInspectOpen(true);
              }}
              className="rei-activity-pill"
              aria-label={`Activity: ${activityCount} completed records. Click to inspect telemetry.`}
              title="View session telemetry and decision reports"
            >
              <span className="rei-activity-pill__dot">⚡</span>
              <span>Activity ({activityCount})</span>
            </button>

            <div style={{ position: "relative" }}>
              <button
                ref={kebabBtnRef}
                type="button"
                onClick={() => setIsKebabOpen(!isKebabOpen)}
                className="rei-action-btn rei-action-btn--kebab"
                aria-label="Workspace utilities and options"
                aria-haspopup="true"
                aria-expanded={isKebabOpen}
              >
                •••
              </button>

              {isKebabOpen && (
                <div
                  ref={kebabMenuRef}
                  className="rei-kebab-popover"
                  role="menu"
                  aria-label="Workspace options"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setThemeMode((m) => (m === "light" ? "dark" : "light"));
                      setIsKebabOpen(false);
                    }}
                    className="rei-kebab-item"
                  >
                    {themeMode === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      handleClearHistory();
                      setIsKebabOpen(false);
                    }}
                    className="rei-kebab-item rei-kebab-item--danger"
                  >
                    🗑️ Clear Chat
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsPhilosophyOpen(true);
                      setIsKebabOpen(false);
                    }}
                    className="rei-kebab-item"
                  >
                    📖 Philosophy
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setSelectedDomain("legal");
                      setInputMessage("What is the hinge in Donoghue v Stevenson?");
                      setIsKebabOpen(false);
                    }}
                    className="rei-kebab-item"
                  >
                    ⚖️ Try a Case
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Unified workspace area: conversation + attached composer on left, instrument rail on right */}
        <div className="rei-workspace">
          <div className="rei-workspace__conversation">
            <main className="flex-1 overflow-y-auto px-4 py-4 rei-main-content">
              {(messages.length > 1 || isTyping || selectedDomain !== "assistant") && (
                <DomainBanner currentDomain={currentDomain} selectedDomain={selectedDomain} reasoningLoopSteps={REASONING_LOOP_STEPS} />
              )}

              {(!mobile || messages.length > 1 || isTyping) && (
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
              )}

              {messages.length <= 1 && !isTyping && (
                <WelcomePanel
                  activeDomain={selectedDomain}
                  onResume={(domainId) => setSelectedDomain(domainId)}
                  onStart={(prompt) => handleSendMessage(prompt)}
                  onEdit={(prompt) => {
                    setInputMessage(prompt);
                    if (inputRef.current) inputRef.current.focus();
                  }}
                />
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

              <ChatHistory
                messages={messages}
                selectedDomain={selectedDomain}
                isTyping={isTyping}
                chatEndRef={chatEndRef}
                mobile={mobile}
                onCopy={copyText}
                onExport={handleExport}
                onInspect={handleInspectDecision}
                domainLabel={currentDomain?.label || "REI.ai"}
              />

              {backendError && (
                <BackendUnavailablePanel
                  routerDecision={backendError.routerDecision}
                  errorMessage={backendError.errorMessage}
                  onRetry={handleRetry}
                  onDismiss={() => {
                    if (backendError.userText) setInputMessage(backendError.userText);
                    setBackendError(null);
                    if (inputRef.current) inputRef.current.focus();
                  }}
                />
              )}
            </main>

            <ChatInput />
          </div>

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
            activityCount={activityCount}
            activityProjections={activityProjections}
            telemetryMode={telemetryMode}
            isInspectOpen={isInspectOpen}
            focusedDecision={focusedDecision}
            onToggleMode={handleToggleTelemetryMode}
            onCloseInspect={() => setIsInspectOpen(false)}
            originRef={inspectTriggerRef}
          />
        </div>
      
        <PhilosophyModal isOpen={isPhilosophyOpen} onClose={() => setIsPhilosophyOpen(false)} />
      </div>
    </ReiContext.Provider>
  );
}
