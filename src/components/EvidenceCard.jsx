import { estimateInputTokens } from "../lib/contracts.js";

/**
 * Parse evidence tier claims from genealogy response text.
 * Matches patterns like:
 *   🟢 Primary Source: claim text
 *   🔵 Strong Evidence: claim text
 *   🟠 Needs Review: claim text
 *   🟡 Family Memory: claim text
 *
 * @param {string} text
 * @returns {Array<{claim: string, tier: string, label: string}>}
 */
export function parseEvidenceTiers(text) {
  if (!text) return [];

  const TIER_PATTERNS = [
    { emoji: "🟢", tier: "primary", label: "Primary Source" },
    { emoji: "🔵", tier: "strong", label: "Strong Evidence" },
    { emoji: "🟠", tier: "needs-review", label: "Needs Review" },
    { emoji: "🟡", tier: "family-memory", label: "Family Memory" },
  ];

  const results = [];

  for (const pattern of TIER_PATTERNS) {
    const escaped = pattern.emoji.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `${escaped}\\s*${pattern.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:?\\s*(.+?)(?=\\n\\s*(?:🟢|🔵|🟠|🟡)|$|\\n\\n)`,
      "gs"
    );
    let match;
    while ((match = regex.exec(text)) !== null) {
      results.push({
        claim: match[1].trim(),
        tier: pattern.tier,
        label: pattern.label,
        index: match.index,
      });
    }
  }

  results.sort((a, b) => a.index - b.index);
  return results.map(({ claim, tier, label }) => ({ claim, tier, label }));
}

/**
 * Estimate token count for an evidence claim.
 * @param {string} claim
 * @returns {number}
 */
export function estimateEvidenceTokens(claim) {
  return estimateInputTokens(claim || "");
}

const TIER_CONFIG = {
  primary: { emoji: "🟢", label: "Primary Source" },
  strong: { emoji: "🔵", label: "Strong Evidence" },
  "needs-review": { emoji: "🟠", label: "Needs Review" },
  "family-memory": { emoji: "🟡", label: "Family Memory" },
};

export default function EvidenceCard({ evidence }) {
  if (!evidence || !evidence.claim) return null;
  const config = TIER_CONFIG[evidence.tier] || { emoji: "📎", label: "Evidence" };

  return (
    <div
      className={`rei-evidence-card rei-evidence-card--${evidence.tier}`}
      role="listitem"
      aria-label={`${config.label} claim`}
    >
      <span className="rei-evidence-card__tier" aria-hidden="true">
        {config.emoji}
      </span>
      <div className="rei-evidence-card__body">
        <span className="rei-evidence-card__tier-label">{config.label}</span>
        <span className="rei-evidence-card__claim">{evidence.claim}</span>
        {evidence.source && (
          <span className="rei-evidence-card__source">{evidence.source}</span>
        )}
      </div>
    </div>
  );
}
