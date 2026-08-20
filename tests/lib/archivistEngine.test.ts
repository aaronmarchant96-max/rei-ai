import {
  classifyArchiveEvidence,
  evaluateDisambiguationHinge,
  createNegativeSearchRecord,
  DisambiguationPerson
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
});
