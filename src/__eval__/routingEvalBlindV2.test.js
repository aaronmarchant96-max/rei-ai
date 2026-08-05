import { computeSemanticHingeScore } from "../lib/semanticHingeClassifier.js";

import { BLIND_HELDOUT_DATASET_V2_50 } from "./blindDatasetV2.js";

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

describe("Routing Eval ML — Un-Contaminated Blind Set V2 Suite (50 Prompts)", () => {
  test("evaluates all 50 un-contaminated prompts and reports embedder mode explicitly", async () => {
    let correct = 0;
    let total = 0;
    let fallbackCount = 0;
    let realOnnxCount = 0;

    for (const [category, prompts] of Object.entries(BLIND_HELDOUT_DATASET_V2_50)) {
      for (const prompt of prompts) {
        total++;
        const res = await computeSemanticHingeScore(prompt);
        expect(res).toHaveProperty("topDomain");
        expect(res).toHaveProperty("topSimilarity");
        expect(res).toHaveProperty("das");
        expect(res).toHaveProperty("fallback");

        if (res.fallback) {
          fallbackCount++;
        } else {
          realOnnxCount++;
        }

        const actualCategory = normalizeLabel(res.topDomain);
        if (actualCategory === category) {
          correct++;
        }
      }
    }

    const accuracy = (correct / total) * 100;
    const usedRealEmbeddings = fallbackCount === 0;

    // Calculate 95% Wilson Score Confidence Interval
    const z = 1.96;
    const p = correct / total;
    const denominator = 1 + (z * z) / total;
    const center = p + (z * z) / (2 * total);
    const spread = z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total));
    const ciLower = ((center - spread) / denominator) * 100;
    const ciUpper = ((center + spread) / denominator) * 100;

    // Surface the embedder mode PROMINENTLY — this is the single most important
    // piece of information in the test output.
    const embedderMode = usedRealEmbeddings
      ? "✅ REAL ONNX (all-MiniLM-L6-v2)"
      : `⚠️  SYNTHETIC HASH FALLBACK (${fallbackCount}/${total} prompts used fake vectors)`;

    console.log(`\n${"═".repeat(78)}`);
    console.log("  REI.ai v4.0 Semantic Router — Blind Set V2 Benchmark (50 Prompts)");
    console.log(`${"═".repeat(78)}`);
    console.log(`  EMBEDDER MODE:     ${embedderMode}`);
    console.log(`  Measured Accuracy: ${accuracy.toFixed(1)}% (${correct}/${total} correct)`);
    console.log(`  95% Wilson CI:     [${ciLower.toFixed(1)}%, ${ciUpper.toFixed(1)}%]`);
    console.log(`  Real ONNX:         ${realOnnxCount}/${total}  |  Fallback: ${fallbackCount}/${total}`);

    if (!usedRealEmbeddings) {
      console.log("\n  ⛔ THIS RESULT DOES NOT VALIDATE SEMANTIC ACCURACY.");
      console.log("     The accuracy number above measures hash-noise classification,");
      console.log("     not real semantic embedding similarity. The v4 semantic router");
      console.log("     has NOT been benchmarked until this test runs with fallback=0.");
      console.log("     To get real results: run in an environment where @xenova/transformers");
      console.log("     can download Xenova/all-MiniLM-L6-v2 from huggingface.co.\n");
    }

    console.log(`${"═".repeat(78)}\n`);

    if (usedRealEmbeddings) {
      // REAL ONNX MODE: enforce the actual v4 target
      expect(accuracy).toBeGreaterThanOrEqual(85.0);
    } else {
      // SYNTHETIC FALLBACK MODE: this test is a structural solvency check only.
      // It verifies the pipeline runs end-to-end without errors, but the accuracy
      // number is meaningless — it's measuring hash collisions, not semantics.
      // We do NOT claim any accuracy from this path.
      //
      // The test still passes to avoid blocking CI in environments without
      // internet/ONNX access, but the output makes clear no accuracy claim
      // can be drawn from this run.
      expect(total).toBe(50); // structural: all 50 prompts were processed
      expect(fallbackCount).toBe(50); // structural: confirms we know every prompt was fallback
    }
  });
});
