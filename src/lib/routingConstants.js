export const UNCERTAINTY_TERMS = ["uncertain", "unclear", "missing", "unknown", "not sure", "unsure", "doubt", "uncertainty"];

export const HIGH_STRUCTURE_TERMS = [
  "what am i missing",
  "what would change my mind",
  "what would make this wrong",
  "real hinge",
  "how do i know",
  "how reliable",
  "prove it wrong",
  "why is this uncertain",
  "what evidence",
  "what matters most",
];

export const GREETING_TERMS = [
  "hi",
  "hello",
  "hey",
  "yo",
  "good morning",
  "good afternoon",
  "good evening",
  "hiya",
  "howdy",
  "sup",
  "heya",
  "greetings",
  "what's up",
  "whats up",
  "morning",
  "afternoon",
  "evening",
];

export function isSimpleGreeting(text = "") {
  const t = text.trim().toLowerCase();
  for (const term of GREETING_TERMS) {
    if (t === term) return true;
    if (t.startsWith(term)) {
      const nextChar = t[term.length];
      if (nextChar === undefined || /[\s!?.,:;]/.test(nextChar)) {
        const rest = t.slice(term.length).trim();
        if (
          rest.length > 25 ||
          /\b(design|implement|code|function|class|story|family|ancestor|legal|runway|tradeoff|decision|build|fix|refactor|cache|api|database|lru|ttl)\b/i.test(
            rest
          )
        ) {
          return false;
        }
        return true;
      }
    }
  }
  return false;
}
