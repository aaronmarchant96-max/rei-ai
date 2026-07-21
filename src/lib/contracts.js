/**
 * @file Data contracts for REI.ai UI.
 *
 * These are NOT runtime classes — they're JSDoc type definitions.
 * Every component should import these types so the shapes stay
 * consistent. When a shape changes, update it here first.
 */

// ─── RouterDecision ───────────────────────────────────────────
// Produced by buildRouterDecision() in nightShiftRouter.js

/**
 * @typedef {Object} RouterSignal
 * @property {"low"|"medium"|"high"} complexityTier
 * @property {string[]} matchedTerms
 * @property {string[]} highStructureSignals
 * @property {string|null} storedPreference
 */

/**
 * @typedef {Object} AlternativeRoute
 * @property {string} model
 * @property {string} label
 * @property {number} costPer1kTotal
 * @property {number} costDeltaFromSelected
 * @property {number} savingsPercentage
 * @property {string} route
 * @property {string} rationale
 * @property {string} pathway
 */

/**
 * @typedef {Object} RouterDecision
 * @property {string} id
 * @property {string} label
 * @property {string} model
 * @property {number} maxTokens
 * @property {number} costPer1kInput
 * @property {number} costPer1kOutput
 * @property {number} costPer1k
 * @property {number} estimatedInputTokens
 * @property {number} estimatedCost
 * @property {number} premiumCost
 * @property {number} premiumCostPer1k
 * @property {number|null} routingConfidence
 * @property {Object} confidence
 * @property {string} pathway
 * @property {string} qualityGate
 * @property {string|null} enforce
 * @property {string} description
 * @property {number} temperature
 * @property {string[]|null} fallbackChain
 * @property {number} contextWindow
 * @property {string} rationale
 * @property {RouterSignal} routingSignals
 * @property {AlternativeRoute[]} alternativeRoutes
 */

// ─── EvidenceTier ─────────────────────────────────────────────
// Extracted from genealogy response text. Designed to extend to all domains.

/**
 * @typedef {"primary"|"strong"|"needs-review"|"family-memory"} TierLevel
 */

/**
 * @typedef {Object} EvidenceTier
 * @property {string} claim
 * @property {TierLevel} tier
 * @property {string} [source]
 * @property {number} [confidence]
 * @property {string} [notes]
 */

// ─── Message ──────────────────────────────────────────────────
// Constructed in handleSendMessage() in REI.jsx.

/**
 * @typedef {Object} AttachedRecord
 * @property {number} charCount
 * @property {"ancestry"|"familysearch"|"findagrave"|"other"} sourceType
 */

/**
 * @typedef {Object} ApiUsage
 * @property {number} total_tokens
 * @property {number} [prompt_tokens]
 * @property {number} [completion_tokens]
 */

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {"user"|"rei"} sender
 * @property {string} text
 * @property {string} timestamp
 * @property {boolean} [isSystemNotice]
 * @property {AttachedRecord} [attachedRecord]
 * @property {ApiUsage} [usage]
 * @property {RouterDecision} [routerDecision]
 * @property {string} [model]
 * @property {number} [cost]
 * @property {EvidenceTier[]} [evidence]
 * @property {string} [error]
 * @property {string} [errorType]
 * @property {boolean} [fallback]
 */

// ─── SessionSummary ───────────────────────────────────────────
// Managed by useSessionTracker() hook.

/**
 * @typedef {Object} SessionSummary
 * @property {number} totalTokens
 * @property {number} totalMessages
 * @property {number} totalCost
 * @property {{ [model: string]: number }} modelBreakdown
 * @property {number} budgetLimit
 */

// ─── DomainProfile ────────────────────────────────────────────
// Defined in REI.jsx, consumed by domain banner + domain pills.

/**
 * @typedef {"assistant"|"coding"|"genealogy"|"story"|"red-team"} DomainId
 */

/**
 * @typedef {Object} DomainProfile
 * @property {DomainId} id
 * @property {string} label
 * @property {string} badge
 * @property {string} description
 * @property {string[]} rules
 * @property {string} exemplar
 */

// ─── Red Team ─────────────────────────────────────────────────
// Produced by scanRedTeamInput() and handleRedTeamRequest().

/**
 * @typedef {"low"|"medium"|"high"|"critical"} RedTeamSeverity
 */

/**
 * @typedef {"clean"|"suspicious"|"high-risk"|"critical"} RedTeamVerdict
 */

/**
 * @typedef {Object} RedTeamFinding
 * @property {string} finding - Human-readable label for the detected pattern
 * @property {RedTeamSeverity} severity - Severity level
 * @property {"D1"|"D2"|"D3"} dimension - Which dimension detected this
 * @property {string} category - Category key from redTeamTaxonomy
 * @property {string[]} evidence - Matched keywords or phrases
 * @property {string} impact - Description of potential impact
 * @property {string[]} suggestedFix - Suggested mitigations
 * @property {number} confidence - Confidence score 0-1
 */

/**
 * @typedef {Object} RedTeamReport
 * @property {RedTeamVerdict} verdict - Overall verdict
 * @property {number} score - Risk score 0-100
 * @property {("D1"|"D2"|"D3")[]} dimensionsTriggered - Which dimensions were triggered
 * @property {RedTeamFinding[]} findings - Detailed findings
 * @property {Object} routingTrace - Routing decision trace
 * @property {number} cost - Estimated cost in USD
 */

// ─── Cost helpers ─────────────────────────────────────────────

let msgIdCounter = 0;

export function nextMessageId() {
  return `msg-${++msgIdCounter}`;
}

export function resetMessageIdCounter() {
  msgIdCounter = 0;
}

/**
 * Compute cost in USD for a given token count and model rate.
 * @param {number} totalTokens
 * @param {number} rate - cost per 1K tokens (average of input/output)
 * @returns {number}
 */
export function computeMsgCost(totalTokens, rate) {
  return (totalTokens / 1000) * rate;
}

/**
 * Format a cost number to a display string.
 * @param {number} cost
 * @returns {string}
 */
export function formatCostDisplay(cost) {
  if (cost <= 0) return "~$0.0000";
  if (cost < 0.0001) return "< $0.0001";
  return `~$${cost.toFixed(4)}`;
}

/**
 * Estimate input tokens from text length.
 * @param {string} text
 * @returns {number}
 */
export function estimateInputTokens(text) {
  return Math.ceil((text || "").length / 4);
}
