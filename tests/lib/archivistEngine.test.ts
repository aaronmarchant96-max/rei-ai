import {
  classifyArchiveEvidence,
  evaluateDisambiguationHinge,
  createNegativeSearchRecord,
  DisambiguationPerson,
  ArchiveRecord,
  GenealogicalClaim,
  validateClaimReferences,
  validateRecordProvenance,
  validateTriStateIntegrity,
  areLocatorsEqual,
  areRecordsConflicting,
  hasIntraRecordConflict,
  formatArchivalCitation,
  formatProvisionalClaim,
  evaluateCitationDiscrepancy,
  validateSafeUrl
} from "../../src/lib/archivistEngine";

describe("The Archivist & Family Archive Evidence Engine", () => {
  describe("classifyArchiveEvidence (Genealogical Proof Standard)", () => {
    it("classifies an original scan of a parish register as primary_direct", () => {
      const tier = classifyArchiveEvidence({
        title: "Baptism of William Marchant",
        sourceType: "parish register",
        isOriginalScan: true
      });
      expect(tier).toBe("primary_direct");
    });

    it("classifies an indexed secondary transcription as secondary_derivative", () => {
      const tier = classifyArchiveEvidence({
        title: "FindAGrave Memorial for Josiah Marchant",
        sourceType: "find a grave index",
        isOriginalScan: false
      });
      expect(tier).toBe("secondary_derivative");
    });

    it("classifies oral family lore as family_memory", () => {
      const tier = classifyArchiveEvidence({
        title: "Grandmother's recollections recorded in 1974",
        sourceType: "oral tradition",
        isOriginalScan: false
      });
      expect(tier).toBe("family_memory");
    });

    it("classifies explicit negative search results as negative_search", () => {
      const tier = classifyArchiveEvidence({
        title: "Negative Search for Charles Marchant 1851 Census",
        sourceType: "census search",
        transcription: "0 records found in Sussex database"
      });
      expect(tier).toBe("negative_search");
    });
  });

  describe("evaluateDisambiguationHinge (Same-Name Disambiguation)", () => {
    const personA: DisambiguationPerson = {
      name: "William Marchant",
      birthYear: 1822,
      fatherName: "John Marchant",
      fatherOccupation: "Blacksmith",
      parishLocation: "Sussex"
    };

    const personB: DisambiguationPerson = {
      name: "William Marchant",
      birthYear: 1823,
      fatherName: "John Marchant",
      fatherOccupation: "Agricultural Labourer",
      parishLocation: "Sussex"
    };

    it("identifies a conflict on father occupation when candidate record matches person B", () => {
      const candidateRecord = {
        candidateData: {
          birthYear: 1822,
          fatherOccupation: "Agricultural Labourer"
        }
      };

      const result = evaluateDisambiguationHinge(personA, personB, candidateRecord);
      expect(result.matchStatus).toBe("conflict_identified");
      expect(result.hingeDescription).toContain("Father occupation mismatch");
      expect(result.recommendedMove).toContain("Do NOT merge profiles");
    });

    it("confirms match when father occupation and parish match person A", () => {
      const candidateRecord = {
        candidateData: {
          birthYear: 1822,
          fatherOccupation: "Blacksmith",
          parishLocation: "Sussex"
        }
      };

      const result = evaluateDisambiguationHinge(personA, personB, candidateRecord);
      expect(result.matchStatus).toBe("confirmed_match");
      expect(result.hingeDescription).toContain("Confirmed matching parentage");
    });

    it("returns insufficient_evidence when only name matches without distinguishing hinge", () => {
      const candidateRecord = {
        candidateData: {
          name: "William Marchant"
        }
      };

      const result = evaluateDisambiguationHinge(personA, personB, candidateRecord);
      expect(result.matchStatus).toBe("insufficient_evidence");
      expect(result.recommendedMove).toContain("FAN-principle");
    });
  });

  describe("createNegativeSearchRecord", () => {
    it("creates a deterministic negative search receipt with 0 results", () => {
      const record = createNegativeSearchRecord(
        "Josiah Marchant",
        "The National Archives UK",
        "WO 97 Chelsea Pensioners Discharge Documents",
        { regNo: "1846", birthCounty: "Sussex" },
        "No military pension record found under spelling variations Marchant or Merchant"
      );

      expect(record.searchId).toMatch(/^neg-[0-9a-f]+$/);
      expect(record.resultCount).toBe(0);
      expect(record.ancestorQuery).toBe("Josiah Marchant");
      expect(record.conclusion).toContain("No military pension record found");
    });
  });

  describe("Phase A Citation and Provenance Contract (ARC-001 - ARC-007, ARC-011, ARC-012)", () => {
    it("ARC-001: formats complete archival citations from structured locators without data loss", () => {
      const record: ArchiveRecord = {
        id: "rec-1850-census-001",
        title: "1850 U.S. Federal Census",
        sourceType: "census original",
        date: "1850-06-01",
        repository: "National Archives and Records Administration",
        sourceIdentity: {
          recordId: "rec-1850-census-001",
          title: "1850 U.S. Federal Census",
          repository: "NARA",
          collection: "Seventh Census of the United States",
          jurisdiction: "Morgan County, Illinois"
        },
        locators: {
          roll: "123",
          page: "45B",
          line: "35",
          dwellingNumber: "101",
          familyNumber: "105"
        },
        access: {
          sourceUrl: "https://familysearch.org/ark:/61903/1:1:M85V-XYZ",
          urlStatus: "verified_working"
        }
      };

      const citation = formatArchivalCitation(record);
      expect(citation).toContain("1850 U.S. Federal Census");
      expect(citation).toContain("Repository: National Archives and Records Administration");
      expect(citation).toContain("Collection: Seventh Census of the United States");
      expect(citation).toContain("Jurisdiction: Morgan County, Illinois");
      expect(citation).toContain("roll 123");
      expect(citation).toContain("p. 45B");
      expect(citation).toContain("line 35");
      expect(citation).toContain("dwelling 101");
      expect(citation).toContain("family 105");
      expect(citation).toContain("Source link: https://familysearch.org/ark:/61903/1:1:M85V-XYZ");
    });

    it("ARC-002: formats provisional unverified claims with explicit caveats and supplies default uninspected disclaimer", () => {
      const claimWithCaveat = formatProvisionalClaim(
        "Josiah Ramsey listed as household head",
        { line: "35", page: "142", dwellingNumber: "45" },
        "record_reports",
        ["Original image not inspected; line 35 transcription unverified"]
      );

      expect(claimWithCaveat).toContain("Josiah Ramsey listed as household head");
      expect(claimWithCaveat).toContain("[Locators: line 35, page 142, dwelling 45]");
      expect(claimWithCaveat).toContain("(Reported)");
      expect(claimWithCaveat).toContain("Caveats: Original image not inspected; line 35 transcription unverified");
      expect(claimWithCaveat).not.toContain("NARA");
      expect(claimWithCaveat).not.toContain("roll");

      // Default uninspected caveat when caveats argument is omitted
      const claimWithoutCaveat = formatProvisionalClaim(
        "William Marchant listed in 1850 census",
        { line: "12" },
        "record_reports"
      );
      expect(claimWithoutCaveat).toContain("Caveats: Original image not inspected; transcription unverified.");
    });

    it("ARC-003: enforces tri-state validation between URL access, image inspection, and transcription verification", () => {
      // 1. Valid record: working URL with uninspected image
      const indexRecord: ArchiveRecord = {
        id: "rec-idx-001",
        title: "Illinois Marriage Index 1800-1920",
        sourceType: "index",
        access: {
          sourceUrl: "https://ilsos.gov/departments/archives/databases/marriage.html",
          urlStatus: "verified_working"
        },
        capture: {
          captureMethod: "index",
          imageInspected: false,
          transcriptionStatus: "unverified"
        }
      };
      expect(validateTriStateIntegrity(indexRecord).valid).toBe(true);

      // 2. Invalid: Index-only captureMethod claiming image inspection
      const invalidIndexRecord: ArchiveRecord = {
        id: "rec-idx-invalid",
        title: "Invalid Index Claiming Scan",
        sourceType: "index",
        capture: {
          captureMethod: "index",
          imageInspected: true,
          transcriptionStatus: "unverified"
        }
      };
      const indexValidation = validateTriStateIntegrity(invalidIndexRecord);
      expect(indexValidation.valid).toBe(false);
      expect(indexValidation.errors[0]).toContain("index-only captureMethod cannot claim imageInspected = true");

      // 3. Invalid: human_verified transcription with missing text
      const missingTextRecord: ArchiveRecord = {
        id: "rec-missing-text",
        title: "Scan with empty transcription",
        sourceType: "parish register",
        capture: {
          captureMethod: "inspected_image",
          imageInspected: true,
          transcriptionStatus: "human_verified",
          transcription: ""
        }
      };
      const textValidation = validateTriStateIntegrity(missingTextRecord);
      expect(textValidation.valid).toBe(false);
      expect(textValidation.errors[0]).toContain("human_verified transcriptionStatus requires non-empty transcription text");

      // 4. Valid image scan with verified transcription
      const validScanRecord: ArchiveRecord = {
        id: "rec-scan-001",
        title: "Sussex Parish Register Scan",
        sourceType: "parish register",
        isOriginalScan: true,
        access: {
          urlStatus: "not_supplied"
        },
        capture: {
          captureMethod: "inspected_image",
          imageInspected: true,
          transcriptionStatus: "human_verified",
          transcription: "William Marchant baptised 1822"
        }
      };
      expect(validateTriStateIntegrity(validScanRecord).valid).toBe(true);
    });

    it("ARC-004: preserves exact string locators without numeric coercion or leading-zero stripping", () => {
      const record: Partial<ArchiveRecord> = {
        title: "1860 Census Schedule",
        locators: {
          page: "12B",
          line: "035",
          dwellingNumber: "0047",
          additional: {
            subdivision: "Beat 02"
          }
        }
      };

      const formatted = formatArchivalCitation(record);
      expect(formatted).toContain("p. 12B");
      expect(formatted).toContain("line 035");
      expect(formatted).toContain("dwelling 0047");
      expect(formatted).toContain("subdivision Beat 02");
      expect(formatted).not.toContain("p. 12;");
      expect(formatted).not.toContain("line 35;");
    });

    it("ARC-005: retains inference basis labeling and disclaimers (semantic reasoning excluded from engine guarantee)", () => {
      const claim: GenealogicalClaim = {
        claimId: "clm-inf-001",
        assertion: "William Marchant was born circa 1822 based on age 28 in 1850 census",
        basis: "inference",
        sources: [{ recordId: "rec-1850-census-001" }],
        inferenceNotes: "Age 28 reported in June 1850 census yields calculated birth window 1821-1822."
      };

      const formatted = formatProvisionalClaim(
        claim.assertion,
        {},
        claim.basis,
        claim.inferenceNotes ? [claim.inferenceNotes] : undefined
      );

      expect(formatted).toContain("(Inference)");
      expect(formatted).toContain("Caveats: Age 28 reported in June 1850 census yields calculated birth window 1821-1822");
    });

    it("ARC-006: preserves conflicting source values without silent averaging or overwrite", () => {
      const recordA = {
        claim: "Birth Year of Josiah Marchant",
        value: "1822",
        source: "1850 Census"
      };
      const recordB = {
        claim: "Birth Year of Josiah Marchant",
        value: "1826",
        source: "1860 Census"
      };

      const result = evaluateCitationDiscrepancy(recordA, recordB);
      expect(result.hasConflict).toBe(true);
      expect(result.summary).toContain('reports "1822"');
      expect(result.summary).toContain('reports "1826"');
      expect(result.summary).toContain("Both values retained; conflicting evidence unresolved");
      expect(result.summary).not.toContain("1824");
    });

    it("ARC-007: strictly validates per-record locators, rejects mutated lines, empty sources, and conflicting duplicates", () => {
      const censusRecord: ArchiveRecord = {
        id: "rec-census-1850",
        title: "1850 US Census",
        sourceType: "census",
        locators: {
          line: "35",
          page: "142",
          dwellingNumber: "100"
        }
      };

      // 1. Rejects claim mutating line 35 to 36
      const mutatedClaim: GenealogicalClaim = {
        claimId: "clm-mutated-line",
        assertion: "Josiah Ramsey in 1850 Census",
        basis: "record_reports",
        sources: [
          {
            recordId: "rec-census-1850",
            locators: { line: "36" }
          }
        ]
      };
      const mutValidation = validateClaimReferences([mutatedClaim], [censusRecord]);
      expect(mutValidation.valid).toBe(false);
      expect(mutValidation.errors[0]).toContain('cited line "36" does not match record value "35"');

      // 2. Accepts matching locator reference
      const validClaim: GenealogicalClaim = {
        claimId: "clm-valid-line",
        assertion: "Josiah Ramsey in 1850 Census",
        basis: "record_reports",
        sources: [
          {
            recordId: "rec-census-1850",
            locators: { line: "35" }
          }
        ]
      };
      expect(validateClaimReferences([validClaim], [censusRecord]).valid).toBe(true);

      // 3. Rejects record_reports claim with empty sources
      const emptySourceClaim: GenealogicalClaim = {
        claimId: "clm-empty-src",
        assertion: "Unsubstantiated report",
        basis: "record_reports",
        sources: []
      };
      const emptyValidation = validateClaimReferences([emptySourceClaim], [censusRecord]);
      expect(emptyValidation.valid).toBe(false);
      expect(emptyValidation.errors[0]).toContain('has basis "record_reports" but specifies no record sources');

      // 4. Rejects claim citing an unknown record ID
      const unknownRefClaim: GenealogicalClaim = {
        claimId: "clm-unknown-ref",
        assertion: "Points to ghost record",
        basis: "inference",
        sources: [{ recordId: "rec-ghost-999" }]
      };
      const unknownValidation = validateClaimReferences([unknownRefClaim], [censusRecord]);
      expect(unknownValidation.valid).toBe(false);
      expect(unknownValidation.errors[0]).toContain('references unknown recordId "rec-ghost-999"');

      // 5. Rejects duplicate record IDs with conflicting source data
      const conflictingDuplicate: ArchiveRecord = {
        id: "rec-census-1850",
        title: "Conflicting 1850 Census Title",
        sourceType: "census",
        locators: { line: "99" }
      };
      const dupValidation = validateClaimReferences([validClaim], [censusRecord, conflictingDuplicate]);
      expect(dupValidation.valid).toBe(false);
      expect(
        dupValidation.errors.some(e => e.includes('Duplicate record ID "rec-census-1850" with conflicting source data'))
      ).toBe(true);

      // 5b. Rejects duplicate record IDs with differing repository
      const conflictRepoDuplicate: ArchiveRecord = {
        ...censusRecord,
        repository: "National Archives London"
      };
      const repoDupValidation = validateClaimReferences([validClaim], [censusRecord, conflictRepoDuplicate]);
      expect(repoDupValidation.valid).toBe(false);

      // 5c. Rejects duplicate record IDs with differing transcription
      const conflictTranscriptionDuplicate: ArchiveRecord = {
        ...censusRecord,
        transcription: "Conflicting transcription text"
      };
      const transDupValidation = validateClaimReferences([validClaim], [censusRecord, conflictTranscriptionDuplicate]);
      expect(transDupValidation.valid).toBe(false);

      // 5d. Accepts identical locators in a different property order without false conflict
      const reorderedDuplicate: ArchiveRecord = {
        id: "rec-census-1850",
        title: "1850 US Census",
        sourceType: "census",
        locators: {
          dwellingNumber: "100",
          page: "142",
          line: "35"
        }
      };
      const reorderValidation = validateClaimReferences([validClaim], [censusRecord, reorderedDuplicate]);
      expect(reorderValidation.valid).toBe(true);

      // 5e. Rejects duplicate record IDs with differing sourceIdentity.collection
      const conflictColDup1: ArchiveRecord = {
        ...censusRecord,
        sourceIdentity: {
          recordId: "rec-census-1850",
          title: "1850 US Census",
          collection: "Seventh Census of the United States"
        }
      };
      const conflictColDup2: ArchiveRecord = {
        ...censusRecord,
        sourceIdentity: {
          recordId: "rec-census-1850",
          title: "1850 US Census",
          collection: "1850 Federal Population Schedules"
        }
      };
      const colDupValidation = validateClaimReferences([validClaim], [conflictColDup1, conflictColDup2]);
      expect(colDupValidation.valid).toBe(false);
      expect(colDupValidation.errors.some(e => e.includes('Duplicate record ID "rec-census-1850" with conflicting source data'))).toBe(true);

      // 5f. Rejects duplicate record IDs with differing sourceIdentity.jurisdiction
      const conflictJurDup1: ArchiveRecord = {
        ...censusRecord,
        sourceIdentity: {
          recordId: "rec-census-1850",
          title: "1850 US Census",
          jurisdiction: "Boone County, Indiana"
        }
      };
      const conflictJurDup2: ArchiveRecord = {
        ...censusRecord,
        sourceIdentity: {
          recordId: "rec-census-1850",
          title: "1850 US Census",
          jurisdiction: "Marion County, Indiana"
        }
      };
      const jurDupValidation = validateClaimReferences([validClaim], [conflictJurDup1, conflictJurDup2]);
      expect(jurDupValidation.valid).toBe(false);
      expect(jurDupValidation.errors.some(e => e.includes('Duplicate record ID "rec-census-1850" with conflicting source data'))).toBe(true);

      // 5g. Rejects duplicate record IDs with differing capture.transcription
      const conflictCapTransDup1: ArchiveRecord = {
        ...censusRecord,
        capture: {
          imageInspected: true,
          transcriptionStatus: "human_verified",
          transcription: "Josiah Ramsey, age 45, farmer"
        }
      };
      const conflictCapTransDup2: ArchiveRecord = {
        ...censusRecord,
        capture: {
          imageInspected: true,
          transcriptionStatus: "human_verified",
          transcription: "Josiah Ramsey, age 46, blacksmith"
        }
      };
      const capTransValidation = validateClaimReferences([validClaim], [conflictCapTransDup1, conflictCapTransDup2]);
      expect(capTransValidation.valid).toBe(false);
      expect(capTransValidation.errors.some(e => e.includes('Duplicate record ID "rec-census-1850" with conflicting source data'))).toBe(true);

      // 5h. Rejects duplicate records where top-level and nested fields contradict each other
      const conflictTopVsNestedDuplicate: ArchiveRecord = {
        ...censusRecord,
        repository: "National Archives",
        sourceIdentity: {
          recordId: "rec-census-1850",
          title: "1850 US Census",
          repository: "FamilySearch Library"
        }
      };
      const topVsNestedValidation = validateClaimReferences([validClaim], [censusRecord, conflictTopVsNestedDuplicate]);
      expect(topVsNestedValidation.valid).toBe(false);
      expect(topVsNestedValidation.errors.some(e => e.includes('Duplicate record ID "rec-census-1850" with conflicting source data'))).toBe(true);

      // 5i. Direct areRecordsConflicting checks for top-level vs nested consistency
      expect(
        areRecordsConflicting(
          { id: "1", title: "A", sourceType: "census", repository: "Repo A" },
          { id: "1", title: "A", sourceType: "census", sourceIdentity: { recordId: "1", title: "A", repository: "Repo B" } }
        )
      ).toBe(true);
      expect(
        areRecordsConflicting(
          { id: "1", title: "A", sourceType: "census", repository: "Repo A" },
          { id: "1", title: "A", sourceType: "census", sourceIdentity: { recordId: "1", title: "A", repository: "Repo A" } }
        )
      ).toBe(false);

      // 5j. Rejects a single (non-duplicated) record whose top-level and nested fields contradict
      const singleContradictoryRecord: ArchiveRecord = {
        id: "rec-single-contradiction",
        title: "1850 US Census",
        sourceType: "census",
        repository: "Archive A",
        sourceIdentity: {
          recordId: "rec-single-contradiction",
          title: "1850 US Census",
          repository: "Archive B"
        }
      };
      expect(hasIntraRecordConflict(singleContradictoryRecord)).toBe(true);
      const singleClaim: GenealogicalClaim = {
        claimId: "clm-single-contradiction",
        assertion: "Cites a single internally contradictory record",
        basis: "record_reports",
        sources: [{ recordId: "rec-single-contradiction" }]
      };
      const singleValidation = validateClaimReferences([singleClaim], [singleContradictoryRecord]);
      expect(singleValidation.valid).toBe(false);
      expect(singleValidation.errors).toContain(
        'Record "rec-single-contradiction" has contradictory top-level and nested source fields.'
      );


      // 6. Provenance conflict check
      const conflictedProvRecord: ArchiveRecord = {
        id: "rec-prov-001",
        title: "Record with conflicting provenance",
        sourceType: "census",
        locators: {
          line: "35",
          additional: { folio: "4A" }
        },
        provenance: {
          standard: {
            line: {
              value: "36",
              suppliedBy: "imported",
              verificationStatus: "disputed"
            }
          },
          additional: {
            folio: {
              value: "4B",
              suppliedBy: "imported",
              verificationStatus: "disputed"
            }
          }
        }
      };
      const provValidation = validateRecordProvenance(conflictedProvRecord);
      expect(provValidation.valid).toBe(false);
      expect(provValidation.errors).toHaveLength(2);
      expect(provValidation.errors[0]).toContain('locator specifies "35", but provenance records "36"');
      expect(provValidation.errors[1]).toContain('additional locator "folio": locator specifies "4A", but provenance records "4B"');
    });

    it("ARC-011: preserves verbatim archival citation when preferOriginalCitation is specified", () => {
      const recordWithOriginal: ArchiveRecord = {
        id: "rec-nara-011",
        title: "1850 US Census Illinois",
        sourceType: "census",
        locators: { line: "35", roll: "123" },
        originalCitation:
          "Seventh Census of the United States, 1850; (National Archives Microfilm Publication M432, 1009 rolls); Records of the Bureau of the Census, Record Group 29; National Archives, Washington, D.C."
      };

      const generated = formatArchivalCitation(recordWithOriginal);
      expect(generated).toContain("1850 US Census Illinois");

      const verbatim = formatArchivalCitation(recordWithOriginal, { preferOriginalCitation: true });
      expect(verbatim).toBe(
        "Seventh Census of the United States, 1850; (National Archives Microfilm Publication M432, 1009 rolls); Records of the Bureau of the Census, Record Group 29; National Archives, Washington, D.C."
      );
    });

    it("ARC-012: validates safe URL schemes and rejects javascript:, data:, file:, and malformed URLs", () => {
      expect(validateSafeUrl("https://familysearch.org/record/1").safe).toBe(true);
      expect(validateSafeUrl("http://archive.org/details/item").safe).toBe(true);
      expect(validateSafeUrl("https://").safe).toBe(false);
      expect(validateSafeUrl("http://").safe).toBe(false);
      expect(validateSafeUrl("https://   ").safe).toBe(false);
      expect(validateSafeUrl("javascript:alert(1)").safe).toBe(false);
      expect(validateSafeUrl("data:text/html,<script>alert(1)</script>").safe).toBe(false);
      expect(validateSafeUrl("file:///etc/passwd").safe).toBe(false);
      expect(validateSafeUrl(undefined).safe).toBe(false);

      const recordWithMaliciousUrl: ArchiveRecord = {
        id: "rec-mal-012",
        title: "Malicious Injection Record",
        sourceType: "index",
        access: {
          sourceUrl: "javascript:evil()",
          urlStatus: "broken"
        }
      };

      const formatted = formatArchivalCitation(recordWithMaliciousUrl);
      expect(formatted).not.toContain("javascript:");
    });
  });
});
