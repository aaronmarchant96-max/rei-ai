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
  // ─── Greetings ─────────────────────────────────────────
  {
    pattern: /^(hi|hello|hey|yo|hiya|sup|howdy|heya|hola)[\s!,.]*$/i,
    response: "Hey. Say what you want to sort out, and I'll help pull it apart cleanly.",
  },
  {
    pattern: /^good\s+(morning|afternoon|evening)[\s!,.]*$/i,
    response: "Good {0}. What are you thinking through?",
  },
  // ─── Smalltalk ─────────────────────────────────────────
  {
    pattern: /^(how\s+are\s+(you|things|it\s+going)|how('s|s)\s+(it\s+going|everything|life)|what('s|s)\s+up|howdy)\b/i,
    response: "Doing what I do best — sorting through what's real. What's on your mind?",
  },
  {
    pattern: /^(thanks|thank\s+you|thx|ty|appreciate\s+(it|that|you))[\s!,.]*$/i,
    response: "Of course. What's next?",
  },
  // ─── Meta / capability questions ─────────────────────
  {
    pattern: /^(what\s+(can|do)\s+you\s+(do|tell\s+me\s+about\s+yourself|offer)|tell\s+me\s+about\s+(yourself|you|rei)|who\s+are\s+you|what\s+are\s+you\s+capable\s+of)\b/i,
    response: "I'm REI — short for Record, Evaluate, Iterate, and the Latin word for 'the hinge of the matter.' I help people pull apart complicated problems: separate facts from assumptions, find the turning point that changes the answer, and land on the smallest useful next step. Throw me something real and I'll show you.",
  },
  {
    pattern: /^(what('s|s)\s+(your\s+purpose|the\s+point\s+of\s+you|are\s+you\s+for))\b/i,
    response: "My purpose is simple: help you find the hinge. The one turning point in a problem that changes the answer. Everything else — facts, assumptions, what might change your mind — follows from that. Give me something you're trying to figure out.",
  },
  {
    pattern: /^(i'?m\s+testing\s+you|show\s+me\s+what\s+you\s+(can\s+do|got)|prove\s+(it|yourself)|impress\s+me)\b/i,
    response: "Good. I like being tested — keeps me honest. Throw me something real, though. A decision you're stuck on, an argument you're trying to sort out, a problem where you're not sure what matters most. The hard stuff is where I earn my keep.",
  },
  // ─── Empty / filler ────────────────────────────────────
  {
    pattern: /^(ok|okay|k+|right|yeah|yep|nope|sure|alright|fine|got\s+it|gotcha|hmm+|uh|um)[\s!,.]*$/i,
    response: "Ready when you are.",
  },
  // ─── Unknown / test input ──────────────────────────────
  {
    pattern: /^(test|testing|ping|pong)[\s!,.]*$/i,
    response: "Pong. What's the real question?",
  },
];

export function resolveDeterministic(input) {
  if (!input || !input.trim()) return null;

  const clean = input.trim();
  for (const entry of PATTERNS) {
    const match = clean.match(entry.pattern);
    if (match) {
      return {
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

export function getDeterministicCatalog() {
  return PATTERNS.map(({ pattern, response }) => ({
    pattern: pattern.toString(),
    response,
  }));
}
