# REI: An AI That Respects Your Budget as Much as Your Time

**Amii / Alberta Innovates Commercialization & Research Proposal**  
**Project:** REI — Transparent, Auditable, Token-Efficient Cognitive Engine  
**Duration:** 6 months · **Request:** $10,000 CAD (Micro-Voucher / Seed Grant Tier)  
**Lead Developer:** Aaron Marchant (Calgary, AB)  
**Repository:** https://github.com/aaronmarchant96-max/rei-ai  
**Date:** August 14, 2026  

---

## Executive Summary

REI.ai is an Alberta-developed cognitive engine and inference router designed to solve the two biggest barriers to AI adoption: **cost opacity** and **unreliable hallucinations**. 

Rather than relying on black-box LLM calls that burn prohibitive enterprise compute budgets, REI operates a **5-layer deterministic governance architecture** (L0 Hard Stops, L1 Governance, L2 CARDO Reasoning, L3 Execution, L4 Optimization). A cost-aware semantic router (Night Shift) dynamically dispatches queries to the cheapest capable model tier while enforcing strict auditability, evidence tiering (🟢 Primary to 🟡 Family Memory), and contrapositive evaluation (*"What fact would change the conclusion?"*).

### Verified Production Benchmarks (Measured):
* **1.744 Billion Tokens Processed** across real-world development and production telemetry.
* **97.6702% Measured Prompt Cache Hit Rate** achieved via frozen-prefix KV-cache optimization.
* **$21.98 Actual Billed Spend** vs. a **$652.30 No-Cache Counterfactual** (**96.63% net cost reduction**).
* **874 Passing Automated Unit & Regression Tests** across 68+ test suites.
* **1,000+ Production Deployments** on Vercel over 45 days of continuous integration.

---

## Alignment with Amii & Alberta Research Pillars

REI directly advances five core machine intelligence priorities:

### 1. Responsible & Interpretable AI
Every routing decision in REI produces a transparent, deterministic trace: matched fingerprint, confidence score, alternative candidate paths, and exact cost delta. No un-audited model selection. The CARDO framework natively forces the model to isolate **The Hinge** (the load-bearing factual assumption) before generating code, legal analysis, or historical evidence evaluations.

### 2. High-Efficiency ML & Token Thermodynamics
By combining Layer 0 deterministic response engines ($0 cost, 0ms latency for ~15–20% of traffic) with frozen-prefix KV-cache harvesting (Google Gemini 3.X, DeepSeek, and Vercel AI Gateway), REI extracts maximum cognitive signal per watt and per cent of compute.

### 3. Falsifiable & Reproducible Systems (Feynman Discipline)
REI enforces strict Layer 0 measurement rules: estimated or modeled values are mathematically forbidden from occupying measured-value fields. All claims are backed by immutable holdout datasets (`data/REI-D1-corpus.json`, version-locked and SHA-256 verified) and continuous automated claim verification (`scripts/gen-claims.mjs`).

### 4. Continuous Error-Gap Learning
REI maintains an automated **Error-Gap Taxonomy** (`docs/ERROR_GAP_CATALOGUE.md`), parsing git commit logs with `[caught: manual|test|claim-gate|ai-cross-check]` tags to scientifically measure which defense layers catch regressions before they reach production.

### 5. Economic Sovereignty for Alberta’s Tech Ecosystem
REI demonstrates how Alberta startups, researchers, and non-profits can build and scale world-class cognitive applications without spending tens of thousands of dollars on US cloud APIs.

---

## Technical Architecture (5-Layer Model)

```
L0 — HARD STOPS (Deterministic non-negotiable boundaries: HEAD matching, scope gates, verified claims)
  │
L1 — GOVERNANCE (Task triage, pre-execution gates, claim-before-code, verification gates)
  │
L2 — CARDO COGNITIVE LOOP (Collect → Analyze → Record → Distinguish → Operate)
  │
L3 — EXECUTION & ROUTING (Night Shift Router: Layer 0 $0 engine → Groq fast lane → Gemini/DeepSeek)
  │
L4 — OPTIMIZATION & PRUNING (DCP Context Compression: -905K token reductions, prompt-freeze caching)
```

| Core Component | Architectural Responsibility | Key Modules |
| :--- | :--- | :--- |
| **Night Shift Router** | Confidence-scored semantic pathway routing & cost estimation | `src/lib/nightShiftRouter.js`, `api/cfai.js` |
| **Deterministic Engine** | $0 instant resolution for pattern-matched intent | `src/lib/deterministicEngine.js` |
| **CARDO Guard** | High-liability cost-to-act vs. cost-to-miss risk governor | `src/lib/cardoGuard.js` |
| **Claim Registry** | Automated falsification gate verifying all public benchmarks | `src/__eval__/claimRegistry.js` |
| **DCP Context Pruner** | Dynamic context compression preserving attention & KV-cache | `opencode.json`, `@tarquinen/opencode-dcp` |

---

## Preliminary Results Table

| Verified Metric | Measured Value | Source / Verification Method |
| :--- | :--- | :--- |
| **Total Input Tokens Processed** | **1,744,909,878 (1.74B)** | `data/cache-spend.csv` billing audit |
| **Input Cache Hits** | **1,704,257,024 tokens** | Measured upstream KV-cache hits |
| **Cache Hit Rate** | **97.6702%** | Direct provider telemetry |
| **Actual Infrastructure Spend** | **$21.98 CAD** | Verified API invoice data |
| **Counterfactual Spend** | **$652.30 CAD** | Standard uncached inference baseline |
| **Effective Net Savings** | **96.63%** | Automated audit script (`scripts/verify-cache.mjs`) |
| **Automated Test Suites** | **68 Suites / 874 Tests** | `npm test -- --runInBand` |
| **Production Deployments** | **1,019 Deployments** | Vercel CI/CD pipeline |
| **Monthly Commit Density** | **532 Commits / Month** | Public git repository history |

---

## 6-Month Project Milestones & Deliverables

| Phase | Duration | Focus & Objectives | Deliverable |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Month 1–2 | **Alberta Open-Source Benchmark Release** | Packaging the 57-prompt blind holdout suite, D1 corpus, and automated claim ledger into an open-source evaluation package for Alberta AI builders. |
| **Phase 2** | Month 3–4 | **Local Enterprise & Legal Pilots** | Running targeted beta trials with 3–5 Calgary-based legal researchers and development teams to evaluate CARDO Hinge accuracy in high-liability environments. |
| **Phase 3** | Month 5–6 | **Enterprise Multi-Agent SDK & Documentation** | Finalizing the standalone Node/TypeScript SDK for the Night Shift semantic router with Docker deployment templates and an Amii technical whitepaper. |

---

## Budget & Use of Funds

| Line Item | Amount (CAD) | Allocation Justification |
| :--- | :--- | :--- |
| **Inference & Multi-Model Testing** | $2,500 | Multi-model evaluation across frontier APIs (Gemini 3.X, DeepSeek, Claude 3.5, Llama 3.3). |
| **Cloud Hosting & Staging Environment** | $1,500 | Production-grade Vercel / Cloudflare edge infrastructure, domain routing, and logging. |
| **Developer Commercialization Stipend** | $4,500 | Full-time sustained development, SDK packaging, and open-source documentation. |
| **Amii Whitepaper & Community Dissemination**| $1,500 | Preparing technical case studies, hosting a local Calgary builder workshop, and open-source release. |
| **Total Requested** | **$10,000 CAD** | |

---

## Lead Developer Profile

* **Aaron Marchant** (Calgary, AB)
  * Independent Systems Builder & Creator of REI.ai.
  * Over 12 years of specialized high-consequence construction background (high-rise glass installation and swing-stage rigging), translating strict physical safety disciplines into fault-tolerant software architectures (`L0 Hard Stops`, `Claim-Before-Code`, `Error-Gap Catalogues`).
  * Sustained output of 530+ commits per month and 1,000+ continuous deployments.

---

## Repository & Open-Source Integrity

* **GitHub:** https://github.com/aaronmarchant96-max/rei-ai
* **Live System:** https://prompthound-labs.vercel.app/#rei
* **License:** MIT Open Source (Code, Test Suites, and Telemetry Ledgers are 100% public and reproducible).
