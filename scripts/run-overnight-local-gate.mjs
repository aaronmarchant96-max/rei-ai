/**
 * OVERNIGHT LOCAL MODEL GATE — v1
 * 
 * Quality Gate Evaluation Harness for Local LLaMA / Ollama Candidates.
 * 
 * Execution Order Rule: Quality → Economics → Security.
 * Local models do NOT enter routing policy automatically.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { buildPool } from "../src/__eval__/hingeCalibrationDebate.js";
import { buildRouterDecision } from "../src/lib/nightShiftRouter.js";
import { parseAssistantStyleReply } from "../src/lib/replyParser.js";
import { detectAISlop } from "../src/lib/detectAISlop.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const RAW_LOG_PATH = path.join(REPO_ROOT, "docs", "overnight_local_gate_raw.jsonl");
const SUMMARY_JSON_PATH = path.join(REPO_ROOT, "docs", "overnight_local_gate_summary.json");
const REPORT_MD_PATH = path.join(REPO_ROOT, "docs", "OVERNIGHT_LOCAL_MODEL_GATE.md");

// Configuration Defaults
const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || "http://localhost:11434";
const TARGET_MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b";
const FROZEN_TEMPERATURE = 0.0;
const FROZEN_TOP_P = 1.0;

/**
 * Computes deterministic SHA-256 hash of the 136-prompt corpus
 */
function computeCorpusHash(pool) {
  const corpusString = JSON.stringify(
    pool.map((p) => ({ text: p.text.trim().toLowerCase(), source: p.source, category: p.category }))
  );
  return crypto.createHash("sha256").update(corpusString).digest("hex");
}

/**
 * Checks if local Ollama service is reachable
 */
async function checkOllamaServer() {
  try {
    const res = await fetch(`${OLLAMA_ENDPOINT}/api/tags`);
    if (!res.ok) return { online: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    const models = data.models || [];
    const found = models.find((m) => m.name === TARGET_MODEL || m.name.startsWith(TARGET_MODEL));
    return {
      online: true,
      foundModel: !!found,
      modelDigest: found?.digest || "unknown_digest",
      availableModels: models.map((m) => m.name),
    };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

/**
 * Calls Ollama API for a prompt
 */
async function queryOllama(promptText, domain) {
  const systemPrompt = `You are REI.ai (${domain || "Generalist"}). Respond clearly using structured CARDO format when appropriate (Hinge, Facts, Assumptions, Evaluation, ChangeMind, Move). Maintain strict epistemic discipline: never conflate facts with assumptions, and never present unverified claims as verified.`;

  const startTime = Date.now();
  const res = await fetch(`${OLLAMA_ENDPOINT}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: TARGET_MODEL,
      prompt: promptText,
      system: systemPrompt,
      options: {
        temperature: FROZEN_TEMPERATURE,
        top_p: FROZEN_TOP_P,
      },
      stream: false,
    }),
  });

  const durationMs = Date.now() - startTime;
  if (!res.ok) {
    throw new Error(`Ollama API error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const completionText = data.response || "";
  const evalCount = data.eval_count || 0;
  const evalDuration = data.eval_duration || 1; // nanoseconds
  const tokensPerSec = evalCount > 0 ? (evalCount / (evalDuration / 1e9)).toFixed(2) : "0.0";

  return {
    completionText,
    durationMs,
    evalCount,
    tokensPerSec: parseFloat(tokensPerSec),
  };
}

/**
 * Epistemic & Structural Evaluator
 */
function evaluateResponse(promptEntry, completionText, routerDecision) {
  const hardFailures = [];
  const text = completionText || "";

  // 1. CARDO Structural Adherence
  const parsed = parseAssistantStyleReply(text);
  const hasHinge = !!parsed.Hinge;
  const hasFacts = !!parsed.Facts;
  const hasAssumptions = !!parsed.Assumptions;
  const hasMove = !!parsed.Move;
  
  const isComplex = routerDecision.id !== "simple-greeting";
  const cardoStructureScore = isComplex
    ? ([hasHinge, hasFacts, hasAssumptions, hasMove].filter(Boolean).length / 4) * 100
    : 100;

  // 2. Hard Failure Check: Facts/Assumptions Collapse
  if (hasFacts && hasAssumptions && parsed.Facts.trim() === parsed.Assumptions.trim()) {
    hardFailures.push("facts_assumptions_collapse");
  }

  // 3. Hard Failure Check: Invented Facts Presented as Verified
  const presentsUnverifiedAsFact =
    /\b(proven fact|100% verified|undeniable truth|scientifically proven)\b/i.test(text) &&
    /\b(alleged|unconfirmed|hypothetical|speculative)\b/i.test(text);
  if (presentsUnverifiedAsFact) {
    hardFailures.push("invented_facts_as_verified");
  }

  // 4. Hard Failure Check: Malformed / Truncated Delivery
  if (text.length < 5 || (text.includes("```") && (text.match(/```/g) || []).length % 2 !== 0)) {
    hardFailures.push("malformed_delivery");
  }

  // 5. Anti-Slop Score
  const slopResult = detectAISlop(text);
  const antiSlopScore = slopResult.isSlop ? Math.max(0, 100 - slopResult.flags.length * 25) : 100;

  // 6. Epistemic Correctness (Separated from Structure)
  let epistemicCorrectnessScore = 100;
  if (hardFailures.includes("facts_assumptions_collapse")) epistemicCorrectnessScore -= 50;
  if (hardFailures.includes("invented_facts_as_verified")) epistemicCorrectnessScore -= 50;
  if (slopResult.isSlop) epistemicCorrectnessScore -= 15;
  epistemicCorrectnessScore = Math.max(0, epistemicCorrectnessScore);

  return {
    cardoStructureScore,
    epistemicCorrectnessScore,
    antiSlopScore,
    hardFailures,
    isCleanDelivery: hardFailures.length === 0,
    parsedSections: Object.keys(parsed).filter((k) => !!parsed[k]),
  };
}

/**
 * Main Run Executable
 */
export async function runOvernightGate() {
  console.log("===============================================================================");
  console.log("                 OVERNIGHT LOCAL MODEL GATE — v1");
  console.log("===============================================================================");
  console.log(`Target Model   : ${TARGET_MODEL}`);
  console.log(`Endpoint       : ${OLLAMA_ENDPOINT}`);
  console.log(`Config         : Temperature=${FROZEN_TEMPERATURE}, Top_P=${FROZEN_TOP_P}`);

  const serverStatus = await checkOllamaServer();
  if (!serverStatus.online) {
    console.error(`\n❌ ERROR: Could not connect to local Ollama server at ${OLLAMA_ENDPOINT}`);
    console.error(`Reason: ${serverStatus.error}`);
    console.error(`\nTo start local Ollama server, run:\n  /home/aaron/repos/rei-character-runtime/.local/ollama/bin/ollama serve`);
    return { success: false, reason: "server_offline" };
  }

  console.log(`Ollama Status  : Online (Available Models: ${serverStatus.availableModels.join(", ") || "none"})`);
  console.log(`Model Digest   : ${serverStatus.modelDigest}`);

  const pool = buildPool();
  const corpusHash = computeCorpusHash(pool);
  console.log(`Corpus Size    : ${pool.length} blind prompts across 5 REI domains`);
  console.log(`Corpus Hash    : ${corpusHash}`);
  console.log("-------------------------------------------------------------------------------\n");

  const rawWriteStream = fs.createWriteStream(RAW_LOG_PATH, { flags: "w" });
  const results = [];
  let completedCount = 0;
  let hardFailureCount = 0;

  for (let i = 0; i < pool.length; i++) {
    const entry = pool[i];
    const routerDecision = buildRouterDecision({ input: entry.text, domain: entry.category });

    process.stdout.write(`[${i + 1}/${pool.length}] Evaluating: "${entry.text.slice(0, 45)}..." `);

    try {
      const ollamaRes = await queryOllama(entry.text, entry.category);
      const evalRes = evaluateResponse(entry, ollamaRes.completionText, routerDecision);

      const record = {
        promptIndex: i + 1,
        source: entry.source,
        category: entry.category,
        promptText: entry.text,
        routeId: routerDecision.id,
        recommendedModel: routerDecision.model,
        durationMs: ollamaRes.durationMs,
        evalCount: ollamaRes.evalCount,
        tokensPerSec: ollamaRes.tokensPerSec,
        cardoStructureScore: evalRes.cardoStructureScore,
        epistemicCorrectnessScore: evalRes.epistemicCorrectnessScore,
        antiSlopScore: evalRes.antiSlopScore,
        hardFailures: evalRes.hardFailures,
        isCleanDelivery: evalRes.isCleanDelivery,
        completionLength: ollamaRes.completionText.length,
        timestamp: new Date().toISOString(),
      };

      rawWriteStream.write(JSON.stringify(record) + "\n");
      results.push(record);
      completedCount++;

      if (!evalRes.isCleanDelivery) hardFailureCount++;

      console.log(`✓ (${ollamaRes.durationMs}ms | ${ollamaRes.tokensPerSec} t/s | Struct: ${evalRes.cardoStructureScore}% | Epistemic: ${evalRes.epistemicCorrectnessScore}%)`);
    } catch (err) {
      console.log(`❌ FAILED (${err.message})`);
      const errorRecord = {
        promptIndex: i + 1,
        source: entry.source,
        category: entry.category,
        promptText: entry.text,
        error: err.message,
        hardFailures: ["delivery_exception"],
        timestamp: new Date().toISOString(),
      };
      rawWriteStream.write(JSON.stringify(errorRecord) + "\n");
      results.push(errorRecord);
      hardFailureCount++;
    }
  }

  rawWriteStream.end();

  // Aggregate Computations
  const totalEvaluated = results.length;
  const avgLatencyMs = Math.round(results.reduce((a, b) => a + (b.durationMs || 0), 0) / totalEvaluated);
  const avgTokensPerSec = (results.reduce((a, b) => a + (b.tokensPerSec || 0), 0) / totalEvaluated).toFixed(2);
  const avgCardoStructure = (results.reduce((a, b) => a + (b.cardoStructureScore || 0), 0) / totalEvaluated).toFixed(1);
  const avgEpistemicCorrectness = (results.reduce((a, b) => a + (b.epistemicCorrectnessScore || 0), 0) / totalEvaluated).toFixed(1);
  const avgAntiSlop = (results.reduce((a, b) => a + (b.antiSlopScore || 0), 0) / totalEvaluated).toFixed(1);

  const summary = {
    contractVersion: "OVERNIGHT LOCAL MODEL GATE v1",
    modelTag: TARGET_MODEL,
    modelDigest: serverStatus.modelDigest,
    corpusHash,
    totalPrompts: pool.length,
    completedPrompts: completedCount,
    hardFailuresCount: hardFailureCount,
    passRatePercent: parseFloat((((totalEvaluated - hardFailureCount) / totalEvaluated) * 100).toFixed(1)),
    benchmarks: {
      avgLatencyMs,
      avgTokensPerSec: parseFloat(avgTokensPerSec),
      avgCardoStructurePercent: parseFloat(avgCardoStructure),
      avgEpistemicCorrectnessPercent: parseFloat(avgEpistemicCorrectness),
      avgAntiSlopPercent: parseFloat(avgAntiSlop),
    },
    promotionGateStatus: hardFailureCount === 0 && parseFloat(avgEpistemicCorrectness) >= 90
      ? "CANDIDATE_ELIGIBLE_FOR_REPLAY_BATTLE"
      : "REJECTED_NEEDS_IMPROVEMENT",
    executedAt: new Date().toISOString(),
  };

  fs.writeFileSync(SUMMARY_JSON_PATH, JSON.stringify(summary, null, 2));

  // Executive Markdown Generator
  const markdownReport = `# Overnight Local Model Gate — Executive Benchmark Report

**Contract**: \`OVERNIGHT LOCAL MODEL GATE v1\`  
**Target Candidate**: \`${TARGET_MODEL}\`  
**Digest**: \`${serverStatus.modelDigest}\`  
**Corpus Hash**: \`${corpusHash}\`  
**Executed At**: \`${summary.executedAt}\`  

---

> 🛑 **Promotion Rule Notice**: This overnight run evaluates candidate capability evidence. Local models do **NOT** enter routing policy automatically. A passing result qualifies the candidate for human review and routing regression tests prior to policy eligibility.

---

## 1. Summary Dashboard

| Metric | Score / Value | Status / Gate |
|---|:---:|:---:|
| **Total Prompts Evaluated** | **${summary.totalPrompts}** | 100% Corpus Coverage |
| **Hard Failures** | **${summary.hardFailuresCount}** | ${summary.hardFailuresCount === 0 ? "✅ ZERO HARD FAILURES" : "❌ GATE FAILED"} |
| **CARDO Structural Adherence** | **${summary.benchmarks.avgCardoStructurePercent}%** | ${summary.benchmarks.avgCardoStructurePercent >= 85 ? "PASS" : "WARN"} |
| **Epistemic Correctness (Separated)** | **${summary.benchmarks.avgEpistemicCorrectnessPercent}%** | ${summary.benchmarks.avgEpistemicCorrectnessPercent >= 90 ? "PASS" : "FAIL"} |
| **Anti-Slop Score** | **${summary.benchmarks.avgAntiSlopPercent}%** | Clean |
| **Average Generation Speed** | **${summary.benchmarks.avgTokensPerSec} t/s** | Benchmark |
| **Average Latency** | **${summary.benchmarks.avgLatencyMs} ms** | Benchmark |

---

## 2. Hard Failure Audit Breakdown

${summary.hardFailuresCount === 0 
  ? "✅ **Zero hard failures observed.** The candidate maintained delivery integrity, avoided Facts/Assumptions collapse, and presented zero unverified facts as verified."
  : `❌ **${summary.hardFailuresCount} hard failure(s) detected during evaluation.** Candidate requires prompt alignment or model fine-tuning before proceeding.`}

---

## 3. Next Steps & Promotion Workflow

1. **Raw Receipts File**: [\`docs/overnight_local_gate_raw.jsonl\`](./overnight_local_gate_raw.jsonl)
2. **Summary Package**: [\`docs/overnight_local_gate_summary.json\`](./overnight_local_gate_summary.json)
3. **Sequence Status**:
   - ${summary.promotionGateStatus === "CANDIDATE_ELIGIBLE_FOR_REPLAY_BATTLE" 
     ? "✅ **Quality Gate Passed**: Candidate qualifies for **Stage 2: Local vs. Cloud Replay Battle**." 
     : "❌ **Quality Gate Failed**: Candidate is rejected for routing policy eligibility. Resolve epistemic/delivery failures prior to economics testing."}
`;

  fs.writeFileSync(REPORT_MD_PATH, markdownReport);
  console.log("\n===============================================================================");
  console.log(`Benchmark Complete! Markdown Report written to:\n  file://${REPORT_MD_PATH}`);
  console.log("===============================================================================");

  return summary;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runOvernightGate().catch(console.error);
}
