/**
 * Layer 0 Deterministic Engine
 *
 * Handles greetings, smalltalk, and trivial queries with zero-token,
 * pre-written responses. No API call, no model inference — just pattern
 * matching and templated replies.
 *
 * This is the "cheapest model is no model" layer. Cost: $0. Latency: ~0ms.
 * Confidence: 1.0 (the response is always exactly what we wrote).
 */

const PATTERNS = [
  {
    name: "greeting",
    pattern: /^(hi|hello|hey|yo|hiya|sup|howdy|heya|hola)[\s!,.]*$/i,
    response: "Hey. Say what you want to sort out, and I'll help pull it apart cleanly.",
  },
  {
    name: "time-of-day greeting",
    pattern: /^good\s+(morning|afternoon|evening)[\s!,.]*$/i,
    response: "Good {0}. What are you thinking through?",
  },
  // ─── Smalltalk ─────────────────────────────────────────
  {
    name: "how are you",
    pattern: /^(how\s+are\s+(you|things|it\s+going)|how('s|s)\s+(it\s+going|everything|life)|what('s|s)\s+up)[\s!,.]*$/i,
    response: "Doing what I do best — sorting through what's real. What's on your mind?",
  },
  {
    name: "thanks",
    pattern: /^(thanks|thank\s+you|thx|ty|appreciate\s+(it|that|you))[\s!,.]*$/i,
    response: "Of course. What's next?",
  },
  // ─── Empty / filler ────────────────────────────────────
  {
    name: "filler",
    pattern: /^(ok|okay|k+|right|yeah|yep|nope|sure|alright|fine|got\s+it|gotcha|hmm+|uh|um)[\s!,.]*$/i,
    response: "Ready when you are.",
  },
  // ─── Unknown / test input ──────────────────────────────
  {
    name: "test/ping",
    pattern: /^(test|testing|ping|pong)[\s!,.]*$/i,
    response: "Pong. What's the real question?",
  },
];

/**
 * resolveDeterministic — Matches input against deterministic patterns for $0 responses.
 * @param {string} input - User input to match
 * @returns {Object|null} Deterministic response object or null if no match
 */
export function resolveDeterministic(input) {
  if (!input || !input.trim()) return null;

  const clean = input.trim();
  for (const entry of PATTERNS) {
    const match = clean.match(entry.pattern);
    if (match) {
      return {
        pattern: entry.name,
        matched: true,
        response: entry.response.replace(/\{(\d+)\}/g, (_, i) => match[parseInt(i) + 1] || ""),
        confidence: 1.0,
        pathway: "deterministic",
        cost: 0,
        tokens: 0,
      };
    }
  }
  return null;
}

/**
 * getDeterministicCatalog — Returns all deterministic patterns for inspection.
 * @returns {Array} Array of pattern objects with regex and response strings
 */
export function getDeterministicCatalog() {
  return PATTERNS.map(({ pattern, response }) => ({
    pattern: pattern.toString(),
    response,
  }));
}
