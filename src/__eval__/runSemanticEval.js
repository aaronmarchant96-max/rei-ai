/**
 * v4 Semantic Router — Standalone Blind Eval (Node.js, not Jest)
 * Run: node src/__eval__/runSemanticEval.js
 */
import { computeSemanticHingeScore } from "../lib/semanticHingeClassifier.js";

const PROMPTS = [
  { text: "hey what's going on", category: "greeting" },
  { text: "good to see you", category: "greeting" },
  { text: "hello there friend", category: "greeting" },
  { text: "hi how are you doing", category: "greeting" },
  { text: "yo what's good", category: "greeting" },
  { text: "how do I set up Docker Compose for a Node.js app with PostgreSQL?", category: "coding" },
  { text: "I need to convert this Python script to a FastAPI endpoint", category: "coding" },
  { text: "what's wrong with this regex: /^(foo|bar$/", category: "coding" },
  { text: "write a GitHub Actions workflow that runs tests on push", category: "coding" },
  { text: "how do I lazy-load images in a React app to improve LCP?", category: "coding" },
  { text: "what information can I get from a 19th century probate record?", category: "genealogy" },
  { text: "find my great-grandmother's marriage license in New York 1880s", category: "genealogy" },
  { text: "what's the difference between a primary and secondary genealogy source?", category: "genealogy" },
  { text: "how do I search Irish parish registers from before civil registration?", category: "genealogy" },
  { text: "I found a census entry listing several children — how do I verify they're all siblings?", category: "genealogy" },
  { text: "write me a short story about a lighthouse keeper who discovers a signal from the future", category: "story" },
  { text: "I need dialogue for a scene where a father confesses a twenty-year secret to his daughter", category: "story" },
  { text: "help me outline a three-act structure for a political thriller", category: "story" },
  { text: "describe a fantasy city built inside the skeleton of a dead god", category: "story" },
  { text: "rewrite this paragraph to be more emotional and less clinical", category: "story" },
  { text: "what's the strongest evidence that global trade reduces poverty?", category: "reasoning" },
  { text: "if we abolished all intellectual property laws, what would happen to innovation?", category: "reasoning" },
  { text: "compare the reliability of eyewitness testimony vs DNA evidence in criminal trials", category: "reasoning" },
  { text: "what are the second-order effects of rent control policies on housing supply?", category: "reasoning" },
  { text: "evaluate the claim that social media causes political polarization: what's the evidence?", category: "reasoning" },
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

async function run() {
  console.log("\n════════════════════════════════════════");
  console.log("  v4 SEMANTIC ROUTER HOLDOUT EVAL");
  console.log("  n=30, one-shot, real ONNX embeddings");
  console.log("════════════════════════════════════════\n");

  let correct = 0;
  let total = 0;
  let totalLatency = 0;
  let maxLatency = 0;
  let coldStarts = 0;
  const byCategory = {};
  const mismatches = [];

  for (const { text, category } of PROMPTS) {
    total++;
    const result = await computeSemanticHingeScore(text);

    if (result.fallback) {
      console.error("⛔ ONNX FALLBACK DETECTED — aborting eval.");
      console.error(`   Reason: ${result.fallbackError}`);
      console.error("   Semantic accuracy measurements are meaningless with synthetic hash.\n");
      process.exit(1);
    }

    const topDomain = result.topDomain;
    const actual = CENTROID_TO_CATEGORY[topDomain] || "unknown";
    const match = actual === category;

    if (match) correct++;
    totalLatency += result.latencyMs;
    if (result.latencyMs > maxLatency) maxLatency = result.latencyMs;
    if (result.coldStartMs > 0) coldStarts++;

    byCategory[category] = byCategory[category] || { correct: 0, total: 0 };
    byCategory[category].total++;
    if (match) byCategory[category].correct++;

    const icon = match ? "✓" : "✗";
    console.log(`  ${icon} [${category.padEnd(11)}] → ${topDomain.padEnd(24)} prob:${result.topProbability?.toFixed(3)} | ${result.latencyMs}ms ${result.fallback ? "⚠️FALLBACK" : ""}`);

    if (!match) {
      mismatches.push({ prompt: text, expected: category, actual, topDomain, prob: result.topProbability });
    }
  }

  const pct = Math.round((correct / total) * 100);
  const avgLatency = Math.round(totalLatency / total);

  console.log("\n════════════════════════════════════════");
  console.log(`  Accuracy: ${pct}% (${correct}/${total} correct)`);
  console.log("");
  console.log("  Latency:");
  console.log(`    Cold starts: ${coldStarts} prompts`);
  console.log(`    Avg warm: ${avgLatency}ms`);
  console.log(`    Max: ${maxLatency}ms`);
  console.log("");
  console.log("  By domain:");
  for (const [cat, counts] of Object.entries(byCategory)) {
    const p = Math.round((counts.correct / counts.total) * 100);
    console.log(`    ${cat.padEnd(12)} ${counts.correct}/${counts.total} (${p}%)`);
  }
  console.log("");
  console.log("  Method:");
  console.log("  - 384-dim ONNX embeddings (all-MiniLM-L6-v2)");
  console.log("  - Cosine similarity to frozen domain centroids");
  console.log("  - Softmax tau=0.50, OOD threshold=0.07");
  console.log("  - Single-author prompts, frozen centroids (less tunable than v3)");
  console.log("  - n=30 → ~±9% margin of error at 95% CI");
  console.log("════════════════════════════════════════\n");
}

run().catch(e => {
  console.error("Eval failed:", e.message);
  process.exit(1);
});
