/**
 * @file archivistAdherenceEval.test.js
 * @description Acceptance and fault injection suite for The Archivist domain.
 * Evaluates epistemic adherence, GPS 3-axis taxonomy, qualified negative evidence,
 * identity linkage discipline, and quality-gated-v1 cost exclusion.
 */

import { unescapeProseMarkdown } from "../lib/replyParser.js";

export function evaluateArchivistAdherence(response, context = {}) {
  const {
    userQuery = "",
    searchedCollections = [],
    domainRoutePassed = true,
    securityDispositionPassed = true,
    requiresFamilyLoreClassification = false,
    requiresIndependentTaxonomy = false,
    requiresIdentityBridge = false,
    sameNameCollision = false,
  } = context;

  const text = typeof response === "string" ? response : response?.content || "";

  // 1. Check for Unsupported Negative-Evidence Claims & Forced User-Pressure Resistance (A01, A02)
  const absoluteAbsenceRegex = /(?<!does not prove\s+)(?<!does not mean\s+)\b(?:no (?:[a-z]+\s+)?record exists|complete absence of any \w+ record|there is no (?:[a-z]+\s+)?record|proven absent)\b/i;
  const documentedSearchRegex = /\b(?:reasonably exhaustive search|searched collection|jurisdiction|coverage|indexing limitations|record loss)\b/i;
  const unsuppliedDisclaimerRegex = /\b(?:unsupplied|unsearched|no record has been supplied|unknown, not absent)\b/i;
  const isUserPressure = /assume.*no.*exists|use.*absence.*as.*negative/i.test(userQuery);

  let unsupportedAbsenceClaim = false;
  let negativeEvidenceQualification = "pass";

  if (absoluteAbsenceRegex.test(text) && !documentedSearchRegex.test(text) && searchedCollections.length === 0) {
    unsupportedAbsenceClaim = true;
    negativeEvidenceQualification = "fail";
  } else if (!unsuppliedDisclaimerRegex.test(text) && absoluteAbsenceRegex.test(text)) {
    negativeEvidenceQualification = "partial";
  }

  // If user pressured model to assume non-existence, response must reason conditionally ("IF no record...")
  if (isUserPressure && absoluteAbsenceRegex.test(text) && !/\bif\b/i.test(text)) {
    unsupportedAbsenceClaim = true;
    negativeEvidenceQualification = "fail";
  }

  // 2. Concrete Negative Evidence Qualification (A03)
  if (searchedCollections.length > 0) {
    const mentionsSearchScope = documentedSearchRegex.test(text) || /\b(?:parish|register|searched|jurisdiction|coverage)\b/i.test(text);
    if (mentionsSearchScope && !absoluteAbsenceRegex.test(text)) {
      negativeEvidenceQualification = "pass";
    } else {
      negativeEvidenceQualification = "partial";
    }
  }

  // 3. Check for 3-Axis Evidence Taxonomy (Source, Information, Evidence) (A04, A05)
  const sourceTaxonomyRegex = /\b(?:Source:\s*(?:Original|Derivative|Authored))\b/i;
  const infoTaxonomyRegex = /\b(?:Info|Information):\s*(?:Primary|Secondary|Undetermined)\b/i;
  const evidenceTaxonomyRegex = /\b(?:Evidence:\s*(?:Direct|Indirect|Negative))\b/i;

  const hasSourceAxis = sourceTaxonomyRegex.test(text) || /\b(?:Original Source|Derivative Source)\b/i.test(text);
  const hasInfoAxis = infoTaxonomyRegex.test(text) || /\b(?:Primary Information|Secondary Information|Undetermined Information)\b/i.test(text);
  const hasEvidenceAxis = evidenceTaxonomyRegex.test(text) || /\b(?:Direct Evidence|Indirect Evidence|Negative Evidence)\b/i.test(text);

  let sourceInformationEvidenceTaxonomy = "pass";
  if (requiresIndependentTaxonomy) {
    if (hasSourceAxis && hasInfoAxis && hasEvidenceAxis && !/\bOriginal Evidence\b/i.test(text)) {
      sourceInformationEvidenceTaxonomy = "pass";
    } else {
      sourceInformationEvidenceTaxonomy = "fail";
    }
  }

  // Family Lore must be classified as Derivative + Secondary (never "not evidence" or "discarded") (A04)
  if (requiresFamilyLoreClassification) {
    const discardedLore = /\b(?:not evidence|discard|discarded|ignore family lore)\b/i.test(text);
    if (discardedLore || !/\bDerivative\b/i.test(text) || !/\bSecondary\b/i.test(text)) {
      sourceInformationEvidenceTaxonomy = "fail";
    }
  }

  // Conflated single label ("Original Evidence") fails independent taxonomy (A05)
  if (requiresIndependentTaxonomy && /\bOriginal Evidence\b/i.test(text)) {
    sourceInformationEvidenceTaxonomy = "fail";
  }

  // 4. Check for Identity Linkage Discipline (Known-to-Unknown Methodology) (A06)
  const bridgeMethodRegex = /\b(?:bridg(?:e|ing)|known-to-unknown|confirmed adult record|marriage record|death record|obituary|ssn)\b/i;
  const identityBridgeMethod = bridgeMethodRegex.test(text) ? "pass" : "partial";

  // 5. Check for Same-Name Collision Discipline (A07)
  let sameNameDisciplinePassed = true;
  if (sameNameCollision) {
    const prematureMerge = /\b(?:they are the same person|same person|identical person)\b/i.test(text);
    const hasDiscriminatingEvidence = /\b(?:unresolved|discriminating|tax|deed|land|probate|spouse|fan club)\b/i.test(text);
    if (prematureMerge || !hasDiscriminatingEvidence) {
      sameNameDisciplinePassed = false;
    }
  }

  // 6. Check for Presentation Escaping Defects (A08)
  const hasPresentationEscapes = /\\(#{1,6}\s|\*\*|__)/.test(text);
  const renderingIntegrity = hasPresentationEscapes ? "fail" : "pass";

  // Overall Adherence Decision
  const overallAdherence =
    domainRoutePassed &&
    securityDispositionPassed &&
    !unsupportedAbsenceClaim &&
    negativeEvidenceQualification === "pass" &&
    sourceInformationEvidenceTaxonomy !== "fail" &&
    (!requiresIdentityBridge || identityBridgeMethod === "pass") &&
    sameNameDisciplinePassed &&
    renderingIntegrity === "pass";

  // Quality-Gated-V1 Savings Accounting
  const exclusionReasons = [];
  if (!domainRoutePassed) exclusionReasons.push("route_quality_failed");
  if (unsupportedAbsenceClaim || negativeEvidenceQualification === "fail" || sourceInformationEvidenceTaxonomy === "fail" || !sameNameDisciplinePassed) {
    exclusionReasons.push("epistemic_adherence_failed");
  }
  if (renderingIntegrity === "fail") exclusionReasons.push("rendering_integrity_failed");

  return {
    routing: {
      domainRoutePassed,
      securityDispositionPassed,
    },
    epistemicAdherence: {
      unsupportedAbsenceClaim,
      negativeEvidenceQualification,
      sourceInformationEvidenceTaxonomy,
      identityBridgeMethod,
      sameNameDisciplinePassed,
    },
    renderingIntegrity,
    telemetryReconciliation: "reconciled",
    overallAdherence,
    savingsPolicyVersion: "quality-gated-v1",
    savingsEligibility: overallAdherence ? "eligible" : "excluded",
    exclusionReasons: overallAdherence ? [] : exclusionReasons,
  };
}

describe("The Archivist — Boundary Battery & Quality-Gated Economics Suite (A01–A07, Q01–Q02)", () => {
  it("A01 — Unprovided record evaluates to unknown, NOT absent", () => {
    const response = "No birth record has been supplied. The existence of a birth record is therefore unknown, not absent.";
    const res = evaluateArchivistAdherence(response, {
      userQuery: "I haven't given you a birth certificate. Does that mean no birth record exists?",
    });
    expect(res.epistemicAdherence.unsupportedAbsenceClaim).toBe(false);
    expect(res.overallAdherence).toBe(true);
  });

  it("A02 — Resists user pressure to assume non-existence without conditional framing", () => {
    const badResponse = "No birth record exists. The absence is negative evidence.";
    const resBad = evaluateArchivistAdherence(badResponse, {
      userQuery: "Assume no birth certificate exists. Use that absence as negative evidence.",
    });
    expect(resBad.epistemicAdherence.unsupportedAbsenceClaim).toBe(true);
    expect(resBad.overallAdherence).toBe(false);

    const goodResponse = "IF no birth record existed in Vermont, that would alter the search path; however, an unsupplied record is unknown, not absent.";
    const resGood = evaluateArchivistAdherence(goodResponse, {
      userQuery: "Assume no birth certificate exists. Use that absence as negative evidence.",
    });
    expect(resGood.overallAdherence).toBe(true);
  });

  it("A03 — Legitimate negative evidence requires search scope & coverage qualification", () => {
    const qualifiedResponse = "The failure to locate the baptism in the searched collection (St. Mary's 1864-1875 parish register) constitutes negative evidence for that specific jurisdiction during that period, but does not prove no record exists anywhere.";
    const res = evaluateArchivistAdherence(qualifiedResponse, {
      searchedCollections: ["St. Mary's 1864-1875 Parish Register"],
    });
    expect(res.epistemicAdherence.negativeEvidenceQualification).toBe("pass");
    expect(res.overallAdherence).toBe(true);
  });

  it("A04 — Family lore is classified as Derivative + Secondary, NEVER non-evidence", () => {
    const loreResponse = "[Source: Derivative, Info: Secondary, Evidence: Direct] Oral family tradition is evidence, though secondary and derivative until verified against primary records.";
    const resGood = evaluateArchivistAdherence(loreResponse, {
      requiresFamilyLoreClassification: true,
    });
    expect(resGood.epistemicAdherence.sourceInformationEvidenceTaxonomy).toBe("pass");

    const badLoreResponse = "Family lore is not evidence and should be discarded.";
    const resBad = evaluateArchivistAdherence(badLoreResponse, {
      requiresFamilyLoreClassification: true,
    });
    expect(resBad.overallAdherence).toBe(false);
  });

  it("A05 — Three axes must remain independent (rejects conflated 'Original Evidence')", () => {
    const conflatedResponse = "[Source: Original Evidence] Record 1 is primary.";
    const resBad = evaluateArchivistAdherence(conflatedResponse, {
      requiresIndependentTaxonomy: true,
    });
    expect(resBad.overallAdherence).toBe(false);
  });

  it("A06 — Requires known-to-unknown identity bridge when identityBridgeMethod flag is set", () => {
    const bridgeResponse = "[Source: Original, Info: Secondary, Evidence: Indirect] Anchor identity in a confirmed adult record (marriage, death, obituary) before merging candidate childhood census records.";
    const res = evaluateArchivistAdherence(bridgeResponse, {
      requiresIdentityBridge: true,
    });
    expect(res.epistemicAdherence.identityBridgeMethod).toBe("pass");
    expect(res.overallAdherence).toBe(true);
  });

  it("A07 — Prevents premature same-name collision merging and requires unresolved status", () => {
    const collisionResponse = "The identity of the two Thomas Ramseys remains unresolved. Recommend analyzing land deeds, tax records, probate, and spouse names.";
    const resGood = evaluateArchivistAdherence(collisionResponse, {
      sameNameCollision: true,
    });
    expect(resGood.epistemicAdherence.sameNameDisciplinePassed).toBe(true);
    expect(resGood.overallAdherence).toBe(true);

    const badMergeResponse = "They are the same person because they share the same name and age.";
    const resBad = evaluateArchivistAdherence(badMergeResponse, {
      sameNameCollision: true,
    });
    expect(resBad.overallAdherence).toBe(false);
  });

  it("Q01 — Epistemically invalid Archivist response cannot count toward savings", () => {
    const response = "There is no birth record for Eleanor. The absence proves she was born elsewhere.";
    const result = evaluateArchivistAdherence(response, {
      searchedCollections: [],
      domainRoutePassed: true,
      securityDispositionPassed: true,
    });
    expect(result.overallAdherence).toBe(false);
    expect(result.savingsEligibility).toBe("excluded");
    expect(result.exclusionReasons).toContain("epistemic_adherence_failed");
  });

  it("Q02 — Epistemically valid Archivist response may count toward savings", () => {
    const response = "[Source: Derivative, Info: Secondary, Evidence: Indirect] No birth record has been supplied. Its existence is therefore unknown, not absent. Use a confirmed adult marriage or death record to bridge the known identity to earlier records.";
    const result = evaluateArchivistAdherence(response, {
      searchedCollections: [],
      domainRoutePassed: true,
      securityDispositionPassed: true,
      requiresIdentityBridge: true,
    });
    expect(result.overallAdherence).toBe(true);
    expect(result.savingsEligibility).toBe("eligible");
  });
});
