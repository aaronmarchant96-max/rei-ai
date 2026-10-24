/**
 * @file archivistEngine.ts
 * @description Core genealogical evidence evaluation, same-name disambiguation hinge detection,
 * and negative-evidence logging for The Archivist domain and Marchant Family Archive.
 */

export type ArchiveEvidenceTier = 
  | "primary_direct"        // 🟢 Primary Source: Original record created at/near time of event with personal knowledge
  | "secondary_derivative"  // 🔵 Secondary Evidence: Transcripts, compiled family trees, published county indices
  | "inferred_modeled"       // 🟠 Inferred / Modeled: Age-derived birth estimates, FAN-principle cluster connections
  | "family_memory"          // 🟡 Family Memory: Oral traditions, unverified recollections
  | "negative_search";       // ⚪ Negative Search: Documented search yielding zero results

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

export interface LocatorProvenance {
  value: string;
  suppliedBy: "user_supplied" | "imported" | "inspected_image";
  evidenceReference?: string;
  verificationStatus: "verified" | "unverified" | "disputed";
}

export interface LocatorProvenanceMap {
  standard?: Partial<Record<keyof Omit<ArchivalLocators, "additional">, LocatorProvenance>>;
  additional?: Record<string, LocatorProvenance>;
  flags?: Record<string, boolean | string>;
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

export type ClaimBasis = "record_reports" | "inference" | "unresolved_hypothesis";

export interface ClaimSourceReference {
  recordId: string;
  revisionId?: string;
  locators?: Partial<ArchivalLocators>;
  supportingExcerpt?: string;
}

export interface ArchiveRecordRevision {
  revisionId: string;
  recordId: string;
  revisionNumber: number;
  createdAt: string;
  author: "imported" | "researcher" | "ai_extraction";
  changeSummary: string;
  previousState?: Partial<ArchiveRecord>;
  snapshot: ArchiveRecord;
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
  currentRevision?: number;
}

export interface DisambiguationPerson {
  name: string;
  birthYear?: number;
  deathYear?: number;
  fatherName?: string;
  fatherOccupation?: string;
  motherName?: string;
  spouseName?: string;
  parishLocation?: string;
  occupation?: string;
}

export interface DisambiguationResult {
  matchStatus: "confirmed_match" | "conflict_identified" | "insufficient_evidence";
  hingeDescription: string;
  conflicts: string[];
  recommendedMove: string;
}

export interface NegativeSearchResult {
  searchId: string;
  ancestorQuery: string;
  repository: string;
  recordSet: string;
  dateSearched: string;
  parameters: Record<string, string | number>;
  resultCount: 0;
  conclusion: string;
}

/**
 * Classify a primary/secondary archival source into the Genealogical Proof Standard (GPS) tier.
 */
export function classifyArchiveEvidence(record: Partial<ArchiveRecord>): ArchiveEvidenceTier {
  const type = (record.sourceType || "").toLowerCase();

  // Negative searches
  if (record.transcription?.includes("0 records found") || record.title?.toLowerCase().includes("negative search")) {
    return "negative_search";
  }

  // Tier 1: Primary Direct Sources
  const isPrimaryType = /parish register|baptism|burial|marriage certificate|birth certificate|death certificate|will original|probate roll|military pay voucher|census original|crown patent/.test(type);
  if (isPrimaryType && record.isOriginalScan) {
    return "primary_direct";
  }

  // Tier 2: Secondary / Derivative Sources
  const isDerivativeType = /transcript|index|find a grave|abstract|county history|familysearch index|ancestry index|pedigree chart/.test(type);
  if (isDerivativeType || isPrimaryType) {
    return "secondary_derivative";
  }

  // Tier 4: Family Memory
  if (/oral tradition|interview|family lore|recollection/.test(type)) {
    return "family_memory";
  }

  return "inferred_modeled";
}

/**
 * Deterministically evaluate the Hinge between two same-name ancestor candidates and a candidate record.
 */
export function evaluateDisambiguationHinge(
  personA: DisambiguationPerson,
  personB: DisambiguationPerson,
  candidateRecord: Partial<ArchiveRecord> & { candidateData?: Partial<DisambiguationPerson> }
): DisambiguationResult {
  const conflicts: string[] = [];
  const candidate = candidateRecord.candidateData || {};

  // 1. Chronological Hinge Checks
  if (personA.birthYear && candidate.birthYear) {
    const diffA = Math.abs(personA.birthYear - candidate.birthYear);
    if (diffA > 5) {
      conflicts.push(`Birth year discrepancy: Person A (${personA.birthYear}) vs Record (${candidate.birthYear}) delta > 5 years`);
    }
  }

  // 2. Parent-Child / Father Occupation Hinge
  if (personA.fatherOccupation && candidate.fatherOccupation) {
    if (personA.fatherOccupation.toLowerCase() !== candidate.fatherOccupation.toLowerCase()) {
      conflicts.push(
        `Father occupation mismatch: Person A's father was "${personA.fatherOccupation}", but candidate record indicates "${candidate.fatherOccupation}"`
      );
    }
  }

  // 3. Spouse Disambiguation Hinge
  if (personA.spouseName && candidate.spouseName) {
    if (personA.spouseName.toLowerCase() !== candidate.spouseName.toLowerCase()) {
      conflicts.push(
        `Spouse mismatch: Person A married "${personA.spouseName}", but candidate record indicates "${candidate.spouseName}"`
      );
    }
  }

  // 4. Geographic Parish Hinge
  if (personA.parishLocation && candidate.parishLocation) {
    if (personA.parishLocation.toLowerCase() !== candidate.parishLocation.toLowerCase()) {
      conflicts.push(
        `Parish boundary discrepancy: Person A in "${personA.parishLocation}" vs Record in "${candidate.parishLocation}"`
      );
    }
  }

  if (conflicts.length > 0) {
    const primaryConflict = conflicts[0];
    return {
      matchStatus: "conflict_identified",
      hingeDescription: `Hinge: ${primaryConflict}`,
      conflicts,
      recommendedMove: "Do NOT merge profiles. Search for parish tax assessments or probate records to separate the cluster."
    };
  }

  // If candidate explicitly matches key hinges
  const hasStrongHingeMatch = 
    Boolean(personA.fatherOccupation && personA.fatherOccupation.toLowerCase() === candidate.fatherOccupation?.toLowerCase()) ||
    Boolean(personA.spouseName && personA.spouseName.toLowerCase() === candidate.spouseName?.toLowerCase());

  if (hasStrongHingeMatch) {
    return {
      matchStatus: "confirmed_match",
      hingeDescription: "Hinge: Confirmed matching parentage / occupational signature",
      conflicts: [],
      recommendedMove: "Attach record with Tier 🟢 Primary or 🔵 Strong Evidence citation."
    };
  }

  return {
    matchStatus: "insufficient_evidence",
    hingeDescription: "Hinge: Candidate data matches name but lacks corroborating parentage or occupational identifiers",
    conflicts: [],
    recommendedMove: "Execute FAN-principle search (neighbors, witnesses on parish register) before linking."
  };
}

/**
 * Log a negative search to preserve research negative space and prevent repeated duplicate queries.
 */
export function createNegativeSearchRecord(
  ancestorQuery: string,
  repository: string,
  recordSet: string,
  parameters: Record<string, string | number>,
  conclusion: string
): NegativeSearchResult {
  const hashString = `${ancestorQuery}:${repository}:${recordSet}:${JSON.stringify(parameters)}`;
  let hash = 0;
  for (let i = 0; i < hashString.length; i++) {
    hash = (hash << 5) - hash + hashString.charCodeAt(i);
    hash |= 0;
  }

  return {
    searchId: `neg-${Math.abs(hash).toString(16)}`,
    ancestorQuery,
    repository,
    recordSet,
    dateSearched: new Date().toISOString().split("T")[0],
    parameters,
    resultCount: 0,
    conclusion
  };
}

/**
 * Validate that a URL uses a safe web scheme (http / https) and has a valid host.
 * Rejects unsafe schemes like javascript:, data:, file: as well as malformed URLs like "https://" (ARC-012).
 */
export function validateSafeUrl(url?: string): { safe: boolean; sanitizedUrl?: string } {
  if (!url) return { safe: false };
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if ((parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.hostname.length > 0) {
      return { safe: true, sanitizedUrl: trimmed };
    }
    return { safe: false };
  } catch {
    return { safe: false };
  }
}

/**
 * Determine if two ArchivalLocators objects match in value regardless of property order.
 */
export function areLocatorsEqual(locA?: ArchivalLocators, locB?: ArchivalLocators): boolean {
  if (!locA && !locB) return true;
  if (!locA || !locB) return false;

  const standardKeys: Array<keyof Omit<ArchivalLocators, "additional">> = [
    "publication", "series", "roll", "volume", "page", "sheet", "line",
    "imageNumber", "dwellingNumber", "familyNumber"
  ];
  for (const k of standardKeys) {
    if ((locA[k] || undefined) !== (locB[k] || undefined)) return false;
  }

  const addA = locA.additional || {};
  const addB = locB.additional || {};
  const keysA = Object.keys(addA).sort();
  const keysB = Object.keys(addB).sort();
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    const k = keysA[i];
    if (k !== keysB[i] || addA[k] !== addB[k]) return false;
  }
  return true;
}

/**
 * Detect whether an ArchiveRecord contains internal contradictions between its
 * legacy top-level fields and structured nested fields (e.g. title, repository, date,
 * sourceType/recordType, or transcription).
 */
export function hasIntraRecordConflict(record: ArchiveRecord): boolean {
  if (record.title && record.sourceIdentity?.title && record.title !== record.sourceIdentity.title) {
    return true;
  }
  if (record.repository && record.sourceIdentity?.repository && record.repository !== record.sourceIdentity.repository) {
    return true;
  }
  if (record.date && record.sourceIdentity?.recordDate && record.date !== record.sourceIdentity.recordDate) {
    return true;
  }
  if (record.sourceType && record.sourceIdentity?.recordType && record.sourceType !== record.sourceIdentity.recordType) {
    return true;
  }
  if (record.transcription && record.capture?.transcription && record.transcription !== record.capture.transcription) {
    return true;
  }
  return false;
}

/**
 * Determine if two ArchiveRecords with the same ID carry conflicting source data.
 *
 * Rules for conflict detection:
 * 1. Intra-record coherence: if either record has internal contradictions between its
 *    top-level and nested fields, it is flagged as conflicting.
 * 2. Effective identity comparisons: compares effective title, repository, date, sourceType,
 *    and transcription across top-level and nested definitions.
 * 3. Nested source-bearing fields: compares sourceIdentity.collection, sourceIdentity.jurisdiction,
 *    capture details (captureMethod, imageInspected, transcriptionStatus, rawText), and
 *    access details (sourceUrl, urlStatus).
 * 4. Citation and locator preservation: compares informant, isOriginalScan, originalCitation,
 *    and locators (order-independent via areLocatorsEqual).
 */
export function areRecordsConflicting(a: ArchiveRecord, b: ArchiveRecord): boolean {
  // 1. Intra-record coherence
  if (hasIntraRecordConflict(a) || hasIntraRecordConflict(b)) return true;

  // 2. Effective identity fields
  const titleA = a.sourceIdentity?.title || a.title;
  const titleB = b.sourceIdentity?.title || b.title;
  if (titleA !== titleB) return true;

  const repoA = a.sourceIdentity?.repository || a.repository;
  const repoB = b.sourceIdentity?.repository || b.repository;
  if (repoA !== repoB) return true;

  const dateA = a.sourceIdentity?.recordDate || a.date;
  const dateB = b.sourceIdentity?.recordDate || b.date;
  if (dateA !== dateB) return true;

  const typeA = a.sourceIdentity?.recordType || a.sourceType;
  const typeB = b.sourceIdentity?.recordType || b.sourceType;
  if (typeA !== typeB) return true;

  const transA = a.capture?.transcription ?? a.transcription;
  const transB = b.capture?.transcription ?? b.transcription;
  if (transA !== transB) return true;

  // 3. Nested sourceIdentity specifics
  if ((a.sourceIdentity?.collection || undefined) !== (b.sourceIdentity?.collection || undefined)) return true;
  if ((a.sourceIdentity?.jurisdiction || undefined) !== (b.sourceIdentity?.jurisdiction || undefined)) return true;

  // 4. Nested capture specifics
  if ((a.capture?.captureMethod || undefined) !== (b.capture?.captureMethod || undefined)) return true;
  if (a.capture?.imageInspected !== b.capture?.imageInspected) return true;
  if ((a.capture?.transcriptionStatus || undefined) !== (b.capture?.transcriptionStatus || undefined)) return true;
  if ((a.capture?.rawText || undefined) !== (b.capture?.rawText || undefined)) return true;

  // 5. Nested access specifics
  if ((a.access?.sourceUrl || undefined) !== (b.access?.sourceUrl || undefined)) return true;
  if ((a.access?.urlStatus || undefined) !== (b.access?.urlStatus || undefined)) return true;

  // 6. Top-level and locator fields
  if (a.informant !== b.informant) return true;
  if (Boolean(a.isOriginalScan) !== Boolean(b.isOriginalScan)) return true;
  if (a.originalCitation !== b.originalCitation) return true;
  if (!areLocatorsEqual(a.locators, b.locators)) return true;

  return false;
}


/**
 * Validate tri-state separation between URL access, image inspection, and transcription verification (ARC-003).
 * Ensures that verified access does not imply image inspection, and that index records cannot assert image inspection.
 */
export function validateTriStateIntegrity(record: ArchiveRecord): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // An index-only capture cannot assert image inspection
  if (record.capture?.captureMethod === "index" && record.capture?.imageInspected) {
    errors.push(`Record "${record.id}": index-only captureMethod cannot claim imageInspected = true.`);
  }

  // A working URL does not imply verified image inspection
  if (record.access?.urlStatus === "verified_working" && record.capture && record.capture.imageInspected === undefined) {
    errors.push(`Record "${record.id}": verified URL access must explicitly declare imageInspected status.`);
  }

  // Human verified transcription requires non-empty transcription text
  if (record.capture?.transcriptionStatus === "human_verified" && !record.capture.transcription?.trim()) {
    errors.push(`Record "${record.id}": human_verified transcriptionStatus requires non-empty transcription text.`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate that claims point to known records and that cited locators strictly match the corresponding record.
 *
 * Boundary Guarantee:
 * - Structural validation only: verifies reference existence, non-empty sources on record_reports,
 *   internal coherence of every supplied record (top-level vs nested source fields),
 *   absence of conflicting duplicate record IDs, and exact string alignment between cited locators and record locators.
 * - Semantic support checking (whether the cited record text justifies the assertion) is explicitly outside
 *   deterministic engine validation.
 */
export function validateClaimReferences(
  claims: GenealogicalClaim[],
  availableRecords: ArchiveRecord[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const recordMap = new Map<string, ArchiveRecord>();

  // Check every record for internal top-level vs nested contradictions,
  // then check duplicate record IDs for conflicting source data
  for (const record of availableRecords) {
    if (hasIntraRecordConflict(record)) {
      errors.push(`Record "${record.id}" has contradictory top-level and nested source fields.`);
    }
    if (recordMap.has(record.id)) {
      const existing = recordMap.get(record.id)!;
      if (areRecordsConflicting(existing, record)) {
        errors.push(`Duplicate record ID "${record.id}" with conflicting source data detected.`);
      }
    } else {
      recordMap.set(record.id, record);
    }
  }

  for (const claim of claims) {
    if (claim.basis === "record_reports" && (!claim.sources || claim.sources.length === 0)) {
      errors.push(`Claim "${claim.claimId}" has basis "record_reports" but specifies no record sources.`);
      continue;
    }

    for (const srcRef of claim.sources || []) {
      const record = recordMap.get(srcRef.recordId);
      if (!record) {
        errors.push(`Claim "${claim.claimId}" references unknown recordId "${srcRef.recordId}".`);
        continue;
      }

      if (srcRef.locators) {
        // Check standard locators
        for (const [key, citedVal] of Object.entries(srcRef.locators)) {
          if (key === "additional") {
            const citedAdd = (citedVal as Record<string, string>) || {};
            for (const [addKey, addVal] of Object.entries(citedAdd)) {
              const expectedAdd = record.locators?.additional?.[addKey];
              if (addVal !== expectedAdd) {
                errors.push(
                  `Claim "${claim.claimId}" locator discrepancy for record "${srcRef.recordId}": cited additional.${addKey} "${addVal}" does not match record value "${expectedAdd ?? "undefined"}".`
                );
              }
            }
          } else {
            const expectedVal = (record.locators as Record<string, unknown> | undefined)?.[key];
            if (citedVal !== undefined && citedVal !== expectedVal) {
              errors.push(
                `Claim "${claim.claimId}" locator discrepancy for record "${srcRef.recordId}": cited ${key} "${citedVal}" does not match record value "${expectedVal ?? "undefined"}".`
              );
            }
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate that provenance records do not conflict with the primary locators in an ArchiveRecord.
 */
export function validateRecordProvenance(record: ArchiveRecord): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (record.provenance?.standard && record.locators) {
    for (const [key, prov] of Object.entries(record.provenance.standard)) {
      const locVal = (record.locators as Record<string, unknown>)[key];
      if (prov && locVal !== undefined && prov.value !== locVal) {
        errors.push(
          `Provenance conflict on locator "${key}": locator specifies "${locVal}", but provenance records "${prov.value}".`
        );
      }
    }
  }

  if (record.provenance?.additional && record.locators?.additional) {
    for (const [key, prov] of Object.entries(record.provenance.additional)) {
      const locVal = record.locators.additional[key];
      if (prov && locVal !== undefined && prov.value !== locVal) {
        errors.push(
          `Provenance conflict on additional locator "${key}": locator specifies "${locVal}", but provenance records "${prov.value}".`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Deterministically format an archival citation.
 * Preserves exact locator string identities without numeric casting or normalization.
 */
export function formatArchivalCitation(
  record: Partial<ArchiveRecord>,
  options?: {
    includeMissingSummary?: boolean;
    preferOriginalCitation?: boolean;
  }
): string {
  if (options?.preferOriginalCitation && record.originalCitation) {
    return record.originalCitation;
  }

  const parts: string[] = [];

  // 1. Identity
  const title = record.title || record.sourceIdentity?.title;
  if (title) parts.push(title);

  const date = record.date || record.sourceIdentity?.recordDate;
  if (date) parts.push(date);

  const repo = record.repository || record.sourceIdentity?.repository;
  if (repo) parts.push(`Repository: ${repo}`);

  const collection = record.sourceIdentity?.collection;
  if (collection) parts.push(`Collection: ${collection}`);

  const jurisdiction = record.sourceIdentity?.jurisdiction;
  if (jurisdiction) parts.push(`Jurisdiction: ${jurisdiction}`);

  // 2. Locators (preserving exact strings)
  const loc = record.locators;
  if (loc) {
    const locParts: string[] = [];
    if (loc.publication) locParts.push(`pub. ${loc.publication}`);
    if (loc.series) locParts.push(`series ${loc.series}`);
    if (loc.roll) locParts.push(`roll ${loc.roll}`);
    if (loc.volume) locParts.push(`vol. ${loc.volume}`);
    if (loc.page) locParts.push(`p. ${loc.page}`);
    if (loc.sheet) locParts.push(`sheet ${loc.sheet}`);
    if (loc.line) locParts.push(`line ${loc.line}`);
    if (loc.imageNumber) locParts.push(`image ${loc.imageNumber}`);
    if (loc.dwellingNumber) locParts.push(`dwelling ${loc.dwellingNumber}`);
    if (loc.familyNumber) locParts.push(`family ${loc.familyNumber}`);
    if (loc.additional) {
      for (const key of Object.keys(loc.additional).sort()) {
        locParts.push(`${key} ${loc.additional[key]}`);
      }
    }
    if (locParts.length > 0) {
      parts.push(locParts.join(", "));
    }
  }

  // 3. Access & URLs
  if (record.access?.sourceUrl) {
    const safeCheck = validateSafeUrl(record.access.sourceUrl);
    if (safeCheck.safe) {
      const isIndex =
        (record.sourceType || "").toLowerCase().includes("index") ||
        record.capture?.captureMethod === "index";
      parts.push(isIndex ? `[Index link: ${safeCheck.sanitizedUrl}]` : `Source link: ${safeCheck.sanitizedUrl}`);
    }
  }

  let result = parts.join("; ");

  // 4. Missing elements note if requested
  if (options?.includeMissingSummary) {
    const missing: string[] = [];
    if (!loc?.roll) missing.push("roll");
    if (!loc?.page) missing.push("page");
    if (!record.access?.sourceUrl) missing.push("source link");
    if (missing.length > 0) {
      result += `. Note: ${missing.join(", ")} not supplied.`;
    }
  }

  return result;
}

/**
 * Format a provisional claim with explicit uncertainty and uninspected status.
 */
export function formatProvisionalClaim(
  assertion: string,
  locators: ArchivalLocators,
  basis: ClaimBasis,
  caveats?: string[]
): string {
  const locParts: string[] = [];
  if (locators.line) locParts.push(`line ${locators.line}`);
  if (locators.page) locParts.push(`page ${locators.page}`);
  if (locators.roll) locParts.push(`roll ${locators.roll}`);
  if (locators.dwellingNumber) locParts.push(`dwelling ${locators.dwellingNumber}`);
  if (locators.familyNumber) locParts.push(`family ${locators.familyNumber}`);

  const locatorStr = locParts.length > 0 ? ` [Locators: ${locParts.join(", ")}]` : "";
  const basisLabel = basis === "record_reports" ? "Reported" : basis === "inference" ? "Inference" : "Hypothesis";

  const effectiveCaveats = caveats && caveats.length > 0
    ? caveats
    : ["Original image not inspected; transcription unverified"];

  const caveatStr = ` Caveats: ${effectiveCaveats.join("; ")}.`;

  return `${assertion}${locatorStr} (${basisLabel}).${caveatStr}`;
}

/**
 * Evaluate discrepancies between two source records without silently averaging or overwriting values.
 */
export function evaluateCitationDiscrepancy(
  recordA: { claim: string; value: string; source: string },
  recordB: { claim: string; value: string; source: string }
): { hasConflict: boolean; summary: string } {
  const valA = recordA.value.trim().toLowerCase();
  const valB = recordB.value.trim().toLowerCase();

  if (valA !== valB) {
    return {
      hasConflict: true,
      summary: `Discrepancy for "${recordA.claim}": Source "${recordA.source}" reports "${recordA.value}", while Source "${recordB.source}" reports "${recordB.value}". Both values retained; conflicting evidence unresolved.`
    };
  }

  return {
    hasConflict: false,
    summary: `Sources agree on "${recordA.claim}": "${recordA.value}".`
  };
}

/**
 * Generate a collision-resistant deterministic record identifier.
 */
export function generateRecordId(content: string, prefix = "rec"): string {
  if (!content || !content.trim()) return `${prefix}-empty`;
  let hash1 = 0x811c9dc5;
  let hash2 = 0x9e3779b9;
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    hash1 ^= code;
    hash1 = Math.imul(hash1, 0x01000193);
    hash2 ^= (code << 5) + (code >> 2) + i;
    hash2 = Math.imul(hash2, 0x27d4eb2d);
  }
  const part1 = (hash1 >>> 0).toString(16).padStart(8, "0");
  const part2 = (hash2 >>> 0).toString(16).padStart(8, "0");
  return `${prefix}-${part1}${part2}`;
}

/**
 * Runtime schema validation for ArchiveRecord.
 * Rejects invalid structures, validates safe URLs and tri-state integrity,
 * and explicitly flags numeric locator inputs where leading zeros cannot be recovered.
 */
export function validateArchiveRecordSchema(data: unknown): {
  valid: boolean;
  errors: string[];
  record?: ArchiveRecord;
} {
  const errors: string[] = [];
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { valid: false, errors: ["Data must be a non-null object."] };
  }

  const raw = data as Record<string, any>;
  const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : "";
  if (!id) {
    errors.push("ArchiveRecord requires a non-empty string 'id'.");
  }

  const title = (typeof raw.title === "string" && raw.title.trim()) ||
    (typeof raw.sourceIdentity?.title === "string" && raw.sourceIdentity.title.trim()) || "";
  if (!title) {
    errors.push("ArchiveRecord requires a non-empty 'title' or 'sourceIdentity.title'.");
  }

  const sourceType = (typeof raw.sourceType === "string" && raw.sourceType.trim()) ||
    (typeof raw.sourceIdentity?.recordType === "string" && raw.sourceIdentity.recordType.trim()) || "other";

  const normalizedRecord: ArchiveRecord = {
    ...raw,
    id,
    title,
    sourceType,
  };

  // Inspect locators and catch numeric coercions
  if (raw.locators && typeof raw.locators === "object" && !Array.isArray(raw.locators)) {
    const loc: ArchivalLocators = {};
    const stdKeys: Array<keyof Omit<ArchivalLocators, "additional">> = [
      "publication", "series", "roll", "volume", "page", "sheet", "line",
      "imageNumber", "dwellingNumber", "familyNumber"
    ];

    if (!normalizedRecord.provenance) normalizedRecord.provenance = {};
    if (!normalizedRecord.provenance.standard) normalizedRecord.provenance.standard = {};
    if (!normalizedRecord.provenance.flags) normalizedRecord.provenance.flags = {};

    for (const k of stdKeys) {
      const val = raw.locators[k];
      if (val !== undefined && val !== null) {
        if (typeof val === "number") {
          loc[k] = String(val);
          normalizedRecord.provenance.flags.numeric_input_coerced = true;
          normalizedRecord.provenance.standard[k] = {
            value: String(val),
            suppliedBy: "imported",
            verificationStatus: "unverified",
            evidenceReference: "numeric_input_coerced: original leading zeroes cannot be inferred"
          };
        } else if (typeof val === "string") {
          loc[k] = val;
        } else {
          errors.push(`Locator "${k}" must be a string or number.`);
        }
      }
    }

    if (raw.locators.additional && typeof raw.locators.additional === "object") {
      loc.additional = {};
      for (const [addK, addV] of Object.entries(raw.locators.additional)) {
        if (typeof addV === "number") {
          loc.additional[addK] = String(addV);
        } else if (typeof addV === "string") {
          loc.additional[addK] = addV;
        }
      }
    }

    normalizedRecord.locators = loc;
  }

  // URL safety validation
  if (normalizedRecord.access?.sourceUrl) {
    const safeCheck = validateSafeUrl(normalizedRecord.access.sourceUrl);
    if (!safeCheck.safe) {
      errors.push(`Unsafe or malformed source URL "${normalizedRecord.access.sourceUrl}".`);
    }
  }

  // Tri-state integrity validation
  const triState = validateTriStateIntegrity(normalizedRecord);
  if (!triState.valid) {
    errors.push(...triState.errors);
  }

  // Intra-record coherence validation
  if (hasIntraRecordConflict(normalizedRecord)) {
    errors.push(`Record "${id}" has contradictory top-level and nested source fields.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    record: errors.length === 0 ? normalizedRecord : undefined
  };
}

/**
 * Parse an incoming archival attachment from chat ingest.
 * Handles valid JSON ArchiveRecord payloads as well as unstructured raw transcripts.
 */
export function parseArchivalAttachment(
  rawText: string,
  sourceType = "other"
): { record: ArchiveRecord; isStructuredJson: boolean; validationErrors: string[] } {
  const trimmed = (rawText || "").trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      const validation = validateArchiveRecordSchema(parsed);
      if (validation.valid && validation.record) {
        return {
          record: validation.record,
          isStructuredJson: true,
          validationErrors: []
        };
      } else {
        return {
          record: (validation.record || parsed) as ArchiveRecord,
          isStructuredJson: true,
          validationErrors: validation.errors
        };
      }
    } catch {
      // JSON parse error falls through to raw text ingestion
    }
  }

  // Raw text ingest fallback
  const generatedId = generateRecordId(trimmed || "empty-record");
  const record: ArchiveRecord = {
    id: generatedId,
    title: `${sourceType ? sourceType.toUpperCase() : "RAW"} Record Ingest`,
    sourceType: sourceType || "transcript",
    capture: {
      rawText: trimmed,
      transcription: trimmed,
      imageInspected: false,
      transcriptionStatus: "unverified",
      captureMethod: "transcript"
    },
    access: {
      urlStatus: "not_supplied"
    },
    provenance: {
      standard: {}
    }
  };

  return {
    record,
    isStructuredJson: false,
    validationErrors: []
  };
}

/**
 * Extract active archive records from historical messages and the persistent HCM register.
 */
export function extractActiveArchiveRecords(
  messages: any[] = [],
  hcmRecords?: Record<string, ArchiveRecord>
): ArchiveRecord[] {
  const map = new Map<string, ArchiveRecord>();

  if (hcmRecords && typeof hcmRecords === "object") {
    for (const [id, rec] of Object.entries(hcmRecords)) {
      if (rec && rec.id) map.set(rec.id, rec);
    }
  }

  for (const msg of messages) {
    if (!msg) continue;
    if (msg.archiveRecord && msg.archiveRecord.id) {
      map.set(msg.archiveRecord.id, msg.archiveRecord);
    }
    if (msg.attachedRecord?.record && msg.attachedRecord.record.id) {
      map.set(msg.attachedRecord.record.id, msg.attachedRecord.record);
    }
    if (Array.isArray(msg.archiveRecords)) {
      for (const r of msg.archiveRecords) {
        if (r && r.id) map.set(r.id, r);
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Build a disciplined prompt context block preserving the full source transcript.
 * Directs the model to ground assertions in the transcript, cite record ID, and disclose missing info.
 */
export function buildArchivalPromptContext(records: ArchiveRecord[], userQuery?: string): string {
  if (!records || records.length === 0) return "";

  const blocks: string[] = [];

  for (const record of records) {
    const citation = formatArchivalCitation(record, { includeMissingSummary: true });
    const transcript = record.capture?.transcription || record.capture?.rawText || record.transcription || "";

    const locParts: string[] = [];
    if (record.locators) {
      for (const [k, v] of Object.entries(record.locators)) {
        if (k !== "additional" && v) locParts.push(`${k}: "${v}"`);
      }
    }

    blocks.push(
      `--- Archival Source Record: ${record.id} ---\n` +
      `Title: ${record.title}\n` +
      `Citation: ${citation}\n` +
      (locParts.length > 0 ? `Locators: { ${locParts.join(", ")} }\n` : "") +
      `Image Inspected: ${record.capture?.imageInspected ? "true" : "false (unverified scan)"}\n` +
      `Transcription Status: ${record.capture?.transcriptionStatus || "unverified"}\n\n` +
      `[Transcript Content]\n${transcript}\n[End Transcript Content]\n` +
      `--- End Record: ${record.id} ---`
    );
  }

  return (
    `\n\n## Attached Archival Records (Preserved Evidence)\n` +
    `${blocks.join("\n\n")}\n\n` +
    `CRITICAL RESEARCH INSTRUCTIONS:\n` +
    `1. Ground all genealogical assertions strictly in the transcript content above.\n` +
    `2. If the user's question asks about names, dates, or events absent from the transcript, explicitly state: "The attached record does not contain information regarding [X]."\n` +
    `3. For every assertion derived from a record, specify the recordId and exact verbatim supporting excerpt.`
  );
}

/**
 * Deterministically verify model-produced claim structure and verbatim excerpt matching.
 * Rejects unsupported claims where the cited excerpt is absent from the transcript.
 */
export function verifyModelClaim(
  claim: GenealogicalClaim,
  record: ArchiveRecord
): { passed: boolean; reason?: string } {
  if (!claim || !claim.sources || claim.sources.length === 0) {
    return { passed: false, reason: "claim_specifies_no_sources" };
  }

  const srcRef = claim.sources.find((s) => s.recordId === record.id);
  if (!srcRef) {
    return { passed: false, reason: `claim_does_not_reference_record_${record.id}` };
  }

  // Verify cited locators match record values
  if (srcRef.locators && record.locators) {
    for (const [key, citedVal] of Object.entries(srcRef.locators)) {
      if (key === "additional") {
        const citedAdd = (citedVal as Record<string, string>) || {};
        for (const [addKey, addVal] of Object.entries(citedAdd)) {
          const expectedAdd = record.locators.additional?.[addKey];
          if (addVal !== expectedAdd) {
            return {
              passed: false,
              reason: `locator_discrepancy_additional_${addKey}`
            };
          }
        }
      } else {
        const expectedVal = (record.locators as Record<string, unknown>)[key];
        if (citedVal !== undefined && citedVal !== expectedVal) {
          return {
            passed: false,
            reason: `locator_discrepancy_${key}`
          };
        }
      }
    }
  }

  // Check mandatory verbatim supporting excerpt
  const excerpt = (srcRef.supportingExcerpt || claim.supportingExcerpt || "").trim();
  if (!excerpt) {
    return { passed: false, reason: "missing_supporting_excerpt" };
  }

  const transcript = (
    record.capture?.transcription ||
    record.capture?.rawText ||
    record.transcription ||
    ""
  ).toLowerCase().replace(/\s+/g, " ");

  const normalizedExcerpt = excerpt.toLowerCase().replace(/\s+/g, " ");

  if (!transcript.includes(normalizedExcerpt)) {
    return {
      passed: false,
      reason: "supporting_excerpt_not_found_in_record"
    };
  }

  return { passed: true };
}

/**
 * Create an immutable revision of an ArchiveRecord when corrected by a researcher.
 * Preserves prior snapshots and updates provenance to user_supplied.
 */
export function createRecordRevision(
  currentRecord: ArchiveRecord,
  updates: Partial<ArchiveRecord>,
  author: "imported" | "researcher" | "ai_extraction",
  changeSummary: string,
  existingRevisions: ArchiveRecordRevision[] = []
): { newRecord: ArchiveRecord; revision: ArchiveRecordRevision } {
  const currentRevNum = existingRevisions.length > 0
    ? Math.max(...existingRevisions.map((r) => r.revisionNumber))
    : (currentRecord.currentRevision || 0);

  const nextRevNum = currentRevNum + 1;
  const revisionId = `rev-${currentRecord.id}-${nextRevNum}`;
  const now = new Date().toISOString();

  const updatedRecord: ArchiveRecord = {
    ...JSON.parse(JSON.stringify(currentRecord)),
    ...updates,
    currentRevision: nextRevNum
  };

  // If locators were updated, update standard provenance map
  if (updates.locators) {
    updatedRecord.locators = {
      ...(currentRecord.locators || {}),
      ...updates.locators
    };
    if (!updatedRecord.provenance) updatedRecord.provenance = {};
    if (!updatedRecord.provenance.standard) updatedRecord.provenance.standard = {};

    for (const [key, val] of Object.entries(updates.locators)) {
      if (key !== "additional" && val !== undefined) {
        updatedRecord.provenance.standard[key as keyof Omit<ArchivalLocators, "additional">] = {
          value: String(val),
          suppliedBy: author === "researcher" ? "user_supplied" : "imported",
          verificationStatus: author === "researcher" ? "verified" : "unverified",
          evidenceReference: `Revision ${nextRevNum}: ${changeSummary}`
        };
      }
    }
  }

  const newRevision: ArchiveRecordRevision = {
    revisionId,
    recordId: currentRecord.id,
    revisionNumber: nextRevNum,
    createdAt: now,
    author,
    changeSummary,
    previousState: JSON.parse(JSON.stringify(currentRecord)),
    snapshot: JSON.parse(JSON.stringify(updatedRecord))
  };

  return { newRecord: updatedRecord, revision: newRevision };
}
