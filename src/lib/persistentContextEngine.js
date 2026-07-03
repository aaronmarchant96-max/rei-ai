/**
 * Persistent Context Engine
 * Implements Hierarchical Context Memory (HCM) with progressive compression and pruning.
 */

const STORAGE_LIMITS = {
  SOFT_LIMIT_BYTES: 4000, // Trigger proactive compression before hitting hard limit
  HARD_LIMIT_BYTES: 8000, // Hard cap; drop oldest summaries if exceeded
};

const DOMAIN_KEYWORDS = {
  architecture: /monolith|microservices|architecture|rewrite|database|design|cardo/i,
  genealogy: /genealogy|family|archive|record/i,
  maintenance: /pump|maintenance|sensor|vibration|operational|equipment/i,
  decision: /cardo|recommendation|verdict|decision/i,
};

/**
 * Generate consistent timestamp for messages (HH:MM format)
 */
function getTimestamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Safe deep clone that preserves message structure
 */
function cloneHCM(hcm) {
  if (typeof structuredClone === "function") {
    return structuredClone(hcm);
  }
  // Fallback for older environments: JSON clone is safe for HCM objects (no functions)
  return JSON.parse(JSON.stringify(hcm));
}

/**
 * Score message priority based on content and characteristics.
 * Higher score = more likely to survive compression.
 */
export function scoreMessage(message) {
  let score = 0;
  const text = message.text || "";

  // Always keep system welcome or initialization prompts
  if (message.sender === "rei" && text.includes("initialized")) {
    return 100;
  }

  // Pinned/Locked facts or rules
  if (message.pinned || text.includes("PIN:") || text.includes("LOCKED:")) {
    return 90;
  }

  // Active decision topics
  if (DOMAIN_KEYWORDS.architecture.test(text)) {
    score += 40;
  }

  // Length factor: meaningful messages score higher
  if (text.length > 5 && !/^(hi|hello|hey|ok|yes|no)\b/i.test(text)) {
    score += 20;
  }

  return score;
}

/**
 * Compresses older messages into a structured summary.
 * Extracts topic keywords and decision counts for context preservation.
 */
export function summarizeMessages(messages) {
  if (!messages || messages.length === 0) return null;

  const topics = new Set();
  let decisionsCount = 0;

  messages.forEach(msg => {
    const text = msg.text || "";
    if (DOMAIN_KEYWORDS.architecture.test(text)) topics.add("SaaS Monolith Architecture");
    if (DOMAIN_KEYWORDS.genealogy.test(text)) topics.add("Genealogy Research");
    if (DOMAIN_KEYWORDS.maintenance.test(text)) topics.add("Equipment Maintenance Decision");
    if (DOMAIN_KEYWORDS.decision.test(text)) decisionsCount++;
  });

  // Build summary with topics if any; always include message count and decision count
  let summary = "Previous discussion";
  if (topics.size > 0) {
    summary += ` regarding: ${Array.from(topics).join(", ")}`;
  }
  summary += ` (${messages.length} messages`;
  if (decisionsCount > 0) {
    summary += `, ${decisionsCount} decisions analyzed`;
  }
  summary += ").";

  return summary;
}

/**
 * Initializes a fresh HCM memory structure.
 */
export function createInitialHCM(domainId, welcomeText) {
  if (!domainId) {
    throw new Error("domainId is required");
  }
  return {
    version: "hcm_v1",
    domainId,
    coreIdentity: {
      domainId,
      initializedAt: new Date().toISOString()
    },
    pinnedFacts: [],
    summarizedHistory: [],
    recentMessages: [
      {
        sender: "rei",
        text: welcomeText || "System initialized.",
        timestamp: getTimestamp()
      }
    ]
  };
}

/**
 * Main pruning and compression engine.
 * Moves old messages to summarizedHistory and pins any marked facts.
 */
export function compressHCM(hcm, maxRecent = 10) {
  if (!hcm || !hcm.recentMessages) {
    throw new Error("Invalid HCM structure");
  }

  const cloned = cloneHCM(hcm);

  if (cloned.recentMessages.length <= maxRecent) {
    return cloned;
  }

  // Always keep the system welcome message (index 0)
  const alwaysKeepSystem = cloned.recentMessages[0];
  const restOfMessages = cloned.recentMessages.slice(1);

  // Separate keep and compress candidates
  const recentThreshold = Math.max(0, restOfMessages.length - maxRecent);
  const keepRecent = restOfMessages.slice(recentThreshold);
  const compressCandidates = restOfMessages.slice(0, recentThreshold);

  // Identify and preserve pinned facts (by checking content, not reference)
  const newPins = [];
  const compressableMessages = [];

  compressCandidates.forEach(msg => {
    if (msg.pinned || (msg.text && (msg.text.includes("PIN:") || msg.text.includes("LOCKED:")))) {
      newPins.push(msg);
    } else {
      compressableMessages.push(msg);
    }
  });

  // Add new pins to permanent storage
  if (newPins.length > 0) {
    cloned.pinnedFacts = [...cloned.pinnedFacts, ...newPins];
  }

  // Summarize remaining compressible history
  if (compressableMessages.length > 0) {
    const summaryText = summarizeMessages(compressableMessages);
    if (summaryText) {
      cloned.summarizedHistory.push({
        sender: "rei",
        text: `[Summary] ${summaryText}`,
        timestamp: getTimestamp(),
        isSummary: true
      });
    }
  }

  cloned.recentMessages = [alwaysKeepSystem, ...keepRecent];
  return cloned;
}

/**
 * Converts the hierarchical memory to a flat array for rendering in the chat UI.
 */
export function flattenHCM(hcm) {
  if (!hcm) return [];

  const messages = [];

  // 1. System welcome message (always first)
  if (hcm.recentMessages && hcm.recentMessages.length > 0) {
    messages.push(hcm.recentMessages[0]);
  }

  // 2. Pinned facts (as a separate announcement; formatting left to UI)
  if (hcm.pinnedFacts && hcm.pinnedFacts.length > 0) {
    messages.push({
      sender: "rei",
      text: hcm.pinnedFacts.map(f => `${f.text}`).join("\n"),
      timestamp: "",
      isSystemAnnouncement: true,
      isPinnedFacts: true
    });
  }

  // 3. Summarized history
  if (hcm.summarizedHistory && hcm.summarizedHistory.length > 0) {
    hcm.summarizedHistory.forEach(summary => {
      messages.push(summary);
    });
  }

  // 4. Recent messages (excluding system welcome which is already added)
  if (hcm.recentMessages && hcm.recentMessages.length > 1) {
    messages.push(...hcm.recentMessages.slice(1));
  }

  return messages;
}

/**
 * Saves chat history using HCM policies.
 * Automatically compresses when size thresholds are exceeded.
 */
export function saveChatHistoryHCM(domainId, messages, maxRecent = 10) {
  if (typeof window === "undefined" || !domainId) return;

  if (!Array.isArray(messages) || messages.length === 0) {
    return; // Nothing to save
  }

  const storageKey = `rei_chat_history_${domainId}`;

  let hcm;
  try {
    const rawSaved = window.localStorage.getItem(storageKey);
    const parsed = rawSaved ? JSON.parse(rawSaved) : null;

    if (parsed && parsed.version === "hcm_v1" && parsed.domainId === domainId) {
      // Update existing HCM structure
      hcm = cloneHCM(parsed);

      // Rebuild recentMessages from flattened list, filtering out system artifacts
      const systemWelcome = messages[0];
      const rest = messages.filter(
        m => !m.isSystemAnnouncement && !m.isSummary && m !== systemWelcome
      );
      hcm.recentMessages = [systemWelcome, ...rest];
    } else {
      // Create new HCM structure
      const welcomeText = messages[0]?.text || "System initialized.";
      hcm = createInitialHCM(domainId, welcomeText);
      if (messages.length > 1) {
        hcm.recentMessages = messages;
      }
    }
  } catch (e) {
    console.warn("Failed to load existing HCM, creating new:", e);
    const welcomeText = messages[0]?.text || "System initialized.";
    hcm = createInitialHCM(domainId, welcomeText);
    hcm.recentMessages = messages;
  }

  // Adaptive compression: trigger when size or count exceeds thresholds
  let serialized = JSON.stringify(hcm);
  const LENGTH_THRESHOLD = STORAGE_LIMITS.SOFT_LIMIT_BYTES;
  const COUNT_THRESHOLD = Math.ceil(maxRecent * 1.5);

  if (serialized.length > LENGTH_THRESHOLD || hcm.recentMessages.length > COUNT_THRESHOLD) {
    hcm = compressHCM(hcm, maxRecent);
    serialized = JSON.stringify(hcm);
  }

  // Hard limit: if still too large, keep recent summaries and drop oldest
  if (serialized.length > STORAGE_LIMITS.HARD_LIMIT_BYTES && hcm.summarizedHistory.length > 2) {
    // Keep newest summaries (most relevant context)
    const keepCount = Math.max(1, hcm.summarizedHistory.length - 1);
    hcm.summarizedHistory = hcm.summarizedHistory.slice(-keepCount);
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(hcm));
  } catch (e) {
    console.error("Failed to save HCM to localStorage:", e);
  }
}

/**
 * Reads chat history with graceful recovery from corruption using HCM tiers.
 * Auto-migrates legacy array format to HCM structure.
 */
export function readChatHistoryHCM(domainId, fallbackWelcomeText) {
  if (typeof window === "undefined" || !domainId) return null;

  const storageKey = `rei_chat_history_${domainId}`;
  const saved = window.localStorage.getItem(storageKey);

  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved);

    // Auto-migrate legacy array format to HCM
    if (Array.isArray(parsed) && parsed.length > 0) {
      const hcm = createInitialHCM(domainId, parsed[0]?.text || fallbackWelcomeText);
      if (parsed.length > 1) {
        hcm.recentMessages = parsed;
      }
      return flattenHCM(hcm);
    }

    // Load HCM v1 structure
    if (parsed && parsed.version === "hcm_v1" && parsed.domainId === domainId) {
      return flattenHCM(parsed);
    }

    throw new Error("Unknown storage structure version");
  } catch (error) {
    console.error("Failed to parse saved chat history, attempting recovery:", error);

    // Graceful recovery: reset to initialization
    try {
      const hcm = createInitialHCM(domainId, fallbackWelcomeText);
      window.localStorage.setItem(storageKey, JSON.stringify(hcm));
      return flattenHCM(hcm);
    } catch (cleanupError) {
      console.warn("Unable to write recovered chat history:", cleanupError);
      return null;
    }
  }
}
