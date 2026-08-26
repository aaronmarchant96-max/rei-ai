# REI.ai — Commercial Strategy & Product Roadmap

> **"The Inference FinOps & Policy Control Plane for Production AI Agents."**

This document outlines the 4-phase commercial execution strategy, immediate commercial target, BYOK open-core model, and target benchmarks for **REI.ai**.

---

## 🎯 Immediate Commercial Target

> **"Get one external developer to replace their OpenAI base URL with REI, process real traffic for two weeks, receive a defensible cost-and-quality report, and pay to continue."**

---

## 🚀 4-Phase Commercial Execution Roadmap

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       THE 4-PHASE COMMERCIAL FUNNEL                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ Phase 1: Validation & Readiness ──► Unpaid partners, BYOK, contract gate   │
│ Phase 2: Paid Bounded Pilots   ──► $500–$1.5k/mo, 30–60 day traffic audit  │
│ Phase 3: Managed Optimization  ──► $1.5k–$5k/mo + 10–20% of net savings    │
│ Phase 4: Productized Platform  ──► $99 dev / $499 team self-service         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 1: Validation and Readiness (Current Phase)
- **Goal**: Repair and contract-test the OpenAI-compatible gateway (`/api/v1/chat/completions`). **`[COMPLETED & EVIDENCED]`**
- **Partner Recruitment**: Recruit 3–5 unpaid design partners who seek regular production API use—not casual testers.
- **Telemetry Capture**: Capture provider cost, baseline cost, quality-gate results, fallbacks, latency, and completion failures.
- **Security & BYOK**: Implement BYOK credentials, tenant receipt isolation, retention controls, and exportable receipts. **`[COMPLETED & EVIDENCED]`**
- **Revenue**: $0.
- **Success Gate**: At least three users integrate through the API and one asks to continue using it.

### Phase 2: Paid, Bounded Pilots
- **Goal**: Sell 30–60 day bounded pilots to 1–3 software teams or agencies.
- **Pricing**: $500–$1,500 monthly, optionally with an upfront setup fee.
- **Credentials**: Customer supplies their own provider keys (BYOK).
- **Scope**: Define traffic limits and an agreed counterfactual baseline (e.g. GPT-4o pricing).
- **Value Proposition**: Promise empirical measurement and optimization—never a fabricated percentage.
- **Success Gate**: Observed savings with non-inferior task quality, acceptable latency, and documented renewal interest.

### Phase 3: Managed Optimization Service
- **Goal**: Transition validated pilots to a recurring managed optimization contract.
- **Pricing**: Monthly minimum of $1,500–$5,000 plus 10–20% of independently calculated net savings.
- **Integrity Rule**: Calculate savings **only on quality-gate-passing responses** (`finish_status === "complete"`). Truncated or incomplete responses contribute $0 eligible savings.
- **Contract Boundaries**: Establish baseline model mix, pricing date, workload window, and excluded traffic in the contract.
- **Reconciliation**: Include a savings cap/floor and customer-visible reconciliation report.

### Phase 4: Productized Platform
- **Goal**: Build self-service onboarding only after several customers repeatedly need the exact same workflow.
- **Self-Service Tiers**: $99/mo developer, $499/mo team, enterprise custom.
- **Metered BYOK**: Keep provider usage BYOK or separately metered.
- **Resellers**: Add resellers only after onboarding, billing, and tenant security are 100% repeatable without manual intervention.

---

## 🌍 Open-Core & BYOK Architecture

```text
┌─────────────────────────────────────────────────────────┐
│              OPEN-CORE ROUTER ENGINE (MIT)               │
│  - CARDO REI 8-Phase Loop                               │
│  - Layer 0 Serverless JS Router (serverRouter.js)       │
│  - Unified Tenant Auth Engine (authTenantEngine.js)     │
│  - Community Fingerprint Catalog (fingerprints.json)    │
└────────────────────────────┬────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
┌──────────────────────┐           ┌──────────────────────┐
│  DROP-IN PROXY API   │           │   ENTERPRISE SLICES  │
│  - OpenAI Compatible │           │  - VPC Sidecar Proxy │
│  - BYOK Credentials  │           │  - Evidence Vault    │
│  - Developer Pilot   │           │  - Red Team Scanner  │
└──────────────────────┘           └──────────────────────┘
```

---

## 📊 Target Benchmarks (Empirically Verified)

- **Cost Reduction Baseline**: **94.8%** (paid routing savings, isolated from free-tier capacity).
- **Automated Test Battery**: **1,346 tests across 119 test suites** (100% green CI).
- **Pre-Flight Decision Latency**: **< 10ms** server-side resolution before provider dispatch.
- **Verification Integrity**: Canonical verification is tracked in [`src/data/claims.json`](../src/data/claims.json) and synchronized with `docs/CLAIM_LEDGER.md`.
