import { computeSemanticHingeScore } from "../src/lib/semanticHingeClassifier.js";

const testPrompts = {
  greeting: ["greetings and salutations", "hi team"],
  coding: ["implement a debounced search input hook in RxJS", "debug memory leak in WebSocket event listener"],
  genealogy: ["find probate records for Samuel Vance in Augusta County Virginia 1795"],
  factCheck: ["did NASA really lose the original Apollo 11 moon landing telemetry tapes?"]
};

async function debug() {
  for (const [expected, prompts] of Object.entries(testPrompts)) {
    for (const prompt of prompts) {
      const res = await computeSemanticHingeScore(prompt);
      console.log(`Prompt: "${prompt}"`);
      console.log(`  Expected: ${expected}`);
      console.log(`  Actual:   ${res.topDomain} (Sim: ${res.topSimilarity.toFixed(4)}, Prob: ${res.topProbability.toFixed(4)})`);
      
      const top3 = Object.entries(res.probabilities)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([d, p]) => `${d} (${(p * 100).toFixed(1)}%)`)
        .join(", ");
      console.log(`  Top 3:    ${top3}\n`);
    }
  }
}

debug().catch(console.error);
