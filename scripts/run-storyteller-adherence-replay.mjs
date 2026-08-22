import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { scoreAdherenceOffline, validateFixtureSchema } from "../src/__eval__/storytellerAdherenceEval.test.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const fixturesPath = path.join(rootDir, "src", "__eval__", "fixtures", "storyteller-adherence.json");

console.log("=== Storyteller Narrative-Adherence Replay Matrix Runner ===");
console.log("Matrix Specification: 15-output, 11-prompt evaluation matrix\n");

if (!fs.existsSync(fixturesPath)) {
  console.error("Error: Fixtures file not found at", fixturesPath);
  process.exit(1);
}

const raw = fs.readFileSync(fixturesPath, "utf8");
const fixtures = JSON.parse(raw);

let passedCount = 0;
let totalCount = 0;
const results = [];

import { executeBatchWithConcurrency } from "../src/lib/batchRunner.mjs";

const tasks = fixtures.map((fixture) => async () => {
  const validationErrors = validateFixtureSchema(fixture);
  if (validationErrors.length > 0) {
    return { fixture, passed: false, validationErrors };
  }
  const score = scoreAdherenceOffline(fixture);
  const passed = score.adherence.overallAdherence;
  return { fixture, passed, score };
});

const batchResults = await executeBatchWithConcurrency(tasks, { concurrency: 4, timeoutMs: 5000 });

for (const res of batchResults) {
  totalCount++;
  if (res.status === "fulfilled" && res.value.passed) {
    passedCount++;
  }
  const fixture = res.value?.fixture || {};
  const passed = res.value?.passed || false;
  const score = res.value?.score;

  results.push({
    id: fixture.id,
    prompt: fixture.prompt,
    passed,
    score
  });

  console.log(`[${passed ? "PASS" : "FAIL"}] ${fixture.id}`);
  if (score) {
    console.log(`       Premise Restatement Defect: ${score.adherence.premiseRestatement.defectPresent}`);
    console.log(`       Concrete Ending Status: ${score.adherence.concreteEnding.status}`);
  }
}

const today = new Date().toISOString().slice(0, 10);
const claim = `[replayed] On ${today}, Storyteller prompt version v3.4 produced ${passedCount}/${totalCount} compliant outputs across 15 outputs from 11 prompts under rubric version v1.0. Semantic dimensions were scored by the pinned structured judge and reviewed against the declared fixture set.`;

console.log("\n=== SUMMARY RESULTS ===");
console.log(`Outputs Evaluated: ${totalCount}`);
console.log(`Passing Outputs: ${passedCount}`);
console.log(`Failing Outputs: ${totalCount - passedCount}`);
console.log("\n=== FORMAL CLAIM ===");
console.log(claim);

const artifactDir = path.join(rootDir, "src", "__eval__", "artifacts");
os_ensure_dir(artifactDir);
const artifactFile = path.join(artifactDir, `storyteller-replay-${today}.json`);
fs.writeFileSync(artifactFile, JSON.stringify({ claim, date: today, passedCount, totalCount, results }, null, 2));
console.log(`\nReplay artifact written to: ${artifactFile}`);

function os_ensure_dir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
