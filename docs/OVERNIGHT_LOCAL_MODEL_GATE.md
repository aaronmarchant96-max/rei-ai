# Overnight Local Model Gate — Executive Benchmark Report

**Contract**: `OVERNIGHT LOCAL MODEL GATE v1`  
**Target Candidate**: `llama3.1:8b`  
**Digest**: `unknown_digest`  
**Corpus Hash**: `ceb97cfe8904a8664868b9c31c4c1d72d9225fe4808a076e19674fbc2c4c5df7`  
**Executed At**: `2026-08-26T10:26:47.250Z`  

---

> 🛑 **Promotion Rule Notice**: This overnight run evaluates candidate capability evidence. Local models do **NOT** enter routing policy automatically. A passing result qualifies the candidate for human review and routing regression tests prior to policy eligibility.

---

## 1. Summary Dashboard

| Metric | Score / Value | Status / Gate |
|---|:---:|:---:|
| **Total Prompts Evaluated** | **136** | 100% Corpus Coverage |
| **Hard Failures** | **136** | ❌ GATE FAILED |
| **CARDO Structural Adherence** | **0%** | WARN |
| **Epistemic Correctness (Separated)** | **0%** | FAIL |
| **Anti-Slop Score** | **0%** | Clean |
| **Average Generation Speed** | **0 t/s** | Benchmark |
| **Average Latency** | **0 ms** | Benchmark |

---

## 2. Hard Failure Audit Breakdown

❌ **136 hard failure(s) detected during evaluation.** Candidate requires prompt alignment or model fine-tuning before proceeding.

---

## 3. Next Steps & Promotion Workflow

1. **Raw Receipts File**: [`docs/overnight_local_gate_raw.jsonl`](./overnight_local_gate_raw.jsonl)
2. **Summary Package**: [`docs/overnight_local_gate_summary.json`](./overnight_local_gate_summary.json)
3. **Sequence Status**:
   - ❌ **Quality Gate Failed**: Candidate is rejected for routing policy eligibility. Resolve epistemic/delivery failures prior to economics testing.
