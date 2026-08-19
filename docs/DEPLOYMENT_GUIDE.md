# REI.ai Deployment, Staging & Incident Mitigation Guide

This guide defines the production deployment workflows, staging preview gates, health monitoring, and instant rollback procedures for REI.ai.

---

## 1. Priority Runbook Overview

| Priority | Strategy | Implementation |
|---|---|---|
| **P0 (Staging)** | Isolated Preview Deployment | Vercel Git Branch Previews (`git push origin staging`) |
| **P1 (Health Check)** | 0-Cost Liveness & Telemetry | `GET /api/health` & `bash scripts/verify-deploy.sh` |
| **P2 (Rollback)** | Instant 1-Second Traffic Revert | `npx vercel rollback` (Zero build delay) |
| **P3 (Decoupling)** | Frontend / API Separation | Standalone `server.js` / Next.js API Routes on Vercel |
| **P4 (Canary)** | Weighted Traffic Rollouts | Edge Middleware Traffic Splitting (10% $\rightarrow$ 100%) |

---

## 2. P0: Staging Environment Workflow

Never push breaking changes directly to `main`. Use Vercel's automatic branch isolation:

1. **Create and push to staging:**
   ```bash
   git checkout -b staging
   git push -u origin staging
   ```
2. **Preview URL:**
   Vercel automatically generates an isolated preview URL:
   ```text
   https://rei-ai-git-staging-aaronmarchant96-maxs-projects.vercel.app
   ```
3. **Run Smoke Test on Staging:**
   ```bash
   PROD_URL="https://rei-ai-git-staging-aaronmarchant96-maxs-projects.vercel.app" node scripts/smoke-test.mjs
   ```
4. **Merge to Main only when all tests pass:**
   ```bash
   git checkout main
   git merge staging
   git push origin main
   ```

---

## 3. P1: Health Checks & Automated Verification

### A. Health Endpoint (`/api/health`)
- **Route:** `GET https://prompthound-labs.vercel.app/api/health`
- **Cost:** $0.00 (Zero LLM token consumption)
- **Response:**
  ```json
  {
    "status": "healthy",
    "service": "rei-ai",
    "version": "1.0.0",
    "uptimeSeconds": 1420,
    "checks": {
      "router": "operational",
      "openaiProxy": "operational",
      "claimsGate": "verified"
    },
    "metrics": {
      "passingTests": 953,
      "testSuites": 77,
      "supportedModels": 7
    }
  }
  ```

### B. Automated Post-Deployment Smoke Test
Run immediately after any deployment:
```bash
bash scripts/verify-deploy.sh
```

---

## 4. P2: Instant Rollback Procedure (In Crisis)

If a deployment introduces a breaking change or proxy regression:

### Option A: Vercel CLI Instant Rollback (Recommended — 1.2 seconds)
Rolls back traffic to the previous healthy deployment instantly without triggering a rebuild:
```bash
# 1. Rollback to previous deployment
npx vercel rollback

# 2. Or rollback to a specific known-good deployment URL:
npx vercel rollback <deployment-url>
```

### Option B: Git Revert (Clean Commit History)
```bash
git revert HEAD --no-edit
git push origin main
```

---

## 5. P3: Frontend / API Decoupling Architecture

For high-throughput enterprise deployments:
* **Static UI (Vite / React):** Deployed to global CDN with static caching.
* **Cognitive Gateway (`/api/v1/*` & `/api/cfai`):** Deployed as serverless / edge runtime or on-premise ARM SBC node (`server.js`).

---

## 6. P4: Canary Traffic Splitting Strategy

When launching major router neural weight updates or new experimental backends:
1. Set edge middleware cookie or header (`x-rei-canary: 0.1`).
2. Route 10% of `rei-auto` queries to the experimental candidate while 90% stays on stable weights.
3. Monitor error-gap tags in `data/proxy_telemetry.jsonl`.
4. Promote to 100% upon passing zero-regression claim verification.
