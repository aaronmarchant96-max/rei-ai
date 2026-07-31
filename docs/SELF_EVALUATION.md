# REI Architecture Self-Evaluation Baseline

**Last Evaluated:** 2026-07-28

This document serves as a living baseline of REI's own self-identified architectural assumptions, failure modes, and domain-drift risks. Future self-evaluations should be compared against this baseline to measure structural improvements over time.

## Subsystem Weaknesses & Structural Assumptions

| Subsystem | Key Assumption | Risk / Failure Mode |
|-----------|----------------|---------------------|
| **Router** | "User input is well-formed and relevant" | Keyword routing cannot handle ambiguous or multi-domain probes effectively, leading to misrouting. |
| **CARDO Pipeline** | "Queries are software-engineering related" | Already handles 5 domains, but the pipeline is CARDO-generic—there is no domain-specific optimization yet. |
| **Engineer** | "Code analysis and design principles are sufficient" | Phase 0 STOP rule fires on underspecified queries even when code is provided, causing rigid dead-ends. |
| **Archivist** | "Knowledge is accurately stored and retrievable" | The legal index only has 12 cases—this does not scale to full, open-ended legal research. |
| **Storyteller** | "Narrative generation can address any query" | No guard against over-narrating simple factual requests. |

## Remediation Tracking

This section maps the self-identified weaknesses to their corresponding active or completed fixes.

1. **Router — Ambiguous query handling**
   - *Status:* Fix in progress.
   - *Action:* Reordering keyword checks (e.g., coding vs. genealogy precedence) to catch domain drift before falling back to generic reasoning.

2. **Engineer — STOP on underspecified**
   - *Status:* **FIXED**.
   - *Action:* Updated Phase 0 trigger condition in `CODING_PROMPT` to allow casual exchange, meta-questions, and direct instructions ("then do it") without firing the rigid STOP rule.

3. **CARDO Pipeline — Domain-specific optimization**
   - *Status:* Open.
   - *Action:* Needs a pass to allow varying structural loops per domain, rather than forcing every domain through the exact same CARDO steps.

4. **Archivist — Legal index scaling**
   - *Status:* Open.
   - *Action:* Requires transitioning from a hardcoded 12-case prompt index to an external retrieval or scalable semantic knowledge base.

5. **Storyteller — Over-narrating facts**
   - *Status:* Open.
   - *Action:* Needs the same escape hatch recently added to The Engineer ("Casual Exchange, Meta-Questions, and Direct Instructions") to bypass the rigid story structure for factual lookups.

## Evaluation Cadence
Run the self-evaluation prompt quarterly (by triggering the `evaluate your architecture` route). Compare the new output against these baseline risks to prove measurable architectural evolution.
