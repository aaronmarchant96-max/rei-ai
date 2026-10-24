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

  // Evidentiary anchors: messages with attached records, claims, or citations
  if (message.attachedRecord || message.archiveRecord || message.claims || message.archivalCitation) {
    score += 80;
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
    archiveRecords: {},
    recordRevisions: {},
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

  // Preserve evidentiary registers on root
  cloned.archiveRecords = cloneHCM(hcm.archiveRecords || {});
  cloned.recordRevisions = cloneHCM(hcm.recordRevisions || {});

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
 * Safely handles QuotaExceededError and returns explicit persistence receipt.
 */
export function saveChatHistoryHCM(domainId, messages, maxRecent = 10, archiveRecords, recordRevisions) {
  if (typeof window === "undefined" || !domainId) {
    return { success: false, bytesUsed: 0, error: "window_or_domain_missing" };
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return { success: false, bytesUsed: 0, error: "empty_messages" };
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
        (m) => !m.isSystemAnnouncement && !m.isSummary && m !== systemWelcome
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

  // Update evidentiary registers
  if (archiveRecords && typeof archiveRecords === "object") {
    hcm.archiveRecords = { ...(hcm.archiveRecords || {}), ...archiveRecords };
  }
  if (recordRevisions && typeof recordRevisions === "object") {
    hcm.recordRevisions = { ...(hcm.recordRevisions || {}), ...recordRevisions };
  }

  // Compression check against conversational messages (excluding evidentiary registers)
  const proseSerialized = JSON.stringify(hcm.recentMessages);
  const COUNT_THRESHOLD = Math.ceil(maxRecent * 1.5);

  if (proseSerialized.length > STORAGE_LIMITS.SOFT_LIMIT_BYTES || hcm.recentMessages.length > COUNT_THRESHOLD) {
    hcm = compressHCM(hcm, maxRecent);
  }

  // Hard limit pruning of summaries if chat history grows very large
  if (hcm.summarizedHistory && hcm.summarizedHistory.length > 4) {
    const keepCount = Math.max(2, hcm.summarizedHistory.length - 2);
    hcm.summarizedHistory = hcm.summarizedHistory.slice(-keepCount);
  }

  let serialized = "";
  try {
    serialized = JSON.stringify(hcm);
    window.localStorage.setItem(storageKey, serialized);
    return { success: true, bytesUsed: serialized.length };
  } catch (e) {
    console.error("Failed to save HCM to localStorage:", e);
    const isQuota =
      e?.name === "QuotaExceededError" ||
      e?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      e?.code === 22 ||
      e?.code === 1014;
    return {
      success: false,
      bytesUsed: serialized ? serialized.length : 0,
      error: isQuota ? "storage_quota_exceeded" : (e?.message || "storage_failed")
    };
  }
}

/**
 * Reads full chat session using HCM structure, returning an explicit object
 * containing messages, archive records, and record revisions.
 */
export function readChatSessionHCM(domainId, fallbackWelcomeText) {
  if (typeof window === "undefined" || !domainId) {
    return {
      messages: null,
      archiveRecords: {},
      recordRevisions: {},
      recoveredFromCorruption: false
    };
  }

  const storageKey = `rei_chat_history_${domainId}`;
  const saved = window.localStorage.getItem(storageKey);

  if (!saved) {
    return {
      messages: null,
      archiveRecords: {},
      recordRevisions: {},
      recoveredFromCorruption: false
    };
  }

  try {
    const parsed = JSON.parse(saved);

    // Auto-migrate legacy array format to HCM
    if (Array.isArray(parsed) && parsed.length > 0) {
      const hcm = createInitialHCM(domainId, parsed[0]?.text || fallbackWelcomeText);
      if (parsed.length > 1) {
        hcm.recentMessages = parsed;
      }
      return {
        messages: flattenHCM(hcm),
        archiveRecords: {},
        recordRevisions: {},
        recoveredFromCorruption: false
      };
    }

    // Load HCM v1 structure
    if (parsed && parsed.version === "hcm_v1" && parsed.domainId === domainId) {
      return {
        messages: flattenHCM(parsed),
        archiveRecords: parsed.archiveRecords || {},
        recordRevisions: parsed.recordRevisions || {},
        recoveredFromCorruption: false
      };
    }

    throw new Error("Unknown storage structure version or domain mismatch");
  } catch (error) {
    console.error("Failed to parse saved chat history, attempting recovery:", error);

    try {
      const hcm = createInitialHCM(domainId, fallbackWelcomeText);
      window.localStorage.setItem(storageKey, JSON.stringify(hcm));
      return {
        messages: flattenHCM(hcm),
        archiveRecords: {},
        recordRevisions: {},
        recoveredFromCorruption: true
      };
    } catch (cleanupError) {
      console.warn("Unable to write recovered chat history:", cleanupError);
      return {
        messages: null,
        archiveRecords: {},
        recordRevisions: {},
        recoveredFromCorruption: true
      };
    }
  }
}

/**
 * Reads chat history returning a flat array of messages for backwards compatibility.
 */
export function readChatHistoryHCM(domainId, fallbackWelcomeText) {
  const session = readChatSessionHCM(domainId, fallbackWelcomeText);
  return session.messages;
}
