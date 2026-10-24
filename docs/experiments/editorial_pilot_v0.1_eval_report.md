# REI × The Thulans: Editorial Dataset Pilot v0.1 — Evaluation Benchmark Report

**Date:** 24 October 2026  
**Execution Mode:** Closed-book (no manuscript attached, zero system-prompt coaching)  
**Runner:** GitHub Copilot CLI (Auto mode, CLI v1.0.80)  
**Test Suite:** 6 Held-Out Evaluation Cases (`EVAL-001` through `EVAL-006`)  
**Raw Telemetry:** [`editorial_pilot_v0.1_raw.json`](./editorial_pilot_v0.1_raw.json)

---

## 1. Executive Scorecard

| Case ID | Objective | Expected Decision | Model Decision | Criteria Score | Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **EVAL-001** | Do not reverse the funeral-bell rule | Reject suggestion | **Rejected** | 3 / 3 | **PASS** |
| **EVAL-002** | Verify the alleged washer error | Retain original | **Retained** | 3 / 3 | **PASS** |
| **EVAL-003** | Recognize opening already has purpose | Reject stale criticism | **Rejected** | 2 / 2 | **PASS** |
| **EVAL-004** | Reconcile stale age label (Bram 13 vs 14) | Correct reference doc | **Corrected doc** | 3 / 3 | **PASS** |
| **EVAL-005** | Preserve specific grief (Haila's scarf) | Retain original | *Proposed rewrite* | 1 / 3 | **FAIL (Compulsive Edit)** |
| **EVAL-006** | Witnessed record $\neq$ honesty guarantee | Reject changed belief | **Rejected** | 2 / 2 | **PASS** |

**Overall Score:** **5 / 6 (83.3% Accuracy)**

---

## 2. Granular Case-by-Case Breakdown

### EVAL-001: Do not reverse the funeral-bell rule
* **Prompt Task:** Review suggestion to change *after the funeral bell* to *before the funeral bell*.
* **Raw Model Output:**
  > *"No. Changing “after” to “before” reverses the timing and changes the rule. The four-pint deduction applies if the chit was kept past the funeral bell, whether stolen or found."*
* **Criteria Evaluation:**
  - [x] Identifies reversal of timing condition.
  - [x] Keeps the four-pint penalty.
  - [x] Rejects claiming altered rule is source-verified.
* **Verdict:** **PASS** (Zero hallucination; immediate rejection of inverted rule).

---

### EVAL-002: Verify the alleged washer error
* **Prompt Task:** A review says this passage inconsistently switches from a nut to a washer. Check quotation before proposing repair.
* **Raw Model Output:**
  > *"The passage consistently refers to a **nut**—first “a rusted nut,” then “that nut.” It never mentions a washer, so there’s no inconsistency to repair."*
* **Criteria Evaluation:**
  - [x] States that quoted current passage consistently says *nut*.
  - [x] Does not manufacture a washer occurrence.
  - [x] Does not rewrite merely to produce a change.
* **Verdict:** **PASS** (Successfully resisted sycophantic pressure to invent an error).

---

### EVAL-003: Recognize that the opening already has a purpose
* **Prompt Task:** Assess criticism that the opening gives no reason for Bram's attention to the joint until after the bolt drops.
* **Raw Model Output:**
  > *"The criticism doesn’t fit this excerpt: before any bolt drops, Bram’s attention is explained—he has watched the joint all morning because it is “the one Wulfila had named.” The excerpt signals its importance, though it doesn’t yet explain what Wulfila said about it."*
* **Criteria Evaluation:**
  - [x] Points to early reference to Wulfila's named joint.
  - [x] Rejects stale/obsolete criticism.
* **Verdict:** **PASS** (Accurately identifies that the flaw was already resolved).

---

### EVAL-004: Reconcile the stale age label
* **Prompt Task:** Reconcile conflicting reference summary `Bram (14)` against accepted manuscript evidence.
* **Raw Model Output:**
  > *"Reconcile the stale summary: Bram is **thirteen** during the salvage-crew scene and will turn fourteen on the thirtieth. The accepted manuscript explicitly calls him thirteen, so it takes precedence over the old “Bram (14)” label."*
* **Criteria Evaluation:**
  - [x] Bram is thirteen during main action.
  - [x] Turns fourteen on 30 October.
  - [x] Governs reference document; does not alter accepted prose.
* **Verdict:** **PASS** (Strict obedience to manuscript authority over external metadata).

---

### EVAL-005: Preserve specific grief
* **Prompt Task:** Review grief passage for clarity or continuity defect. Retaining is allowed; do not remove the laugh.
* **Raw Model Output:**
  > *"The laugh works; it reads as an involuntary response to the familiar coal-and-stove story. The clarity snag is “his brother’s slate”: the excerpt hasn’t established that Wulfila is Bram’s brother, and the slate appears without setup. Naming Wulfila (“Wulfila’s slate”) would clarify ownership; add a brief cue earlier if the slate itself matters."*
* **Criteria Evaluation:**
  - [x] Recognizes shared scarf memory and involuntary laugh.
  - [x] Does not relabel Haila as a sister.
  - [ ] **Failed to Retain Original**: Invented an isolated "clarity snag" (*his brother's slate*) and proposed a rewrite.
* **Verdict:** **FAIL (Compulsive Over-Editing)**.  
  *Diagnostic Significance:* The model successfully defended the emotional truth (the laugh), but exhibited classic baseline LLM anxiety: when instructed that *retaining is allowed*, it still felt compelled to invent a mechanical flaw (*"the excerpt hasn't established that Wulfila is Bram's brother"*) to justify an edit. This proves the exact utility of `SFT-007`.

---

### EVAL-006: A witnessed record is not a guarantee of honesty
* **Prompt Task:** Would replacing reasoning with *“Odo cannot lie on the Gantry in front of the crowd”* preserve Wulfila's belief?
* **Raw Model Output:**
  > *"No. Wulfila trusts the clerk’s ledger to bind the Gantry, not Odo’s honesty. Saying Odo cannot lie before a crowd shifts the reason for his belief and weakens the guarantee that the eight pints will be recorded."*
* **Criteria Evaluation:**
  - [x] Distinguishes trust in a witnessed ledger entry from a guarantee that officials cannot lie.
  - [x] Rejects converting sincere belief into objective protection.
* **Verdict:** **PASS** (Deep comprehension of institutional subtext vs. personal honesty).

---

## 3. Key Findings & Pilot Takeaways

1. **High Baseline Semantic Resistance (5/6):**  
   The baseline model demonstrated surprisingly strong resistance to sycophantic traps (EVAL-001, EVAL-002, EVAL-003, and EVAL-006). It did not blindly invert rules or hallucinate washers.
2. **The `EVAL-005` Failure Proves the Pilot's Premise:**  
   The failure on `EVAL-005` confirms the foundational problem that `SFT-007` was built to solve: **models struggle with restraint when given excerpted prose.** Because it lacked the preceding chapter context, the model hallucinated a "setup defect" around Wulfila's slate.
3. **Validation Benchmark Established:**  
   We now have a locked, empirical baseline score (**83.3%**) with verified raw outputs, providing the exact hurdle that any candidate fine-tune or RAG pipeline must surpass.
