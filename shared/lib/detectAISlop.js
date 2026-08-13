/**
 * detectAISlop.js — deterministic AI-slop / "hype-slope" tone scanner.
 *
 * PURPOSE
 *   Keeps copy (and, later, generated replies) from drifting into the generic
 *   formulaic register that reads as "written by an LLM." The goal is NOT to
 *   forbid enthusiasm — it is to forbid the PHRASING that signals a bot wrote
 *   it, so real conviction reads as human.
 *
 *   This is a SCORE + REPORT tool (non-destructive). A human or agent reads
 *   the flags and rewrites; it never strips or rephrases on its own.
 *
 * INVARIANTS
 *   - Deterministic: same input => same output, no randomness, no LLM calls.
 *   - Dependency-free: runs in browser (bundle) AND Vercel serverless (ESM
 *     Node). No imports beyond itself.
 *   - Low false-positive: patterns are deliberately literal. A phrase like
 *     "Elevate your workflow" fires because it is a canned value-verb; a plain
 *     factual sentence does not. Inspect `details` to audit each hit's match.
 *
 * SCORING
 *   Each match adds the pattern's weight. The total is compared against graded
 *   thresholds for a coarse verdict. Use `score` + `flags` for your own
 *   threshold when you need finer control.
 *
 * RED-FLAG CATEGORIES (weighted)
 *   - opener      2 : canned present-participle value-openers ("Unleash",
 *                     "Discover", "Dive into", "Elevate your")
 *   - modal       2 : hollow sales modal claims ("Take your X to the next
 *                     level", "unlock your potential")
 *   - stacking    1 : triple-conjunction listing ("seamlessly", "effortlessly",
 *                     "powerhouse", "game-changer")
 *   - filler      1 : fluff intensifiers with little information ("cutting-edge",
 *                     "state-of-the-art", "revolutionary", "world-class")
 *   - conversion  2 : bottom-funnel manipulation ("Don't miss out",
 *                     "act now", "limited time offer")
 *   - hollow     1 : generic platitudes that fit any product ("unlock the
 *                     power of", "supercharge your")
 */

export const AI_SLOP_PATTERNS = [
  // openers — value-verb + noun pivots
  { re: /\bunleash\b/i, weight: 2, category: "opener", label: "unleash" },
  { re: /\bdive\s+into\b/i, weight: 2, category: "opener", label: "dive into" },
  { re: /\belevate\s+(your|the)\b/i, weight: 2, category: "opener", label: "elevate your" },
  { re: /\bdiscover\s+(the|how|a)\b/i, weight: 2, category: "opener", label: "discover the/how/a" },
  { re: /\bembark\s+on\b/i, weight: 2, category: "opener", label: "embark on" },
  { re: /\bstep\s+into\s+(a|the|your)\b/i, weight: 2, category: "opener", label: "step into a/the/your" },
  { re: /\btransform(?:ing)?\s+your\b/i, weight: 2, category: "opener", label: "transform your" },

  // modal — hollow sales-claim intensifiers
  { re: /\btake\s+your\s+\w+\s+to\s+the\s+next\s+level\b/i, weight: 2, category: "modal", label: "take your X to the next level" },
  { re: /\butterly\s+transform\b/i, weight: 2, category: "modal", label: "utterly transform" },

  // stacking — over-stacked connective cliches
  { re: /\bseamless(?:ly)?\b/i, weight: 1, category: "stacking", label: "seamless/seamlessly" },
  { re: /\beffortless(?:ly)?\b/i, weight: 1, category: "stacking", label: "effortless/effortlessly" },
  { re: /\bpowerhouse\b/i, weight: 1, category: "stacking", label: "powerhouse" },
  { re: /\bgame[\s-]?chang(?:er|ing)\b/i, weight: 1, category: "stacking", label: "game-changer" },

  // filler — low-information intensifiers
  { re: /\bcutting[\s-]?edge\b/i, weight: 1, category: "filler", label: "cutting-edge" },
  { re: /\bstate[\s-]?of[\s-]?the[\s-]?art\b/i, weight: 1, category: "filler", label: "state-of-the-art" },
  { re: /\brevolution(?:ary|ize)?\b/i, weight: 1, category: "filler", label: "revolution" },
  { re: /\bworld[\s-]?class\b/i, weight: 1, category: "filler", label: "world-class" },

  // conversion — bottom-funnel pressure
  { re: /\bdon'?t\s+miss\s+out\b/i, weight: 2, category: "conversion", label: "don't miss out" },
  { re: /\bact\s+now\b/i, weight: 2, category: "conversion", label: "act now" },
  { re: /\blimited[\s-]?time\s+offer\b/i, weight: 2, category: "conversion", label: "limited time offer" },

  // hollow — generic platon platitudes
  { re: /\bunlock\s+(the\s+power|your|the\s+full)\b/i, weight: 2, category: "hollow", label: "unlock the power / your / the full" },
  { re: /\bsupercharge\s+(your|the)\b/i, weight: 2, category: "hollow", label: "supercharge your/the" },
  { re: /\bharness(?:ing)?\s+the\s+power\b/i, weight: 2, category: "hollow", label: "harness the power" },
];

/** Grades applied to an aggregate score for a coarse verdict. */
export const AI_SLOP_THRESHOLDS = [
  { upTo: 0, verdict: "clean" },
  { upTo: 2, verdict: "minor" },
  { upTo: 4, verdict: "sloppy" },
  { upTo: Infinity, verdict: "slop" },
];

/**
 * Scan `text` for AI-slop patterns.
 * @param {string} text
 * @param {{patterns?: {re:RegExp,weight:number,category:string,label:string}[], thresholds?: {upTo:number,verdict:string}[]}} [opts]
 * @returns {{score:number, verdict:string, flags: {category:string,label:string,weight:number,count:number,total:number}[],
 *            details: {category:string,label:string,weight:number,matches:string[],subtotal:number}[]}}
 */
export function detectAISlop(text, opts = {}) {
  const patterns = opts.patterns || AI_SLOP_PATTERNS;
  const thresholds = opts.thresholds || AI_SLOP_THRESHOLDS;
  const source = typeof text === "string" ? text : "";

  const details = [];
  let score = 0;

  for (const p of patterns) {
    const matches = [];
    const globalRe = new RegExp(p.re.source, "gi");
    let m;
    // Loop-safe duplicate match guard (avoid zero-length infinite loop by
    // requiring each match to consume the source).
    while ((m = globalRe.exec(source)) !== null && m[0].length > 0) {
      matches.push(m[0]);
      // Prevent infinite loop on a zero-width bork if any pattern were slipped in.
      if (m.index === globalRe.lastIndex) globalRe.lastIndex++;
    }
    if (matches.length === 0) continue;
    const subtotal = p.weight * matches.length;
    score += subtotal;
    details.push({
      category: p.category,
      label: p.label,
      weight: p.weight,
      matches,
      subtotal,
    });
  }

  // Pick the FIRST threshold whose upper bound still contains the score — the
  // lowest applicable grade. (Assumes thresholds are sorted ascending by upTo.)
  let verdict = "clean";
  for (const t of thresholds) {
    if (score <= t.upTo) {
      verdict = t.verdict;
      break;
    }
  }

  // Aggregate flags across categories (dedupe by label).
  const byLabel = {};
  for (const d of details) {
    byLabel[d.label] = byLabel[d.label] || { category: d.category, label: d.label, weight: d.weight, count: 0, total: 0 };
    byLabel[d.label].count += d.matches.length;
    byLabel[d.label].total += d.subtotal;
  }
  const flags = Object.values(byLabel);

  return { score, verdict, flags, details };
}

export default detectAISlop;
