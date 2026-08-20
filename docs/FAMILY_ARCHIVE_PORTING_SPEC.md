# Marchant Family Archive — REI.ai Porting Specification & Evidence Architecture

**Date:** 2026-08-20  
**Target Repository:** `aaronmarchant96-max/family-archive`  
**Purpose:** Specification for porting the CARDO REI epistemic evidence engine, same-name disambiguation hinge detection, and frozen-prefix transcript caching into the Marchant Family Archive.

---

## 1. Architectural Alignment: The 4-Tier Genealogical Proof Standard (GPS)

To prevent family-tree corruption (e.g. merging two unrelated ancestors with identical names), every claim, relationship, and date in the archive must carry an explicit `ArchiveEvidenceTier`:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ARCHIVE EVIDENCE TIERS                          │
├──────────────────────┬─────────────────────────────────────────────────┤
│ Tier                 │ Definition & Primary Sources                    │
├──────────────────────┼─────────────────────────────────────────────────┤
│ 🟢 primary_direct    │ Original records created at or near the event   │
│                      │ by informants with direct personal knowledge:   │
│                      │ • Original Parish Registers (Baptisms, Burials) │
│                      │ • Civil Birth, Marriage, & Death Certificates   │
│                      │ • Military Pay Vouchers (e.g. War of 1812)      │
│                      │ • Original Last Will & Testament Scans          │
├──────────────────────┼─────────────────────────────────────────────────┤
│ 🔵 secondary_derive  │ Derivative works, indexes, compiled genealogies:│
│                      │ • Find A Grave memorials                        │
│                      │ • FamilySearch / Ancestry digital index entries │
│                      │ • Published county histories & pedigree charts  │
├──────────────────────┼─────────────────────────────────────────────────┤
│ 🟠 inferred_modeled  │ Hypotheses derived from surrounding data:       │
│                      │ • Estimated birth year calculated from census   │
│                      │ • Cluster research connections (FAN Principle)  │
├──────────────────────┼─────────────────────────────────────────────────┤
│ ⚪ negative_search   │ Documented exhaustive searches yielding 0 hits: │
│                      │ • "Searched 1851 Sussex Census — 0 found"       │
│                      │ Prevents duplicate searching & hallucination    │
└──────────────────────┴─────────────────────────────────────────────────┘
```

---

## 2. Core Ported Modules & Code

The TypeScript logic in [`src/lib/archivistEngine.ts`](../src/lib/archivistEngine.ts) can be dropped directly into `family-archive/src/lib/archivistEngine.ts`:

### A. Same-Name Disambiguation Hinge Engine
```typescript
import { evaluateDisambiguationHinge } from "@/lib/archivistEngine";

const result = evaluateDisambiguationHinge(personA, personB, candidateRecord);

if (result.matchStatus === "conflict_identified") {
  // Hard barrier: Prevents auto-merging profiles in Family Archive UI
  console.warn(result.hingeDescription);
}
```

### B. Negative Evidence Logging Receipt
```typescript
import { createNegativeSearchRecord } from "@/lib/archivistEngine";

const receipt = createNegativeSearchRecord(
  "Josiah Marchant",
  "The National Archives UK",
  "WO 97 Chelsea Pensioners Discharge Documents",
  { regNo: "1846", county: "Sussex" },
  "No military pension record found under spelling variations Marchant or Merchant"
);
```

---

## 3. Large-Document Prompt-Freeze Caching Protocol

When analyzing 10-page historical wills or census manifests:
1. **Frozen Prefix Position**: Place raw transcriptions and source metadata in the static system prompt or top of context.
2. **Dynamic Inquiries**: Send user follow-up questions (*"Extract all land bequests"*, *"List witnesses to the will"*) at the end.
3. **90%+ Cache Discount**: Leverages Gemini 2.5/3.6 Flash and DeepSeek v4 prompt caching discounts.

---

## 4. Privacy & Living Person Invariants

- Living person records and private family correspondence remain encrypted in local browser storage / SQLite.
- External LLM inference operates under BYOK with **zero prompt retention** by default.
