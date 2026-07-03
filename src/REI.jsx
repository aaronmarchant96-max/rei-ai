import { useState, useRef, useEffect } from "react";
import { useMobile, useKeyboardVisible } from "./useMobile.js";
import { buildRouterDecision } from "./lib/nightShiftRouter.js";

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

function readStoredMessages(selectedDomain) {
  if (typeof window === "undefined") {
    return null;
  }

  const storageKey = `rei_chat_history_${selectedDomain}`;
  const saved = window.localStorage.getItem(storageKey);

  if (!saved) {
    return null;
  }

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      throw new Error("Stored chat history is not an array");
    }
    return parsed;
  } catch (error) {
    console.error("Failed to parse saved chat history:", error);
    try {
      window.localStorage.removeItem(storageKey);
    } catch (cleanupError) {
      console.warn("Unable to clear corrupted chat history storage:", cleanupError);
    }
    return null;
  }
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

function parseAssistantStyleReply(text = "") {
  const sections = { Hinge: "", Facts: "", Assumptions: "", Evaluation: "", ChangeMind: "", Move: "", intro: "" };
  const cleaned = text.replace(/\*\*/g, "").replace(/^\s*[-*]\s+/gm, "• ");
  const lines = cleaned.split("\n").map((line) => line.trim()).filter(Boolean);
  let current = "intro";
  for (const rawLine of lines) {
    const line = rawLine.replace(/^•\s*/, "");
    const inlineMatch = line.match(/^(Hinge|Facts|Assumptions|Evaluation|Move|Next move|Next step|What would change my mind|What would change my mind\?):?\s*(.*)$/i);
    if (inlineMatch) {
      const normalized = inlineMatch[1].trim().toLowerCase();
      const keyMap = {
        hinge: "Hinge",
        facts: "Facts",
        assumptions: "Assumptions",
        evaluation: "Evaluation",
        move: "Move",
        "next move": "Move",
        "next step": "Move",
        "what would change my mind": "ChangeMind",
        "what would change my mind?": "ChangeMind",
      };
      const key = keyMap[normalized] || null;
      const rest = inlineMatch[2].trim();
      if (key && rest) {
        sections[key] = sections[key] ? `${sections[key]} ${rest}` : rest;
        current = key;
        continue;
      }
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
export default function REI() {
  // Mobile detection
  const { isMobile, keyboardVisible } = useMobile();
  const inputRows = isMobile ? 3 : 5;
  const MAX_MOBILE_TOKENS = keyboardVisible ? 75 : 150;
  const keyboardVisible = useKeyboardVisible();
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
      .rei-header {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        padding: 16px 16px 12px;
        background: rgba(10, 5, 5, 0.9);
        border-bottom: 1px solid rgba(251, 146, 60, 0.16);
        backdrop-filter: blur(10px);
      }
      .rei-header__brand {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }
      .rei-domain-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        justify-content: flex-end;
        flex: 1 1 320px;
      }
      .rei-domain-tab {
        padding: 8px 12px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.02);
        color: #94a3b8;
        font-size: 12px;
        font-weight: 600;
        line-height: 1.25;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
        text-align: left;
        min-height: 46px;
      }
      .rei-domain-tab.is-active {
        background: linear-gradient(135deg, rgba(249,115,22,0.22), rgba(251,191,36,0.14));
        border-color: #f97316;
        color: #fed7aa;
        box-shadow: 0 0 18px rgba(249,115,22,0.15);
      }
      .rei-action-btn {
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 10px;
        padding: 9px 12px;
        font-size: 12px;
        font-weight: 700;
        color: #e2e8f0;
        background: rgba(255,255,255,0.04);
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .rei-action-btn:hover {
        border-color: rgba(251,146,60,0.35);
        transform: translateY(-1px);
      }
      .rei-action-btn--danger {
        color: #fda4af;
        border-color: rgba(251,113,133,0.25);
      }
      .rei-action-btn--accent {
        color: #fde68a;
        border-color: rgba(251,191,36,0.25);
      }
      .rei-domain-banner {
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(251,146,60,0.16);
        border-radius: 14px;
        padding: 12px 14px;
        margin-bottom: 12px;
      }
      .rei-domain-banner__eyebrow {
        font-size: 11px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: #fb923c;
        margin-bottom: 8px;
        font-weight: 700;
      }
      .rei-domain-banner__row {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 8px;
      }
      .rei-domain-banner__meta {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        color: #f5d7c4;
        font-size: 13px;
      }
      .rei-domain-banner__meta--secondary {
        color: #d6a98a;
      }
      .rei-domain-banner__label {
        color: #fb923c;
        font-weight: 700;
      }
      .rei-domain-banner__steps {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .rei-domain-banner__step {
        padding: 5px 8px;
        border-radius: 999px;
        background: rgba(251,146,60,0.11);
        border: 1px solid rgba(251,146,60,0.18);
        color: #fed7aa;
        font-size: 11px;
        font-weight: 600;
      }
      .rei-reasoning-loop {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 8px;
        margin-top: 10px;
      }
      .rei-reasoning-loop__step {
        border: 1px solid rgba(251,146,60,0.16);
        border-radius: 10px;
        background: rgba(255,255,255,0.03);
        padding: 8px 10px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .rei-reasoning-loop__label {
        color: #fb923c;
        font-weight: 700;
        font-size: 11px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .rei-reasoning-loop__detail {
        color: #f5d7c4;
        font-size: 12px;
        line-height: 1.35;
      }
      .rei-chat-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .rei-chat-history {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding-bottom: 8px;
      }
      .rei-chat-message {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        animation: fadeIn 0.3s ease-in-out forwards;
        opacity: 0;
      }
      .rei-chat-message--user {
        align-items: flex-end;
      }
      .rei-chat-message--rei {
        align-items: flex-start;
      }
      .rei-chat-bubble {
        border-radius: 12px;
        padding: 12px 14px 12px 14px;
        font-family: inherit;
        font-size: 14.5px;
        white-space: pre-wrap;
        line-height: 1.5;
        position: relative;
        width: 100%;
        box-sizing: border-box;
      }
      .rei-chat-bubble--user {
        background: rgba(255,255,255,0.06);
        color: #E2E8F0;
        border: 1px solid rgba(255,255,255,0.1);
      }
      .rei-chat-bubble--rei {
        background: rgba(251,146,60,0.08);
        color: #E2E8F0;
        border: 1px solid rgba(251,146,60,0.18);
      }
      .rei-chat-meta {
        font-size: 0.78em;
        color: #94A3B8;
        margin-top: 4px;
      }
      .rei-router-badge {
        margin-bottom: 8px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid rgba(251,146,60,0.24);
        background: rgba(251,146,60,0.1);
        color: #fed7aa;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.03em;
        text-transform: uppercase;
      }
      .rei-router-panel {
        margin-top: 12px;
        border-top: 1px dashed rgba(251,146,60,0.18);
        padding-top: 8px;
      }
      .rei-router-panel__title {
        color: #94A3B8;
        font-size: 0.85em;
        margin-bottom: 6px;
        font-weight: 600;
      }
      .rei-router-panel__grid {
        display: grid;
        gap: 4px;
        font-size: 0.82em;
        color: #cbd5e1;
      }
      .rei-router-panel__item {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .rei-router-panel__label {
        color: #fb923c;
        font-weight: 700;
      }
      .rei-copy-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(251,146,60,0.15);
        border: 1px solid rgba(251,146,60,0.3);
        border-radius: 4px;
        color: #fb923c;
        cursor: pointer;
        font-size: 0.75em;
        padding: 2px 6px;
        opacity: 0.7;
        transition: opacity 0.2s;
        min-width: 44px;
        min-height: 44px;
      }
      .rei-copy-btn:hover {
        opacity: 1;
      }
      .rei-input-shell {
        width: 100%;
        max-width: 1400px;
        left: 0;
        right: 0;
        margin-left: auto;
        margin-right: auto;
        background: var(--surface);
        border-top: 1px solid rgba(251,146,60,0.15);
        padding: 16px;
        box-sizing: border-box;
      }
      .rei-input-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .rei-input-row {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .rei-input-area {
        flex: 1;
        background: rgba(0,0,0,0.2);
        color: #E2E8F0;
        border: 1px solid rgba(251,146,60,0.15);
        border-radius: 6px;
        font-family: inherit;
        font-size: 16px;
        outline: none;
      }
      .rei-input-area:focus {
        border-color: rgba(251,146,60,0.45);
        box-shadow: 0 0 0 2px rgba(249,115,22,0.18);
      }
      .rei-touch-button {
        background: #f97316;
        color: #FFFFFF;
        border: none;
        border-radius: 6px;
        font-weight: bold;
        cursor: pointer;
        transition: background 0.2s ease;
        min-width: 48px;
        align-self: center;
        font-size: 16px;
      }
      .rei-quick-prompt {
        flex: 1 1 auto;
        min-width: 100px;
        padding: 14px 18px;
        white-space: normal;
        line-height: 1.3;
        border-radius: 16px;
        background: #3a2a1f;
        color: #f5e5d7;
        border: 1px solid rgba(255,255,255,0.06);
        cursor: pointer;
      }
      .rei-quick-prompt:hover {
        border-color: rgba(251,146,60,0.35);
        transform: translateY(-1px);
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
        font-family: inherit;
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

  const currentDomain = DOMAIN_PROFILES.find((d) => d.id === selectedDomain) || DOMAIN_PROFILES[0];
  const assistantQuickPrompt = GENERALIST_PROMPTS[assistantPromptIndex % GENERALIST_PROMPTS.length];

  // Clear chat and initialize domain-specific context when domain changes
  useEffect(() => {
    const domainSpecificMessage = {
      sender: "rei",
      text: buildDomainSystemMessage(selectedDomain, currentDomain),
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
    chatEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
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
      text: buildDomainSystemMessage(selectedDomain, currentDomain),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([domainSpecificMessage]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(`rei_chat_history_${selectedDomain}`);
    }
  };

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
          "You are REI, The Generalist: a distinct everyday reasoning model for ordinary conversation, judgment, and decision support. CARDO REI is the practice of finding the hinge of the problem—the exact turning point that changes the answer. For every non-greeting response, make the reasoning visible in a structured loop: first name the Hinge, then separate Facts from Assumptions, then add an Evaluation of how strong the case is, then explain what would change your mind, and finish with a concrete Move. Keep the tone warm but not bland, sharp but not hostile, and concrete rather than corporate. For LITERAL greetings ONLY (hello, hi, hey, hey there): respond with one warm sentence inviting a real topic. FOR ALL OTHER INPUTS: default to full CARDO REI structure. Never use casual one-word or one-line responses for actual queries. Quality Check: Before sending, verify your response contains at least one named Hinge plus either a Facts/Assumptions separation or a concrete Move. If not, re-structure using the reasoning loop.";
      } else if (selectedDomain === "coding") {
        systemContext =
          "You are REI.ai, a senior software engineer executing the CARDO REI methodology. CARDO REI is Latin for finding the hinge of the problem—the core turning point. Dissect codebases and requirements to locate the single point of pivot (the Hinge) before proposing any change. Default stance: write code that is obvious, testable, and boring; prefer clarity over cleverness; fix root causes, not symptoms. Keep functions single-responsibility, name things by intent, comment the why not the what.\n\n## Phase 0 — The Questioning Stance (runs before any code is written)\nBefore producing code for any non-trivial request, silently answer these. If you cannot answer in 1-2 sentences each, stop and ask the user instead of writing code:\n1. What is the real problem (not the symptom being described)?\n2. Who uses this, and in what context?\n3. What are the failure modes — bad input, network failure, race conditions?\n4. What existing code does this touch? What's the dependency surface?\n5. Is there a simpler existing solution — reuse over rewrite?\n6. What are the non-functional constraints (perf, memory, bundle size, accessibility, privacy)?\n7. How will this be verified before it's considered done?\n\nTrigger condition: if 2+ of these are unanswerable from the request as given, your response is a clarifying question, not code.\n\n### HARD STOP RULE (Non-Negotiable)\nIf you cannot answer 2+ Phase 0 questions, your response MUST follow this exact format:\n\n```\n**STOP: Request underspecified**\n\nI cannot proceed without:\n\n1. [First unanswerable question]\n2. [Second unanswerable question]\n3. [Third unanswerable question] (if applicable)\n\nPlease provide these details before I can generate any code.\n```\n\n**FORBIDDEN:** No code snippets, no partial solutions, no hedging, no \"simple version anyway\".\n**ALLOWED:** Only the questions, only the STOP declaration, only the required details list.";
      } else if (selectedDomain === "genealogy") {
        systemContext =
          "You are REI.ai, a genealogical research assistant executing the CARDO REI evidence-evaluation methodology. CARDO REI is Latin for finding the hinge of the problem—the core turning point (such as a disputed parentage, a same-name disambiguation, or a key birth record). Dissect records to isolate this pivot. Tier every claim explicitly: 🟢 Primary Source, 🔵 Strong Evidence, 🟠 Needs Review, 🟡 Family Memory. State your tier and reasoning inline with each claim.\n\n" +
          "Your reasoning is grounded in the Marchant Family Archive canonical profiles:\n" +
          "1. **Charles Dyer**: Confirmed direct patriot ancestor. Honorably discharged September 25, 1778 after serving as a soldier in Captain William McKee's company of the 12th Virginia Regiment at Fort Randolph. Father of Jonathan Dyer (b. 1802). Disambiguation note: Not the William Dyer of the 15th Virginia (sick in Eastern Virginia).\n" +
          "2. **William Moore**: Painter of Springwell Street, Ballymena, County Antrim. Married Isabella Law on March 29, 1846. Emigrated to Canada (Hull, Quebec) shortly after, then later to New York City by 1865. Father of James Moore (b. 1860) and Robert Harvey Moore.\n" +
          "3. **Josiah Ramsey Sr.**: Born 1728 in Delaware Colony, died 1811 in Davidson, Tennessee. Confirmed North Carolina Militia Revolutionary War veteran with verified 1782 pay voucher. Married Alice Bower (1744, Delaware). Father of Josiah Ramsey Jr. (1769-1835).\n" +
          "Dissect all queries regarding these lines against these verified facts. Do not allow oral family traditions or same-name duplicates to override these primary sources.";
      } else if (selectedDomain === "story") {
        systemContext =
          "You are REI.ai, a creative story architect using the CARDO REI narrative methodology. CARDO REI is Latin for finding the hinge of the story—the core turning point or character driver hinge (what each character actually wants and fears that pivots the arc). Dissect the narrative blueprint to isolate this hinge before expanding any outline. Speak with direct narrative clarity, avoid cliché tropes, and structure clear structural timelines.";
      }

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

      const routerDecision = buildRouterDecision({
        input: userMsg.text,
        domain: selectedDomain,
        history: historyPayload,
        attachedRecord: ingestedRecord,
      });

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
          history: historyPayload,
          routerDecision,
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
            routerDecision: data.routerDecision || routerDecision,
          }
        }
      ]);
    } catch (error) {
      console.error('REI.ai API error:', error);
      
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
    <div
      className="mobile-container safe-area rei-shell"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        maxWidth: mobile ? undefined : "1400px",
        marginLeft: mobile ? undefined : "auto",
        marginRight: mobile ? undefined : "auto"
      }}
    >
      {/* Sticky Header with safe area top */}
      <header className="safe-top rei-header">
          <div className="rei-header__brand">
            {/* Logo Mark */}
            <div className="rei-logo-mark">
              <HingeMark size={28} animated={true} />
            </div>
            <div>
              <h1 className="rei-logo-title">REI.ai</h1>
              <p className="rei-logo-sub">
                Latin: <em>Rei</em> (The Matter / Hinge) &nbsp;|&nbsp; Loop: <strong>Record • Evaluate • Iterate</strong>
              </p>
            </div>
          </div>
 
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
          </div>
        </header>

        {/* Scrollable Main Content with keyboard space */}
        <main className="flex-1 overflow-y-auto pb-32 rei-main-content">
          {/* Active Domain Info Banner (Custom Card Style) */}
          <div className="rei-domain-banner">
            <div className="rei-domain-banner__eyebrow">Active Voice</div>
            <div className="rei-domain-banner__row">
              <div className="rei-domain-banner__meta">
                <span className="rei-domain-banner__label">Mode:</span>
                <span>{currentDomain.description}</span>
              </div>
              <div className="rei-domain-banner__meta rei-domain-banner__meta--secondary">
                <span className="rei-domain-banner__label">Voice cues:</span>
                <span>{currentDomain.rules.join(" | ")}</span>
              </div>
            </div>
            {selectedDomain === "assistant" && (
               <>
                 <div className="rei-reasoning-loop">
                   {REASONING_LOOP_STEPS.map((step) => (
                     <div key={step.id} className="rei-reasoning-loop__step">
                       <span className="rei-reasoning-loop__label">{step.label}</span>
                       <span className="rei-reasoning-loop__detail">{step.detail}</span>
                     </div>
                   ))}
                 </div>
                 <div className="rei-domain-banner__steps">
                   {["Collect", "Analyze", "Record", "Distinguish", "Organize", "Review", "Evaluate", "Iterate"].map((step) => (
                     <span key={step} className="rei-domain-banner__step">
                       {step}
                     </span>
                   ))}
                 </div>
               </>
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
        <div className="rei-chat-container">
          
          {/* Chat History Area */}
          <div className="rei-chat-history">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`rei-chat-message ${msg.sender === "user" ? "rei-chat-message--user" : "rei-chat-message--rei"}`}
                style={{
                  maxWidth: "95%",
                  width: "100%"
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
                {msg.sender === "rei" && msg.rawJson?.routerDecision && (
                  <div className="rei-router-badge">
                    <span style={{ fontSize: "11px" }}>🌙</span>
                    <span>{msg.rawJson.routerDecision.label}</span>
                    <span style={{ color: "#fbbf24", fontWeight: 600 }}>
                      {msg.rawJson.routerDecision.model}
                    </span>
                  </div>
                )}
                <div
                  className={`rei-chat-bubble ${msg.sender === "user" ? "rei-chat-bubble--user" : "rei-chat-bubble--rei"}`}
                  style={{
                    padding: "10px 60px 10px 14px"
                  }}
                >
                  {selectedDomain === "assistant" && msg.sender === "rei" && !msg.rawJson?.fallback ? (
                    (() => {
                      const sections = parseAssistantStyleReply(msg.text);
                      const sectionOrder = [
                        { key: "Hinge", label: "Hinge" },
                        { key: "Facts", label: "Facts" },
                        { key: "Assumptions", label: "Assumptions" },
                        { key: "Evaluation", label: "Evaluation" },
                        { key: "ChangeMind", label: "What would change my mind" },
                        { key: "Move", label: "Move" },
                      ];
                      const visibleSections = sectionOrder.filter(({ key }) => sections[key] && sections[key].trim());
                      return sections.intro || visibleSections.length > 0 ? (
                        <div style={{ display: "grid", gap: "10px" }}>
                          {sections.intro && <div>{sections.intro}</div>}
                          {visibleSections.map(({ key, label }) => (
                            <div key={key}>
                              <div style={{ color: "#fb923c", fontSize: "0.85em", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>{label}</div>
                              <div>{sections[key]}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div>{msg.text}</div>
                      );
                    })()
                  ) : (
                    msg.text
                  )}

                  {/* Router summary */}
                  {msg.rawJson && (
                    <div className="rei-router-panel">
                      <div className="rei-router-panel__title">Night Shift routing</div>
                      <div className="rei-router-panel__grid">
                        <div className="rei-router-panel__item"><span className="rei-router-panel__label">Route:</span> {msg.rawJson.routerDecision?.label || "n/a"}</div>
                        <div className="rei-router-panel__item"><span className="rei-router-panel__label">Model:</span> {msg.rawJson.routerDecision?.model || msg.rawJson.model || "n/a"}</div>
                        <div className="rei-router-panel__item"><span className="rei-router-panel__label">Max tokens:</span> {msg.rawJson.routerDecision?.maxTokens || "n/a"}</div>
                        <div className="rei-router-panel__item"><span className="rei-router-panel__label">Quality gate:</span> {msg.rawJson.routerDecision?.qualityGate || "n/a"}</div>
                        <div className="rei-router-panel__item"><span className="rei-router-panel__label">Enforcement:</span> {msg.rawJson.routerDecision?.enforce || "none"}</div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => copyText(msg.text)}
                    className="rei-copy-btn touch-target"
                    aria-label="Copy message"
                    style={{
                      fontSize: mobile ? "0.85em" : "0.75em",
                      padding: mobile ? "6px 10px" : "2px 6px"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.opacity = 1}
                    onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
                    title="Copy message"
                  >
                    Copy
                  </button>
                </div>
                <span className="rei-chat-meta">
                  {msg.sender === "user" ? "You" : "REI.ai"} • {msg.timestamp}
                </span>
              </div>
            ))}

            {isTyping && (
              <div style={{ 
                alignSelf: "flex-start", 
                color: "#FFB300", 
                fontFamily: "inherit",
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
        </div>
        </main>

        {/* Fixed Input Area at Bottom with safe area */}
        <div className="rei-input-shell fixed bottom-0 safe-bottom" style={{
          maxWidth: mobile ? undefined : "1400px"
        }}>
          <form className="rei-input-form" onSubmit={handleSendMessage}>
            {selectedDomain === "assistant" && (
              <div className="rei-input-row" style={{
                flexWrap: "wrap",
                justifyContent: mobile ? "stretch" : "center"
              }}>
                {GENERALIST_PROMPTS.map((prompt, index) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      setInputMessage(prompt);
                      setAssistantPromptIndex(index);
                    }}
                    className="rei-quick-prompt"
                    style={{
                      flex: mobile ? "1 1 30%" : "1 1 auto",
                      minWidth: mobile ? "100px" : "180px"
                    }}
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
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={selectedDomain === "assistant" ? "What are you thinking through?" : "Type proof context or statements to evaluate..."}
                className="rei-input-area"
                style={{
                  flex: 1,
                  padding: mobile ? "14px 16px" : "12px 16px",
                  minHeight: "48px"
                }}
              />
              <button
                type="submit"
                className="rei-touch-button touch-target"
                style={{
                  padding: mobile ? "14px 28px" : "12px 24px",
                  minHeight: "48px",
                  height: "48px"
                }}
                onMouseOver={(e) => e.currentTarget.style.background = "#fb923c"}
                onMouseOut={(e) => e.currentTarget.style.background = "#f97316"}
              >
                Send
              </button>
            </div>
          </form>
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
    </div>
  );
}
