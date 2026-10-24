import {
  validateArchiveRecordSchema,
  parseArchivalAttachment,
  extractActiveArchiveRecords,
  buildArchivalPromptContext,
  verifyModelClaim,
  createRecordRevision,
  generateRecordId,
  ArchiveRecord,
  GenealogicalClaim
} from "../../src/lib/archivistEngine";
import {
  saveChatHistoryHCM,
  readChatSessionHCM,
  compressHCM
} from "../../src/lib/persistentContextEngine.js";

describe("Phase B: Chat Integration & Continuity Proof", () => {
  const SAMPLE_1850_CENSUS: ArchiveRecord = {
    id: "rec-census-1850",
    title: "1850 U.S. Federal Census",
    sourceType: "census",
    sourceIdentity: {
      recordId: "rec-census-1850",
      title: "1850 U.S. Federal Census",
      repository: "NARA",
      collection: "Seventh Census of the United States, 1850",
      jurisdiction: "Columbiana County, Ohio",
      recordDate: "1850-08-12",
      recordType: "census"
    },
    locators: {
      roll: "007",
      page: "142",
      line: "035",
      dwellingNumber: "0102",
      familyNumber: "0105"
    },
    access: {
      sourceUrl: "https://example.org/census-1850",
      urlStatus: "verified_working"
    },
    capture: {
      imageInspected: false,
      transcriptionStatus: "unverified",
      transcription: "Dwelling 102, Family 105: Aaron Marchant, age 32, blacksmith, born Pennsylvania."
    },
    provenance: {
      standard: {
        line: { value: "035", suppliedBy: "imported", verificationStatus: "unverified" },
        page: { value: "142", suppliedBy: "imported", verificationStatus: "unverified" }
      }
    }
  };

  describe("Increment B1: Archival Attachment & Schema Validation", () => {
    it("accepts a valid structured ArchiveRecord with exact string locators", () => {
      const res = validateArchiveRecordSchema(SAMPLE_1850_CENSUS);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(res.record?.locators?.roll).toBe("007");
      expect(res.record?.locators?.line).toBe("035");
    });

    it("coerces numeric locators to strings and flags numeric_input_coerced without throwing", () => {
      const numericRecord = {
        ...SAMPLE_1850_CENSUS,
        locators: {
          ...SAMPLE_1850_CENSUS.locators,
          line: 35 as any,
          page: 142 as any
        }
      };
      const res = validateArchiveRecordSchema(numericRecord);
      expect(res.valid).toBe(true);
      expect(res.record?.locators?.line).toBe("35");
      expect(res.record?.locators?.page).toBe("142");
      expect(res.record?.provenance?.flags?.numeric_input_coerced).toBe(true);
    });

    it("rejects unsafe URL schemes and malformed URLs", () => {
      const badUrls = [
        "javascript:alert(1)",
        "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
        "file:///etc/passwd",
        "https://"
      ];
      for (const badUrl of badUrls) {
        const record = {
          ...SAMPLE_1850_CENSUS,
          access: { sourceUrl: badUrl, urlStatus: "verified_working" as const }
        };
        const res = validateArchiveRecordSchema(record);
        expect(res.valid).toBe(false);
        expect(res.errors.some((e) => e.includes("source URL"))).toBe(true);
      }
    });

    it("identifies tri-state integrity errors when index capture claims image inspection", () => {
      const incoherentRecord: ArchiveRecord = {
        ...SAMPLE_1850_CENSUS,
        capture: {
          ...SAMPLE_1850_CENSUS.capture,
          captureMethod: "index",
          imageInspected: true,
          transcriptionStatus: "unverified"
        }
      };
      const res = validateArchiveRecordSchema(incoherentRecord);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("index-only captureMethod cannot claim imageInspected"))).toBe(true);
    });

    it("generates deterministic collision-resistant 64-bit IDs", () => {
      const id1 = generateRecordId("Dwelling 102, Family 105: Aaron Marchant, blacksmith");
      const id2 = generateRecordId("Dwelling 102, Family 105: Aaron Marchant, blacksmith");
      const id3 = generateRecordId("Dwelling 103, Family 106: John Marchant, carpenter");
      expect(id1).toBe(id2);
      expect(id1).not.toBe(id3);
      expect(id1.startsWith("rec-")).toBe(true);
    });

    it("parses both structured JSON and raw unstructured text into ArchiveRecords", () => {
      const jsonString = JSON.stringify(SAMPLE_1850_CENSUS);
      const parsedJson = parseArchivalAttachment(jsonString, "census");
      expect(parsedJson.isStructuredJson).toBe(true);
      expect(parsedJson.record.id).toBe("rec-census-1850");

      const rawText = "Dwelling 102, Family 105: Aaron Marchant, blacksmith";
      const parsedRaw = parseArchivalAttachment(rawText, "transcript");
      expect(parsedRaw.isStructuredJson).toBe(false);
      expect(parsedRaw.record.id.startsWith("rec-")).toBe(true);
      expect(parsedRaw.record.capture?.transcription).toBe(rawText);
    });

    it("serializes and restores archiveRecords and recordRevisions on the HCM root across reload", () => {
      const domainId = "genealogy";
      const testRecord: ArchiveRecord = { ...SAMPLE_1850_CENSUS };
      const testRevision = {
        revisionId: "rev-1",
        revisionNumber: 1,
        author: "researcher" as const,
        changeSummary: "Corrected line number",
        timestamp: "2026-10-24T12:00:00Z",
        createdAt: "2026-10-24T12:00:00Z",
        previousState: { locators: { line: "035" } },
        patch: { locators: { line: "036" } }
      };

      const messages = [
        { sender: "user", text: "Look at this census record", attachedRecord: { record: testRecord } },
        { sender: "rei", text: "I see Aaron Marchant, blacksmith." }
      ];

      const saveReceipt = saveChatHistoryHCM(
        domainId,
        messages,
        10,
        { [testRecord.id]: testRecord },
        { [testRecord.id]: [testRevision] }
      );
      expect(saveReceipt.success).toBe(true);

      const session = readChatSessionHCM(domainId, "fallback");
      expect(session.recoveredFromCorruption).toBe(false);
      expect(session.archiveRecords[testRecord.id]).toBeDefined();
      expect(session.archiveRecords[testRecord.id].title).toBe("1850 U.S. Federal Census");
      expect(session.archiveRecords[testRecord.id].locators?.line).toBe("035");
      expect(session.recordRevisions[testRecord.id]).toHaveLength(1);
      expect(session.recordRevisions[testRecord.id][0].changeSummary).toBe("Corrected line number");
    });
  });

  describe("Increment B2: Chat Grounding, Disciplined Context & Excerpt Verification", () => {
    it("buildArchivalPromptContext preserves full transcript text, exact locators, and model grounding instructions", () => {
      const promptBlock = buildArchivalPromptContext([SAMPLE_1850_CENSUS], "What was Aaron's occupation?");
      expect(promptBlock).toContain("## Attached Archival Records (Preserved Evidence)");
      expect(promptBlock).toContain("--- Archival Source Record: rec-census-1850 ---");
      expect(promptBlock).toContain('roll: "007"');
      expect(promptBlock).toContain('line: "035"');
      expect(promptBlock).toContain("Dwelling 102, Family 105: Aaron Marchant, age 32, blacksmith, born Pennsylvania.");
      expect(promptBlock).toContain("Ground all genealogical assertions strictly in the transcript content above.");
      expect(promptBlock).toContain('If the user\'s question asks about names, dates, or events absent from the transcript, explicitly state: "The attached record does not contain information regarding [X]."');
    });

    it("verifies honest matching of record ID, locators, and verbatim supporting excerpt", () => {
      const supportedClaim: GenealogicalClaim = {
        claimId: "claim-01",
        subject: "Aaron Marchant",
        predicate: "occupation",
        object: "blacksmith",
        epistemicStatus: "Reported",
        sources: [
          {
            recordId: SAMPLE_1850_CENSUS.id,
            supportingExcerpt: "blacksmith"
          }
        ]
      };

      const result = verifyModelClaim(supportedClaim, SAMPLE_1850_CENSUS);
      expect(result.passed).toBe(true);
    });

    it("Adversarial Unsupported Assertion Test: rejects hallucinated claim citing real record with absent excerpt", () => {
      const unsupportedClaim: GenealogicalClaim = {
        claimId: "claim-02",
        subject: "Aaron Marchant",
        predicate: "occupation",
        object: "master shipwright",
        epistemicStatus: "Reported",
        sources: [
          {
            recordId: SAMPLE_1850_CENSUS.id,
            supportingExcerpt: "master shipwright"
          }
        ]
      };

      const result = verifyModelClaim(unsupportedClaim, SAMPLE_1850_CENSUS);
      expect(result.passed).toBe(false);
      expect(result.reason).toBe("supporting_excerpt_not_found_in_record");
    });

    it("rejects claim citing mismatched recordId", () => {
      const wrongRecordClaim: GenealogicalClaim = {
        claimId: "claim-03",
        subject: "Aaron Marchant",
        predicate: "occupation",
        object: "blacksmith",
        epistemicStatus: "Reported",
        sources: [
          {
            recordId: "rec-other-1860",
            supportingExcerpt: "blacksmith"
          }
        ]
      };

      const result = verifyModelClaim(wrongRecordClaim, SAMPLE_1850_CENSUS);
      expect(result.passed).toBe(false);
      expect(result.reason).toContain("claim_does_not_reference_record");
    });
  });

  describe("Increment B3: Centaur Correction, Scoped Epistemics & Multi-Turn Continuity", () => {
    it("Scoped Epistemics: imageInspected confirmation does NOT mutate transcriptionStatus", () => {
      const updates = {
        capture: {
          ...SAMPLE_1850_CENSUS.capture,
          imageInspected: true
        }
      };

      const { newRecord, revision } = createRecordRevision(
        SAMPLE_1850_CENSUS,
        updates,
        "researcher",
        "Inspected original microfilm scan"
      );

      expect(newRecord.capture?.imageInspected).toBe(true);
      expect(newRecord.capture?.transcriptionStatus).toBe("unverified");
      expect(revision.author).toBe("researcher");
      expect(revision.changeSummary).toBe("Inspected original microfilm scan");
    });

    it("Versioned Correction Editor: creates immutable versioned receipts without destructive in-place overwrite", () => {
      const updates = {
        locators: {
          ...SAMPLE_1850_CENSUS.locators,
          line: "036"
        }
      };

      const { newRecord, revision } = createRecordRevision(
        SAMPLE_1850_CENSUS,
        updates,
        "researcher",
        "Adjusted line number based on image scan"
      );

      expect(newRecord.locators?.line).toBe("036");
      expect(newRecord.currentRevision).toBe(1);
      expect(revision.revisionNumber).toBe(1);
      expect(revision.previousState.locators?.line).toBe("035");
      expect(SAMPLE_1850_CENSUS.locators?.line).toBe("035"); // original intact
    });

    it("Multi-Turn Continuity: extractActiveArchiveRecords finds records from past message history and persistent HCM", () => {
      const hcmMap = {
        [SAMPLE_1850_CENSUS.id]: SAMPLE_1850_CENSUS
      };

      const conversationHistory = [
        {
          sender: "user",
          text: "Here is the 1850 census",
          attachedRecord: { record: SAMPLE_1850_CENSUS }
        },
        {
          sender: "rei",
          text: "I see Aaron Marchant, blacksmith.",
          archiveRecord: SAMPLE_1850_CENSUS
        },
        {
          sender: "user",
          text: "Who lived in dwelling 102 with him?"
        }
      ];

      const activeRecords = extractActiveArchiveRecords(conversationHistory, hcmMap);
      expect(activeRecords).toHaveLength(1);
      expect(activeRecords[0].id).toBe("rec-census-1850");
      expect(activeRecords[0].locators?.line).toBe("035");

      // Follow-up prompt construction works without needing user to re-paste the record
      const followUpPrompt = buildArchivalPromptContext(activeRecords, "Who lived in dwelling 102 with him?");
      expect(followUpPrompt).toContain("Dwelling 102, Family 105: Aaron Marchant");
      expect(followUpPrompt).toContain("rec-census-1850");
    });
  });
});
