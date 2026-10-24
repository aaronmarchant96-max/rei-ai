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

### 1.3 Strict Data Isolation & Bounded Leakage Claims
1. **Chapters 1 and 3 Excluded**: Chapters 1 and 3 of *The Thulans* remain strictly held out from training examples, prompts, and few-shot exemplars.
2. **Prior Cases Not Recycled**: Cases from v0.1 (`EVAL-001` through `EVAL-006`) are classified as *previously exposed* and excluded from v0.2 holdout evaluation.
3. **Quarantined Unseen Evaluation Holdout**: The 15 fixtures in v0.2 are strictly quarantined as out-of-sample evaluation data under `tests/fixtures/editorial_benchmark_v0.2.json`. The engine logic, constitution rules, heuristic thresholds, and system prompts must NEVER be tuned or modified against these specific 15 fixtures.
4. **Preregistered Non-Blind Status**: Because these 15 fixtures are committed openly to the repository specification, they function as an open, preregistered benchmark. Future generalization claims beyond this benchmark require a separate, strictly blinded, uncommitted holdout set.
5. **Bounded Leakage Definition**: Zero matching 12-word spans establishes only that the compared texts contain no matching spans under lowercase, whitespace-and-punctuation-normalized tokenization against the declared comparison corpus:
   - Novella training exemplars (`trainingDecisions` in `thulanEditorialConstitution.json`).
   - Historical v0.1 pilot passages (`eval_pilot_v0.1_raw.json`).
   - Novella held-out Chapters 1 and 3 (`chapter_01.md` and `chapter_03.md`).
   - *Limitation Disclosure*: This span check does not establish chapter-level semantic independence, does not protect against sub-12-word memorization, and cannot prevent future model contamination once committed to the public repository. Missing corpus files produce an explicit incomplete check error in the test suite, never a clean pass.
6. **Zero Manuscript Mutation**: The live manuscript repository (`/home/aaron/animation/thulans-production/novella/`) remains strictly read-only.

---

## 2. Evaluation Protocol & Rigor Specifications

### 2.1 Multi-Trial Replication ($N = 3$) & Independence Distinction
To evaluate stochastic variance alongside consistency, each case is executed across **3 independent scheduled trials** per candidate:
- **Independent Case Count**: 15 unique, held-out editorial scenarios.
- **Scheduled Trial Budget**: 15 cases $\times$ 3 trials = **45 scheduled trials per candidate** (90 scheduled trials total across two candidate models). Additional HTTP transport attempts are logged separately.
- **Dual Reporting Accounting**:
  1. **Trial-Level Accounting ($N=45$)**: Evaluates first-attempt validity, schema error rate, and API transport failure rate. Denominator is strictly 45.
  2. **Case-Level Accounting ($N=15$)**: Evaluates majority accuracy, unanimous consistency, and no-majority rate. Denominator is strictly 15.
- **Run Metadata Recording**:
  - Model identifier (e.g. `deepseek-chat`, `llama-3.3-70b-versatile`, `gpt-4o-2024-08-06`).
  - Generation temperature ($T=0.2$ default; $T=0.0$ designated as greedy decoding).
  - Seed (if provider supported).
  - Exact prompt context, instruction, and system prompt hashes.
  - ISO-8601 execution timestamp.
  - Source repository commit SHA (`HEAD`).
  - Input/output token telemetry.

### 2.2 Majority Rule & Failure Aggregation Contract
To prevent ambiguous state handling, case outcomes are governed by explicit aggregation rules:
1. **Majority Decision**: A case has a valid majority decision if and only if at least **two valid responses** (i.e., parseable JSON adhering to the schema, not `SCHEMA_ERROR` or `API_FAILURE`) select the identical decision.
2. **No-Majority Outcome (`NO_MAJORITY`)**:
   - If responses split `1–1–1` across the 3 trials (`RETAIN`, `REVISE`, `CONTEXT`), or if a trial failure results in fewer than two agreeing valid decisions (e.g., 1 schema failure + 1 Retain + 1 Revise), the case is scored as `NO_MAJORITY`.
   - `NO_MAJORITY` receives **0 case accuracy credit** and is reported explicitly in the scorecard.
   - No conditional fourth trial is executed. The 45-trial budget per candidate is fixed.
3. **Unanimous Consistency**:
   $$\text{Unanimous Case Consistency} = \frac{\sum_{i=1}^{15} \mathbb{I}(\text{Trial}_{i,1} = \text{Trial}_{i,2} = \text{Trial}_{i,3} \land \text{Trial}_{i,1} \in \text{ValidDecisions})}{15}$$
   Unanimity requires three valid, identical decisions. Three identical failures (e.g., 3 `SCHEMA_ERROR` results) never count toward consistency.

### 2.3 Candidate Input Envelope & Projection Isolation
To eliminate data contamination and class leakage:
- **Allowlist Candidate Payload**: The payload provided to candidate API calls is constructed strictly from an allowlist:
  ```json
  {
    "passage": "<prose excerpt>",
    "query": "<reviewer note>"
  }
  ```
  - **No Class IDs or Labels**: Candidates receive NO fixture IDs (`TC-REV-02`), opaque indices, titles, expected decisions, target defects, or acceptance criteria.
  - **Randomized Execution Order**: Cases are executed in a recorded, seeded pseudorandom order rather than sequential class blocks.
- **Constitution Projection**: Candidates receive only Tiers A, B, and C of the constitution (`getProjectedConstitution()`). Historical SFT exemplars (`trainingDecisions`) and pilot benchmark answers (`evaluationDecisions`) are strictly omitted.
- **Frozen Cryptographic Hashes**:
  - `FROZEN_SYSTEM_PROMPT` SHA-256: `a7a29873126fabfcf36a5566b9f50dd7d19270013f895f2f3aca16ed9c04e4a0`
  - `ProjectedConstitution` SHA-256: `109a598c4d788390ad4f5c02d96f64d897bfb88a0d16a1522f7f26b0d2916cb8`

### 2.4 Transport Retries vs. First-Attempt Reliability
- **First-Attempt Reliability**: Candidate outputs must conform to the JSON schema on the first attempt. Malformed JSON, missing fields, or invalid decision strings are recorded as `SCHEMA_ERROR` on the first attempt and penalize accuracy. They are not replaced with cleaner responses generated at another temperature.
- **HTTP Transport Retries**: For HTTP 429 (rate limit) or HTTP 5xx (server error), the runner allows up to **3 total attempts** (initial attempt + max 2 retries with exponential backoff: 2s, 4s). The request payload is re-sent unchanged, and all attempts and HTTP status codes are logged. Persistent failures yield `API_FAILURE`.
- **Greedy Decoding**: Temperature $0.0$ is designated as greedy decoding, recognizing that hosted provider batching, floating-point reductions, and mixture-of-experts routing do not guarantee bitwise determinism.

### 2.5 Decision Schema & Output Invariants
Every test case must return one of three formal decisions:
```typescript
type EditorialDecision = "RETAIN ORIGINAL" | "PROPOSE REVISION" | "NEED MORE CONTEXT";
```
The output JSON schema enforces conditional constraints:
- `decision === "RETAIN ORIGINAL"`: `proposed_revision === null`, `context_inquiry === null`.
- `decision === "PROPOSE REVISION"`: `proposed_revision` is a non-empty string, `context_inquiry === null`.
- `decision === "NEED MORE CONTEXT"`: `context_inquiry` is a non-empty string, `proposed_revision === null`.
- In all cases: `rationale` is a non-empty string.

### 2.6 Mathematical Baseline Comparisons
Candidate performance is benchmarked directly against four trivial heuristics:

| Baseline Model | Decision Strategy | Expected Accuracy on v0.2 |
| :--- | :--- | :---: |
| **Always Retain** | Outputs `RETAIN ORIGINAL` on all 15 cases | **33.3%** ($5/15$) |
| **Always Revise** | Outputs `PROPOSE REVISION` on all 15 cases | **33.3%** ($5/15$) |
| **Always Context** | Outputs `NEED MORE CONTEXT` on all 15 cases | **33.3%** ($5/15$) |
| **Uniform Random** | Selects randomly with $p=1/3$ per class | **33.3%** |

---

## 3. Comprehensive Metrics & Evaluation Matrix

### 3.1 Confusion Matrix ($3 \times 4$ with Failure / No-Majority Column)

```text
                     PREDICTED MAJORITY DECISION
               Retain      Revise     Need Context   No Majority / Failed   Total Actual
ACTUAL  Retain   [ C_RR ]    [ C_RP ]     [ C_RC ]           [ C_RF ]            = 5
DECISION Revise  [ C_PR ]    [ C_PP ]     [ C_PC ]           [ C_PF ]            = 5
        Context  [ C_CR ]    [ C_CP ]     [ C_CC ]           [ C_CF ]            = 5
```

### 3.2 Derived Performance Metrics
1. **Per-Class Precision, Recall, and $F_1$ Score**:
   - **Per-Class Recall**: Failures (`NO_MAJORITY` or trial errors) remain strictly in the denominator so that failed cases directly penalize recall:
     $$R_{\text{class}} = \frac{C_{ii}}{\text{Actual}_{\text{class}}} = \frac{C_{ii}}{5}$$
     where $\text{Actual}_i = C_{iR} + C_{iP} + C_{iC} + C_{iF} = 5$. (e.g. 1 correct retain + 4 no-majority cases yields $R = 1/5 = 20.0\%$, not $1/1$).
   - **Per-Class Precision**:
     $$P_{\text{class}} = \frac{C_{ii}}{\sum_{k \in \{R, P, C\}} C_{ki}}$$
     *Zero-Denominator Protection*: If $\sum_k C_{ki} = 0$, precision is defined as $0.0$.
   - **Per-Class $F_1$ Score**:
     $$F_{1,\text{class}} = \begin{cases} 0.0 & \text{if } P + R = 0 \\ 2 \cdot \frac{P \cdot R}{P + R} & \text{otherwise} \end{cases}$$
2. **Unnecessary Edit Rate (Type I Error)**:
   - Proposing revisions on clean prose:
     $$\text{UER} = \frac{C_{RP}}{\text{Actual Retain}} = \frac{C_{RP}}{5}$$
3. **Context Deferral Rate on Clean Prose**:
   - Requesting context when prose is sound:
     $$\text{CDR} = \frac{C_{RC}}{\text{Actual Retain}} = \frac{C_{RC}}{5}$$
4. **Missed Defect Rate (Type II Error)**:
   - Retaining prose that carries genuine defects:
     $$\text{MDR} = \frac{C_{PR}}{\text{Actual Revise}} = \frac{C_{PR}}{5}$$
5. **Context Hallucination Rate**:
   - Forcing an edit or retention when context is missing:
     $$\text{CHR} = \frac{C_{CR} + C_{CP}}{\text{Actual Context}} = \frac{C_{CR} + C_{CP}}{5}$$
6. **Overall Case Accuracy & No-Majority Rate ($N=15$)**:
   $$\text{Case Accuracy} = \frac{C_{RR} + C_{PP} + C_{CC}}{15}, \quad \text{NMR} = \frac{C_{RF} + C_{PF} + C_{CF}}{15}$$
7. **Revision Improvement Quality (1–3 Scale) & Blinded Selection Protocol**:
   - Evaluated strictly for true positive revisions ($C_{PP}$) via **blinded human evaluation by Aaron Marchant**:
     - **Trial Selection Protocol**: To prevent upward quality bias from cherry-picking the best output across trials, the grader evaluates the proposed revision from **Trial 1 (the first attempt)** by default. If Trial 1 did not produce a revision (e.g. schema error or context deferral) but the case achieved a revision majority via subsequent trials, the revision from the earliest valid trial (Trial 2) is evaluated.
     - **Score 1 (Regressive / Defective)**: Fails to fix targeted flaw, introduces banned AI vocabulary, or distorts voice.
     - **Score 2 (Mechanical Fix)**: Resolves technical flaw but flattens rhythm or adds unnecessary words.
     - **Score 3 (Surgical Enhancement)**: Fixes flaw while strictly preserving physical grounding, economy, and character register.

---

## 4. Benchmark v0.2 Fixture Review (15 Test Cases)

### Class 1: RETAIN ORIGINAL (5 Cases)
*Objective: The prose is sound, restrained, and intentional. The system must defend the text against sycophantic suggestions, cosmetic meddling, and generic AI smoothing.*

---

#### Case 1.1: `TC-RET-01` — Sensory Restraint vs. Lyrical Metaphor Inflation
- **Passage**:
  > *"The bearing grease smelled of sheep tallow and kerosene. Varek wiped his scraper across the rim of the bucket, leaving a thick yellow curl that did not melt in the draft."*
- **Editorial Query**:
  > *"Reader note: Suggests replacing the technical description of sheep tallow, kerosene, and the yellow curl with more atmospheric figurative imagery to heighten the mood of the deep shaft."*
- **Ground Truth**: `RETAIN ORIGINAL`
- **Acceptance Criteria**:
  - Rejects lyrical or metaphorical embellishment.
  - Defends concrete sensory detail (sheep tallow, kerosene, yellow curl).
  - Preserves physical economy and restraint.

---

#### Case 1.2: `TC-RET-02` — Intentional Rhythm & Controlled Fragment
- **Passage**:
  > *"Ten hours on the bar. Cold water in the boot. Nothing to show for it but three sheared bolts and a cracked pinch-wedge."*
- **Editorial Query**:
  > *"Copyeditor note: Flags the second and third sentences as sentence fragments lacking independent verbs, and suggests combining the lines into a single complete grammatically subordinate clause."*
- **Ground Truth**: `RETAIN ORIGINAL`
- **Acceptance Criteria**:
  - Rejects combining into a subordinate clausal structure.
  - Recognizes fragments as intentional craft conveying exhaustion and physical reality.
  - Defends concision over grammatical homogenization.

---

#### Case 1.3: `TC-RET-03` — Character Voice Register (Varek vs. Modern Conversationalism)
- **Passage**:
  > *"“Leave the timber,” Varek said without looking up from the hoist drum. “The damp’s in it. Drop the wedge where it sits and get your tally-chit stamped before the clerk closes the cage.”"*
- **Editorial Query**:
  > *"Reviewer note: Flags Varek’s dialogue as overly abrasive and clipped; suggests softening his phrasing to make him sound more patient and conversational with Bram."*
- **Ground Truth**: `RETAIN ORIGINAL`
- **Acceptance Criteria**:
  - Rejects softening or conversationalizing Varek's dialogue.
  - Upholds Varek's vocal register: clipped, industrial, task-focused, zero pleasantries.
  - Retains specific nouns (*drum, cage, tally-chit, timber*).

---

#### Case 1.4: `TC-RET-04` — Physical Mechanical Detail vs. Simplified Generalization
- **Passage**:
  > *"He drove the drift-pin through the flange until the shoulders seated flush against the raw iron. The burr on the strike-face caught his sleeve, tearing the oilcloth."*
- **Editorial Query**:
  > *"Reviewer note: Flags trade jargon ('drift-pin', 'flange', 'burr on the strike-face') as dense and inaccessible; suggests simplifying to generic workshop terms so the general reader can follow the action."*
- **Ground Truth**: `RETAIN ORIGINAL`
- **Acceptance Criteria**:
  - Defends trade precision (*drift-pin, flange, shoulders seated flush, burr, oilcloth*).
  - Rejects diluting specialized mechanical craft into generic action verbs.

---

#### Case 1.5: `TC-RET-05` — Understated Action vs. Unearned Interiority
- **Passage**:
  > *"Kaelen set his father’s level on the timber sill. The bubble hovered two hairs off the red center line. He stared at it for a moment, then picked up the rasp and took four strokes off the high oak corner."*
- **Editorial Query**:
  > *"Developmental note: Suggests expanding Kaelen’s pause by adding interior monologue exploring his grief and memories of his father before he resumes rasping."*
- **Ground Truth**: `RETAIN ORIGINAL` (Explicit Decision Contract)
- **Acceptance Criteria**:
  - Defends emotional restraint; physical action (taking four rasp strokes) carries the emotional weight.
  - Rejects imposing explicit explanatory psychology or sentimental interiority.
  - *Scoring Rule*: Strictly scores `RETAIN ORIGINAL` as correct. Proposing an edit or declaring `NEED MORE CONTEXT` for whether to insert this unearned monologue is scored as an uncredited deferral ($C_{RC}$).

---

### Class 2: PROPOSE REVISION (5 Cases)
*Objective: The passage carries an objective defect (syntactic ambiguity, temporal contradiction, physical error, or AI vocabulary). The system must detect the flaw, propose a surgical fix, and preserve character voice.*

---

#### Case 2.1: `TC-REV-01` — Misplaced Modifier / Syntactic Ambiguity
- **Passage**:
  > *"Climbing down the iron rungs of Shaft 44, the grease bucket swung violently against Bram's shin."*
- **Editorial Query**:
  > *"Copyeditor note: Flags the opening participle clause ('Climbing down the iron rungs...') as syntactically detached from the bucket, making it appear that the bucket is climbing the ladder."*
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
- **Editorial Query**:
  > *"Reader note: Queries the mechanical sequence, noting that the cast-iron grate cannot be slid off the flange and set against the sill while retaining pins are still pinning it to the flange."*
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
- **Editorial Query**:
  > *"Style note: Flags 'testament', 'intricate tapestry', and 'palpable reminder' as abstract boilerplate imagery, suggesting replacement with grounded physical descriptions of the machinery and rock."*
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
- **Editorial Query**:
  > *"Technical reader note: Queries the tool rotation, noting that turning a wrench clockwise when facing a standard right-hand nut tightens the fastener rather than backing it off."*
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
- **Editorial Query**:
  > *"Copyeditor note: Flags a fused sentence / run-on error between Sanna’s dialogue attribution ('barked') and the subsequent independent clause ('she slammed the safety gate shut')."*
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
- **Editorial Query**:
  > *"Developmental note: Queries whether the letter from the Upper Tier has already been introduced in an earlier scene, or if an explanatory sentence needs to be inserted here explaining what the letter contained."*
- **Ground Truth**: `NEED MORE CONTEXT`
- **Acceptance Criteria**:
  - Recognizes that whether the letter has already been explained depends entirely on preceding chapters.
  - Refuses to prematurely cut or inject exposition into the scene.
  - Formulates a request for surrounding context: asks whether the letter's arrival was dramatized earlier in the manuscript.

---

#### Case 3.2: `TC-CTX-02` — Chronology & Transit Time
- **Passage**:
  > *"By the fourth shift after the bell, Varek was back at the forge hearth, heating tongs for the drift bolts."*
- **Editorial Query**:
  > *"Continuity note: Queries whether four shifts is sufficient transit time to return to the forge hearth from the lower levels, suggesting it may contradict the established route timeline."*
- **Ground Truth**: `NEED MORE CONTEXT`
- **Acceptance Criteria**:
  - Identifies that the transit duration between the Lower Sump and the forge depends on universe canon geography and transit mode.
  - Refuses to alter the number of shifts based on unverified reviewer assertions.
  - Formulates a specific inquiry asking what travel duration is established in story chronology.

---

#### Case 3.3: `TC-CTX-03` — Technical Capacity & Hydraulic Physics
- **Passage**:
  > *"The twin jacks took the weight of the laden timber carriage, their copper pistons rising half an inch with each pump stroke."*
- **Editorial Query**:
  > *"Technical note: Queries whether standard hydraulic shaft jacks have the rated tonnage capacity to lift a fully laden timber carriage without failing."*
- **Ground Truth**: `NEED MORE CONTEXT`
- **Acceptance Criteria**:
  - Notes that the tonnage capacity of twin jacks and carriage weight depend on canon equipment specifications.
  - Refuses to rewrite carriage weight or jack specifications based on unverified reviewer assumptions.
  - Formulates a specific inquiry asking for the rated load capacity of the jacks or carriage weight in canon.

---

#### Case 3.4: `TC-CTX-04` — Human Character Physical State & Injury Continuity
- **Passage**:
  > *"Kaelen braced the timber cradle with both shoulders, using his left forearm to steady the upright while he drove the wedge home with the mallet."*
- **Editorial Query**:
  > *"Continuity note: Queries whether Kaelen’s fractured collarbone from the gallery collapse would prevent him from bracing with both shoulders, or if sufficient recovery shifts have passed."*
- **Ground Truth**: `NEED MORE CONTEXT`
- **Acceptance Criteria**:
  - Recognizes that whether Kaelen is currently incapacitated depends on off-page manuscript chronology (which chapter the cave-in occurred in, how many shifts have elapsed, and whether medical healing or bone-setting took place).
  - Refuses to rewrite Kaelen's physical actions based on an unsubstantiated continuity assertion.
  - Formulates an explicit request for off-page manuscript chronology: asks when the fracture occurred and how much recovery time elapsed in the timeline.

---

#### Case 3.5: `TC-CTX-05` — Council Charter Legal Precedent
- **Passage**:
  > *"“Under Section 12, the Council takes half your salvage if you haul it through the main shaft without an inspector’s lead seal,” the watchman said."*
- **Editorial Query**:
  > *"Continuity note: Queries whether Section 12 of the Council salvage code applies to all haulage through the main shaft, or whether timber and tool salvage fall under a different legal provision."*
- **Ground Truth**: `NEED MORE CONTEXT`
- **Acceptance Criteria**:
  - Recognizes that legal statutes in Deephearth are governed by the Universe Canon Rules (Tier C).
  - Refuses to arbitrarily swap Section 12 for Section 4 without verifying the salvage regulations.
  - Formulates a specific inquiry asking whether Section 12 covers timber salvage under canon law.

---

## 5. Implementation Roadmap & Guardrails

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       BENCHMARK v0.2 EXECUTION GATE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Spec & Fixture Review  ──► Human approval of 15 fixtures (THIS STEP)     │
│ 2. Test Fixture Encoding  ──► JSON in tests/fixtures/editorial_benchmark_   │
│                               v0.2.json                                     │
│ 3. Harness Automation     ──► test runner executing N=3 with raw logging    │
│ 4. Scorecard & Metrics    ──► Confusion matrix, F1, UER, trivial baselines   │
│ 5. Audit Report           ──► Durable report in docs/experiments/            │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Keep Candidate Runs on Hold**: Do not execute candidate LLM runs until the offline harness and specification updates are reviewed and frozen by Aaron and Codex.
2. **Deterministic Replay Harness**: Implement `scripts/run_eval_v0.2.mjs` executing all 15 cases $\times$ 3 trials (45 scheduled trials per candidate) with telemetry recorded to `docs/experiments/editorial_benchmark_v0.2_raw.json`.
3. **No Training Set Contamination**: Ensure these 15 cases are completely held out from all system prompts, RAG indexes, and few-shot examples.

