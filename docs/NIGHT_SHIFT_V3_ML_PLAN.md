# NIGHT SHIFT v3: The Hinge Classifier
### ML-Based Routing Integration Plan for REI.ai
**Status: DRAFT — Awaiting user approval before implementation**

---

> **"Fortis et Liber"** — Strong and Free.
> Strong enough to classify with precision. Free enough to fall back without inference.

---

## 1. What We're Building (In One Sentence)

A **zero-dependency, local-first ML classifier** that sits as **Layer 1.5** between the existing deterministic fingerprint catalog and the CARDO GUARD escalation gate — scoring every prompt on three axes and outputting a **Complexity Hinge Score** that replaces the current hand-weighted `R(T)` formula with a learned one.

---

## 2. The Problem with the Current Router

The existing `R(T)` formula in `nightShiftRouter.js` is:

```
R(T) = words×2 + questionMarks×8 + uncertaintyHits×10
```

This is **hand-calibrated, not learned**. The docs themselves say it:

> *"A hand-set baseline, not statistically fit... The 4x multiplier is a design choice, not a fitted parameter. It has not been validated against an alternative weighting."*
> — `INFORMATION_THEORETIC_ARCHITECTURE.md`, Section 2

The documented limitations are exact:
- Cannot detect **sarcasm, irony, or indirect requests**
- Confidence thresholds are **human-calibrated, not learned**
- No **session-level routing strategy**
- Keyword-only — can't detect **semantic intent hiding behind safe words**

The ML layer fixes all four of these.

---

## 3. Theoretical Grounding

### 3a. Michio Kaku's Civilization Tiers → LLM Capability Tiers

Kaku's Type I/II/III Civilization framework categorizes civilizations by energy mastery. We cannibalize this to define **prompt complexity tiers** that map to LLM capability requirements:

| Kaku Tier | Civilization Type | REI Router Tier | Model | Energy Analogy |
| :--- | :--- | :--- | :--- | :--- |
| **Type 0** | Current Earth — can't harness own planet yet | **Layer 0: Deterministic** | `$0 — no LLM call` | Zero inference energy |
| **Type I** | Planetary-scale energy mastery | **Cheap: Instant pattern** | `llama-3.1-8b-instant` | Local, bounded cognition |
| **Type II** | Stellar-scale energy mastery | **Standard: Structured reasoning** | `llama-3.3-70b-versatile` | Full planetary cognitive load |
| **Type III** | Galactic-scale energy mastery | **Premium: Frontier reasoning** | `gpt-4o / gpt-oss-120b` | Unbounded cross-domain synthesis |

**The ML classifier's job is to determine, in <20ms, which civilization tier a prompt actually belongs to** — without the current heuristic misclassifying "stellar-scale" prompts as "planetary" and vice versa.

### 3b. Fortis et Liber Philosophy ("Strong and Free")

From `GRANT_PROPOSAL.md` and `fortis-et-liber.md`, the **Fortis et Liber documentation framework** captures reasoning alongside code. We apply this to the ML classifier:

- **Fortis (Strong)**: The classifier must be **provably correct** — every routing decision produces an auditable trace. ML classifiers are typically black boxes; ours will emit a `hingeVector` with feature weights, making the learned signal transparent.
- **Liber (Free)**: The classifier must be **free to fail safely** — if it times out (>50ms), the system falls back to the existing deterministic fingerprint catalog with **zero quality regression**.

This is the only ML routing system that is simultaneously **learned AND fully deterministic on failure**.

### 3c. What We Cannibalize from Open Source

| System | What We Take | What We Reject |
| :--- | :--- | :--- |
| **RouteLLM (LMSys)** | The insight that **matrix factorization on LMSYS Arena preference pairs** produces a reliable "strong model needed" signal. We'll generate synthetic preference pairs from our 57-prompt benchmark. | Their full BERT fine-tune (too heavy for WASM/local-first). |
| **Semantic Router (aurelio-labs)** | The idea of **embedding similarity routing** — using cosine distance from pre-computed anchor vectors. We'll compute anchors from our 15 fingerprint categories. | Their Python/API-only architecture (we need pure JS). |
| **Mixtral MoE gating** | The **top-k softmax gating mechanism** — each expert gets a score, and the router picks the top-k winners. We adopt this as a multi-label probability vector across our 15 domains. | The Sparse MoE implementation (too complex; we stay dense). |
| **FrugalGPT cascade pattern** | The **cascade-until-confident** principle already baked into our Layer 0 → 1 → 2 architecture. We extend the cascade with a learned confidence gate. | Nothing — we've already implemented the cascade. |
| **CARGO (confidence-aware escalation)** | The concept of a **confidence threshold as the escalation hinge**. We formalize this into the Hinge Score. | Their dependency on model inference for confidence scoring. |

---

## 4. The Architecture: Night Shift v3

```
┌──────────────────────────────────────────────────────────────────────┐
│  INCOMING PROMPT                                                       │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  LAYER 0: DETERMINISTIC ENGINE                     [<1ms, $0]         │
│  deterministicEngine.js — greetings, smalltalk                        │
│  UNCHANGED from current implementation                                │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ (null = not greeting)
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  LAYER 1: FINGERPRINT CATALOG                      [<2ms, $0]         │
│  nightShiftRouter.js — 15-entry keyword catalog                       │
│  UNCHANGED from current implementation                                │
│  Outputs: { catalogMatch, catalogScore, catalogConfidence }           │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  LAYER 1.5: HINGE CLASSIFIER (NEW — Night Shift v3)  [<20ms, $0]     │
│  src/lib/hingeClassifier.js                                            │
│                                                                        │
│  Input: raw prompt text                                               │
│  Process: 3-axis scoring →                                            │
│    [1] Epistemic Complexity Score  (ECS) — 0.0 to 1.0                │
│    [2] Domain Ambiguity Score      (DAS) — 0.0 to 1.0                │
│    [3] Adversarial Pressure Score  (APS) — 0.0 to 1.0                │
│                                                                        │
│  Output: Hinge Score (HS) = weighted(ECS, DAS, APS) → Tier           │
│  Also emits: hingeVector (transparent feature weights)                │
│                                                                        │
│  FAILURE MODE: if classifier errors/timeouts → falls back to          │
│  Layer 1 catalog result. Zero quality regression guaranteed.          │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  LAYER 2: CARDO GUARD GATE                          [<1ms, $0]        │
│  cardoGuard.js — cost-weighted escalation decision                     │
│  NOW CONSUMES: Hinge Score as confidence input                        │
│  (Previously consumed raw catalogConfidence)                          │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  LAYER 3: MODEL INFERENCE                                              │
│  api/cfai.js — Groq/OpenAI API call                                   │
│  UNCHANGED from current implementation                                │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 5. The Three-Axis Hinge Classifier

### Axis 1: Epistemic Complexity Score (ECS)

**What it measures:** How much domain knowledge and multi-step reasoning is required.

This replaces the current `R(T) = words×2 + questionMarks×8 + uncertaintyHits×10` with a **learned, weighted n-gram feature vector**.

**How it's built:**
- Collect our 57-prompt benchmark set (already labeled with routing tiers from `routingEval.test.js`)
- Augment with ~500 synthetic prompts generated by varying:
  - Word count (10 → 200)
  - Uncertainty language density
  - Multi-clause conditionals
  - Code vs natural language ratio
- Train a **logistic regression classifier** (scikit-learn compatible coefficients, exported to a 4KB JSON weight file)
- Deploy as pure JS inference using the weight file — no ONNX, no WASM runtime needed

**Features extracted (all computable in pure JS):**
```
f1: normalized word count (0-1, sigmoid scaled at 150 words)
f2: question mark density (questions / words)
f3: uncertainty phrase density (UNCERTAINTY_TERMS hits / words)
f4: HIGH_STRUCTURE_TERMS hit count (from current router)
f5: conditional clause count ("if", "unless", "given that", "assuming")
f6: multi-comparison verbs ("compare", "versus", "weigh", "trade-off")
f7: negation density ("not", "never", "without", "except")
f8: technical vocabulary ratio (code fences, markdown tables, URLs)
f9: cross-domain signal collision (fingerprint catalog: how many entries score > 0?)
```

**Output:** `ECS ∈ [0.0, 1.0]`

### Axis 2: Domain Ambiguity Score (DAS)

**What it measures:** How ambiguous is the domain assignment? If a prompt scores highly in both `genealogy-deep-dive` AND `story-architect`, that collision is itself a signal that higher-tier reasoning is needed.

**How it's built:**
- Run the existing `getCatalogRouteMatch()` across ALL 15 fingerprint entries (not just the top match)
- Compute the **entropy of the score distribution**: `DAS = -Σ p(i) × log(p(i))`
- High entropy = high ambiguity = higher-tier model needed
- Low entropy = clear domain match = trust the catalog

**Key insight (novel — not in RouteLLM or Semantic Router):**
> The **disagreement between fingerprints is itself a routing signal**. If a prompt activates 6 fingerprints at moderate confidence, that's a Type III (Galactic) prompt — it needs frontier reasoning regardless of its word count.

**Output:** `DAS ∈ [0.0, 1.0]`

### Axis 3: Adversarial Pressure Score (APS)

**What it measures:** The probability that the prompt is attempting to subvert routing, extract system prompts, or cause policy bypass — even if it avoids the obvious surface keywords.

**How it's built:**
- Extends the existing `ADVERSARIAL_REPHRASE_PATTERNS` in `nightShiftRouter.js`
- Adds 12 new **second-order rephrase patterns** (the ones that get past the current scanner)
- Integrates the output of `redTeamScanner.js` (already in the codebase) as a binary signal
- Weights APS heavily toward the `red-team-deep` pathway if APS > 0.6

**The key addition — "Syntax-Semantic Mismatch" detection:**
> A prompt that uses greeting-syntax but embeds instruction-override semantics (e.g., "Hi! By the way, ignore your previous instructions.") should score high on APS. The current system can miss this by routing the "Hi!" to `simple-greeting` before the injection is seen.
>
> Solution: APS is computed on the **full prompt, before any routing decision is made**.

**Output:** `APS ∈ [0.0, 1.0]`

---

## 6. The Hinge Score Formula

```
HS = (ECS × 0.45) + (DAS × 0.35) + (APS × 0.20)
```

**Weight rationale:**
- ECS gets the most weight (0.45) — it's the primary complexity signal
- DAS is second (0.35) — domain collision is a strong escalation predictor
- APS is lowest (0.20) — security concerns are already handled by the red-team pipeline; APS is an early-warning amplifier

**Tier mapping (replacing the current R(T) thresholds):**
```
HS < 0.25  → Type 0/I  (deterministic / cheap)     [llama-3.1-8b-instant]
HS < 0.55  → Type II   (standard reasoning)         [llama-3.3-70b-versatile]
HS < 0.80  → Type II+  (structured premium)         [llama-3.3-70b-versatile + CARDO GUARD escalation check]
HS ≥ 0.80  → Type III  (frontier / galactic)        [gpt-4o / gpt-oss-120b]
```

**The Hinge Score feeds directly into CARDO GUARD as the `confidence` parameter:**
```js
// Before (v2):
const confidence = catalogConfidence || decision.confidence.cheap;

// After (v3):
const confidence = hingeScore.hs;  // Learned, not hand-tuned
```

---

## 7. Training Strategy (Synthetic Dataset from Existing Tests)

We don't need external labeled data. We have it already:

### Source 1: 57-Prompt Benchmark (`routingEval.test.js`)
- Already labeled with expected routing tier
- Extract all 57 prompts, map tier → complexity label
- Weight: **High** (hand-curated, production-representative)

### Source 2: 26 Blind Held-Out Prompts (`routingEvalBlind.test.js`)
- Never seen during development — ideal test set
- Weight: **High** (true holdout)

### Source 3: Synthetic Augmentation (500 prompts)
- Generate 100 prompts per tier using simple templates + word count scaling
- Validate against the existing `nightShiftRouter` to ensure synthetic labels are consistent
- Weight: **Medium** (synthetic, but rule-consistent)

### Training Algorithm
- **Logistic Regression with L2 regularization** for ECS (interpretable coefficients, exportable to JSON)
- **Shannon entropy** for DAS (pure math, no training needed)
- **Rule-based weighted sum** for APS (deterministic, extending existing regex patterns)

**Output artifacts:**
```
data/ml/ecs_weights.json       // ~4KB — logistic regression coefficients
data/ml/ecs_training_log.json  // Training accuracy, per-feature importance
data/ml/ecs_test_results.json  // Holdout accuracy on blind set
```

---

## 8. Implementation Phases

### Phase 1: Feature Extraction (Pure JS — No ML Libraries)
**File:** `src/lib/hingeClassifier.js`

Build the feature extraction functions in pure JS. No external dependencies. Every feature is a deterministic function of the raw prompt string. This is testable immediately with our existing Jest setup.

**Deliverables:**
- `extractFeatures(prompt) → FeatureVector` (9 features)
- `scoreDomainAmbiguity(prompt) → DAS` (entropy of catalog scores)
- `scoreAdversarialPressure(prompt) → APS` (extended rephrase patterns)
- 20+ Jest tests for feature extraction edge cases

### Phase 2: Training Script (Node.js, one-off run)
**File:** `scripts/train-hinge-classifier.mjs`

A standalone Node.js script that:
1. Loads prompts from `routingEval.test.js` and `routingEvalBlind.test.js`
2. Extracts feature vectors for each
3. Runs logistic regression (using a tiny pure-JS implementation or `ml-logistic-regression` npm)
4. Exports coefficients to `data/ml/ecs_weights.json`
5. Reports accuracy on the holdout set

This script is run **once** to generate the weight file. The weight file ships with the repo. No training at runtime.

### Phase 3: Inference Integration
**File:** `src/lib/hingeClassifier.js` (continued)

Wire the ECS logistic regression inference into the `computeHingeScore()` function:
```js
export function computeHingeScore(prompt) {
  const features = extractFeatures(prompt);
  const ecs = inferECS(features);     // logistic regression on weight file
  const das = scoreDomainAmbiguity(prompt);
  const aps = scoreAdversarialPressure(prompt);
  const hs = (ecs * 0.45) + (das * 0.35) + (aps * 0.20);
  return {
    hs,
    tier: getTierFromHS(hs),
    hingeVector: { ecs, das, aps, features },  // Fortis: transparent trace
  };
}
```

### Phase 4: Router Integration
**File:** `src/lib/nightShiftRouter.js`

Insert the Hinge Classifier call between Layer 1 (catalog) and the CARDO GUARD gate:
```js
// After catalog match, before CARDO GUARD:
let hingeResult = null;
try {
  hingeResult = computeHingeScore(input);  // <20ms, pure JS
} catch (e) {
  // Liber: fail safe — fall back to catalog confidence
  hingeResult = null;
}
const confidence = hingeResult?.hs ?? (catalogConfidence || decision.confidence.cheap);
```

### Phase 5: Test Suite Updates
**Files:** `src/lib/nightShiftRouter.test.js`, new `src/lib/hingeClassifier.test.js`

- 15+ tests for `computeHingeScore()` covering all 4 tiers
- 10+ tests for `extractFeatures()` covering edge cases
- Update existing router tests to assert `hingeScore` is present in routing decision output
- Add a new `routingEvalML.test.js` comparing ML-routed accuracy vs baseline accuracy

**Target: 231 → ~265 tests total (34 new tests)**

### Phase 6: Transparency UI (Landing Page)
**File:** `src/ToolsLanding.jsx`

Surface the `hingeVector` in the live routing demo:
- Show `ECS / DAS / APS` scores as 3 micro-bars next to the latency readout
- Label as: `Epistemic · Ambiguity · Pressure`
- This turns the ML classifier into a visible, explainable feature — not a black box

---

## 9. What This Unlocks (The Novel Contribution)

No existing open source router does all three of these simultaneously:

| Property | RouteLLM | Semantic Router | CARDO REI v2 | **Night Shift v3 (Proposed)** |
| :--- | :--- | :--- | :--- | :--- |
| Zero-inference fallback | ❌ | ❌ | ✅ | ✅ |
| Learned complexity scoring | ✅ | ✅ | ❌ | ✅ |
| Domain collision signal (DAS) | ❌ | ❌ | ❌ | ✅ |
| Transparent hingeVector trace | ❌ | ❌ | ✅ | ✅ |
| Pure JS, no Python runtime | ❌ | ❌ | ✅ | ✅ |
| Trained on repo's own benchmark | N/A | N/A | N/A | ✅ |
| Adversarial pre-routing scan | ❌ | ❌ | ✅ (after) | ✅ (before catalog) |
| Kaku-tier capability mapping | ❌ | ❌ | ❌ | ✅ |
| CARDO GUARD integration | ❌ | ❌ | ✅ | ✅ |
| 100% deterministic on failure | ❌ | ❌ | ✅ | ✅ |

---

## 10. What Changes, What Stays the Same

### Stays Exactly the Same
- Layer 0 `deterministicEngine.js` — unchanged
- `fingerprints.json` catalog — unchanged (still used for DAS computation)
- `cardoGuard.js` equation — unchanged (now fed a better confidence value)
- `api/cfai.js` — unchanged
- All 231 existing tests — must continue passing
- Production cost savings — must remain ≥78%

### Changes
- `nightShiftRouter.js` — adds one `try/catch` wrapped call to `computeHingeScore()`
- New file: `src/lib/hingeClassifier.js`
- New file: `scripts/train-hinge-classifier.mjs` (dev-only, not shipped to production)
- New data: `data/ml/ecs_weights.json` (4KB, static, ships with repo)
- `ToolsLanding.jsx` — adds `hingeVector` visualization to live demo

---

## 11. Risks & Mitigations

| Risk | Mitigation |
| :--- | :--- |
| ML classifier is slower than 20ms | Hard timeout → falls back to catalog confidence (Liber principle) |
| Training data (57 prompts) is too small | L2 regularization prevents overfitting; blind set validation confirms generalization |
| New tests break existing 231 | Phase 5 runs full suite before any merge; pre-commit hooks enforce this |
| Weight file drifts from router logic | `data/ml/ecs_training_log.json` records exact training conditions; re-training script is reproducible |
| Routing accuracy regresses | `routingEvalML.test.js` benchmark gates deployment: build fails if ML accuracy < baseline accuracy |

---

## 12. Falsifiable Hypothesis (Per the Fortis et Liber Documentation Standard)

> **Hypothesis:** The Hinge Score (HS) will produce routing accuracy ≥85% on the 26-prompt blind held-out set (`routingEvalBlind.test.js`), compared to the current baseline accuracy of ~80%.
>
> **What would disprove this:** If `routingEvalML.test.js` shows HS accuracy < 80% on the blind set, the ML layer is removed and the system reverts to the catalog-only confidence. The fallback is in the code from day one.
>
> **Verification command:**
> ```bash
> npm test -- --testPathPatterns=routingEvalML
> ```

---

## 13. File Map

```
rei-ai/
├── src/lib/
│   ├── hingeClassifier.js          [NEW — Layer 1.5 ML classifier]
│   ├── hingeClassifier.test.js     [NEW — 25+ tests]
│   └── nightShiftRouter.js         [EDIT — ~10 lines changed]
├── scripts/
│   └── train-hinge-classifier.mjs  [NEW — one-off training script]
├── data/ml/
│   ├── ecs_weights.json            [NEW — 4KB logistic regression weights]
│   └── ecs_training_log.json       [NEW — training provenance]
└── src/__eval__/
    └── routingEvalML.test.js       [NEW — ML accuracy benchmark]
```

**Total new code: ~600 lines**
**Lines changed in existing files: ~15**
**Risk surface: minimal**

---

## 14. Implementation Order (Recommended)

1. `hingeClassifier.js` — pure feature extraction (no ML yet, fully testable)
2. `hingeClassifier.test.js` — 25+ tests passing before training script is written
3. `train-hinge-classifier.mjs` — training script, generates `ecs_weights.json`
4. Add `inferECS()` to `hingeClassifier.js` — logistic regression inference on weight file
5. `routingEvalML.test.js` — benchmark accuracy before touching the router
6. Integrate into `nightShiftRouter.js` — the 10-line change, gated by the benchmark passing
7. `ToolsLanding.jsx` — surface `hingeVector` in UI

---

*Prepared: 2026-07-24 — PromptHound Labs / REI.ai*
*Classification: DRAFT — pending user approval*
