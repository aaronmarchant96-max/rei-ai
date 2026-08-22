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
  } = context;

  const text = typeof response === "string" ? response : response?.content || "";

  // 1. Check for Unsupported Negative-Evidence Claims
  // Fails if output asserts "no record exists" or treats unsupplied records as absent
  // without a documented, reasonably exhaustive search.
  const absoluteAbsenceRegex = /\b(?:no record exists|complete absence of any \w+ record|there is no record|proven absent)\b/i;
  const documentedSearchRegex = /\b(?:reasonably exhaustive search|searched collection|jurisdiction|coverage|indexing limitations|record loss)\b/i;
  const unsuppliedDisclaimerRegex = /\b(?:unsupplied|unsearched|no record has been supplied|unknown, not absent)\b/i;

  let unsupportedAbsenceClaim = false;
  let negativeEvidenceQualification = "pass";

  if (absoluteAbsenceRegex.test(text) && !documentedSearchRegex.test(text) && searchedCollections.length === 0) {
    unsupportedAbsenceClaim = true;
    negativeEvidenceQualification = "fail";
  } else if (!unsuppliedDisclaimerRegex.test(text) && absoluteAbsenceRegex.test(text)) {
    negativeEvidenceQualification = "partial";
  }

  // 2. Check for 3-Axis Evidence Taxonomy (Source, Information, Evidence)
  const sourceTaxonomyRegex = /\b(?:Source:\s*(?:Original|Derivative|Authored))\b/i;
  const infoTaxonomyRegex = /\b(?:Info|Information):\s*(?:Primary|Secondary|Undetermined)\b/i;
  const evidenceTaxonomyRegex = /\b(?:Evidence:\s*(?:Direct|Indirect|Negative))\b/i;

  const hasSourceAxis = sourceTaxonomyRegex.test(text) || /\b(?:Original Source|Derivative Source)\b/i.test(text);
  const hasInfoAxis = infoTaxonomyRegex.test(text) || /\b(?:Primary Information|Secondary Information|Undetermined Information)\b/i.test(text);
  const hasEvidenceAxis = evidenceTaxonomyRegex.test(text) || /\b(?:Direct Evidence|Indirect Evidence|Negative Evidence)\b/i.test(text);

  let sourceInformationEvidenceTaxonomy = "fail";
  if (hasSourceAxis && hasInfoAxis && hasEvidenceAxis) {
    sourceInformationEvidenceTaxonomy = "pass";
  } else if (hasSourceAxis || hasInfoAxis || hasEvidenceAxis) {
    sourceInformationEvidenceTaxonomy = "partial";
  }

  // 3. Check for Identity Linkage Discipline (Known-to-Unknown Methodology)
  const bridgeMethodRegex = /\b(?:bridg(?:e|ing)|known-to-unknown|confirmed adult record|marriage record|death record|obituary|ssn)\b/i;
  const identityBridgeMethod = bridgeMethodRegex.test(text) ? "pass" : "partial";

  // 4. Check for Presentation Escaping Defects
  const hasPresentationEscapes = /\\(#{1,6}\s|\*\*|__)/.test(text);
  const renderingIntegrity = hasPresentationEscapes ? "fail" : "pass";

  // Overall Adherence Decision
  const overallAdherence =
    domainRoutePassed &&
    securityDispositionPassed &&
    !unsupportedAbsenceClaim &&
    negativeEvidenceQualification === "pass" &&
    sourceInformationEvidenceTaxonomy !== "fail" &&
    renderingIntegrity === "pass";

  // Quality-Gated-V1 Savings Accounting
  const exclusionReasons = [];
  if (!domainRoutePassed) exclusionReasons.push("route_quality_failed");
  if (unsupportedAbsenceClaim || negativeEvidenceQualification === "fail") exclusionReasons.push("epistemic_adherence_failed");
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
    },
    renderingIntegrity,
    telemetryReconciliation: "reconciled",
    overallAdherence,
    savingsPolicyVersion: "quality-gated-v1",
    savingsEligibility: overallAdherence ? "eligible" : "excluded",
    exclusionReasons: overallAdherence ? [] : exclusionReasons,
  };
}

describe("The Archivist — Epistemic Adherence & Quality-Gated-V1 Evaluator", () => {
  it("PASSES when response strictly obeys 3-axis taxonomy, qualified negative evidence, and identity bridging", () => {
    const validResponse = `
### 🟢 Evidence Analysis — Eleanor Vance Inquiry

**Record 1: 1892 Birth Certificate**
[Source: Original, Info: Primary, Evidence: Direct]
Shows an Eleanor Whitmore born 1892, mother Margaret Whitmore.

**Record 2: 1900 Census**
[Source: Original, Info: Secondary, Evidence: Indirect]
Lists an Eleanor Whitmore as adopted daughter.

**Epistemic Qualification:**
No Vance record has been supplied or described yet. An unsupplied record is unknown, not absent.

**Research Strategy (Known-to-Unknown):**
Anchor identity in a confirmed adult record for the known great-grandmother (marriage certificate or obituary) to establish bridging evidence before merging childhood records.
`;

    const evalResult = evaluateArchivistAdherence(validResponse, {
      searchedCollections: [],
      domainRoutePassed: true,
      securityDispositionPassed: true,
    });

    expect(evalResult.overallAdherence).toBe(true);
    expect(evalResult.savingsEligibility).toBe("eligible");
    expect(evalResult.epistemicAdherence.unsupportedAbsenceClaim).toBe(false);
    expect(evalResult.epistemicAdherence.sourceInformationEvidenceTaxonomy).toBe("pass");
  });

  it("FAILS when response asserts unsupported negative evidence ('complete absence of any Vance record')", () => {
    const flawedResponse = `
There is a complete absence of any Vance record in Vermont.
This absence is negative evidence that the Vance family never existed.
`;

    const evalResult = evaluateArchivistAdherence(flawedResponse, {
      searchedCollections: [],
      domainRoutePassed: true,
      securityDispositionPassed: true,
    });

    expect(evalResult.overallAdherence).toBe(false);
    expect(evalResult.savingsEligibility).toBe("excluded");
    expect(evalResult.exclusionReasons).toContain("epistemic_adherence_failed");
  });

  it("FAILS savings eligibility when rendering integrity has presentation escapes", () => {
    const escapedResponse = `
\\# Header Escaped
This is \\*\\*escaped\\*\\* text.
[Source: Original, Info: Primary, Evidence: Direct]
No record has been supplied. Anchor identity using confirmed adult record bridging.
`;

    const evalResult = evaluateArchivistAdherence(escapedResponse, {
      searchedCollections: [],
      domainRoutePassed: true,
      securityDispositionPassed: true,
    });

    expect(evalResult.renderingIntegrity).toBe("fail");
    expect(evalResult.savingsEligibility).toBe("excluded");
    expect(evalResult.exclusionReasons).toContain("rendering_integrity_failed");
  });
});
