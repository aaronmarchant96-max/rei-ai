# REI.ai — Investor Diligence Memo & Founder Execution Plan

**Date:** 2026-08-20  
**Status:** Canonical Strategic Roadmap  
**Positioning Wedge:** *The Inference FinOps & Policy Control Plane for Production AI Agents*  

---

## 1. Executive Summary & Diligence Scorecard

```text
========================================================================================
                               INVESTOR DILIGENCE SCORECARD
========================================================================================
Category                         Grade    Assessment
----------------------------------------------------------------------------------------
Founder Resourcefulness          9/10     Exceptional output under hardware & budget limits
Technical Execution              8/10     Working proxy, routing, evidence, & 967 passing tests
Product Thesis                   7/10     Inference FinOps + auditable routing is a real wedge
Product Readiness                6/10     Strong prototype; requires enterprise VPC boundaries
Business Model                   6/10     BYOK & staged funnel; needs pricing conversion gates
Evidence Credibility             6/10     Unusually candid proof-layer; needs customer logs
Market Clarity                   5/10     Transitioning from "6 domains" to focused FinOps ICP
Security / Enterprise Readiness  5/10     Zero-retention invariants; VPC sidecar architecture
Defensibility                    5/10     Data flywheel & routing policy moat in development
----------------------------------------------------------------------------------------
Overall Assessment               6.3/10   Technically credible wedge; entering customer validation
========================================================================================
```

---

## 2. The Core Commercial Wedge

### The Problem
Companies deploying production AI agents face unpredictable model costs ($10k–$100k+/month). Developers over-provision frontier models (e.g., GPT-4o) for routine reasoning because they lack safe, policy-driven routing and empirical evidence that cheaper models won't regress output quality.

### The Solution
**REI is an OpenAI-compatible FinOps control plane.**
1. **Drop-in Integration**: Point existing SDK/agent `baseURL` to REI proxy.
2. **Deterministic Hinge Classification**: Inspects request complexity before token spend.
3. **Cheapest Capable Route**: Dynamically routes to specialized cheaper models with automatic rescue fallbacks.
4. **Epistemic Evidence Receipts**: Emits per-request cost attribution, token receipts, and non-inferiority evidence.

---

## 3. Ideal Customer Profile (ICP)

- **Target Segment**: AI-native SaaS companies, developer agent startups, and high-volume workflow platforms.
- **Team Size**: 20–200 employees.
- **Inference Spend**: $\ge \$10,000$ / month across multi-provider stacks (OpenAI, Gemini, Groq, DeepSeek).
- **Core Pain**: Executive mandate to reduce inference spend without full-time infrastructure engineers dedicating months to custom routing or eval harnesses.
- **Buyer Persona**: Head of Engineering / VP of AI / VP of Infrastructure.

---

## 4. Graduated Commercial Pricing Model

$$\text{Customer Value} = \text{Reduced Provider Spend} + \text{REI Platform Fee} \ll \text{Original Unmanaged Baseline}$$

### Pilot Terms
- **30-Day Controlled BYOK Pilot**: **$0 Platform Fee**. Customer retains direct provider billing.

### Post-Pilot Commercial Structure
- **Base Platform Fee**: $500–$1,500/month (covering control plane, evidence vault, and audit export).
- **Value-Share Variable Fee**: 15–20% of independently reconciled net provider savings (capped at a monthly ceiling).
- **Condition Precedent**: Zero variable fees are incurred unless the **Quality Non-Inferiority Gate ($\delta \le 3\%$)** and **Billing Reconciliation Gate** pass.

---

## 5. 90-Day Founder Execution Plan

```
┌───────────────────────────────────────────────────────────┐
│ Days 0–30: Buyer Validation & Discovery (15 Interviews)   │
│ - Narrow messaging to FinOps / Proxy Control Plane        │
│ - Sign 3 Design Partners for Stage 1 Offline Replay Audit │
│ - Agree on pre-declared paid conversion conditions        │
└─────────────────────────────┬─────────────────────────────┘
                              ▼
┌───────────────────────────────────────────────────────────┐
│ Days 31–60: Customer Evidence Production                  │
│ - Complete first customer replay audit on 10k real logs   │
│ - Run bounded A/B non-inferiority validation (δ ≤ 3%)     │
│ - Publish first anonymized customer case study            │
└─────────────────────────────┬─────────────────────────────┘
                              ▼
┌───────────────────────────────────────────────────────────┐
│ Days 61–90: Commercial Conversion & Repeatability         │
│ - Convert at least 1 pilot to recurring paid agreement    │
│ - Deploy VPC containerized sidecar for enterprise BYOK    │
│ - Establish repeatable outbound sales pipeline            │
└───────────────────────────────────────────────────────────┘
```
