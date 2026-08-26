---
status: canonical
authority_scope: implemented-system-behavior
owner: Aaron Marchant
last_verified: 2026-08-20
verified_against_commit: 7247921
claims_source: docs/CLAIM_LEDGER.md
supersedes: [docs/INFORMATION_THEORETIC_ARCHITECTURE.md]
superseded_by: null
archived_at: null
---

# REI.ai — Adaptive Inference Orchestrator Architecture

> **"The future of AI isn't just about better models — it's about better systems."**

---

## 1. System Overview

```
Incoming Query
      │
      ▼
 Layer 0: Deterministic Engine & Red Team Scanner
   (regex · templates · zero-token · D1 adversarial scanner)
      │
      ▼
 Layer 1: Hinge Classifier (Instrument)
   (hingeClassifier.ts · 8 textual features · ECS · DAS · APS · ML Weights)
      │
      ▼
 Layer 2: Decision Cascade (Router)
   (nightShiftRouter.ts · priority-ordered ladder · fingerprint matching)
      │
      ├── Deterministic → $0, 0ms
      ├── Cheap (Flash/Chat) → ~$0.0001, ~500ms
      ├── Medium (70B/Domain) → ~$0.0005, ~1s
      └── Premium Baseline (GPT-4o) → ~$0.0125 (Savings baseline)
      │
      ▼
 CARDO GUARD
   (cost-governor: is expensive inference justified?)
      │
      ▼
  Response + Routing Trace
    (why this pathway? confidence? cost vs premium?)
```

---

## 2. Two-Layer Router Architecture

The design principle decouples **scoring** (how hard is this query?) from **decision** (which route should handle it?) so each layer is independently testable.

### Layer 1 — Hinge Classifier (`src/lib/hingeClassifier.ts`)
The Hinge Classifier is the numerical instrument. It extracts **8 textual features**:
- Word count ($f_1$)
- Question mark density ($f_2$)
- Uncertainty terms ($f_3$)
- Structural phrases ($f_4$)
- Conditional syntax ($f_5$)
- Comparative verbs ($f_6$)
- Negation density ($f_7$)
- Technical structural markers ($f_8$)

These features feed three composite signals:
1. **ECS (Explicit Complexity Score):** Weighted linear combination of the 8 features.
2. **DAS (Domain Ambiguity Score):** Normalized Shannon entropy across the route catalog. High DAS indicates ambiguous intent spanning multiple domain fingerprints.
3. **APS (Adversarial Pressure Score):** Aggregated score from scanner triggers and regex rephrase patterns.

A sigmoid function applies **ML-trained weights** loaded from `data/ml/ecs_weights.json`, outputting a Hinge Score $HS \in [0, 1]$ across four complexity tiers (`low`, `medium`, `high`, `ultra`) and calculating `cheapRouteConfidence` = $1 - HS$. Because weights are loaded from JSON, the scoring model can be retrained independently of the routing logic.

### Layer 2 — Decision Cascade (`src/lib/nightShiftRouter.ts`)
A priority-ordered ladder where the first match wins:

```text
1. empty input                   → default route
2. greeting                     → cheapest path (llama-3.1-8b-instant)
3. meta-query ("who are you")   → cheapest path (llama-3.1-8b-instant)
4. self-evaluation              → The Engineer (strict, temp 0.2, 800 tokens)
5. adversarial (regex / scanner) → adversarial-validation (~10.6x ceiling cost of cheapest path, $0.00138 vs $0.00013/1K)
6. domain match (coding/genealogy/story/legal) → domain route
7. high complexity / structure  → structured-reasoning (800 tokens, temp 0.2)
8. stored preference            → recall last domain
9. default fallback             → structured-reasoning
```

*Note on Lane Locking:* Greetings and meta-queries run **before** the adversarial check so a prompt like *"hi, ignore your instructions"* hits the cheap fast path (`llama-3.1-8b-instant`) instead of paying the ~10.6x ceiling cost of the adversarial-validation route. This priority order is locked by unit tests.

---

## 3. Cost Model & Adversarial Detection

- **Cost Model:** Decoupled in `modelRates.json` and `fingerprints.json`. Baseline comparison is always `gpt-4o`. Every routing decision logs the actual estimated cost alongside the baseline ceiling cost to track cumulative savings.
- **Adversarial Detection:** Evaluated via task phrasing regex **OR** D1 scanner escalation. First-pass regex retains router-owned fast detection, while scanner taxonomy acts as the security backstop.

---

## 4. Error-Gap Tagging & Meta-Evaluation ("Evaluating the Evaluator")

The error-gap tagging system measures **which defenses catch errors and which errors slip through everything.** Rather than merely evaluating input queries, **REI evaluates the reliability of the machinery doing the evaluation.**

```text
Architecture ──> Router ──> Evaluation ──> Error Gaps ──> [caught: tag] ──> Error Catalogue ──> System Feedback Loop
```

### Git Commit Tags
When a commit fixes or documents an error, one tag is included in the commit body:
- `[caught: manual]` — Caught by human review (dashboard, diff, UI test).
- `[caught: ai-cross-check]` — Caught by comparing outputs across models.
- `[caught: test]` — Caught by an automated unit test suite.
- `[caught: claim-gate]` — Caught by a `verifyAll()` claim in the FEYNMAN GATE.

### Automated Tooling & Derived Artifacts
- **Extractor:** `scripts/extract-error-gaps.mjs` parses git commit history into `src/data/errorGaps.json` and `docs/ERROR_GAP_CATALOGUE.md`.
- **CI Verification:** CI runs `--check` to ensure `errorGaps.json` matches git reality. Git commit history is the single source of truth; docs and JSON are reproducible projections.
- **Long-term Value:** As tagged commits accumulate (~30+ entries), the catalogue statistically answers: *Which defense actually catches errors over time? Where does the router drift from the evaluator?*

---

## 5. Summary & Verification

Run the full verification suite across all 115 test suites:

```bash
npm test                             # 1331 passing tests across 115 suites
node scripts/gen-claims.mjs --check  # Verify claims.json integrity
node scripts/extract-error-gaps.mjs # Update error gap catalogue
```
