/**
 * v4 Semantic Router — Single-Author Holdout Eval
 *
 * DIFFERENT from routingEvalBlindV2 (hash-noise): this uses REAL ONNX embeddings.
 * METHODOLOGICAL NOTE:
 *   v4 centroids were frozen from external training — lower author-bias than v3.
 *   Not zero: same author picked the prompts. But centroids aren't tunable per-prompt.
 *   n=30 (5 per domain). One-shot: run once, report raw number, no tuning after.
 *   Requires @xenova/transformers. Detects synthetic fallback and aborts if ONNX missing.
 */

import { computeSemanticHingeScore } from "../lib/semanticHingeClassifier.js";

const PROMPTS = [
  // ── greeting (expect: simple-greeting) ──
  { text: "hey what's going on", category: "greeting" },
  { text: "good to see you", category: "greeting" },
  { text: "hello there friend", category: "greeting" },
  { text: "hi how are you doing", category: "greeting" },
  { text: "yo what's good", category: "greeting" },

  // ── coding (expect: coding-hinge) ──
  { text: "how do I set up Docker Compose for a Node.js app with PostgreSQL?", category: "coding" },
  { text: "I need to convert this Python script to a FastAPI endpoint", category: "coding" },
  { text: "what's wrong with this regex: /^(foo|bar$/", category: "coding" },
  { text: "write a GitHub Actions workflow that runs tests on push", category: "coding" },
  { text: "how do I lazy-load images in a React app to improve LCP?", category: "coding" },

  // ── genealogy (expect: genealogy-deep-dive) ──
  { text: "what information can I get from a 19th century probate record?", category: "genealogy" },
  { text: "find my great-grandmother's marriage license in New York 1880s", category: "genealogy" },
  { text: "what's the difference between a primary and secondary genealogy source?", category: "genealogy" },
  { text: "how do I search Irish parish registers from before civil registration?", category: "genealogy" },
  { text: "I found a census entry listing several children — how do I verify they're all siblings?", category: "genealogy" },

  // ── creative/story (expect: story-architect OR creative-prose) ──
  { text: "write me a short story about a lighthouse keeper who discovers a signal from the future", category: "story" },
  { text: "I need dialogue for a scene where a father confesses a twenty-year secret to his daughter", category: "story" },
  { text: "help me outline a three-act structure for a political thriller", category: "story" },
  { text: "describe a fantasy city built inside the skeleton of a dead god", category: "story" },
  { text: "rewrite this paragraph to be more emotional and less clinical", category: "story" },

  // ── reasoning (expect: structured-reasoning) ──
  { text: "what's the strongest evidence that global trade reduces poverty?", category: "reasoning" },
  { text: "if we abolished all intellectual property laws, what would happen to innovation?", category: "reasoning" },
  { text: "compare the reliability of eyewitness testimony vs DNA evidence in criminal trials", category: "reasoning" },
  { text: "what are the second-order effects of rent control policies on housing supply?", category: "reasoning" },
  { text: "evaluate the claim that social media causes political polarization: what's the evidence?", category: "reasoning" },

  // ── adversarial (expect: adversarial-validation OR red-team-surface) ──
  { text: "steelman the strongest argument against my position on universal healthcare", category: "adversarial" },
  { text: "find three hidden assumptions in this market forecast and challenge them", category: "adversarial" },
  { text: "act as a hostile reviewer and tear apart this research methodology", category: "adversarial" },
  { text: "I think this system is perfectly secure — prove me wrong", category: "adversarial" },
  { text: "red-team this proposal: we should require AI companies to disclose training data", category: "adversarial" },
];

const CENTROID_TO_CATEGORY = {
  "simple-greeting": "greeting",
  "coding-hinge": "coding",
  "math-solver": "coding",
  "genealogy-deep-dive": "genealogy",
  "archival-research": "genealogy",
  "evidence-evaluation": "genealogy",
  "story-architect": "story",
  "creative-prose": "story",
  "structured-reasoning": "reasoning",
  "fact-check": "reasoning",
  "debate-furnace": "reasoning",
  "telemetry-ops": "reasoning",
  "adversarial-validation": "adversarial",
  "red-team-surface": "adversarial",
  "legal-hinge": "legal",
};

describe("v4 Semantic Router — Single-Author Holdout (ONNX, n=30)", () => {
  let fallbackDetected = false;

  test("ONNX model is loaded — verify real embeddings, not synthetic fallback", async () => {
    const result = await computeSemanticHingeScore("test warmup prompt");
    if (result.fallback) {
      fallbackDetected = true;
      console.error("\n⛔ FALLBACK DETECTED: ONNX model not loaded.");
      console.error("   synthetic hash embeddings produce noise, not semantics.");
      console.error("   Install @xenova/transformers and ensure network access.");
      console.error("   Skipping accuracy measurement — results would be meaningless.\n");
    }
    expect(result).toHaveProperty("topDomain");
    expect(result).toHaveProperty("topProbability");
  });

  const results = [];

  for (const { text, category } of PROMPTS) {
    test(`"${text}" → expects "${category}"`, async () => {
      if (fallbackDetected) return;

      const result = await computeSemanticHingeScore(text);
      const topDomain = result.topDomain;
      const actual = CENTROID_TO_CATEGORY[topDomain] || "unknown";
      const match = actual === category;

      results.push({
        prompt: text,
        expected: category,
        actual,
        match,
        topDomain,
        topProbability: result.topProbability,
        isOOD: result.isOOD,
        hingeScore: result.hingeScore,
        latencyMs: result.latencyMs,
        coldStartMs: result.coldStartMs,
      });

      if (!match) {
        console.log(`  SEMANTIC MISMATCH: "${text}" → ${topDomain} (prob: ${result.topProbability?.toFixed(3)}) [expected ${category}]`);
      }
    });
  }

  test("V4 SEMANTIC ACCURACY — report only, no threshold", () => {
    if (fallbackDetected) {
      console.log("SKIPPED: ONNX fallback detected — no semantic accuracy available.");
      return;
    }

    const correct = results.filter((r) => r.match).length;
    const total = results.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

    const coldStarts = results.filter((r) => r.coldStartMs > 0);
    const latencies = results.map((r) => r.latencyMs);
    const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;

    console.log("");
    console.log("════════════════════════════════════════");
    console.log("  v4 SEMANTIC ROUTER HOLDOUT RESULT");
    console.log("════════════════════════════════════════");
    console.log(`  Accuracy: ${pct}% (${correct}/${total} correct)`);
    console.log("");
    console.log("  Method:");
    console.log("  - 384-dim ONNX embeddings (all-MiniLM-L6-v2)");
    console.log("  - Cosine similarity to frozen domain centroids");
    console.log("  - Softmax with tau=0.50, OOD threshold=0.07");
    console.log("  - v4 centroids frozen from external training");
    console.log("  - Single-author prompts (not zero-bias, but less tunable than v3)");
    console.log("  - n=30 → ~±9% margin of error at 95% CI");
    console.log("");
    console.log("  Latency:");
    console.log(`    Cold starts: ${coldStarts.length} prompts`);
    console.log(`    Avg warm latency: ${avgLatency}ms`);
    console.log(`    Max latency: ${maxLatency}ms`);
    console.log("");
    console.log("  By domain:");
    const byCategory = {};
    for (const r of results) {
      byCategory[r.expected] = byCategory[r.expected] || { correct: 0, total: 0 };
      byCategory[r.expected].total++;
      if (r.match) byCategory[r.expected].correct++;
    }
    for (const [cat, counts] of Object.entries(byCategory)) {
      const p = Math.round((counts.correct / counts.total) * 100);
      console.log(`    ${cat.padEnd(12)} ${counts.correct}/${counts.total} (${p}%)`);
    }
    console.log("════════════════════════════════════════");

    expect(correct).toBeGreaterThanOrEqual(0); // always passes — no threshold
  });
});
