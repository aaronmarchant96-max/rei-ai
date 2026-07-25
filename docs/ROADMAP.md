# REI.ai — Product Roadmap & Strategic Vision

> **"The only router that thinks before it spends."**

This document outlines the strategic product vision, open-core architecture model, commercial proxy API roadmap, and domain slice expansion strategy for **REI.ai**.

---

## 🎯 Strategic Vision

Most AI deployments suffer from two cost-performance failures:
1. **Cost-Bleed**: Blindly routing simple queries to expensive frontier models ($15k+/month API bills).
2. **Quality-Bleed**: Blindly routing complex reasoning to low-cost models (resulting in hallucinations).

REI.ai solves this by placing a **zero-inference deterministic engine** and **complexity router** before the first LLM call, reducing inference spend by up to **78%** without compromising output quality.

---

## 🌍 Open-Core & Commercial Architecture

```
┌─────────────────────────────────────────────────────────┐
│              OPEN-CORE ROUTER ENGINE (MIT)               │
│  - CARDO REI 8-Phase Loop                               │
│  - Layer 0 Deterministic Engine                         │
│  - Complexity Index R(T) Calculator                     │
│  - Community Fingerprint Catalog (rei-ai/fingerprints)  │
└────────────────────────────┬────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
┌──────────────────────┐           ┌──────────────────────┐
│  DROP-IN PROXY API   │           │   ENTERPRISE SLICES  │
│  - OpenAI Compatible │           │  - Legal Hinge       │
│  - proxy.rei.ai      │           │  - Math Solver       │
│  - Cost Dashboard    │           │  - Red Team Scanner  │
└──────────────────────┘           └──────────────────────┘
```

### 1. Open-Source Engine (MIT / Apache 2.0)
- **Core Router & Fingerprints**: The core Night Shift router algorithm, zero-inference fingerprint matcher, and R(T) calculator are 100% open-source.
- **Community Fingerprint Catalog (`rei-ai/fingerprints`)**: A crowdsourced repository of regex and complexity rules allowing developers to define custom domain triggers.

### 2. Commercial Drop-in Proxy API (`proxy.rei.ai`)
- **Zero-Code Integration**: Point any OpenAI SDK or LLM client `baseURL` to `https://proxy.rei.ai/v1` to immediately cut API spend by 78%.
- **Live Cost Savings Dashboard**: Real-time telemetry tracking dollars saved, query distribution, and Layer 0 deflection rates.

### 3. Enterprise Specialized Slices
- 🛡️ **Red Team Security**: 16-category threat detection scanner for prompt injection, jailbreaks, and context poisoning.
- 📜 **Archival Genealogy**: High-precision record disambiguation engine using explicit evidence tiering (🟢 Primary, 🔵 Strong, 🟠 Review, 🟡 Memory).
- ⚖️ **Legal Hinge Analyzer**: Isolate load-bearing precedent pivots in case law.
- 🧮 **Math Solver**: Multi-step mathematical proof verification without symbolic hallucination.

---

## 🗓️ 30-Day Launch Roadmap

### Phase 1: Proxy Handler & Core Polish (Week 1)
- [x] Integrate Pro Relume flagship landing page & sticky glass navigation.
- [x] Rename cost gate to **CARDO Guard**.
- [ ] Build serverless `/api/v1/chat/completions` proxy route handler.
- [ ] Implement `X-REI-Savings` & `X-REI-Pathway` HTTP response headers.

### Phase 2: Open-Source Catalog & SDK Release (Week 2)
- [ ] Create public **`rei-ai/fingerprints`** catalog repository with contribution guidelines.
- [ ] Release Python SDK (`pip install rei-ai`).
- [ ] Release TypeScript / Node SDK (`npm install @rei-ai/sdk`).

### Phase 3: Cost Savings Dashboard & Analytics (Week 3)
- [ ] Build user telemetry dashboard displaying real-time dollar savings vs. frontier baselines.
- [ ] Implement token budget ceiling controls (`max_cost_per_query`).

### Phase 4: Public Launch & Case Studies (Week 4)
- [ ] Publish reproducible 57-prompt benchmark study ([`INFORMATION_THEORETIC_ARCHITECTURE.md`](INFORMATION_THEORETIC_ARCHITECTURE.md)).
- [ ] Public launch on Hacker News, ProductHunt, and GitHub Trending.

---

## 🧠 Next Generation Architecture (v4.0 Roadmap)

### Local ONNX / Semantic Embedding Classifier (Zero-Shot Upgrade)
- **Problem Statement:** Current lexical/keyword feature extraction (`Night Shift v3`) achieves **53.6% zero-shot accuracy** on un-mined prompts (`routingEvalBlindV2.test.js`), representing a hard lexical ceiling for pure regex matching.
- **Architectural Milestone (v4.0):** Integrate local, zero-dependency ONNX embeddings (`@xenova/transformers` with `all-MiniLM-L6-v2` or `bge-small-en-v1.5`) directly into the local JS runtime.
- **Zero-Latency Invariant:** Execute local vector similarity scoring in <25ms in WebAssembly/Node environments without external API calls.
- **Target Accuracy:** Elevate true zero-shot out-of-sample holdout accuracy from **53.6%** to **> 85.0%**.

---

## 📊 Target Benchmarks (Empirically Verified)
- **Cost Reduction Baseline**: **Verified 78% reduction** vs. always-premium baseline across general catalog queries.
- **V1 In-Sample Holdout Accuracy**: **88.9%** across 27 tuned prompts (`routingEvalML.test.js`).
- **V2 Zero-Shot Holdout Accuracy**: **53.6%** across 28 un-mined prompts (`routingEvalBlindV2.test.js` — *Known Lexical Ceiling*).
- **v4.0 Zero-Shot Embedding Target**: **> 85.0%** target via local ONNX semantic vector classifier.
- **Test Suite Integrity**: Maintain 100% pass rate across all **312 automated unit and integration tests across 21 test suites**. Current canonical stats are tracked in [`data/telemetry.json`](../data/telemetry.json).
