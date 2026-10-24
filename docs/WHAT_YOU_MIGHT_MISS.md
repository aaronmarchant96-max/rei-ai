---
status: active
authority_scope: portfolio-deep-dive-guide
owner: Aaron Marchant
last_verified: 2026-10-18
verified_against_commit: HEAD
claims_source: docs/CLAIM_LEDGER.md
supersedes: []
superseded_by: null
archived_at: null
---

# Under the Hood: What You Might Miss

An engineering guide to the systems architecture, test invariants, and verification discipline running beneath the surface of this repository.

---

## 1. Value, Plainly

When a technical recruiter, hiring manager, or staff engineer glances at a GitHub profile, they typically spend 30 to 60 seconds reviewing surface-level indicators: repository titles, language breakdowns, and commit frequency.

From a quick surface scan, this repository might look like a standard OpenAI API proxy and personal project portfolio. 

What a surface scan misses is that this codebase is built around **strict empirical verification and systems-level constraints**. Nothing in this repository relies on unmeasured marketing claims or self-reported vibes. Every number is tied to an automated test or a raw billing export, every agent action is bounded by deterministic state machines, and every failure mode is logged with a public receipt.

This document details five specific engineering achievements implemented in this codebase that an outside reviewer might otherwise miss.

---

## 2. Mechanism, Precisely

### Pillar 1: Deterministic Test Invariants & Programmatic Claims
- **The Surface View:** A badge showing passing tests.
- **Under the Hood:** 1,366 automated tests across 121 suites passing in under 20 seconds (`npm test`).
- **The Mechanism:** Test counts and metric claims across all markdown documentation are not hand-edited. The script `scripts/gen-claims.mjs` executes the test runner with a JSON reporter, parses exact totals, and synchronizes `src/data/claims.json` alongside documentation tables. If a claim drifts by a single test, CI gate `npm run claims:check` exits nonzero.
- **The Epistemic Standard:** In [docs/CLAIM_LEDGER.md](CLAIM_LEDGER.md), every single metric maps to a reproducible terminal command. Claims that fail reproduction are formally retired or struck rather than left unverified.

### Pillar 2: Token Economy & Prompt Prefix Caching
- **The Surface View:** A claim of low API spend.
- **Under the Hood:** 1,848,473,560 tokens processed for an actual expenditure of $23.5172, achieving a measured 97.3502% input cache hit rate across 9,157 requests.
- **The Mechanism:** High cache hit rates do not happen by default. They require strict deterministic serialization: freezing prompt prefix order, isolating dynamic user variables behind static system envelopes, and maintaining persistent session hash keys.
- **The Proof:** Verified via `npm run verify:cache` against the unredacted billing ledger in `data/cache-spend.csv`.

### Pillar 3: Multi-Agent Governance & "Three Chairs" Discipline
- **The Surface View:** Code assisted by AI generation.
- **Under the Hood:** A formal three-role adversarial governance protocol governing local tools:
  - **The Builder (AGY / Codex):** Holds execution authority to write files and run test suites.
  - **The Auditor (GLM / OpenCode):** Strictly read-only by default. Inspects disk artifacts, hashes files, and cross-examines plans. Disagreement between models is treated as information, not consensus.
  - **The Arbitrator (Aaron, Human):** Closes gates and verifies evidence manifests before flipping verification status.
- **Inter-Agent Message Bus:** Includes a local file-based agent messaging bus with separate mailboxes (`inbox/agy`, `inbox/opencode`), append-only JSON journal logs, and POSIX file locking (`flock`) to prevent multi-agent race conditions.

### Pillar 4: The Error-Gap Catalogue
- **The Surface View:** Normal bug fixes in git history.
- **Under the Hood:** An empirical taxonomy tracking 183 git commits to answer: *"Which layer catches which defects?"*
  - `manual` (109 occurrences): Defects caught by human review that automation missed (visual alignment, tone, subtle logic).
  - `test` (61 occurrences): Regressions intercepted by automated test suites.
  - `claim-gate` (15 occurrences): Metric discrepancies caught when documentation drifted from test reality.
  - `ai-cross-check` (1 occurrence): Bugs identified through adversarial model disagreement.
- **Reference:** Documented in [docs/ERROR_GAP_CATALOGUE.md](ERROR_GAP_CATALOGUE.md).

### Pillar 5: Hostile Environment Sandboxing & Binary Auditing
- **The Surface View:** Gaming and runner scripts.
- **Under the Hood:** Software preservation and security forensics.
  - Software installations and untrusted installers are run inside **Bubblewrap (`bwrap`) filesystem sandboxes** with access restricted to isolated test prefixes.
  - Repack payloads are statically inspected before execution: tracing Inno Download Plugin dependencies (`idp.dll`), isolating DNS redirect scripts (`host.cmd` / `hosts.exe`), checking MD5/SHA-256 manifests, and documenting potential security concerns before certifying playability.

---

## 3. Evidence, One Level Deeper

All mechanisms described above can be independently reproduced on this machine using the following commands:

| Engineering Pillar | Verification Command | Ground Truth Evidence File |
| :--- | :--- | :--- |
| Test Suite Rigor | `npm test` | 121 test suites, 1,366 passing tests |
| Automated Claims Check | `npm run claims:check` | `src/data/claims.json` vs documentation |
| Cache Spend Reconciliation | `npm run verify:cache` | `data/cache-spend.csv` (1.848B tokens, $23.5172) |
| Documentation Lifecycle | `npm run docs:validate` | 98 markdown files validated |
| Threat Scanning Rules | `npm test -- src/__eval__/feynmanGate.test.js` | 136 holdout queries across 5 domains |
| Error Gap Taxonomy | `node scripts/extract-error-gaps.mjs --check` | [docs/ERROR_GAP_CATALOGUE.md](ERROR_GAP_CATALOGUE.md) |
| Architecture Topology | Review specification | [docs/ARCHITECTURE.md](ARCHITECTURE.md) |
| Control Matrix | Review security matrix | [docs/DEFENSE_IN_DEPTH_CONTROL_MATRIX.md](DEFENSE_IN_DEPTH_CONTROL_MATRIX.md) |
