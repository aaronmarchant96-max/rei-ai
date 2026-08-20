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
