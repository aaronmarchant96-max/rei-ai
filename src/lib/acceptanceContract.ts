/**
 * @file src/lib/acceptanceContract.ts
 * @description Domain-specific delivery acceptance contracts + unfinished-work narration detection.
 *
 * Regression context:
 *  1. A legal answer that stops mid-analysis ("I'll continue the analysis…")
 *     must NOT be marked `complete` — required CARDO sections must actually be present.
 *  3. Unfinished-work narration ("I'll continue…", "Let me first verify…") is
 *     model/process meta-prose, not the requested answer. Detect it so the
 *     delivery gate can downgrade the response and the sanitizer can strip it.
 *
 * INVARIANTS
 *  - Deterministic, dependency-free (browser + serverless).
 *  - Never fabricate: absence of a section is a real, testable signal.
 */

/** CARDO sections a legal analysis MUST include to be considered delivered. */
export const LEGAL_REQUIRED_SECTIONS = [
  "HINGE",
  "FACTS",
  "ASSUMPTIONS",
  "EVALUATION",
  "WHAT WOULD CHANGE THE OUTCOME",
  "MOVE",
] as const;

/**
 * Unfinished-work narration phrases. These signal that the model stopped
 * before producing a completed answer — the response narrates the *process*
 * ("I'll continue the analysis…") instead of delivering the result.
 */
const UNFINISHED_NARRATION_PATTERNS: RegExp[] = [
  /\bi'?ll\s+continue\b[^.\n]{0,80}/i,
  /\blet\s+me\s+first\s+(verify|check|confirm|address|look)\b[^.\n]{0,80}/i,
  /\bi\s+will\s+(continue|now\s+analyze|now\s+address|next\s+turn\s+to)\b[^.\n]{0,80}/i,
  /\bcontinue\s+the\s+analysis\b/i,
  /\bto\s+be\s+continued\b/i,
  /\bi'?ll\s+(analyze|address|cover|complete)\s+(the\s+)?(next|remaining|second|following)\b[^.\n]{0,80}/i,
  /\bthis\s+(response|analysis)\s+is\s+incomplete\b/i,
  /\bplease\s+let\s+me\s+know\s+if\s+you\s+want\s+me\s+to\s+continue\b/i,
];

/**
 * True when the content contains unfinished-work narration — the model
 * describing what it will do next rather than having done it.
 */
export function detectUnfinishedNarration(content?: string | null): boolean {
  if (!content) return false;
  return UNFINISHED_NARRATION_PATTERNS.some((re) => re.test(content));
}

/**
 * Returns the matched narration phrase(s) for reporting/audit, or null.
 * Deterministic and cheap; used by the delivery gate failure reasons.
 */
export function findUnfinishedNarration(content?: string | null): string | null {
  if (!content) return null;
  for (const re of UNFINISHED_NARRATION_PATTERNS) {
    const match = content.match(re);
    if (match) return match[0].trim();
  }
  return null;
}

/**
 * Resolve the required-section contract for a given route/fingerprint id.
 * Returns null when the route has no explicit section acceptance contract.
 */
export function requiredSectionsForRoute(routeId?: string | null): string[] | null {
  const id = String(routeId || "").toLowerCase();
  if (id === "legal-hinge" || id === "case-hinge-legal" || id === "legal") {
    return [...LEGAL_REQUIRED_SECTIONS];
  }
  return null;
}

/**
 * Check which required sections are missing from the delivered content.
 * Section presence is a case-insensitive label match (the CARDO headers).
 */
export function missingRequiredSections(
  content: string,
  required: readonly string[]
): string[] {
  if (!content) return [...required];
  const text = content.toLowerCase();
  const missing: string[] = [];
  for (const section of required) {
    const label = section.toLowerCase();
    // A section is present if its label appears as a labeled heading/word.
    if (!text.includes(label)) {
      missing.push(section);
    }
  }
  return missing;
}
