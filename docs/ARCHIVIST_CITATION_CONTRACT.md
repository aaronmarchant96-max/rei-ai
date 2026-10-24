# The Archivist — Record Citations and Claim Provenance Contract (Phase A)

**Document ID:** `archivist-citation-contract-v0-1`  
**Status:** Implemented & Verified (Phase A)  
**Date:** 2026-10-24  
**Scope:** Pure deterministic TypeScript interfaces, validation helpers, and test suite in `src/lib/archivistEngine.ts` and `tests/lib/archivistEngine.test.ts`.

---

## 1. Centaur Boundary & Epistemic Scope

The Archivist engine enforces an explicit epistemic boundary:

1. **Deterministic Guarantees (Machine-Verified):**
   - Structural claim-to-record traceability.
   - Non-empty source references on `record_reports` basis.
   - Known `recordId` existence and duplicate-record conflict detection.
   - Exact string preservation of archival locators (`"12B"`, `"035"`).
   - Per-record locator validation (catching mutations like line 35 $\to$ line 36).
   - Tri-state separation of URL access status, physical image inspection, and transcription verification.
   - Discrepancy retention without silent averaging or overwrite.
   - Unsafe URL scheme rejection (`javascript:`, `data:`, `file:`).

2. **Semantic Guarantees (Human / Model-in-the-Loop, Excluded from Engine Guarantee):**
   - Whether cited record text semantically supports the substantive assertion.
   - Historical plausibility of inferences or transcript interpretations.
   - Resistance to adversarial prompt injection in unstructured free text.

---

## 2. Type Architecture & Schemas

The following types are exported from [`src/lib/archivistEngine.ts`](../src/lib/archivistEngine.ts):

### Record Identity & Structured Locators
```typescript
export interface SourceIdentity {
  recordId: string;
  title: string;
  repository?: string;
  collection?: string;
  recordType?: string;
  recordDate?: string;
  jurisdiction?: string;
}

export interface ArchivalLocators {
  publication?: string;
  series?: string;
  roll?: string;
  volume?: string;
  page?: string;
  sheet?: string;
  line?: string;
  imageNumber?: string;
  dwellingNumber?: string;
  familyNumber?: string;
  additional?: Record<string, string>;
}
```

### Tri-State Separation & Provenance
```typescript
export interface LocatorProvenance {
  value: string;
  suppliedBy: "user_supplied" | "imported" | "inspected_image";
  evidenceReference?: string;
  verificationStatus: "verified" | "unverified" | "disputed";
}

export interface LocatorProvenanceMap {
  standard?: Partial<Record<keyof Omit<ArchivalLocators, "additional">, LocatorProvenance>>;
  additional?: Record<string, LocatorProvenance>;
}

export interface AccessRecord {
  sourceUrl?: string;
  urlStatus: "verified_working" | "unverified" | "broken" | "not_supplied";
  accessedAt?: string;
}

export interface CaptureRecord {
  captureMethod?: "transcript" | "ocr" | "index" | "inspected_image";
  capturedAt?: string;
  imageInspected: boolean;
  transcriptionStatus: "unverified" | "human_verified" | "ocr_raw";
  rawText?: string;
  transcription?: string;
  transcriptionNotes?: string;
}
```

### Claims Bound to Individual Records
```typescript
export type ClaimBasis = "record_reports" | "inference" | "unresolved_hypothesis";

export interface ClaimSourceReference {
  recordId: string;
  locators?: Partial<ArchivalLocators>;
}

export interface GenealogicalClaim {
  claimId: string;
  assertion: string;
  basis: ClaimBasis;
  sources: ClaimSourceReference[];
  supportingExcerpt?: string;
  inferenceNotes?: string;
}

export interface ArchiveRecord {
  id: string;
  title: string;
  sourceType: string;
  date?: string;
  repository?: string;
  informant?: string;
  isOriginalScan?: boolean;
  transcription?: string;
  tier?: ArchiveEvidenceTier;
  sourceIdentity?: SourceIdentity;
  locators?: ArchivalLocators;
  access?: AccessRecord;
  capture?: CaptureRecord;
  provenance?: LocatorProvenanceMap;
  originalCitation?: string;
}
```

---

## 3. Pure Deterministic Helper Functions

1. **`formatArchivalCitation(record: Partial<ArchiveRecord>, options?: { includeMissingSummary?: boolean; preferOriginalCitation?: boolean }): string`**
   - Deterministically formats archival citations preserving exact string locator values.
   - If `preferOriginalCitation: true` and `record.originalCitation` is present, returns the exact verbatim original citation unchanged.
   - Distinguishes index citations from original document scans.
   - Safely omits unsafe URL schemes.

2. **`formatProvisionalClaim(assertion: string, locators: ArchivalLocators, basis: ClaimBasis, caveats?: string[]): string`**
   - Formats uninspected or provisional assertions with explicit basis tags and disclaimers.
   - Automatically supplies default uninspected disclaimer (`"Caveats: Original image not inspected; transcription unverified."`) when caveats argument is omitted or empty.
   - Does not hallucinate unsupplied repository, roll, or state data.

3. **`validateClaimReferences(claims: GenealogicalClaim[], availableRecords: ArchiveRecord[]): { valid: boolean; errors: string[] }`**
   - Validates that every referenced record ID exists in `availableRecords`.
   - Rejects duplicate record IDs in `availableRecords` that carry conflicting source data (including differing titles, sourceTypes, dates, repositories, transcriptions, informants, or locators).
   - Compares locators field-by-field independently of object property insertion order (`areLocatorsEqual`).
   - Rejects claims with basis `record_reports` that specify empty sources.
   - Validates cited locators on each `ClaimSourceReference` directly against the corresponding record's locators (catching mutations such as line 35 $\to$ line 36).

4. **`validateRecordProvenance(record: ArchiveRecord): { valid: boolean; errors: string[] }`**
   - Verifies that `provenance.standard` and `provenance.additional` match the corresponding fields in `record.locators`.
   - Rejects conflicting values between locators and their provenance entries.

5. **`validateTriStateIntegrity(record: ArchiveRecord): { valid: boolean; errors: string[] }`**
   - Enforces tri-state separation between URL access, image inspection, and transcription verification.
   - Rejects index-only records attempting to assert physical image inspection (`imageInspected: true`).
   - Rejects human-verified transcriptions with empty transcription text.

6. **`evaluateCitationDiscrepancy(recordA, recordB): { hasConflict: boolean; summary: string }`**
   - Compares conflicting reports (e.g. birth year 1822 vs 1826) and retains both values explicitly without numeric averaging or silent overwrite.

7. **`validateSafeUrl(url?: string): { safe: boolean; sanitizedUrl?: string }`**
   - Restricts URLs to `http://` and `https://` schemes with non-empty hostnames, rejecting `javascript:`, `data:`, `file:`, and malformed URLs (e.g. `https://`).

---

## 4. Acceptance Criteria & Test Verification Matrix

| Case ID | Invariant Verified | Implementation Method | Test Status |
|:---|:---|:---|:---|
| **ARC-001** | Structured locator preservation & citation rendering | `formatArchivalCitation` | Verified (`tests/lib/archivistEngine.test.ts`) |
| **ARC-002** | Provisional unverified citation framing & default disclaimers | `formatProvisionalClaim` | Verified (`tests/lib/archivistEngine.test.ts`) |
| **ARC-003** | Tri-state validation: access vs inspection vs transcription | `validateTriStateIntegrity` | Verified (`tests/lib/archivistEngine.test.ts`) |
| **ARC-004** | Alphanumeric & leading-zero locator preservation | Exact string typing in `ArchivalLocators` | Verified (`tests/lib/archivistEngine.test.ts`) |
| **ARC-005** | Inference basis labeling & disclaimers | `formatProvisionalClaim` / `GenealogicalClaim` | Verified (`tests/lib/archivistEngine.test.ts`) |
| **ARC-006** | Citation discrepancy retention without averaging | `evaluateCitationDiscrepancy` | Verified (`tests/lib/archivistEngine.test.ts`) |
| **ARC-007** | Strict per-record locator validation, empty sources, duplicates | `validateClaimReferences` & `validateRecordProvenance` | Verified (`tests/lib/archivistEngine.test.ts`) |
| **ARC-008** | An original scan does not automatically make every statement primary information | Epistemic classification / prompt framing | **Deferred to Phase B** |
| **ARC-009** | Unavailable or index-only links must not imply verified image access | Chat persona / model-in-the-loop | **Deferred to Phase B** |
| **ARC-010** | Negative-evidence qualification in chat generation | Prompt harness & persona evaluation | **Deferred to Phase B** |
| **ARC-011** | Verbatim citation preservation option | `formatArchivalCitation({ preferOriginalCitation: true })` | Verified (`tests/lib/archivistEngine.test.ts`) |
| **ARC-012** | Safe URL scheme validation & containment | `validateSafeUrl` | Verified (`tests/lib/archivistEngine.test.ts`) |

---

## 5. Live Test Execution Snapshot

Executed via `npm test tests/lib/archivistEngine.test.ts`:
```text
PASS tests/lib/archivistEngine.test.ts
  The Archivist & Family Archive Evidence Engine
    classifyArchiveEvidence (Genealogical Proof Standard)
      ✓ classifies an original scan of a parish register as primary_direct (2 ms)
      ✓ classifies an indexed secondary transcription as secondary_derivative (1 ms)
      ✓ classifies oral family lore as family_memory (1 ms)
      ✓ classifies explicit negative search results as negative_search
    evaluateDisambiguationHinge (Same-Name Disambiguation)
      ✓ identifies a conflict on father occupation when candidate record matches person B (1 ms)
      ✓ confirms match when father occupation and parish match person A
      ✓ returns insufficient_evidence when only name matches without distinguishing hinge (4 ms)
    createNegativeSearchRecord
      ✓ creates a deterministic negative search receipt with 0 results (1 ms)
    Phase A Citation and Provenance Contract (ARC-001 - ARC-007, ARC-011, ARC-012)
      ✓ ARC-001: formats complete archival citations from structured locators without data loss (2 ms)
      ✓ ARC-002: formats provisional unverified claims with explicit caveats and supplies default uninspected disclaimer
      ✓ ARC-003: enforces tri-state validation between URL access, image inspection, and transcription verification (1 ms)
      ✓ ARC-004: preserves exact string locators without numeric coercion or leading-zero stripping (1 ms)
      ✓ ARC-005: retains inference basis labeling and disclaimers (semantic reasoning excluded from engine guarantee)
      ✓ ARC-006: preserves conflicting source values without silent averaging or overwrite (1 ms)
      ✓ ARC-007: strictly validates per-record locators, rejects mutated lines, empty sources, and conflicting duplicates (4 ms)
      ✓ ARC-011: preserves verbatim archival citation when preferOriginalCitation is specified (1 ms)
      ✓ ARC-012: validates safe URL schemes and rejects javascript:, data:, file:, and malformed URLs (2 ms)

Test Suites: 1 passed, 1 total
Tests:       17 passed, 17 total
Snapshots:   0 total
Time:        0.921 s
```
