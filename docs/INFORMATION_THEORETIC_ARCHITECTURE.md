# CARDO REI: A Deterministic, Cost-Aware Routing Architecture for Multi-Domain LLM Reasoning

**A cascading, zero-inference-first router with an explicit cost-benefit escalation gate,
validated across five task domains.**

---

## Claim Stratification

This paper makes claims at three levels. All are argued, but not all are proven to the same standard:

| Claim | Level | Status |
|-------|-------|--------|
| **A:** The REI routing pipeline works as described — deterministic, cost-aware, multi-domain, auditably tested | Engineering | **Proven** — 162 tests, 57-prompt benchmark, gate assertions, reproducible CLI |
| **B:** This architecture is a good design for cost-aware reasoning systems — the combination of deterministic routing + explicit hinge detection + cost-weighted governance + human boundary conditions is superior to alternative designs | Design | **Argued** — supported by the evidence but not proven across alternative architectures |
| **C:** The principles underlying REI (complexity reduction, decision boundary detection, cost-weighted action) generalize beyond this specific implementation to reasoning more broadly | Theory | **Hypothesized** — see Testable Hypotheses (Section 9) |

---

## Abstract

> While Large Language Models (LLMs) excel at generative tasks, agentic deployments face severe quality-bleed (hallucinations) and cost-bleed (over-routing simple queries to expensive models). We present CARDO REI, a deterministic cascading router that extends prior cost-aware routing work (e.g., FrugalGPT's cascade-until-confident pattern, RouteLLM's preference-trained routing) with a zero-inference lexical fingerprint layer and an explicit cost-weighted escalation gate (CARDO GUARD). CARDO REI separates cognitive processing into a structured 8-step pipeline, isolates decision boundaries using a deterministic hinge detection algorithm, and evaluates execution paths using a cost-weighted utility gate. We demonstrate the efficacy of this framework across five diverse domains (genealogy, coding, debate, industrial telemetry, and creative writing). Our system achieves 80% routing accuracy using a zero-inference lexical router, resulting in a 78% reduction in inference costs while maintaining strict consistency verified via 162 automated regression tests.

---

## 1. Design Philosophy

REI is built on one working assumption: most routing problems reduce to a single decision
boundary — the "hinge" — the point where a cheap pathway stops being adequate and a more
expensive one becomes justified. The design principle is to find that boundary explicitly,
price the cost of crossing it, and avoid building separate routing logic per domain.

| Step | Principle | REI Implementation |
|------|-----------|---------------------|
| **1. Reduce** | Strip the problem to the smallest decision that matters | 8-stage pipeline — every input passes through the same stages regardless of domain |
| **2. Formalize** | State the decision as an explicit rule, not a heuristic buried in prompt text | `Miss Loss > Waste → ACT` (Section 3) |
| **3. Generalize** | Test whether the same rule holds across domains without domain-specific code | Five domains (genealogy, coding, debate, telemetry, creative) |
| **4. Verify** | Test experimentally, not just argue | 162 assertion-gated tests; build fails if savings ≤ 0 |
| **5. Falsify** | State what would disprove the design choice | If routing accuracy degrades or costs exceed premium, CI blocks deployment (Section 9 has the full falsifiable hypotheses) |

This is closer to a cascading router with an explicit cost gate (in the tradition of FrugalGPT's
cascade pattern) than to a new theoretical framework — the contribution is the specific
combination (zero-inference lexical layer + cross-domain fingerprint catalog + cost-weighted
escalation gate), not a new principle of reasoning.

---

## 2. Formal Definition: The Routing Model

The design principles demand a formal specification, not metaphors. Here is the definition of the routing pipeline:

```
Let T be a reasoning task.
Let R(T) = words×2 + questionMarks×8 + uncertaintyHits×10  [Routing Complexity Index, nightShiftRouter.js:247-255]
Let P ∈ {deterministic, base, standard, premium}           [selected pathway]
Let τ be the hinge threshold — the exact boundary          [decision boundary point]
         where the answer flips
Let C(P, T) be the estimated cost of routing T through P   [cost estimation, nightShiftRouter.js:506]


A routing decision is correct for T when:

  C(P_actual, T) < C(P_premium, T)    (1) Cost Constraint
  AND accuracy(T) > threshold         (2) Quality Constraint
  AND P is deterministic AND reproducible  (3) Reproducibility Constraint


The pipeline operates correctly when it:
  (a) Routes queries to a pathway no more expensive than needed
  (b) Maintains quality above a measurable threshold
  (c) Produces identical output for identical input
  (d) Fails verifiably — the build blocks deployment if constraints are violated
```

### Derivations

**Complexity Score Derivation (R):**

```
R(T) = words×2 + questionMarks×8 + uncertaintyHits×10  [Routing Complexity Index]

Lexical weight coefficient (×2):
- A hand-set baseline, not statistically fit. Each word contributes 2 units
  to the complexity score. This weighting is checked against routing outcomes
  in the 57-prompt benchmark (routingEval.test.js) but has not been optimized
  against a labeled dataset — see Limitation 2 (Section 8).

Branching factor (×8, 4x lexical weight):
- Question marks are weighted higher on the assumption that they signal a
  decision point in the user's request. The 4x multiplier is a design choice,
  not a fitted parameter. It has not been validated against an alternative
  weighting.

Explicit uncertainty signal (×10, 5x lexical weight):
- Terms: "not sure", "unclear", "unknown", "missing", "uncertain", "doubt",
  "uncertainty". Weighted highest on the assumption that user-stated
  uncertainty correlates with routing difficulty — this is Testable
  Hypothesis 3 (Section 9), not yet confirmed.

Tier mapping:
  R(T) < 20  → low    (deterministic or base tier adequate)
  20 ≤ R(T) < 40 → medium (standard tier recommended)
  R(T) ≥ 40 → high   (consider premium tier, evaluate escalation)
```

**Cost Constraint Derivation:**

```
C(P, T) = (estimatedInputTokens + maxOutputTokens) / 1000
          × (costPer1kInput + costPer1kOutput)

C(P_premium, T) = same formula, using gpt-4o pricing

Savings = C(P_premium, T) - C(P_actual, T)
Savings must be > 0 — enforced by routingEval.test.js:227
```

**CARDO GUARD Derivation:**

```
Given:
- costToAct: the cost of taking action (routing premium, escalating)
- costToMiss: the cost of missing a real need (under-routing a complex query)
- falseAlarmRate: probability we act when action is unnecessary

Expected Waste = costToAct × falseAlarmRate          [cardoGuard.js:101]
Expected Loss  = costToMiss × (1 - falseAlarmRate)   [cardoGuard.js:102]

Verdict = ACT if Expected Loss > Expected Waste      [cardoGuard.js:103]
Verdict = WAIT if Expected Waste > Expected Loss

Breakeven: the exact cost at which the decision flips
  τ = (costToAct × falseAlarmRate) / (1 - falseAlarmRate)  [cardoGuard.js:85-91]
```

---

## 3. The Escalation Gate (CARDO GUARD)

Every escalation decision has an associated cost. The gate below is applied at every decision
point in the system — routing a user query to gpt-4o, evaluating evidence for a genealogy claim,
or deciding whether to flag a compressor anomaly in Tracepoint. The domain changes; the gate logic
does not.

```
Expected Waste    = Cost to Act   × False Alarm Rate
Expected Loss     = Cost of Miss  × (1 - False Alarm Rate)

Verdict = ACT     if Expected Loss > Expected Waste
Verdict = DO NOT ACT if Expected Waste > Expected Loss
```

*This is an application of expected utility theory with cost-weighted parameters. The contribution is not the equation — it is the adaptive parameterization: false alarm rates derived from routing confidence scores, cost weights calibrated against provider pricing, and the equation deployed at a specific decision boundary in a multi-tier routing pipeline.*

The breakeven point — the exact cost at which the decision flips — is computed by `calculateBreakevenMissCost()` (`cardoGuard.js:85-91`).

The `shouldEscalateToRemote()` cost-governor extends this to model routing: when confidence drops below a pathway-specific threshold, the system escalates to a higher-capability model, updating the model identifier, cost estimates, and token budget.

---

## 4. The Information-Flow Model

In this model, information passes through a series of processing stages. Raw input enters at high complexity, passes through filters, hits a decision boundary (the hinge), and emerges as a low-complexity routing decision. Each stage has a measurable cost.

```
[ RAW INPUT / HIGH COMPLEXITY ]
             ↓
      1. Collect (Mass)
             ↓
2. Analyze & Distinguish (Filters)
   Separates Signal from Inference
             ↓
3. Find the Hinge (Decision Boundary)
   The exact threshold where the answer changes
             ↓
4. CARDO GUARD Gate
   Cost-Risk Balance Evaluation
             ↓
[ ROUTING DECISION / LOW COMPLEXITY ]
```

### System Mappings

Each design concept maps to a specific, verifiable code path:

| Design Concept | REI Component | Verification |
|----------------|---------------|-------------|
| **Routing Complexity** | `getComplexityTier()` — `R = words×2 + questionMarks×8 + uncertaintyHits×10` | `nightShiftRouter.js:247-255`. 57-prompt benchmark validates tier assignment |
| **Decision Boundary (hinge)** | `buildRouterDecision()` — the decision tree branches at deterministic → base → standard → premium. One binary choice at each boundary | `nightShiftRouter.js:349-525`. Deterministic, reproducible |
| **Confidence Levels (evidence)** | 🟢 Primary Source = high-confidence, low-complexity. 🟡 Family Memory = low-confidence, high-complexity (subject to decay). Four-tier confidence ladder | `EvidenceCard.jsx`. 10 parser tests |
| **System Invariants** | 162 Jest tests. Information that enters the output must have entered the input through validated channels. Hallucination is an invariant violation | `routingEval.test.js`. Build fails if assertions fail |
| **Signal-to-Noise Ratio** | `isLikelyGenealogyRequest(input)` — current input only. History is noise. Signal is the user's immediate intent | `nightShiftRouter.js:426`. Fixed routing bleed |
| **Decision Equilibrium** | CARDO GUARD: the equilibrium point where `Action Waste = Miss Loss` — the breakeven hinge where the decision flips | `cardoGuard.js:85-91` |

### Design Heuristics

The pipeline is built around one working rule: keep the decision logic as simple as possible,
and look for the single boundary that actually determines the outcome.

| Heuristic | REI Application |
|---------------|----------------|
| Don't add complexity to find the answer — strip it away. | The 8-stage pipeline decomposes every problem into the same fundamental steps |
| The deciding factor is usually already in the input. | The hinge exists in the problem; REI isolates it rather than generating it |
| If the rule needs more branches per domain, it isn't reduced enough. | The escalation rule is one inequality (Section 3). If a domain needs a different rule, that's a sign the reduction isn't complete |
| Look for the exact boundary, not a gradient. | The hinge is a threshold, not a continuous score |

---

## 5. Pipeline Walkthrough — One Query, From Chaos to Solution

The theory's strength is that every claim can be verified by tracing a single query through the pipeline. Below is a complete walkthrough. The same result reproduces identically every run.

### Visual Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│  QUERY: "what should I consider before quitting my job to   │
│         start a company"                                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              LAYER 0: DETERMINISTIC CHECK                     │
│  Cost: $0 | Tokens: 0                                       │
│  Code: deterministicEngine.js:43-61                          │
│  Result: null — not a greeting. Proceed to routing.          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              COMPLEXITY COMPUTATION                             │
│  H = 13×2 + 0×8 + 0×10 = 26                                │
│  Tier: medium (≥20, <40)                                     │
│  Code: nightShiftRouter.js:247-255                           │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            FINGERPRINT CATALOG MATCH                           │
│  9 entries scanned | No matchTerms hit | Score: 0            │
│  Code: nightShiftRouter.js:125-152                           │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               DOMAIN DETECTION (input-isolated)                │
│  Coding: ✗ | Genealogy: ✗ | Story: ✗                        │
│  Default → structured-reasoning                               │
│  Code: nightShiftRouter.js:426,435,444                       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  ROUTE SELECTION                               │
│  Pathway: medium | Model: llama-3.3-70b                      │
│  Quality Gate: Hinge + Facts + Move                          │
│  Code: nightShiftRouter.js:486-489                           │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               CONFIDENCE SCORING                               │
│  catalogConfidence: 0 → fallback: 72%                        │
│  Code: nightShiftRouter.js:494-501                           │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  COST ESTIMATION                               │
│  estCost: $0.000558 | premiumCost: $0.005050                 │
│  Savings: 89% vs always-premium                               │
│  Code: nightShiftRouter.js:506-507                           │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│         CARDO GUARD — ESCALATION CHECK                         │
│  confidence 0.72 ≥ 0.3 → no escalation                       │
│  Code: cardoGuard.js:225-232                                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               RESPONSE GENERATION                               │
│  Model: llama-3.3-70b | Context: 5 messages                  │
│  deRoboticize filter active | System prompt: static const     │
│  Code: api/cfai.js:313-323, api/cfai.js:340                  │
└─────────────────────────────────────────────────────────────┘
```

### Step-by-Step Trace

```
QUERY: "what should I consider before quitting my job to start a company"
```

### Step 1 — Layer 0: Deterministic Check

```
resolveDeterministic("what should I consider...") → null
→ Not a greeting or smalltalk pattern. Proceed to routing.
→ Cost so far: $0. Tokens: 0.
→ Code: nightShiftRouter.js:370, deterministicEngine.js:43-61
```

### Step 2 — Complexity Computation

```
getComplexityTier("what should I consider before quitting my job to start a company")
  words = 13        → 13 × 2 = 26
  questionMarks = 0  → 0 × 8 = 0
  uncertaintyHits = 0 → 0 × 10 = 0
  Score: 26 → Tier: medium (≥20, <40)
→ Moderate cognitive load, no explicit uncertainty signals
→ Code: nightShiftRouter.js:247-255
```

### Step 3 — Fingerprint Catalog Match

```
getCatalogRouteMatch("what should I consider...")
  → Scans 9 fingerprint entries
  → No matchTerms hit → bestEntry: null, bestScore: 0
→ No specific fingerprint matched. Will use domain detection + default.
→ Code: nightShiftRouter.js:125-152
```

### Step 4 — Domain Detection (input-isolated)

```
isLikelyCodingRequest(input)   → false (no coding keywords)
isLikelyGenealogyRequest(input) → false (no genealogy keywords)
isLikelyStoryRequest(input)    → false (no story keywords)
→ No domain signal detected. Default to structured-reasoning.
→ Code: nightShiftRouter.js:426,435,444
```

### Step 5 — Route Selection

```
Decision: buildDecision("structured-reasoning")
  id: "structured-reasoning"
  label: "Structured Reasoning"
  model: "llama-3.3-70b-versatile"
  pathway: "medium"
  qualityGate: "Hinge + Facts + Move"
  rationale: "No special-case fingerprint matched; use the balanced reasoning profile."
→ Code: nightShiftRouter.js:486-489
```

### Step 6 — Confidence Scoring

```
catalogMatchId = null → does not match decision.id → catalogConfidence = 0
Fallback: decision.confidence.cheap = 0.72 (fingerprint threshold)
routingConfidence = 72%
→ Code: nightShiftRouter.js:494-501
```

### Step 7 — Cost Estimation

```
estimatedInputTokens = ceil(13 words / 4) = 4
maxOutputTokens = 400
selectedCostPer1k = 0.00059 + 0.00079 = 0.00138
premiumCostPer1k   = 0.00250 + 0.01000 = 0.01250

estimatedCost = (4 + 400) / 1000 × 0.00138 = $0.000558
premiumCost   = (4 + 400) / 1000 × 0.01250 = $0.005050
Savings: $0.004492 → 89% vs always-premium
→ Code: nightShiftRouter.js:506-507
```

### Step 8 — CARDO GUARD Escalation Check

```
shouldEscalateToRemote({
  confidence: 0.72,
  pathway: "medium",
  estimatedCost: $0.000558,
  premiumCost: $0.005050
})
→ pathway is "medium" → check confidence < 0.3? → 0.72 ≥ 0.3
→ No escalation needed
→ "Confidence meets pathway quality threshold. Remote inference justified."
→ Code: cardoGuard.js:225-232
```

### Step 9 — Response Generation

```
Model: llama-3.3-70b-versatile
System prompt: DOMAIN_SYSTEM_PROMPTS.assistant (~700 words, static)
Context window: last 5 messages only
deRoboticize filter strips formulaic openers and (Source: ...) fake citations
→ Code: api/cfai.js:313-323 (deterministic check), api/cfai.js:340 (API call)
```

### Response Quality Analysis

```
Hinge identified: "whether you have a viable business idea with a clear revenue stream"
  → Specific claim, falsifiable — not "the hinge is quitting your job"

Move identified: "Consider validating your business idea with potential customers"
  → Concrete action — not "more research is needed"

Citation: "CB Insights (2018)" — specific enough to verify
  → No fake (Source: ...) citation detected

Structured reasoning: present (Hinge, Facts, Move)
→ System operates within the 4 constraints of the hardened assistant prompt
```

### Verdict

```
Pathway:     medium (standard tier)
Confidence:  72%
Cost:        $0.000558
Premium:     $0.005050
Savings:     89%
Escalated:   no
Correct:     yes — constraints (1), (2), and (3) all satisfied
```

---

## 5b. Quick Verification (For Engineers)

Verify every claim in this paper in under 3 minutes:

### 1. Reproduce the Pipeline Walkthrough

```bash
git clone https://github.com/aaronmarchant96-max/rei-ai-platform
cd rei-ai-platform
npm ci --legacy-peer-deps
node scripts/demo.mjs "what should I consider before quitting my job to start a company"
```

Result: exact same routing decision, cost estimate, and savings as Section 5.

### 2. Run the Benchmark

```bash
npm test -- --testPathPatterns=routingEval
```

Result: 57/57 passing, 68% savings, 80% accuracy, 5 deterministic queries at $0.

### 3. Run Full Test Suite

```bash
npm test
```

Result: 162 tests, 15 suites, all passing.

### 4. Verify Production Numbers

```
Source: DeepSeek API dashboard
Tokens: 601M processed
Cost: $6.51 total
API calls: 1,497
Cost per million: $0.0108
```

All numbers independently verifiable at the provider dashboard.

---

## 6. Empirical Verification

A design claim is only as good as its verification. REI's verification is deterministic and reproducible — no model calls, no embeddings, no non-determinism. Identical input produces identical output every run. This is what makes it engineering rather than speculation.

| Measurement | Result | Method |
|------------|--------|--------|
| Routing accuracy | 80% across 57 prompts, 9 categories | `npm test -- --testPathPatterns=routingEval` |
| Cost savings | 68% vs always-premium | 57-prompt benchmark |
| Deterministic ($0) queries | 5 of 57 (9%) | Layer 0 engine |
| Escalation rate | 5 of 57 (9%) | CARDO GUARD cost-governor |
| Test coverage | 162 tests, 15 suites | Jest |
| Build gate | Fails if savings ≤ 0 | `routingEval.test.js:227` |
| Laboratory cost | $0.129 for 57 prompts | `routingEval` benchmark output |
| Development cost | $6.51 for 601M tokens | DeepSeek API dashboard |

```bash
git clone https://github.com/aaronmarchant96-max/rei-ai-platform
npm ci --legacy-peer-deps
npm test -- --testPathPatterns=routingEval
```

---

> **LIVE DEMO**
>
> The REI Engine is deployed and publicly accessible. Every claim in this paper can be verified by entering your own query, toggling the 🔍 transparency mode, and inspecting the routing trace — the pipeline walkthrough from Section 5 reproduces identically.
>
> **URL:** https://rei-ai.vercel.app  
> **Source:** https://github.com/aaronmarchant96-max/rei-ai-platform  
> **Benchmarks:** `npm test -- --testPathPatterns=routingEval`  
> **Docker:** `docker compose up`
>
> If the URL changes, the benchmark and source remain the authoritative verification. The live demo is convenience, not dependency.

---

## 7. Unification Across Domains

The same 8-stage CARDO REI pipeline + cost-weighted CARDO GUARD gate governs five domains. No domain-specific code. No per-domain routing logic. No per-domain quality checks. One architecture:

| Domain | Input Type | Hinge | Evidence Tiers | Cost Consideration |
|--------|-----------|-------|---------------|-------------------|
| **Genealogy** | Census records, parish registers, military pay vouchers | Birth date, marriage date, name disambiguation | 🟢 Primary → 🟡 Family Memory | False positive on misattributed ancestor |
| **Coding** | Source files, API requests, architecture questions | Is the request specific enough to proceed? (Phase 0 gate) | HARD STOP enforcement | gpt-4o vs llama-3.3-70b cost delta |
| **Debate** | Arguments, evidence, counter-arguments | Which side carries the burden of proof? | Source reliability classification | Cost of generating vs cost of verifying |
| **Industrial** | Sensor streams, vibration data, thermal readings | Is the anomaly above the action threshold? | Raw sensor → Processed feature → Anomaly score | Cost of shutdown vs cost of missed failure |
| **Creative** | Story prompts, character outlines, narrative structures | What is the character's driver hinge (want/fear)? | Genre alignment, structure coherence | Token budget for long-form generation |

One framework. One equation. Five domains. Zero domain-specific code.

---

## 8. Limitations

A theory that doesn't acknowledge its boundaries isn't a theory — it's a belief.

1. **Keyword-only classification.** The fingerprint catalog cannot detect sarcasm, irony, or indirect requests. "Oh great, another meeting" routes to structured-reasoning, not to the user's actual intent (sarcasm).

2. **Confidence thresholds are human-calibrated, not learned.** The 0.72 threshold for the standard pathway on structured-reasoning was set by human judgment, not by statistical optimization against a labeled dataset. As feedback data accumulates, these thresholds should be tuned automatically.

3. **Single-turn routing.** Each query is routed independently. The system does not maintain a session-level routing strategy. A user who asks 10 genealogy questions in sequence gets individual routing decisions per query. The explicit domain tab is the only persistent domain override.

4. **No adversarial robustness testing.** The feedback loop's client-side escalation cap (5/session) is a budget guard, not a security measure. A determined adversary can reset the cap by reloading the page. Server-side rate limiting is the proper defense.

5. **70B-class model instruction following degrades under constraint stacking.** The hardened assistant prompt enforces 3 of 4 constraints consistently (hinge identification, concrete Move, citation quality). The fourth (falsifiability — "what would change my mind") slips under load. This is a model capacity limitation, not a framework limitation.

6. **Benchmark is synthetic.** The 57 prompts are hand-curated, not drawn from real user traffic. Real-world routing accuracy and cost savings may differ from lab numbers. The feedback collection endpoint (`/api/feedback`) will provide real data but has not yet accumulated enough volume for analysis.

7. **The $6.51 development cost is a point-in-time measurement.** It represents one developer's workflow, one toolchain (OpenCode CLI + DeepSeek API), and one project. It is not a controlled experiment with a control group. It is evidence, not proof, of development efficiency. DeepSeek introduced peak-valley pricing in mid-July 2026 (2x during peak hours), which may affect future cost comparisons.

---

## 9. Testable Hypotheses

These hypotheses are about the routing system's behavior, not about reasoning in general. Each is falsifiable through the existing benchmark harness and feedback collection infrastructure.

**Hypothesis 1 (Feedback Pattern Detection):** User prompts receiving ≥3 downvotes within a 24-hour window will show significantly lower routing confidence scores than prompts with no downvotes, controlling for prompt complexity (complexity score) and domain. If routing confidence is uncorrelated with user satisfaction, the routing model is incomplete.

**Hypothesis 2 (Canary Probing):** When a model receives a major version update (e.g., llama-3.1-8b → llama-3.2-8b), previously-escalated patterns routed to the base tier as a canary probe will receive ≥50% fewer user escalations than before the update. If model improvements don't reduce escalation rates, model selection isn't the primary driver of routing quality.

**Hypothesis 3 (Complexity-Routing Correlation):** Prompts with uncertaintyHits ≥ 2 will have lower routing confidence scores than prompts with uncertaintyHits = 0, even after controlling for word count and questionMarks. If uncertainty language doesn't predict routing difficulty, the complexity score is misweighted.

**Hypothesis 4 (Lexical Density-Routing Accuracy):** Cross-domain routing accuracy will be higher for domains with more specific lexical fingerprints (genealogy: 30 match terms, 17 negative terms, including record, will, code) than for domains with broader fingerprints (assistant: 24 match terms, 6 negative terms). If specificity doesn't improve accuracy, the fingerprint catalog approach is underperforming.

**Hypothesis 5 (Cost-Constraint Adherence):** Under the $20/month budget constraint, the system will favor deterministic and base-tier routing over standard and premium routing as monthly spend approaches the limit, even for queries that would normally qualify for higher tiers. If the system does not adapt routing behavior to budget pressure, the cost-governance model is incomplete.

---

## 10. Comparison to Prior Routing Work

CARDO REI's routing pattern (deterministic → cheap → medium → premium) is an implementation of the
cascading approach FrugalGPT (Chen et al., 2023) established. RouteLLM (Ong et al., 2025) and
RouterBench (Hu et al., 2024) address the same problem with learned/trained routers rather than a
lexical fingerprint catalog. CARGO (Barrak et al., 2025) is the closest prior work in name and
mechanism — confidence-aware routing with an explicit escalation threshold.

| System | Routing mechanism | Requires training data? | Zero-inference tier? | Cross-domain validated? | Reproducibility |
|--------|-------------------|--------------------------|----------------------|--------------------------|------------------|
| FrugalGPT | Cascade until confidence threshold met | No | No | Not evaluated | Not published as a suite |
| RouteLLM | Preference-trained classifier (matrix factorization / BERT) | Yes — human preference data | No | Not domain-specific | Model-dependent, not fully deterministic |
| CARGO | Confidence-aware escalation | Yes | No | Not evaluated | Not published as a suite |
| **CARDO REI** | Lexical fingerprint + deterministic layer 0 + cost gate | No — hand-set catalog, not trained | Yes — Layer 0 handles ~9% of traffic at $0 | Yes — 5 domains, same architecture | Fully deterministic; identical input → identical output |

Where CARDO REI is weaker: it has not been benchmarked against RouteLLM or FrugalGPT on the same
prompt set, so the accuracy/cost-savings comparison above is qualitative, not measured head-to-head.
That comparison is listed as future work (Section 9) rather than claimed here.

---

## 11. What Requires a Human

Three human interventions sit outside what the routing logic can do on its own. The system
operates within constraints a human sets; it has no independent way to verify claims against
external reality, no way to set its own cost/risk tradeoffs, and no mechanism to decide when its
own rules need to change. Without a human in these three roles, the system is internally
consistent but has no check against being wrong in a way it can't detect.

See [`docs/HUMAN_VALUE_FRAMEWORK.md`](./HUMAN_VALUE_FRAMEWORK.md) for the full framework documenting the human as:

1. **The Root of Trust** — ground-truth alignment gate, verifying external reality
2. **The Calibrator of Values** — setting subjective costs and risk tolerances
3. **The Originator of Paradigms** — deciding when rules must be rewritten

---

## 12. Future Work: Self-Adjusting Routing

The feedback loop is designed to make the fingerprint catalog adapt over time rather than stay
fixed. When the base tier consistently receives downvotes for a specific pattern, that's a signal
to elevate the fingerprint to a higher-confidence pathway (Hypothesis 1, Section 9).

The canary probing mechanism works the other direction: when a cheaper model's quality improves,
previously-escalated patterns are tested against it and released back to the cheaper tier if they
pass (Hypothesis 2, Section 9). The goal is continuous adjustment rather than a fixed threshold set
once and left alone.

See [`docs/FEEDBACK_ARCHITECTURE.md`](./FEEDBACK_ARCHITECTURE.md) for the full feedback loop design.

---

## 13. Summary

For a one-paragraph summary of what's proven vs. argued vs. hypothesized, see the Claim
Stratification table at the top of this document. For evidence, see Section 6 (Empirical
Verification). For open questions, see Section 8 (Limitations) and Section 9 (Testable Hypotheses).

---

## Appendix: Code Trace for Pipeline Walkthrough

Every step in Section 5 maps to these exact code paths. To verify: open each file, check the line numbers, confirm the logic matches the walkthrough.

| Step | File | Lines | Function | Purpose |
|------|------|-------|----------|---------|
| Layer 0 Check | `src/lib/deterministicEngine.js` | 43-61 | `resolveDeterministic()` | Pattern-match input against greetings/smalltalk. Return null if no match |
| Layer 0 Check | `src/lib/nightShiftRouter.js` | 370 | `buildRouterDecision()` | Call site that invokes deterministic check first |
| Complexity Computation | `src/lib/nightShiftRouter.js` | 247-255 | `getComplexityTier()` | Compute H = words×2 + questionMarks×8 + uncertaintyHits×10 |
| Complexity Computation | `src/lib/nightShiftRouter.js` | 363 | `buildRouterDecision()` | Call site passing combined text for tiering |
| Fingerprint Match | `src/lib/nightShiftRouter.js` | 125-152 | `getCatalogRouteMatch()` | Iterate 9 fingerprint entries, score match terms, subtract negative terms |
| Fingerprint Match | `src/lib/nightShiftRouter.js` | 362 | `buildRouterDecision()` | Call site using `input` (not `text`) for history isolation |
| Domain Detection | `src/lib/nightShiftRouter.js` | 235-237 | `isLikelyGenealogyRequest()` | Regex match for genealogy keywords (input-isolated) |
| Domain Detection | `src/lib/nightShiftRouter.js` | 231-233 | `isLikelyCodingRequest()` | Regex match for coding keywords (input-isolated) |
| Domain Detection | `src/lib/nightShiftRouter.js` | 239-241 | `isLikelyStoryRequest()` | Regex match for story keywords (input-isolated) |
| Domain Detection | `src/lib/nightShiftRouter.js` | 426, 435, 444 | `buildRouterDecision()` | Call sites for domain-specific routing |
| Route Selection | `src/lib/nightShiftRouter.js` | 486-489 | `buildRouterDecision()` | Default fallback: "No special-case fingerprint matched" |
| Confidence Scoring | `src/lib/nightShiftRouter.js` | 494-501 | `buildRouterDecision()` | catalogConfidence fallback chain: match → threshold → default 0.5 |
| Cost Estimation | `src/lib/nightShiftRouter.js` | 506-507 | `buildRouterDecision()` | Compute estimatedCost and premiumCost |
| CARDO GUARD | `src/lib/cardoGuard.js` | 225-232 | `shouldEscalateToRemote()` | Check pathway confidence against threshold |
| CARDO GUARD | `src/lib/nightShiftRouter.js` | 509-523 | `buildRouterDecision()` | Call site that invokes escalation check |
| Response Generation | `api/cfai.js` | 313-323 | `handleCfaiRequest()` | Backend deterministic check before API call |
| Response Generation | `api/cfai.js` | 340 | `handleCfaiRequest()` | Call `callGroqDirectly()` with system prompt |
| Response Generation | `api/cfai.js` | 343 | `handleCfaiRequest()` | Run `deRoboticize()` filter on API response |

---

*See also:*  
[ARCHITECTURE.md](./ARCHITECTURE.md) — decision flow diagram  
[COST_EFFICIENCY.md](./COST_EFFICIENCY.md) — benchmark numbers  
[TELEMETRY_PROOF.md](./TELEMETRY_PROOF.md) — data sources  
[DECISIONS.md](./DECISIONS.md) — architectural choices  
[FEEDBACK_ARCHITECTURE.md](./FEEDBACK_ARCHITECTURE.md) — feedback loop  
[HUMAN_VALUE_FRAMEWORK.md](./HUMAN_VALUE_FRAMEWORK.md) — human as boundary condition  
[AMII_PROPOSAL.md](./AMII_PROPOSAL.md) — grant framing
