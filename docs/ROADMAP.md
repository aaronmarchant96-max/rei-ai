# REI.ai — Product Roadmap & Strategic Vision

> **"The Inference FinOps & Policy Control Plane for Production AI Agents."**

This document outlines the strategic product vision, open-core architecture model, commercial proxy API roadmap, and 90-day customer validation plan for **REI.ai**.

---

## 🎯 Strategic Vision

Most production AI agent stacks suffer from two critical operational failures:
1. **Cost-Bleed**: Blindly routing routine reasoning to expensive frontier models ($15k+/month API spend).
2. **Unverified Optimization**: Lack of empirical evaluation or non-inferiority evidence when adopting cheaper models.

REI.ai solves this with a **zero-inference deterministic routing engine** and **epistemic evidence plane**, reducing inference spend by **~85–92%** (measured ceiling & replayed baseline) without compromising output quality.

---

## 🌍 Open-Core & Commercial Architecture

```
┌─────────────────────────────────────────────────────────┐
│              OPEN-CORE ROUTER ENGINE (MIT)               │
│  - CARDO REI 8-Phase Loop                               │
│  - Layer 0 Deterministic Engine                         │
│  - Complexity Index R(T) Calculator                     │
│  - Community Fingerprint Catalog (data/fingerprints.json│
└────────────────────────────┬────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
┌──────────────────────┐           ┌──────────────────────┐
│  DROP-IN PROXY API   │           │   ENTERPRISE SLICES  │
│  - OpenAI Compatible │           │  - VPC Sidecar Proxy │
│  - BYOK Credentials  │           │  - Evidence Vault    │
│  - Cost Dashboard    │           │  - Red Team Scanner  │
└──────────────────────┘           └──────────────────────┘
```

---

## 🗓️ 90-Day Commercial Execution Plan

### Days 0–30: Buyer Discovery & Design Partners
- [x] Integrate Pro Relume flagship landing page & sticky navigation.
- [x] Rename cost gate to **CARDO Guard**.
- [x] Build serverless `/api/v1/chat/completions` proxy route handler.
- [x] Implement `X-REI-Savings` & `X-REI-Pathway` HTTP response headers.
- [ ] Conduct 15 structured customer discovery interviews with AI engineering leads.
- [ ] Sign 3 Design Partners for Stage 1 Offline Replay Audits.

### Days 31–60: Customer Evidence Production
- [ ] Complete first customer replay audit on 10,000 anonymized production logs.
- [ ] Execute bounded A/B non-inferiority validation ($\delta \le 3\%$) on customer workload.
- [ ] Publish first customer case study with reconciled billing evidence.
- [ ] Package containerized VPC Sidecar Proxy for customer-hosted deployments.

### Days 61–90: Commercial Conversion & Scaling
- [ ] Convert at least 1 design partner into a recurring paid contract ($500–$1,500/mo base + value share).
- [ ] Release public Python and TypeScript SDKs.
- [ ] Launch on ProductHunt, Hacker News, and AI FinOps communities.

---

## 📊 Target Benchmarks (Empirically Verified)

- **Cost Reduction Baseline**: **-85.7%** (replayed demo) / **~92%** (ceiling-based modeled) vs. always-premium gpt-4o baseline.
- **Holdout Accuracy**: **72.8%** deterministic accuracy across 136 unique pooled calibration samples.
- **Empirical Rigor**: Backed by **997 automated tests across 83 test suites**. Canonical verification is tracked in [`src/data/claims.json`](../src/data/claims.json).
