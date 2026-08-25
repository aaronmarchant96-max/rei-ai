---
status: canonical
authority_scope: builder-story-and-case-studies
owner: Aaron Marchant
last_verified: 2026-08-20
verified_against_commit: 7247921
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

- **Inference Optimization & FinOps**: Deterministic `< 1ms` pre-flight model selection, OpenAI-compatible proxy gateways, and prompt-freeze caching achieving **96.0% build spend reduction** ($23.52 billed vs $590.57 no-cache counterfactual across 1.848B tokens).
- **Adversarial Security & Evaluation**: 14-category prompt-injection detection, ground-truth benchmarking, and formal epistemic claim ledgers.
- **Full-Stack AI Engineering**: End-to-end React/TypeScript interfaces, serverless streaming backends, structured reasoning pipelines, and complex provenance architectures.
- **Empirical Rigor**: **997 automated tests across 83 suites** (100% green CI) with machine-reproducible claim verification.

---

## 🏛️ The Three Flagship Projects

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             THE 3-PILLAR TRIAD                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. REI.ai          ──► AI Systems & FinOps (Proxy, <1ms Routing, 997 Tests) │
│ 2. Arena Harness   ──► AI Security & Evals (Adversarial, Red Team, D1-D3)   │
│ 3. Family Archive  ──► Full-Stack Product (GPS Evidence Tiers, Provenance)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 1. REI.ai — AI FinOps Proxy & Dynamic Inference Router
**Repository:** [github.com/aaronmarchant96-max/rei-ai](https://github.com/aaronmarchant96-max/rei-ai) · **Live:** [prompthound-labs.vercel.app](https://prompthound-labs.vercel.app)

* **Problem**: Engineering teams waste 80%+ of their inference budgets by routing simple, routine agent queries to expensive flagship models (e.g. GPT-4o, Claude 3.5 Sonnet) when sub-cent models (e.g. LLaMA 3.1 8B, Gemini 2.5 Flash) provide identical accuracy.
* **Architecture**:
  - **OpenAI-Compatible Gateway (`/v1/chat/completions`)**: Drop-in proxy for Cursor, Cline, Aider, and LangChain.
  - **Deterministic 9-Stage Decision Cascade**: Classifies prompt semantics locally in **`< 1ms`** without calling an LLM to route an LLM.
  - **Prompt-Freeze Caching**: Frozen instruction prefixes and SHA-256 cache keys yielding an **88.0% effective multi-turn cache ratio** and **97.35% input cache hit rate**.
  - **Epistemic Trace Receipts**: Every turn outputs audit headers stamped with explicit evidence tiers (`(Observed)`, `(Derived)`, `(Modeled)`). Missing telemetry explicitly renders `"Evidence unavailable"`—zero synthetic data.
* **Measured Result**:
  - **997 passing automated tests** across 83 test suites.
  - **1.848B development-agent tokens** processed through OpenCode/DeepSeek build workflow for **$23.52** (saving $567.06 vs $590.57 no-cache counterfactual).
  - **81–92% modeled and replayed inference savings** across documented provider scenarios (workload-specific quality preservation requires bounded non-inferiority evaluation).
  - **< 40ms end-to-end routing latency** (< 1ms in-memory resolution).
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
  - **100% adherence** under red-team stress testing.
  - **93–96% classification accuracy** across blind and holdout evaluation suites.
  - **Zero silent tool failures**: Strictly validates tool arguments against JSON/Zod schemas with automatic retry loops.

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
  - **100% citation provenance** on all generated genealogical assertions.
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
| **Automated Passing Tests** | **1099 tests** (102 suites) | `npm test -- --runInBand` · `src/data/claims.json` |
| **Input Cache Hit Rate** | **97.35%** | `npm run verify:cache` · `data/cache-spend.csv` |
| **Effective Multi-Turn Cache Ratio** | **88.0%** | Reconstructed $N=1,500$ model turns · `docs/CACHING_RULES.md` |
| **Modeled & Replayed Savings** | **81–92%** | Provider scenario sensitivity · `docs/CLAIM_LEDGER.md` |
| **Build Workflow API Spend** | **$23.52** | 1.848B tokens processed ($567.06 saved vs no-cache) |
| **Router Decision Latency** | **< 1ms** | In-memory TypeScript cascade (`nightShiftRouter.ts`) |
| **Production Decision Latency** | **< 40ms** (39.52ms avg) | Serverless proxy execution trace log |
| **Production Deployments** | **1,000+** | Vercel production deployment log |

*All metrics current as of August 2026. Verified via automated pre-commit integrity gate `npm run claims:check`.*
