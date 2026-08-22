#!/usr/bin/env node
/**
 * @file scripts/verify-deployed-gateway.mjs
 * @description Live minimal-cost deployment canary verification script.
 * Runs against live deployed Vercel URL with low-cost synthetic prompt.
 * Generates canary-report.json with timestamp, commit hash, checks, and observed spend.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEPLOY_URL = process.env.REI_DEPLOY_URL || "https://prompthound-labs.vercel.app";
const CANARY_API_KEY = process.env.REI_CANARY_API_KEY || "rei_key_pilot_canary";
const COMMIT_HASH = process.env.VERCEL_GIT_COMMIT_SHA || "40a244c";

console.log("═══════════════════════════════════════════════════════════");
console.log("  REI.ai LIVE GATEWAY CANARY VERIFICATION");
console.log("═══════════════════════════════════════════════════════════");
console.log(`  Target Deployment URL: ${DEPLOY_URL}`);
console.log(`  Commit Hash:           ${COMMIT_HASH}`);
console.log(`  Canary Key:            ${CANARY_API_KEY.slice(0, 12)}...`);
console.log("═══════════════════════════════════════════════════════════\n");

async function runCanary() {
  const startTime = Date.now();
  const checks = [];
  let observedSpendUsd = 0;

  // 1. Check Health Endpoint (/api/health)
  try {
    const healthRes = await fetch(`${DEPLOY_URL}/api/health`);
    const healthJson = await healthRes.json();
    const isHealthy = healthRes.status === 200 && healthJson.status === "ready";
    checks.push({
      name: "GET /api/health probe",
      passed: isHealthy,
      status: healthRes.status,
      detail: `status=${healthJson.status}, gateway=${healthJson.gateway}`
    });
    console.log(`  [${isHealthy ? "PASS" : "FAIL"}] GET /api/health (status: ${healthRes.status})`);
  } catch (err) {
    checks.push({ name: "GET /api/health probe", passed: false, error: err.message });
    console.log(`  [FAIL] GET /api/health: ${err.message}`);
  }

  // 2. Check Unauthenticated Request (/api/v1/chat/completions without key -> 401)
  try {
    const unauthRes = await fetch(`${DEPLOY_URL}/api/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "rei-auto", messages: [{ role: "user", content: "test" }] })
    });
    const unauthJson = await unauthRes.json();
    const is401 = unauthRes.status === 401 && unauthJson.error?.type === "authentication_error";
    checks.push({
      name: "POST /api/v1/chat/completions missing auth (401)",
      passed: is401,
      status: unauthRes.status,
      code: unauthJson.error?.code
    });
    console.log(`  [${is401 ? "PASS" : "FAIL"}] Missing key returns 401 (code: ${unauthJson.error?.code})`);
  } catch (err) {
    checks.push({ name: "POST missing auth", passed: false, error: err.message });
    console.log(`  [FAIL] Missing auth test: ${err.message}`);
  }

  // 3. Check Live Synthetic Inference Request (/api/v1/chat/completions with valid key)
  try {
    const inferRes = await fetch(`${DEPLOY_URL}/api/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CANARY_API_KEY}`
      },
      body: JSON.stringify({
        model: "rei-auto",
        messages: [{ role: "user", content: "Explain this function in 1 short sentence." }]
      })
    });

    if (inferRes.status === 200) {
      const inferJson = await inferRes.json();
      observedSpendUsd = inferJson.receipt?.observed_cost_usd || 0;
      const isComplete = inferJson.choices?.[0]?.finish_reason === "stop";
      checks.push({
        name: "POST /api/v1/chat/completions synthetic inference",
        passed: true,
        status: 200,
        model: inferJson.model,
        finishReason: inferJson.choices?.[0]?.finish_reason,
        observedSpendUsd
      });
      console.log(`  [PASS] Live synthetic inference complete (model: ${inferJson.model}, spend: $${observedSpendUsd})`);
    } else {
      checks.push({
        name: "POST /api/v1/chat/completions synthetic inference",
        passed: false,
        status: inferRes.status
      });
      console.log(`  [WARN] Live synthetic inference returned status ${inferRes.status}`);
    }
  } catch (err) {
    checks.push({ name: "POST synthetic inference", passed: false, error: err.message });
    console.log(`  [WARN] Live synthetic inference failed: ${err.message}`);
  }

  const durationMs = Date.now() - startTime;
  const passedCount = checks.filter((c) => c.passed).length;
  const overallStatus = passedCount === checks.length ? "HEALTHY" : "DEGRADED";

  const report = {
    timestamp: new Date().toISOString(),
    commit: COMMIT_HASH,
    deploymentUrl: DEPLOY_URL,
    overallStatus,
    durationMs,
    totalChecks: checks.length,
    passedChecks: passedCount,
    observedSpendUsd,
    checks
  };

  const outputPath = path.join(process.cwd(), "canary-report.json");
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(`  CANARY RESULT: ${overallStatus} (${passedCount}/${checks.length} checks passed)`);
  console.log(`  Report written to: ${outputPath}`);
  console.log("═══════════════════════════════════════════════════════════\n");
}

runCanary();
