---
status: canonical
authority_scope: business-strategy-pricing-and-financials
owner: Aaron Marchant
last_verified: 2026-08-22
verified_against_commit: a29d750
claims_source: docs/CLAIM_LEDGER.md
supersedes: []
superseded_by: null
archived_at: null
---

# REI.ai — Comprehensive Business Plan & Commercial Strategy

> **"Know which AI should do the job, what its answer must prove, and whether it actually delivered."**
> 
> *An executable method and control layer for accountable multi-model AI.*

---

## 1. Executive Summary

### 1.1 The Vision
**REI.ai** turns a repeatable decision method into software. It helps builders define the job, select an eligible model, set the answer contract, reject incomplete delivery, and retain a receipt. The OpenAI-compatible proxy (`/v1/chat/completions`) is its first production implementation; the broader product is the method and controls teams can apply to their own AI systems.

### 1.2 The Problem
Teams can connect models quickly, but often lack a repeatable answer to five operational questions: what job is being done, why a model was selected, what its answer must satisfy, whether delivery completed, and what evidence supports the result and cost. That gap creates waste, silent quality failures, and claims that cannot survive buyer review.

### 1.3 The Solution
The **REI Method** supplies the five-question standard. The **REI Engine** applies it as routing, quality, delivery, and evidence controls. **REI Studio** demonstrates the controls in a usable workspace. The first offer, a **REI Decision Audit**, evaluates a bounded sample before asking a customer to replace infrastructure. CARDO remains the formal execution cycle under the hood.

### 1.4 Immediate Target & Trajectory
- **Immediate Target**: Complete one REI Decision Audit for an external AI builder, deliver a defensible control-gap and cost-quality report, and earn authorization for a bounded pilot.
- **12-Month Trajectory**: $250k ARR across 25 paid teams by Month 12.

---

## 2. Company & Founder Profile

### 2.1 Solo Founder & Zero-Headcount Operating Model
- **Founder**: Aaron Marchant — AI Systems Engineer & Software Architect.
- **Headcount Strategy**: **100% Solo Founder (Zero Hiring)**. No hiring or team expansion planned. All platform engineering, routing maintenance, pilot reconciliation, and onboarding are fully automated via AI pair-engineering and serverless edge functions.
- **Track Record**: Processed **1.848 Billion development & evaluation tokens** through the OpenCode/DeepSeek workflow for **$23.52 total API spend** (97.35% input-cache hit rate across 1,000+ deployments).
- **Test Infrastructure**: Built and maintains a 100% green test suite comprising **1,343 automated tests across 118 test suites**.

### 2.2 Infrastructure & Capital Efficiency
- **Operating Overhead**: ~$60/month total infrastructure budget.
- **Gross Margins**: **~90%+** under Bring Your Own Key (BYOK) architecture (zero inference balance-sheet liability, zero payroll overhead).

---

## 3. Product & Technology Advantage (The Moat)

```text
┌─────────────────────────────────────────────────────────────┐
│                      CUSTOMER BUSINESS                      │
│   - Application / Agents (Cursor, Cline, Aider, Custom)     │
│   - Customer-Owned Provider Keys (OpenAI, Gemini, Groq)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                REI.AI CONTROL & ROUTING PROXY               │
│   1. Inspects semantic hinge & complexity R(T) locally      │
│   2. Runs client-side safety & anti-slop pre-flight checks  │
│   3. Selects policy-eligible provider and model route       │
│   4. Forwards request using customer's scoped credentials   │
│   5. Emits canonical RequestEvidence & cost telemetry       │
└──────────────────────────────┬──────────────────────────────┘
                               │
             ┌─────────────────┼─────────────────┐
             ▼                 ▼                 ▼
      ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
      │ OpenAI (4o)  │  │ Google (Gem) │  │  Groq (Llama)│
      └──────────────┘  └──────────────┘  └──────────────┘
```

### Key Technological Invariants:
1. **Pre-Spend Selection**: Decisions happen in plain JavaScript (`shared/lib/serverRouter.js`) in <10ms before any token spend occurs.
2. **Bring Your Own Key (BYOK)**: Customers supply their own provider API keys (`REI_API_KEYS`). Upstream model providers bill the customer directly. REI incurs **zero cash-flow risk**.
3. **Delivery-Gated-v1 Receipts**: Truncated or incomplete responses (`finish_status !== "complete"`) yield **$0.00 eligible savings**, guaranteeing that customers only pay for successful, full-quality deliveries.
4. **Prompt Freeze & Deterministic Caching**: Sustains an **88.0% effective prompt cache ratio** by freezing prefix ordering and generating SHA-256 deterministic cache keys.

---

## 4. Market Opportunity & Ideal Customer Profile (ICP)

### 4.1 Target Market
- **Primary ICP**: Small AI product teams and development agencies with a live use case, more than one model or provider, and a buyer asking for clearer quality, cost, or decision evidence.
- **Monthly API Spend Range**: $2,000 to $50,000/month on LLM inference.
- **Pain Point**: High API bills restricting agent iteration frequency and scaling margin.

### 4.2 Market Sizing
- **TAM (Total Addressable Market)**: Global LLM Inference Market ($12B+ in 2026).
- **SAM (Serviceable Addressable Market)**: Developer & Agent API Routing & FinOps ($1.2B).
- **SOM (Serviceable Obtainable Market)**: Initial focus on early-stage AI agent teams ($15M).

---

## 5. 4-Phase Go-To-Market (GTM) Strategy

### Phase 1: Validation & Readiness (Current)
- **Model**: Bounded REI Decision Audits for design partners.
- **Target**: Complete 3–5 audits without requiring customers to replace their stack.
- **Deliverable**: Control-gap inventory, replay evidence, and a recommendation to stop, test further, or begin a bounded pilot.
- **Success Gate**: At least one partner authorizes a pilot because the audit exposed a material, testable gap.

### Phase 2: Paid Bounded Pilots
- **Model**: 30–60 Day Paid Pilots ($500–$1,500/month flat fee).
- **Target**: 1–3 software teams or agencies.
- **Terms**: Customer supplies provider keys. Counterfactual baseline established (e.g. GPT-4o).
- **Success Gate**: Observed >75% net savings with non-inferior task quality and documented renewal interest.

### Phase 3: Managed Optimization Service
- **Model**: Recurring Managed Service ($1,500–$5,000/mo minimum + 10–20% net savings share).
- **Integrity Rule**: Savings calculated strictly on 100% quality-gate-passing responses.
- **Deliverable**: Customer-visible automated monthly reconciliation report with savings cap/floor.

### Phase 4: Productized Platform
- **Model**: Self-Service SaaS Platform.
- **Pricing Tiers**:
  - **Developer**: $99 / month (up to 100k requests)
  - **Team**: $499 / month (up to 1M requests + custom domain profiles)
  - **Enterprise**: Custom BYOK / Local VPC Sidecar
- **Prerequisite**: Build self-service only after 5+ customers repeatedly use the exact same onboarding workflow.

---

## 6. Financial Model & Unit Economics

### 6.1 Unit Economics (Per $1,000 Customer Baseline Spend)
- **Unmanaged Customer Spend (Baseline)**: $1,000.00
- **REI Routed Provider Spend (~85% Savings)**: $150.00
- **Gross Savings Unlocked**: $850.00
- **REI Fee (15% Value Share or Tiered Flat Fee)**: $127.50
- **Net Customer Cash Savings**: **$722.50 / month**

### 6.2 12-Month Revenue Trajectory

| Horizon | Active Customers | Pricing Model | Monthly Recurring Revenue (MRR) | Annual Run-Rate (ARR) |
| :--- | :---: | :--- | :---: | :---: |
| **Month 1–2** | 1 Pilot Customer | Unpaid / Phase 1 Validation | $0 | $0 |
| **Month 3–4** | 2 Bounded Pilots | Phase 2 ($750/mo avg) | $1,500 | $18,000 |
| **Month 5–8** | 5 Managed Accounts | Phase 3 ($2,500/mo avg) | $12,500 | $150,000 |
| **Month 9–12** | 15 Managed + 30 Self-Serve | Phase 3 + Phase 4 | $25,000 | **$300,000** |

---

## 7. Risk Assessment & Defensive Strategy

| Risk Factor | Threat Level | Mitigation Architecture |
| :--- | :---: | :--- |
| **Provider Price Wars** (OpenAI drops GPT-4o price) | Low | Price drops increase multi-model spread. REI routes between Groq, Gemini, DeepSeek, and OpenAI dynamically based on live rates in `modelRates.json`. |
| **Provider Key Security & Privacy** | Medium | BYOK architecture ensures keys stay customer-owned. Optional containerized VPC Sidecar deployment ensures keys never leave customer network. |
| **Model Outages & Rate Limits** | High | Automated multi-provider fallback engine (`cfai.js` rescue pool) seamlessly redirects requests when primary backend is throttled. |
| **Quality Degradation Concerns** | Medium | Delivery-gated-v1 policy excludes truncated turns. CARDO Guard pre-flight gates escalate complex tasks to frontier models automatically. |

---

## 8. Immediate Execution Plan (Next 14 Days)

1. **Deploy Pilot Onboarding Page**: Live at `/pilot` with cURL, Python, and Node SDK drop-in snippets. **`[DONE]`**
2. **Execute First External Outreach**: Contact 5 AI developer teams using Cursor/Cline with the 14-day zero-risk pilot offer.
3. **Run 14-Day Audit**: Process 1,000+ real production turns through `/api/v1/chat/completions`.
4. **Generate Reconciliation Report**: Run `node scripts/generate-pilot-report.mjs <tenant_id> 14` to present empirical savings and close Phase 2 paid conversion.

---
*Document Version: 1.0 (Canonical Business Plan) · Synchronized with [`src/data/claims.json`](../src/data/claims.json).*
