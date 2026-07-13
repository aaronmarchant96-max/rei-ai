# REI: AMII-Ready Research Proposal

**For:** Alberta Machine Intelligence Institute (AMII)  
**Project:** REI — Transparent Token-Efficient Reasoning Engine  
**Duration:** 6 months  
**Request:** $5,000 CAD  

---

## Executive Summary

REI is a transparent, token-efficient reasoning engine built and tested in Alberta. It makes AI reasoning auditable by exposing the hinge point, evidence tiers, and what-would-change-the-conclusion in every response. A cost-aware routing layer (Night Shift) selects the cheapest model that meets a confidence threshold, reducing inference costs 68% below always-premium baselines. All routing decisions are deterministic and testable — zero inference dependency in the router itself.

The system has processed 441 million tokens across 1,194 API calls at a total cost of $3.83, demonstrating production-scale efficiency. A 57-prompt benchmark suite across 9 categories confirms 80% routing accuracy with 162 passing tests and zero inference cost in the evaluation harness.

---

## AMII Research Theme Alignment

REI directly addresses five of AMII's core research themes:

### 1. Responsible AI
Every routing decision in REI is traceable, confidence-scored, and auditable. The Night Shift router produces a complete decision trace: which fingerprint matched, at what confidence, what alternatives were considered, and what the cost delta was versus the most expensive option. No black-box model selection.

**Evidence:** `src/lib/nightShiftRouter.js` — `buildRouterDecision()` produces explicit `routingConfidence`, `rationale`, `alternativeRoutes` with `costDeltaFromSelected` and `savingsPercentage` for every decision.

### 2. Interpretability
CARDO REI makes the reasoning structure explicit: the hinge point (falsifiable claim), facts versus assumptions, evaluation strength, what would change the conclusion, and the smallest useful next move. This is not post-hoc explanation — it's the native output format.

**Evidence:** `api/cfai.js` — hardened assistant domain prompt enforces hinge-as-falsifiable-claim with contrapositive ("what would change my mind"). `src/lib/replyParser.js` — deterministic parser extracts structured reasoning sections from responses.

### 3. Efficient ML
Night Shift router reduces inference cost 68% compared to always-premium routing. Layer 0 deterministic engine handles ~15-20% of queries at $0 cost. The 5-message sliding window keeps context payloads minimal. Fingerprint catalog matching costs <1ms per decision with zero inference.

**Evidence:** 57-prompt benchmark: `$0.280 saved vs $0.410 always-premium`. Production data: 441M tokens, $3.83 total cost across 1,194 API calls.

### 4. Reproducible AI
Identical input → identical routing decision. The fingerprint catalog is deterministic — no model inference, no embeddings, no non-deterministic hashing. Confidence thresholds are versioned in `data/fingerprints.json`. The `routingConfidence` fallback chain (catalog score → fingerprint threshold → default 0.5) is explicit and auditable.

**Evidence:** `src/__eval__/routingEval.test.js` — 57 test cases produce identical results every run. The benchmark harness has zero inference cost.

### 5. Applied AI for Alberta
The genealogy domain applies structured reasoning to historical record evaluation — military pay vouchers, parish registers, census records, family correspondence. Evidence tiering (🟢 Primary / 🔵 Strong / 🟠 Needs Review / 🟡 Family Memory) generalizes to any domain where source reliability varies. The Marchant Family Archive integration demonstrates real-world application.

**Evidence:** `api/cfai.js` — genealogy domain prompt with canonical profiles. `src/components/EvidenceCard.jsx` — tier-based evidence rendering. `src/__eval__/evidenceEval.test.js` — 10 deterministic parser tests.

---

## Technical Architecture

```
Query → Layer 0: Deterministic Engine ($0, instant)
      → Layer 1: Night Shift Router (fingerprint catalog + confidence)
      → Layer 2: Domain Detection (coding, genealogy, story — isolated from history)
      → Layer 3: CARDO GUARD (cost-governor — escalation decision)
      → Response + structured reasoning trace
```

| Component | Purpose | Lines |
|-----------|---------|-------|
| `nightShiftRouter.js` | Fingerprint matching, confidence scoring, pathway selection, cost estimation | 572 |
| `deterministicEngine.js` | Layer 0 zero-token engine — greetings/smalltalk | 68 |
| `cardoGuard.js` | Cost-governor — `shouldEscalateToRemote()` | 240 |
| `contracts.js` | JSDoc type definitions for all data contracts | 178 |
| `fingerprints.json` | 9-entry routing catalog with confidence thresholds | 182 |

---

## Preliminary Results

| Metric | Value |
|--------|-------|
| Total API calls | 1,194 |
| Total tokens processed | 441,861,520 |
| Total cost | $3.83 |
| Cost per million tokens | $0.0087 |
| Savings vs always-premium | 68% (lab), 90% (production) |
| Routing accuracy | 80% across 57 prompts, 9 categories |
| Deterministic (zero-cost) queries | 5 of 57 lab, ~15-20% production |
| Escalation rate (to premium) | 9% |
| Test suites | 15 |
| Total tests | 162 |
| All tests passing | Yes |

---

## Evaluation Plan

| Condition | Description | Dataset | Metric |
|-----------|-------------|---------|--------|
| C4 (Naive) | Full context per turn, no HCM, no guard | LongGenBench | Token count, cost |
| C1 (Full REI) | Cached prefix + sliding window + deterministic | LongGenBench | Token savings, accuracy delta |
| C3 (Guard) | C1 + CARDO GUARD active | GPQA Diamond | Hallucination catch rate, false positive rate |
| Synthesis | C1 + HCM hierarchical compression | AcademicEval | ROUGE/BERTScore on Related Work |

### D1 Corpus

`data/REI-D1-corpus.json` — 30 frozen arXiv papers (snapshot: August 1, 2026). Version-locked, SHA-256 hashed, immutable. Reproducible by any third party. See `data/corpus/README.md` for population methodology.

---

## Timeline

| Month | Milestone | Deliverable |
|-------|-----------|-------------|
| Month 1 | Benchmarking | C4/C1/C3 results on LongGenBench + GPQA Diamond |
| Month 2 | Reproducibility | Multi-run comparison with hash-verified corpus |
| Month 3 | Multi-model evaluation | Agreement rates: llama vs gpt-4o on evidence tiers |
| Month 4 | Confidence calibration | Threshold tuning against GPQA accuracy |
| Month 5 | Documentation + release | Open-source Docker image, lab reports, README |
| Month 6 | Final report | Grant deliverable with all protocol results |

---

## Budget

| Line item | CAD |
|-----------|-----|
| API compute (3 months, estimated) | $1,500 |
| Hosting + deployment (Vercel, Docker) | $600 |
| Developer stipend (documentation, testing, release) | $2,000 |
| Dissemination (open-source release, grant writeup) | $900 |
| **Total requested** | **$5,000** |

---

## Team

| Role | Person |
|------|--------|
| Lead developer | Aaron Marchant — 202 commits, 6 repos, 3 months of sustained development |
| Advisors | PromptHound Labs — applied AI engineering methodology |

---

## Repository

`https://github.com/aaronmarchant96-max/rei-ai-platform`

All code, tests (162 passing), benchmarks, and documentation are publicly available. Docker containerization included. Licensed under MIT.
