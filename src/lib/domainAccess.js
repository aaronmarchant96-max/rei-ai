/**
 * Domain Access Control Configuration
 *
 * Multi-tenant access control (planned). Configure per deployment.
 * Currently all domains enabled — no enforcement logic yet.
 * Future: gate premium domains behind auth-tier checks at the
 * router level before dispatching a model call.
 */
export const DOMAIN_ACCESS = {
  assistant: { enabled: true, tier: "free", label: "REI Generalist" },
  coding:    { enabled: true, tier: "free", label: "The Engineer" },
  genealogy: { enabled: true, tier: "free", label: "The Archivist" },
  story:     { enabled: true, tier: "free", label: "The Story Forge" },
  legal:     { enabled: true, tier: "premium", label: "The Precedent Engine" },
};

/**
 * Check if a domain is enabled for the current deployment context.
 * @param {string} domainId — e.g. "legal", "coding", "assistant"
 * @returns {boolean}
 */
export function isDomainEnabled(domainId) {
  const entry = DOMAIN_ACCESS[domainId];
  if (!entry) return false;
  return entry.enabled;
}

/**
 * Get the access tier for a domain.
 * @param {string} domainId
 * @returns {"free" | "premium" | undefined}
 */
export function getDomainTier(domainId) {
  return DOMAIN_ACCESS[domainId]?.tier;
}
