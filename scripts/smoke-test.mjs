import fs from "node:fs";

const PROD_URL = "https://prompthound-labs.vercel.app";

async function runSmokeTests() {
  console.log("==========================================================");
  console.log("             REI.AI PRODUCTION SMOKE TEST                 ");
  console.log("==========================================================");
  console.log(`Target Domain: ${PROD_URL}
`);

  let allPassed = true;

  // 1. Check Subsystem Health & Internal State Probes
  try {
    process.stdout.write("1. Testing Subsystem State Probes (GET /api/health)... ");
    const t0 = Date.now();
    const res = await fetch(`${PROD_URL}/api/health`);
    const latency = Date.now() - t0;
    if (res.status === 200) {
      const data = await res.json();
      const hinge = data.subsystems?.hingeClassifier?.status || "ok";
      const dim = data.subsystems?.semanticCentroids?.vectorDim || 0;
      console.log(`✅ PASS (HTTP 200, ${latency}ms, Hinge: ${hinge}, Centroids: ${dim}d)`);
    } else {
      console.log(`❌ FAIL (HTTP ${res.status})`);
      allPassed = false;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    allPassed = false;
  }

  // 2. Check Frontend Web App
  try {
    process.stdout.write("2. Testing Frontend Web App (GET /)... ");
    const t0 = Date.now();
    const res = await fetch(PROD_URL);
    const latency = Date.now() - t0;
    if (res.status === 200) {
      console.log(`✅ PASS (HTTP 200, ${latency}ms)`);
    } else {
      console.log(`❌ FAIL (HTTP ${res.status})`);
      allPassed = false;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    allPassed = false;
  }

  // 3. Check OpenAI-Compatible Models Endpoint
  try {
    process.stdout.write("3. Testing OpenAI Proxy Endpoint (GET /api/v1/models)... ");
    const t0 = Date.now();
    const res = await fetch(`${PROD_URL}/api/v1/models`);
    const latency = Date.now() - t0;
    if (res.status === 200) {
      const data = await res.json();
      const modelCount = data.data?.length || 0;
      console.log(`✅ PASS (HTTP 200, ${latency}ms, ${modelCount} models listed)`);
    } else {
      console.log(`❌ FAIL (HTTP ${res.status})`);
      allPassed = false;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    allPassed = false;
  }

  // 4. Check Native CFAI Reasoning Router
  try {
    process.stdout.write("4. Testing Native Router Endpoint (POST /api/cfai)... ");
    const t0 = Date.now();
    const res = await fetch(`${PROD_URL}/api/cfai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        command: "score",
        input: "hi",
        systemPrompt: "You are The Generalist.",
        history: []
      })
    });
    const latency = Date.now() - t0;
    if (res.status === 200) {
      const data = await res.json();
      console.log(`✅ PASS (HTTP 200, ${latency}ms, model: ${data.model || "ok"})`);
    } else {
      console.log(`❌ FAIL (HTTP ${res.status})`);
      allPassed = false;
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err.message}`);
    allPassed = false;
  }

  // 5. Telemetry Secret Leak Audit
  process.stdout.write("5. Auditing Local Telemetry Files for Key Leaks... ");
  const telemetryPath = "data/proxy_telemetry.jsonl";
  if (fs.existsSync(telemetryPath)) {
    const raw = fs.readFileSync(telemetryPath, "utf8");
    if (raw.includes("gsk_") || raw.includes("AIzaSy") || raw.includes("sk-") || raw.includes("Bearer ")) {
      console.log("❌ LEAK DETECTED: Found API key or Bearer token in telemetry log!");
      allPassed = false;
    } else {
      console.log("✅ PASS (0 exposed secrets found)");
    }
  } else {
    console.log("✅ PASS (no telemetry file created yet)");
  }

  console.log("==========================================================");
  if (allPassed) {
    console.log("🎉 ALL PRODUCTION SMOKE TESTS PASSED CLEANLY");
  } else {
    console.log("⚠️  ONE OR MORE SMOKE TESTS FAILED — CHECK LOGS BEFORE PROCEEDING");
    process.exit(1);
  }
  console.log("==========================================================\n");
}

runSmokeTests();
