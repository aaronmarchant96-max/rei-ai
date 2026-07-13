# REI: Transparent Token-Efficient Reasoning Engine

**Research framing — the one sentence a reviewer remembers:**

> REI is a transparent, token-efficient reasoning engine designed to test reproducible AI reasoning at scale.

---

## 1. The Problem

Most AI systems produce answers without showing how they arrived at them. When an LLM generates a plausible-sounding but incorrect response, there's no trace of the reasoning path — no way to audit, reproduce, or falsify the output. This matters for any domain where decisions have consequences: research, policy, medicine, law.

REI solves three problems simultaneously:

| Problem | REI's solution |
|---------|---------------|
| **Opaque reasoning** | CARDO REI makes the hinge point, facts, assumptions, and what-would-change-my-mind explicit in every response |
| **Unbounded cost** | Night Shift router selects the cheapest model that meets a confidence threshold (68% savings vs always-premium) |
| **Non-reproducible outputs** | Deterministic routing + fingerprint catalog enables identical input → identical classification, with confidence scoring at every decision point |

---

## 2. Research Questions

1. **Transparent reasoning** — Does exposing hinge points and evidence tiers reduce hallucinations compared to opaque LLM output?
2. **Token efficiency** — What is the cost of transparency? How many additional tokens does structured reasoning require versus unstructured output?
3. **Model agreement** — Do different models (llama-3.1-8b, llama-3.3-70b, gpt-4o) agree on evidence classification when given the same structured prompt?
4. **Reproducibility** — Can the Night Shift fingerprint catalog produce identical routing decisions across sessions, eliminating non-deterministic model selection?
5. **Confidence calibration** — Does the routing confidence score (catalog match strength) correlate with answer quality?

---

## 3. Preliminary Results

| Metric | Value |
|--------|-------|
| Total API calls | 1,194 |
| Total tokens processed | 441,861,520 |
| Total cost | $3.83 |
| Cost per million tokens | $0.0087 |
| Savings vs always-premium | 68% (lab), 90% (real-world) |
| Routing accuracy | 80% across 57 prompts, 9 categories |
| Deterministic (zero-cost) queries | 5 of 57 lab, ~15-20% production |
| Test suites | 15 |
| Total tests | 162 |
| All tests passing | Yes |

Production cost data (DeepSeek API, July 2026): 918 requests via deepseek-v4-pro, 276 via deepseek-v4-flash. Layer 0 deterministic engine captures greetings and smalltalk at $0, further reducing real-world cost below lab benchmark numbers.

---

## 4. Methodology

### Architecture

```
Query → Layer 0: Deterministic Engine (regex, $0, instant)
      → Layer 1: Night Shift Router (fingerprint catalog, confidence scoring)
      → Layer 2: Domain Detection (coding, genealogy, story — isolated from history)
      → Layer 3: CARDO GUARD (cost-governor: is expensive inference justified?)
      → Response + structured reasoning trace
```

### Measurement Protocols

| Protocol | What it measures | How it's measured |
|----------|-----------------|-------------------|
| Routing accuracy | Correct pathway selection | 57-prompt benchmark, 9 categories, deterministic assertions |
| Cost savings | Actual vs always-premium baseline | Per-message cost tracking with cumulative savings |
| Reproducibility | Identical input → identical routing | Deterministic catalog matching, no inference dependency |
| Confidence calibration | Match score vs answer quality | Fingerprint entry confidence thresholds (0-1) |
| Token efficiency | Tokens per decision | Pre-send token estimation + per-message usage tracking |

### Baselines

- **C4 (Naive)**: Full context per turn, no HCM, no guard — baseline cost
- **C1 (Full REI)**: Cached prefix + sliding window + deterministic Layer 0 — cost savings vs C4
- **C3 (Guard)**: C1 + CARDO GUARD active — hallucination catch rate, confidence scoring

---

## 5. Comparison to Existing Systems

| System | Transparent | Reproducible | Cost-aware | Multi-model | Alberta-built |
|--------|------------|-------------|------------|-------------|---------------|
| Chain-of-thought prompting | Partial | No | No | No | No |
| RAG systems | No | No | No | No | No |
| Agent frameworks | Partial | No | No | Yes | No |
| REI (this project) | Yes | Yes | Yes | Yes | Yes |

---

## 6. Evidence Tiering (Generalized)

Originally developed for genealogical record evaluation, the evidence tier system applies to any domain where sources have varying reliability:

| Tier | Label | Application |
|------|-------|-------------|
| 🟢 Primary | Direct source verification | Original documents, API responses, logged data |
| 🔵 Strong | Corroborated secondary sources | Peer-reviewed papers, official documentation |
| 🟠 Needs Review | Single-source or inferred | Unverified claims, plausible-but-unconfirmed |
| 🟡 Weak / Memory | Anecdotal, oral, or recalled | User memory, unsubstantiated assertions |

---

## 7. AMII Alignment

REI maps directly to Alberta Machine Intelligence Institute's research themes:

- **Responsible AI**: Every routing decision is traceable, testable, and confidence-scored
- **Interpretability**: CARDO REI makes the reasoning hinge, assumptions, and falsifiability criteria explicit
- **Efficient ML**: Night Shift router reduces inference cost 68% without quality degradation
- **Reproducible AI**: Deterministic routing + fingerprint catalog enables identical-input-identical-output
- **Applied AI for Alberta**: Genealogy domain applies these methods to historical record evaluation

---

## 8. Timeline

| Month | Milestone |
|-------|-----------|
| Month 1 | Benchmarking: 57-prompt suite + GPQA Diamond + AcademicEval integration |
| Month 2 | Reproducibility testing: hash-verified corpus, multi-run MD diff comparison |
| Month 3 | Multi-model evaluation: llama vs gpt-4o agreement on evidence classification |
| Month 4 | Research graph: evidence scoring + hinge-point network visualization |
| Month 5 | Documentation + open-source release: Docker, README, lab reports |
| Month 6 | Final report: grant deliverable with all protocol results |

---

## 9. Budget

| Line item | Estimate (CAD) |
|-----------|---------------|
| API compute (3 months, estimated) | $1,500 |
| Hosting + deployment (Vercel, Docker) | $600 |
| Developer time (documentation, testing) | $2,000 |
| Dissemination (open-source release, writeup) | $900 |
| **Total** | **$5,000** |

---

*Night Shift Router — the cheapest model that still meets the confidence bar.*  
*Built in Alberta. 162 tests. 68% savings. Deterministic, testable, reproducible.*
