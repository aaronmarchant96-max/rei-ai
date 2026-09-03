---
status: canonical
authority_scope: builder-story-and-case-studies
owner: Aaron Marchant
last_verified: 2026-09-02
verified_against_commit: 4e729c2
claims_source: docs/CLAIM_LEDGER.md
supersedes: []
superseded_by: null
archived_at: null
---

# Engineering Portfolio Overview

> **"I build evidence-driven systems for evaluating, securing, and optimizing AI."**
> 
> *Self-taught AI Systems & Product Engineer specializing in inference FinOps, deterministic routing, prompt-cache engineering, and adversarial evaluation.*

---

## 🎯 Profile & Core Competencies

- **Inference Optimization & FinOps**: Deterministic pre-flight model selection, OpenAI-compatible proxy gateways, and prompt-freeze caching with a **96.0% modeled build-spend reduction** ($23.5172 billed vs a $590.5747 no-cache counterfactual across 1,848,473,560 tokens).
- **Adversarial Security & Evaluation**: 14-category prompt-injection detection, ground-truth benchmarking, and formal epistemic claim ledgers.
- **Full-Stack AI Engineering**: End-to-end React/TypeScript interfaces, serverless streaming backends, structured reasoning pipelines, and complex provenance architectures.
- **Empirical Rigor**: **1366/1366 automated tests across 121/121 suites** in the latest local verification.

---

## 🏛️ The Three Flagship Projects

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             THE 3-PILLAR TRIAD                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. REI.ai          ──► AI Systems & FinOps (Proxy, Evidence, 1366 Tests)     │
│ 2. Arena Harness   ──► AI Security & Evals (Adversarial, Red Team, D1-D3)   │
│ 3. Family Archive  ──► Full-Stack Product (GPS Evidence Tiers, Provenance)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 1. REI.ai — AI FinOps Proxy & Dynamic Inference Router
**Repository:** [github.com/aaronmarchant96-max/rei-ai](https://github.com/aaronmarchant96-max/rei-ai) · **Live:** [prompthound-labs.vercel.app](https://prompthound-labs.vercel.app)

* **Problem**: Teams lack evidence about which routine requests may be candidates for less expensive models without degrading task-specific quality.
* **Architecture**:
  - **OpenAI-Compatible Gateway (`/v1/chat/completions`)**: Drop-in proxy for Cursor, Cline, Aider, and LangChain.
  - **Deterministic 9-Stage Decision Cascade**: Classifies prompt semantics locally without calling an LLM to route an LLM. A fresh benchmark is required before publishing a numeric latency ceiling.
  - **Prompt-Freeze Caching**: Frozen instruction prefixes and SHA-256 cache keys yielding an **88.0% effective multi-turn cache ratio** and **97.35% input cache hit rate**.
  - **Epistemic Trace Receipts**: Every turn outputs audit headers stamped with explicit evidence tiers (`(Observed)`, `(Derived)`, `(Modeled)`). Missing telemetry explicitly renders `"Evidence unavailable"`—zero synthetic data.
* **Measured Result**:
  - **1366 passing automated tests** across 121 test suites.
  - **1.848B development-agent tokens** processed through OpenCode/DeepSeek build workflow for **$23.52** (saving $567.06 vs $590.57 no-cache counterfactual).
  - **81.1–91.2% modeled provider-scenario savings** and **87–90% ceiling-based savings on current synthetic holdouts**; neither is realized customer savings, and quality preservation requires bounded non-inferiority evaluation.
* **Reproduce from Clean Checkout**:
  ```bash
  git clone https://github.com/aaronmarchant96-max/rei-ai.git
  cd rei-ai && npm install
  npm test
  npm run dev
  ```

---

### 2. Arena Harness — Adversarial AI Evaluation & Benchmarking
**Integrated Module:** [`rei-ai/src/__eval__`](https://github.com/aaronmarchant96-max/rei-ai/tree/main/src/__eval__) · [`docs/DEFENSE_IN_DEPTH_CONTROL_MATRIX.md`](https://github.com/aaronmarchant96-max/rei-ai/blob/main/docs/DEFENSE_IN_DEPTH_CONTROL_MATRIX.md)

* **Problem**: AI benchmarks often suffer from dataset contamination, brittle regex parsers, and ungrounded claims. Teams lack standardized, reproducible ways to test model resilience against prompt injections, system extraction, and quality degradation.
* **Architecture**:
  - **14-Category D1 Threat Taxonomy**: Client-side, zero-token regex/AST scanner flagging recursive jailbreaks, base64 ciphers, credential leaks, and identity spoofing before API dispatch.
  - **Multi-Model Holdout Benchmark Engine**: 136 ground-truth holdout queries evaluating classification accuracy across 6 specialized reasoning domains.
  - **Feynman Gate Integrity Suite**: Automated test suite (`feynmanGate.test.js`) that refuses to pass if any claim ledger number deviates from live test stdout.
* **Measured Result**:
  - **12/12 correct routes** on the fixed red-team regression corpus; the separate five-entry route-adherence replay measured **75%** (3/4 escalated entries reached the adversarial route).
  - **93–96% classification accuracy** across blind and holdout evaluation suites.
  - Schema-validation and retry behavior are covered by automated tests; no universal zero-failure claim is made.

---

### 3. Family Archive — Full-Stack Knowledge Graph & Genealogical Provenance
**Repository:** [github.com/aaronmarchant96-max/family-archive](https://github.com/aaronmarchant96-max/family-archive) · **Engine Spec:** [`docs/FAMILY_ARCHIVE_PORTING_SPEC.md`](https://github.com/aaronmarchant96-max/rei-ai/blob/main/docs/FAMILY_ARCHIVE_PORTING_SPEC.md)

* **Problem**: Historical and genealogical databases suffer from catastrophic hallucination when AI systems merge records of individuals who share identical names, birth years, and locations.
* **Architecture**:
  - **4-Tier Genealogical Proof Standard (GPS) Classifier**: Enforces strict epistemic tiers (`primary_direct`, `secondary_derivative`, `inferred_modeled`, `negative_search`).
  - **Disambiguation Hinge Evaluator**: Isolates conflicting facts (spousal discrepancies, military service overlaps, probate timeline gaps) before asserting identity matches.
  - **Negative Search Audit Receipts**: Logs exhaustively searched databases where no record was found, preventing duplicate retrieval queries.
  - **High-Density React UI**: Responsive family tree exploration, document transcription viewer, and confidence badges.
* **Measured Result**:
  - Citation and provenance requirements are enforced by repository schemas and integrity tests; this is not a claim that every generated assertion has been externally audited.
  - Reusable standalone TypeScript library (`archivistEngine.ts`) with dedicated unit test suite.

---

## 🛠️ Supporting Engineering & Exploratory Pipelines

### 4. Computer Vision & Signal Processing (UAP Analyzer & Motion Detection)
* **Stack**: Python, OpenCV, NumPy.
* **Core Capabilities**:
  - Frame-by-frame spatial trajectory reconstruction and background subtraction.
  - Kalman filter state estimation to separate aerodynamic motion from sensor noise and optical glare.
  - Structured JSON telemetry emission for downstream multi-spectral analysis.

### 5. Debate Furnace (Dialectical Stress-Testing Engine)
* **Stack**: React, TypeScript, Multi-Persona LLM Orchestration.
* **Core Capabilities**:
  - Automated counter-argument generation, thesis pressure-testing, and belief-revision hinge detection.

### 6. Storm Replay (Radar Signal Synthesis)
* **Stack**: React, Canvas API, Meteorological Data Replay.
* **Core Capabilities**:
  - Radar sweep spatial visualization, temporal interpolation, and storm cell tracking.

---

## 📊 Single-Source-of-Truth Metrics Summary

| Metric | Verified Value | Verification Source / Producing Command |
| :--- | :--- | :--- |
| **Automated Passing Tests** | **1366 tests** (121 suites) | `npm test -- --runInBand` · `src/data/claims.json` |
| **Input Cache Hit Rate** | **97.35%** | `npm run verify:cache` · `data/cache-spend.csv` |
| **Effective Multi-Turn Cache Ratio** | **88.0%** | Reconstructed $N=1,500$ model turns · `docs/CACHING_RULES.md` |
| **Modeled Provider-Scenario Savings** | **81.1–91.2%** | Fixed workload and routes; provider scenario sensitivity · `docs/CLAIM_LEDGER.md` |
| **Build Workflow API Spend** | **$23.52** | 1.848B tokens processed ($567.06 saved vs no-cache) |
| **Router Decision Latency** | **Benchmark required** | Deterministic in-memory cascade; no current retained benchmark supports a numeric ceiling |
| **Production Decision Latency** | **Benchmark required** | Historical 39.52ms copy lacks a current retained trace artifact |
| **GitHub Deployment Records** | **1,495** | GitHub Deployment API observed 2026-09-02; records are not equivalent to successful production releases |

*Metrics above were re-audited on 2026-09-02. `npm run claims:check` verifies synchronized test totals; it does not independently verify every portfolio statement.*
