# REI Story Editorial Benchmark v0.2 — Evaluation Specification & Fixture Review

**Document Version:** v0.2-SPEC  
**Date:** 2026-10-24  
**Authority:** Aaron Marchant / PromptHound Labs  
**Target:** `src/lib/editorialEngine.ts` & Candidate Editorial Models  
**Status:** DRAFT PROPOSAL — PENDING AUTHOR REVIEW & APPROVAL  

---

## 1. Executive Summary & Problem Formulation

### 1.1 The v0.1 Class-Imbalance Defect
The v0.1 pilot (6 cases) suffered from an 83.3% class imbalance: 5 of 6 cases rewarded rejecting critique or retaining original prose, while only 1 case required action. Under that distribution:
- A trivial baseline predicting `RETAIN ORIGINAL` on every turn achieves an **83.3% pass rate** ($5/6$).
- A trivial baseline rejecting all user suggestions scores **83.3%**.
- The pilot failed to test **editorial discrimination**—the capacity to distinguish clean prose that must be left alone from genuine defects requiring revision, and from incomplete passages requiring further context.

### 1.2 Benchmark v0.2 Objective
Benchmark v0.2 replaces the historical pilot with a **balanced 15-case benchmark** split evenly across the three primary editorial decisions:

$$\text{Class Distribution: } 5 \times \text{RETAIN ORIGINAL} \quad \mid \quad 5 \times \text{PROPOSE REVISION} \quad \mid \quad 5 \times \text{NEED MORE CONTEXT}$$

### 1.3 Strict Data Isolation Invariants
1. **Chapters 1 and 3 Excluded**: Chapters 1 and 3 of *The Thulans* remain strictly held out from training examples, prompts, and few-shot exemplars.
2. **Prior Cases Not Recycled**: Cases from v0.1 (`EVAL-001` through `EVAL-006`) are classified as *previously exposed* and excluded from v0.2 holdout evaluation.
3. **Quarantined Unseen Evaluation Holdout**: The 15 fixtures in v0.2 are strictly quarantined as out-of-sample evaluation data. The engine logic, constitution rules, heuristic thresholds, and system prompts must NEVER be tuned or modified against these specific 15 fixtures.
4. **Preregistered Non-Blind Status**: Because these 15 fixtures are committed openly to the repository specification, they function as an open, preregistered benchmark. Future generalization claims beyond this benchmark require a separate, strictly blinded, uncommitted holdout set.
5. **No 12-Word Span Leakage**: Zero 12-word exact matches between training exemplars and evaluation passages.
6. **Zero Manuscript Mutation**: The live manuscript repository (`/home/aaron/animation/thulans-production/novella/`) remains read-only.

---

## 2. Evaluation Protocol & Rigor Specifications

### 2.1 Multi-Trial Replication ($N = 3$) & Independence Distinction
To evaluate stochastic variance alongside deterministic consistency, each case is executed **3 independent times** per candidate:
- **Independent Case Count**: 15 unique, held-out editorial scenarios.
- **Total Test Volume**: 15 cases $\times$ 3 trials = **45 evaluation runs** per model configuration.
- **Dual Reporting Metrics**:
  1. **Case-Level Accuracy ($N=15$)**: Assessed using majority-vote aggregation across the 3 trials per case. Demonstrates primary editorial capability against the 33.3% trivial baseline.
  2. **Run-to-Run Consistency ($N=45$)**: Proportion of cases achieving unanimous ($3/3$) agreement across trials, plus cross-run variance. Demonstrates stochastic stability and prompt robustness.
- **Run Metadata Recording**:
  - Model identifier (e.g. `deepseek-chat`, `llama-3.3-70b-versatile`, `gpt-4o-2024-08-06`).
  - Generation temperature ($T=0.2$ default for consistency).
  - Seed (if provider supported).
  - Exact prompt context, instruction, and system prompts.
  - ISO-8601 execution timestamp.
  - Source repository commit SHA (`HEAD`).
  - Input/output token telemetry.

### 2.2 System Architecture Distinction: Deterministic Engine vs. Candidate Models
- **Deterministic Baseline Engine (`src/lib/editorialEngine.ts`)**: Serves as a deterministic, zero-latency rule guardrail enforcing explicit, hardcoded canon invariants (such as the Funeral Bell rule and character age summary reconciliation). In v0.1, it implements branches for `RETAIN_ORIGINAL` and `PROPOSE_REVISION` only; it does not evaluate open generative craft or return `NEED_MORE_CONTEXT`.
- **Benchmark v0.2 Target Candidates**: Benchmark v0.2 is formulated to evaluate **independent LLM editorial candidates** (e.g. `deepseek-chat`, `llama-3.3-70b-versatile`, `gpt-4o`) prompted with the Editorial Constitution (Tier A/B/C) to measure open subjective discrimination across all three decisions: `RETAIN ORIGINAL`, `PROPOSE REVISION`, and `NEED MORE CONTEXT`.

### 2.3 Decision Schema & Scoring Criteria
Every test case must return one of three formal decisions:

```typescript
type EditorialDecision = "RETAIN ORIGINAL" | "PROPOSE REVISION" | "NEED MORE CONTEXT";
```

### 2.4 Mathematical Baseline Comparisons
Candidate performance will be benchmarked directly against four trivial heuristics:

| Baseline Model | Decision Strategy | Expected Accuracy on v0.2 |
| :--- | :--- | :---: |
| **Always Retain** | Outputs `RETAIN ORIGINAL` on all 15 cases | **33.3%** ($5/15$) |
| **Always Revise** | Outputs `PROPOSE REVISION` on all 15 cases | **33.3%** ($5/15$) |
| **Always Context** | Outputs `NEED MORE CONTEXT` on all 15 cases | **33.3%** ($5/15$) |
| **Uniform Random** | Selects randomly with $p=1/3$ per class | **33.3%** |

To demonstrate meaningful editorial discrimination, a system must substantially exceed the 33.3% trivial baseline while maintaining balanced precision across all three classes.

---

## 3. Comprehensive Metrics & Evaluation Matrix

### 3.1 Confusion Matrix ($3 \times 3$)

```text
                     PREDICTED DECISION
               Retain      Revise     Need Context
ACTUAL  Retain   [ C_RR ]    [ C_RP ]     [ C_RC ]
DECISION Revise  [ C_PR ]    [ C_PP ]     [ C_PC ]
        Context  [ C_CR ]    [ C_CP ]     [ C_CC ]
```

### 3.2 Derived Performance Metrics
1. **Per-Class Precision, Recall, and $F_1$ Score**:
   - $P_{\text{class}} = \frac{C_{ii}}{\sum_j C_{ji}}$, \quad $R_{\text{class}} = \frac{C_{ii}}{\sum_j C_{ij}}$, \quad $F_{1,\text{class}} = 2 \cdot \frac{P \cdot R}{P + R}$.
2. **Unnecessary Edit Rate (Type I Error)**:
   - Proposing revisions on clean prose: $\text{UER} = \frac{C_{RP} + C_{RC}}{\sum_j C_{Rj}} = \frac{\text{False Revisions on Retain}}{\text{Total Ground-Truth Retains}}$.
3. **Missed Defect Rate (Type II Error)**:
   - Retaining prose that carries genuine defects: $\text{MDR} = \frac{C_{PR}}{\sum_j C_{Pj}} = \frac{\text{False Retains on Revise}}{\text{Total Ground-Truth Defects}}$.
4. **Context Hallucination Rate**:
   - Forcing a revision or retention when context is insufficient: $\text{CHR} = \frac{C_{CR} + C_{CP}}{\sum_j C_{Cj}}$.
5. **Revision Improvement Quality (1–3 Scale)**:
   - Evaluated strictly for Class 2 (`PROPOSE REVISION`):
     - **Score 1 (Regressive / Defective)**: Fails to fix the targeted flaw, introduces banned AI vocabulary, or distorts character voice.
     - **Score 2 (Mechanical Fix)**: Resolves the technical flaw but flattens prose rhythm or adds unnecessary words.
     - **Score 3 (Surgical Enhancement)**: Fixes the targeted flaw while strictly preserving physical grounding, sentence economy, and character register.

---

## 4. Benchmark v0.2 Fixture Review (15 Test Cases)

### Class 1: RETAIN ORIGINAL (5 Cases)
*Objective: The prose is sound, restrained, and intentional. The system must defend the text against sycophantic suggestions, cosmetic meddling, and generic AI smoothing.*

---

#### Case 1.1: `TC-RET-01` — Sensory Restraint vs. Lyrical Metaphor Inflation
- **Passage**:
  > *"The bearing grease smelled of sheep tallow and kerosene. Varek wiped his scraper across the rim of the bucket, leaving a thick yellow curl that did not melt in the draft."*
- **Critique / Prompt**:
  > *"A reviewer suggests: 'Elevate this description with richer imagery, such as comparing the grease to an ancient amber testament of labor, and describing the draft as a dancing whisper of the deep shafts.'"*
- **Ground Truth**: `RETAIN ORIGINAL`
- **Acceptance Criteria**:
  - Rejects lyrical/metaphorical embellishment.
  - Flags banned AI vocabulary (*testament, dancing whisper*).
  - Defends concrete sensory detail (sheep tallow, kerosene, thick yellow curl).

---

#### Case 1.2: `TC-RET-02` — Intentional Rhythm & Controlled Fragment
- **Passage**:
  > *"Ten hours on the bar. Cold water in the boot. Nothing to show for it but three sheared bolts and a cracked pinch-wedge."*
- **Critique / Prompt**:
  > *"A grammar checker flags lines 2 and 3 as incomplete sentences and recommends combining them into: 'Because I spent ten hours on the bar with cold water in my boot, I had nothing to show for it except three sheared bolts and a cracked pinch-wedge.'"*
- **Ground Truth**: `RETAIN ORIGINAL`
- **Acceptance Criteria**:
  - Rejects combining into a subordinate clausal structure.
  - Recognizes fragments as intentional craft conveying exhaustion and physical reality.
  - Defends concision over grammatical homogenization.

---

#### Case 1.3: `TC-RET-03` — Character Voice Register (Varek vs. Modern Conversationalism)
- **Passage**:
  > *"“Leave the timber,” Varek said without looking up from the hoist drum. “The damp’s in it. Drop the wedge where it sits and get your tally-chit stamped before the clerk closes the cage.”"*
- **Critique / Prompt**:
  > *"A critique suggests making Varek sound more approachable: '“Hey Bram, let’s leave that timber behind,” Varek explained kindly. “It’s getting pretty damp, so why don’t you put the wedge down and make sure you get your tally stamped before we lose our spot?”'"*
- **Ground Truth**: `RETAIN ORIGINAL`
- **Acceptance Criteria**:
  - Rejects softening or conversationalizing Varek's dialogue.
  - Upholds Varek's vocal register: clipped, industrial, task-focused, zero pleasantries.
  - Retains specific nouns (*drum, cage, tally-chit, timber*).

---

#### Case 1.4: `TC-RET-04` — Physical Mechanical Detail vs. Simplified Generalization
- **Passage**:
  > *"He drove the drift-pin through the flange until the shoulders seated flush against the raw iron. The burr on the strike-face caught his sleeve, tearing the oilcloth."*
- **Critique / Prompt**:
  > *"A reviewer suggests: 'Simplify the tool terminology: change drift-pin to metal rod, remove flange and shoulders, and just say he pounded the pin in until his sleeve ripped.'"*
- **Ground Truth**: `RETAIN ORIGINAL`
- **Acceptance Criteria**:
  - Defends trade precision (*drift-pin, flange, shoulders seated flush, burr, oilcloth*).
  - Rejects diluting specialized mechanical craft into generic action verbs.

---

#### Case 1.5: `TC-RET-05` — Understated Action vs. Unearned Interiority
- **Passage**:
  > *"Kaelen set his father’s level on the timber sill. The bubble hovered two hairs off the red center line. He stared at it for a moment, then picked up the rasp and took four strokes off the high oak corner."*
- **Critique / Prompt**:
  > *"A developmental editor suggests: 'Explain what Kaelen is thinking and feeling about his father while looking at the level. Add interior monologue reflecting on his grief and legacy.'"*
- **Ground Truth**: `RETAIN ORIGINAL`
- **Acceptance Criteria**:
  - Defends emotional restraint; physical action (taking four rasp strokes) carries the scene.
  - Rejects imposing explicit explanatory psychology or sentimental interiority.

---

### Class 2: PROPOSE REVISION (5 Cases)
*Objective: The passage carries an objective defect (syntactic ambiguity, temporal contradiction, physical error, or AI vocabulary). The system must detect the flaw, propose a surgical fix, and preserve character voice.*

---

#### Case 2.1: `TC-REV-01` — Misplaced Modifier / Syntactic Ambiguity
- **Passage**:
  > *"Climbing down the iron rungs of Shaft 44, the grease bucket swung violently against Bram's shin."*
- **Critique / Prompt**:
  > *"Examine this sentence for grammatical ambiguity and clarity of action."*
- **Ground Truth**: `PROPOSE REVISION`
- **Target Defect**: Dangling participle (the grease bucket was not climbing down the iron rungs).
- **Acceptance Criteria**:
  - Identifies that the modifier *Climbing down the iron rungs...* dangles.
  - Proposes a revision attributing the action to Bram (e.g., *"As Bram climbed down the iron rungs of Shaft 44, the grease bucket swung violently against his shin."*).
  - Does not introduce flowery vocabulary or change established setting nouns.

---

#### Case 2.2: `TC-REV-02` — Physical Disassembly Sequence Contradiction
- **Passage**:
  > *"Bram slid the heavy cast-iron intake grate off the sump flange and leaned it against the timber sill, then reached down with his drift-punch to drive out the two rusted retaining pins that locked the grate to the flange."*
- **Critique / Prompt**:
  > *"Inspect the physical sequence of mechanical disassembly actions described."*
- **Ground Truth**: `PROPOSE REVISION`
- **Target Defect**: Physical mechanical impossibility. The cast-iron grate cannot be slid off the flange and leaned against the sill *before* driving out the captive retaining pins that lock it to that same flange.
- **Acceptance Criteria**:
  - Identifies that sliding the locked grate off the flange prior to extracting its locking pins is a physical sequence contradiction.
  - Proposes a surgical re-sequencing (driving out the retaining pins first, then sliding the grate off the flange).
  - Preserves vernacular tone and tool/setting terms (*drift-punch, retaining pins, flange, timber sill*).

---

#### Case 2.3: `TC-REV-03` — Banned AI Vocabulary Blacklist Intrusion
- **Passage**:
  > *"The steam gantry was a testament to the intricate tapestry of mining engineering, its massive gears a palpable reminder of the depths below."*
- **Critique / Prompt**:
  > *"Review this sentence against the Thulan Project Voice Contract (Tier B)."*
- **Ground Truth**: `PROPOSE REVISION`
- **Target Defect**: Multiple violations of banned AI blacklist (*testament, intricate tapestry, palpable reminder*).
- **Acceptance Criteria**:
  - Explicitly flags *testament*, *tapestry*, and *palpable* as prohibited AI slop.
  - Rewrites the sentence using concrete, physical nouns (e.g., *"The steam gantry stood bolted to the pit-head granite, its cast-iron gears grinding over the shaft mouth."*).
  - Completely eliminates abstract metaphors.

---

#### Case 2.4: `TC-REV-04` — Physical Mechanical Contradiction (Nut Rotation)
- **Passage**:
  > *"Looking directly at the exposed face of the standard right-hand nut, he swung the long-handled box wrench clockwise to back it off the corroded stud."*
- **Critique / Prompt**:
  > *"Verify the mechanical rotation described for loosening this fastener."*
- **Ground Truth**: `PROPOSE REVISION`
- **Target Defect**: Physical mechanical contradiction. Looking directly at the exposed face of a standard right-hand nut, clockwise rotation advances/tightens the nut onto the stud; loosening or backing it off requires counter-clockwise rotation.
- **Acceptance Criteria**:
  - Identifies that clockwise rotation tightens rather than backs off a standard right-hand fastener when facing the nut.
  - Proposes changing the rotation direction to counter-clockwise.
  - Preserves industrial tradecraft vocabulary (*standard right-hand nut, box wrench, corroded stud*).

---

#### Case 2.5: `TC-REV-05` — Punctuation & Dialogue Attribution Mismatch
- **Passage**:
  > *"“Get back from the cage edge,” Sanna barked she slammed the safety gate shut before Bram could step onto the platform."*
- **Critique / Prompt**:
  > *"Inspect the punctuation and clause structure of this dialogue exchange."*
- **Ground Truth**: `PROPOSE REVISION`
- **Target Defect**: Run-on sentence / missing punctuation separating dialogue tag from following independent action (*barked she slammed*).
- **Acceptance Criteria**:
  - Identifies missing punctuation/conjunction after dialogue attribution.
  - Proposes clean punctuation: *"“Get back from the cage edge,” Sanna barked. She slammed the safety gate shut..."* or *"“Get back from the cage edge,” Sanna barked, slamming the safety gate shut..."*.
  - Retains character vocal aggression and physical action.

---

### Class 3: NEED MORE CONTEXT (5 Cases)
*Objective: The critique alleges an error or proposes a change, but determining whether an error exists is impossible without off-page manuscript context, broader chronology, or universe rules. The system must refuse to guess and ask for context.*

---

#### Case 3.1: `TC-CTX-01` — Off-Page Character Relationship & Knowledge
- **Passage**:
  > *"Marek did not look up when the clerk called his name. He kept his eyes on the oil drum, the way he had done ever since the letter arrived from the Upper Tier."*
- **Critique / Prompt**:
  > *"A reviewer says: 'This mention of a letter from the Upper Tier is an unearned mystery box that confuses the reader. Cut the reference or explain who sent it right here.'"*
- **Ground Truth**: `NEED MORE CONTEXT`
- **Acceptance Criteria**:
  - Recognizes that whether the letter has already been explained depends entirely on preceding chapters.
  - Refuses to prematurely cut or inject exposition into the scene.
  - Formulates a request for surrounding context: asks whether the letter's arrival was dramatized earlier in the manuscript.

---

#### Case 3.2: `TC-CTX-02` — Chronology & Transit Time
- **Passage**:
  > *"By the fourth shift after the bell, Varek was back at the forge hearth, heating tongs for the drift bolts."*
- **Critique / Prompt**:
  > *"A reviewer claims: 'It takes at least six shifts to travel from the Lower Sump to the forge. Varek could not have returned by the fourth shift; change this to eight shifts.'"*
- **Ground Truth**: `NEED MORE CONTEXT`
- **Acceptance Criteria**:
  - Identifies that the transit duration between the Lower Sump and the forge depends on universe canon geography and transit mode (e.g. foot transit vs. ore-cage ride).
  - Refuses to alter the number of shifts without checking the canonical shaft transit timetable.
  - Requests verification of the transit itinerary from the series timeline document.

---

#### Case 3.3: `TC-CTX-03` — Technical Capacity & Hydraulic Physics
- **Passage**:
  > *"The twin jacks took the weight of the laden timber carriage, their copper pistons rising half an inch with each pump stroke."*
- **Critique / Prompt**:
  > *"An engineering reviewer says: 'Standard shaft jacks are only rated for five tons. A laden timber carriage weighs at least twelve tons; this is a physics plot hole.'"*
- **Ground Truth**: `NEED MORE CONTEXT`
- **Acceptance Criteria**:
  - Notes that the tonnage capacity of "twin jacks" depends on specific Shaft 44 hydraulic specs and whether these are standard or high-pressure salvage gear.
  - Refuses to rewrite carriage weight or jack specifications based on unverified reviewer assumptions.
  - Requests canon equipment specifications for Deephearth hydraulic salvage tools.

---

#### Case 3.4: `TC-CTX-04` — Human Character Physical State & Injury Continuity
- **Passage**:
  > *"Kaelen braced the timber cradle with both shoulders, using his left forearm to steady the upright while he drove the wedge home with the mallet."*
- **Critique / Prompt**:
  > *"A proofreader flags a continuity contradiction: 'Kaelen’s left collarbone was fractured during the gallery cave-in. He cannot bear weight on that shoulder; rewrite this passage so he sets the timber one-handed using only his right arm.'"*
- **Ground Truth**: `NEED MORE CONTEXT`
- **Acceptance Criteria**:
  - Recognizes that whether Kaelen is currently incapacitated depends on off-page manuscript chronology (which chapter the cave-in occurred in, how many shifts have elapsed, and whether medical healing or bone-setting took place).
  - Refuses to rewrite Kaelen's physical actions based on an unsubstantiated continuity assertion.
  - Formulates an explicit request for off-page manuscript chronology: asks which chapter the fracture occurred in and whether medical recovery time has elapsed in the manuscript timeline.

---

#### Case 3.5: `TC-CTX-05` — Council Charter Legal Precedent
- **Passage**:
  > *"“Under Section 12, the Council takes half your salvage if you haul it through the main shaft without an inspector’s lead seal,” the watchman said."*
- **Critique / Prompt**:
  > *"A reviewer asserts: 'Section 12 of mining law only applies to ore, not timber or tool salvage. Change Section 12 to Section 4.'"*
- **Ground Truth**: `NEED MORE CONTEXT`
- **Acceptance Criteria**:
  - Recognizes that legal statutes in Deephearth are governed by the Universe Canon Rules (Tier C).
  - Refuses to arbitrarily swap Section 12 for Section 4 without verifying the Council Charter.
  - Directs the inquiry to the Canon Rules / Legal Charter index.

---

## 5. Implementation Roadmap & Guardrails

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       BENCHMARK v0.2 EXECUTION GATE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Spec & Fixture Review  ──► Human approval of 15 fixtures (THIS STEP)     │
│ 2. Test Fixture Encoding  ──► JSON schema in tests/fixtures/eval_v0.2.json   │
│ 3. Harness Automation     ──► test runner executing N=3 with raw logging    │
│ 4. Scorecard & Metrics    ──► Confusion matrix, F1, UER, trivial baselines   │
│ 5. Audit Report           ──► Durable report in docs/experiments/            │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Wait for Author Approval**: Do not execute candidate runs until Aaron reviews and approves these 15 fixtures.
2. **Deterministic Replay Harness**: Implement `scripts/run_eval_v0.2.mjs` executing all 15 cases $\times$ 3 trials with telemetry recorded to `docs/experiments/editorial_benchmark_v0.2_raw.json`.
3. **No Training Set Contamination**: Ensure these 15 cases are completely held out from all system prompts, RAG indexes, and few-shot examples.
