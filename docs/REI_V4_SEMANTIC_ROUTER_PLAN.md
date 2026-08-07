# REI.ai v4.0: The Semantic Hinge Engine (Final Hardened Spec)
### Local ONNX Embedding Classifier Architecture & Implementation Plan
**Objective:** Elevate un-contaminated zero-shot out-of-sample holdout accuracy from **53.6% ➔ > 90.0%** while maintaining zero-network execution and explicit latency boundaries.

---

> **"Fortis et Liber"** — Strong in semantic representation. Free from cloud inference latency.

---

> **⚠️ SUPERSEDED CLAIMS — see `CLAIM_LEDGER.md` for current, verified figures.**
> This document is a historical record of what was targeted/measured at the time of writing
> (53.6% zero-shot, 88.9% in-sample, 78% savings, 162/227/312 test counts). Those numbers
> have since been re-baselined: deterministic accuracy is measured at 60–80% (69.1% pooled
> claimsSync gate), savings ~92% (ceiling-based, after honest 70B pricing fix), tests 560/44
> suites (auto-verified by `node scripts/gen-claims.mjs --check` in CI). Do not quote this
> document's figures in proposals, pitches, or diligence — use `CLAIM_LEDGER.md`.

## 1. Executive Summary & Root Cause Analysis

### The Root Cause of the 53.6% Zero-Shot Ceiling
In Night Shift v3, domain classification relied on a hybrid lexical pipeline:
- Keyword term frequency (`matchTerms` array hits in `fingerprints.json`)
- Heuristic regex patterns ($f_1 \dots f_8$)
- L2-regularized logistic regression over lexical features (`ecs_weights.json`)

While this yielded **88.9% in-sample accuracy** when keywords were tuned against error prompts, it suffered a sharp drop to **53.6% zero-shot accuracy** on un-mined novel prompts (`routingEvalBlindV2.test.js`). 

**Why Lexical Routing Fails Zero-Shot:**
Lexical matchers cannot capture semantic intent without exact word overlap. For instance:
- *"did NASA really lose the original Apollo 11 moon landing telemetry tapes?"* fails to match `fact-check` because `"Apollo 11"` and `"telemetry tapes"` are absent from the dictionary.
- *"refactor monolithic controller into domain services"* routes to `creative` instead of `coding` because `"monolithic"` and `"controller"` hit storytelling registers.

### The v4.0 Solution: Local ONNX Semantic Embeddings
REI.ai v4.0 replaces token-level regex matching with **dense vector cosine similarity** using a quantized, local-first ONNX embedding model (`all-MiniLM-L6-v2` via `@xenova/transformers` / ONNX runtime):

```
User Query 
   │
   ▼
[ Local WASM / ONNX Model: all-MiniLM-L6-v2 (<20ms warm) ]
   │
   ▼
Dense 384-dimensional Vector u
   │
   ▼
[ k-Means Sub-Centroid Cosine Similarity vs 15 Domains (k=3 per domain) ]
   │
   ▼
Top Domain Match + Temperature-Calibrated DAS Entropy [0.0, 1.0]
   │
   ▼
[ Out-Of-Distribution Gate: max(p_i) < theta_ood ➔ Escalate ]
   │
   ▼
[ CARDO Guard Cost Gate (CheapRouteConfidence = 1.0 - HS) ]
```

---

## 2. Review Audit Corrections & Architectural Hardening

This specification incorporates 10 architectural, performance, and mathematical refinements identified during audit:

1. **Strict Blind Set V2 Contamination Safeguard (Pre-Registration):**
   *Rule:* Domain centroid exemplars MUST be selected and finalized **before** running any Blind Set V2 accuracy check. **Zero exemplar modifications** are permitted post-evaluation to prevent dataset contamination.
2. **Cold-Start vs Warm Process Latency Allocation:**
   Distinguishes **warm process latency (<20ms)** from **serverless cold-start latency (<2.5s)**. Introduces lazy WASM/ONNX initialization, process warming, and IndexedDB model caching for client-side execution.
3. **Framing Reversal Disclosure:**
   Honest documentation disclosure: Adding `@xenova/transformers` and a 23MB ONNX binary artifact reverses the previous "zero-dependency pure-JS" design constraint in favor of true semantic vector generalization.
4. **k-Means Sub-Centroid Upgrade (k=3 per domain):**
   Replaces single blurred mean centroid vectors with **k-Means sub-centroids ($k=3$)** per domain to represent multimodal domain registers (e.g. `coding` split into *Implementation*, *Debugging*, and *Architecture*).
5. **Joint Grid Search Calibration ($\tau$ and $\theta_{\text{ood}}$):**
   Softmax temperature $\tau$ and OOD threshold $\theta_{\text{ood}}$ will be jointly calibrated via grid search over $\tau \in [0.25, 1.5]$ and $\theta_{\text{ood}} \in [0.15, 0.45]$ ($2.25\times \dots 6.75\times$ uniform baseline $1/15 \approx 0.067$) on the validation set.
6. **Explicit Cost-Efficiency Trade-Off Rationale:**
   v4 deliberately trades ~4% of aggressive cost savings for safety and accuracy via the OOD Gate. Queries where $\max(p_i) < \theta_{\text{ood}}$ escalate to the frontier model, intentionally lowering cost deflection from ~89% down to ~85%, with 78.0% as the hard floor.
7. **Concrete Exemplar Prompt Sourcing:**
   Exemplars per domain (200 total) are sourced from 50 canonical hand-curated examples + 100 LLM-synthetic variations + 50 team-authored realistic user probes.
8. **Out-of-Distribution (OOD) Escalation Gate:**
   If $\max(p_i) < \theta_{\text{ood}}$, the query is classified as Out-of-Distribution and safely escalated to the frontier reasoning tier (`gpt-4o`).
9. **Expanded Evaluation Harness & Confidence Intervals:**
   Expands `routingEvalBlindV2.test.js` from 28 to **50+ un-mined prompts**, reporting Wilson Score 95% confidence intervals alongside point estimates.
10. **Dual-Signal Fallback Safety:**
   Retains Layer 0 (deterministic) and lexical `fingerprints.json` catalog matching as a secondary fallback if WASM/ONNX cold-start is delayed or fails.

---

## 3. Detailed Component Architecture

### Component A: Local Semantic Embedder (`src/lib/semanticEmbedder.js`)
- Uses `@xenova/transformers` in Node/browser environments with ONNX runtime.
- Loads quantized `all-MiniLM-L6-v2` (23MB static WASM/ONNX weight artifact).
- Converts text input to a normalized $\mathbb{R}^{384}$ dense vector $\vec{u}$ in $<20\text{ms}$ (warm).
- Client-side: Lazy-loaded on first input interaction, cached in IndexedDB.

### Component B: Balanced k-Means Sub-Centroid Matrix (`data/ml/domain_centroids.json`)
- Pre-computes $15 \times 3 = 45$ sub-centroid vectors ($\vec{c}_{i,1}, \vec{c}_{i,2}, \vec{c}_{i,3}$) across all 15 domain categories.
- Centroids generated by embedding exactly **200 exemplar prompts per domain** (50 canonical + 100 LLM-synthetic + 50 team-authored user probes) and running $k$-means clustering ($k=3$).

### Component C: Calibrated Cosine & Vector DAS Engine (`src/lib/semanticHingeClassifier.js`)
- Computes Cosine Similarity $\text{Sim}(\vec{u}, \vec{c}_{i,k})$ for all sub-centroids.
- Takes maximum sub-centroid similarity per domain $S_i = \max_{k} \text{Sim}(\vec{u}, \vec{c}_{i,k})$.
- Applies Calibrated Softmax over domain similarity scores:
  $$p_i = \frac{e^{S_i / \tau}}{\sum_{m=1}^{15} e^{S_m / \tau}}$$
- Calculates normalized Shannon Entropy for Domain Ambiguity Score ($\text{DAS}$):
  $$\text{DAS} = \frac{-\sum_{i=1}^{15} p_i \log_2(p_i)}{\log_2(15)} \in [0.0, 1.0]$$

---

## 4. Implementation Roadmap (5 Phases)

### Phase 1: Local Model Harness & Cold-Start Benchmark Setup
- Add `@xenova/transformers` dependency.
- Create `src/lib/semanticEmbedder.js` with WASM/ONNX lazy initialization, IndexedDB caching, and process warming.
- Write unit tests (`src/lib/semanticEmbedder.test.js`) asserting 384 dimensions, warm latency (<25ms), and cold-start fallback handling.

### Phase 2: Offline Centroid Matrix Generation Script (`scripts/generate-domain-centroids.mjs`)
- Create Node.js script embedding exactly 200 exemplars per domain (50 canonical + 100 synthetic + 50 team probes).
- Perform $k$-means clustering ($k=3$) per domain and export pre-computed JSON artifact: `data/ml/domain_centroids.json` (~85KB).

### Phase 3: Calibrated Semantic Classifier Engine Integration (`src/lib/semanticHingeClassifier.js`)
- Wire `computeSemanticHingeScore()` into Layer 1.5 of `nightShiftRouter.js`.
- Jointly calibrate Softmax temperature $\tau$ and OOD threshold $\theta_{\text{ood}}$ via grid search over validation set.
- Implement OOD gate ($\max(p_i) < \theta_{\text{ood}} \rightarrow \text{frontier}$).

### Phase 4: Expanded Zero-Shot Evaluation Harness (`src/__eval__/routingEvalBlindV2.test.js`)
- Expand `routingEvalBlindV2.test.js` to **50+ un-mined prompts** across 7 categories.
- Enforce strict pre-registered rule: Zero exemplar modifications permitted after running V2 test.
- Assert pass condition: **Zero-shot out-of-sample accuracy $\ge 90.0\%$** (with 95% Wilson confidence intervals).

### Phase 5: UI & Telemetry Readout Upgrade (`ToolsLanding.jsx` & `REI.jsx`)
- Update live router demo readout to display `Semantic Vector Match` ($S_{\text{cos}}$) and `DAS` entropy micro-bars.
- Update `data/telemetry.json`, `CHANGELOG.md`, `README.md`, and `docs/ROADMAP.md`.

---

## 5. Falsifiable Success Criteria

| Metric | v3 Lexical Baseline | v4 Semantic Target | Pass Condition | Rationale for Delta |
| :--- | :--- | :--- | :--- | :--- |
| **V2 Blind Set Zero-Shot Accuracy** | 53.6% (15/28 correct) | **> 90.0%** ($\ge 45/50$ correct) | $\ge 90.0\%$ | Dense vector representation captures semantic intent zero-shot. |
| **Warm Inference Latency** | 18ms | **< 25ms** | $\le 25\text{ms}$ | Quantized ONNX model running in local WASM/Node environment. |
| **Cold-Start Load Latency** | N/A | **< 2.5s** (serverless) | $\le 2.5\text{s}$ | First invocation initialization in Vercel serverless functions. |
| **Cost Savings vs Premium Baseline** | 89.2% | **> 85.0%** | $\ge 78.0\%$ | **Trade-Off Rationale:** v4 intentionally trades ~4% savings for safety via the OOD gate ($\max(p_i) < \theta_{\text{ood}} \rightarrow$ frontier). Hard floor is 78.0%. |
| **Out-Of-Distribution Gating** | Unhandled | **$\max(p_i) < \theta_{\text{ood}} \rightarrow$ Frontier** | Verified | $\theta_{\text{ood}}$ jointly calibrated via grid search ($2.25\times \dots 6.75\times$ uniform baseline). |
| **Test Suite Integrity** | 312 tests passing | **335+ tests passing** | 100% Green | All regression, unit, and integration suites pass. |

---

*Prepared: 2026-07-24 — PromptHound Labs / REI.ai*  
*Status: REVISED, AUDITED & APPROVED FOR IMPLEMENTATION (v4.0 BUILD)*
