import assistant from "./assistant/index.js";
import coding from "./coding/index.js";
import genealogy from "./genealogy/index.js";
import story from "./story/index.js";
import legal from "./legal/index.js";

export const DOMAINS = [assistant, coding, genealogy, story, legal];

export function getDomain(id) {
  return DOMAINS.find((d) => d.id === id);
}

export function getDomainProfiles() {
  return DOMAINS.map((d) => ({
    id: d.id,
    label: d.label,
    badge: d.badge,
    description: d.description,
    rules: d.rules,
    exemplar: d.exemplar,
  }));
}

export function getDomainPrompt(id) {
  const domain = getDomain(id);
  return domain?.systemPrompt || assistant.systemPrompt;
}

export function getDomainMatchTerms(id) {
  const domain = getDomain(id);
  return domain?.matchTerms || [];
}

export function getAllMatchTerms() {
  return DOMAINS.flatMap((d) => d.matchTerms);
}

export function getFingerprintEntry(id) {
  const domain = getDomain(id) || assistant;
  return domain.fingerprint || null;
}

export function getAllFingerprints() {
  return DOMAINS.map((d) => d.fingerprint).filter(Boolean);
}
