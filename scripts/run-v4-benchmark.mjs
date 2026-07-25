import { computeSemanticHingeScore } from "../src/lib/semanticHingeClassifier.js";
import { BLIND_HELDOUT_DATASET_V2_50 } from "../src/__eval__/blindDatasetV2.js";

function normalizeLabel(label) {
  const map = {
    "simple-greeting": "greeting",
    "coding-hinge": "coding",
    "genealogy-deep-dive": "genealogy",
    "archival-research": "genealogy",
    "creative-prose": "creative",
    "story-architect": "creative",
    "fact-check": "factCheck",
    "evidence-evaluation": "factCheck",
    "structured-reasoning": "reasoning",
    "debate-furnace": "reasoning",
    "legal-hinge": "reasoning",
    "math-solver": "reasoning",
    "red-team-surface": "adversarial",
    "adversarial-validation": "adversarial",
  };
  return map[label] || "unknown";
}

async function runBenchmark() {
  console.log("Starting v4 Semantic Router Benchmark (Native ESM)...");
  console.log("==============================================================================");
  console.log(`Execution Environment: Node ${process.version} (${process.platform}-${process.arch})`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("==============================================================================\n");
  
  let correct = 0;
  let total = 0;
  let fallbackCount = 0;

  for (const [category, prompts] of Object.entries(BLIND_HELDOUT_DATASET_V2_50)) {
    for (const prompt of prompts) {
      total++;
      const res = await computeSemanticHingeScore(prompt);
      
      if (res.fallback) {
        fallbackCount++;
      }

      const actualCategory = normalizeLabel(res.topDomain);
      const isCorrect = actualCategory === category;
      if (isCorrect) {
        correct++;
      }
      
      console.log(`[${total.toString().padStart(2, '0')}/50] ${isCorrect ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`   Prompt:   "${prompt}"`);
      console.log(`   Expected: ${category}`);
      console.log(`   Actual:   ${res.topDomain} (Sim: ${res.topSimilarity.toFixed(4)})`);
    }
    console.log(""); // Spacing between categories
  }

  const accuracy = (correct / total) * 100;
  
  console.log(`\n${"═".repeat(78)}`);
  console.log(`  REI.ai v4.0 Semantic Router — Native ESM Benchmark`);
  console.log(`${"═".repeat(78)}`);
  console.log(`  EMBEDDER MODE:     ${fallbackCount === 0 ? "✅ REAL ONNX (all-MiniLM-L6-v2)" : `⚠️  SYNTHETIC HASH FALLBACK (${fallbackCount}/${total} prompts)`}`);
  console.log(`  Measured Accuracy: ${accuracy.toFixed(1)}% (${correct}/${total} correct)`);
  console.log(`${"═".repeat(78)}\n`);

  if (fallbackCount > 0) {
    process.exit(1);
  }
}

runBenchmark().catch(console.error);
