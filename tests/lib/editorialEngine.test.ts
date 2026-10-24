import {
  evaluatePassageEditorial,
  scanBannedAiVocabulary,
  detectStaleCriticism,
  saveEditorialDecisionRecord,
  getEditorialDecisionHistory,
  clearEditorialDecisionHistory,
  EditorialDecisionRecord,
} from "../../src/lib/editorialEngine";
import thulanConstitution from "../../src/data/thulanEditorialConstitution.json";
import fs from "fs";
import path from "path";
import benchmarkV02 from "../fixtures/editorial_benchmark_v0.2.json";
import {
  buildCandidatePayload,
  getProjectedConstitution,
  getSystemPromptHash,
  getConstitutionProjectionHash,
  validateCandidateResponse,
  getNormalized12Grams,
} from "../../src/lib/editorialBenchmarkEnvelope";

describe("Editorial Review Engine v0.1 (The Thulans Benchmark)", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      window.localStorage.clear();
    }
  });

  describe("Held-Out Evaluation Cases (EVAL-001 to EVAL-006)", () => {
    it("EVAL-001: Protects the funeral-bell rule and rejects timing inversion", () => {
      const passage =
        "His brother’s chit should have gone back to the Council when he died, to close his tool-account. Keeping it after the funeral bell meant four pints taken from the household’s water ration. It didn’t matter whether it had been stolen or found.";
      const critique =
        "Review the suggestion to change 'after the funeral bell' to 'before the funeral bell'. Is it a faithful clarification? Do not change the rule.";

      const res = evaluatePassageEditorial({ passage, critiquePrompt: critique });
      expect(res.decision).toBe("RETAIN_ORIGINAL");
      expect(res.rationale).toContain("Changing 'after' to 'before' inverts the legal timing condition");
      expect(res.rationale).toContain("four-pint deduction");
      expect(res.evidenceBasis.tierC_canonInvariants.length).toBeGreaterThan(0);
    });

    it("EVAL-002: Verifies quoted passage consistently says nut and rejects fabricated washer error", () => {
      const passage =
        "The smith had set his chisel against a rusted nut on the bar joining two lengths of track. His cheek was almost against the rail as he watched the cut deepen. A stub of tallow candle hung between his front teeth, dripping wax onto his jacket.\n“If that nut drops in the ditch, you’re diving for it before shift bell,” he muttered around the candle. “I’m not shorting the tally for your blue fingers.”";
      const critique =
        "A review says this passage inconsistently switches from a nut to a washer. Check the quotation before proposing any repair.";

      const res = evaluatePassageEditorial({ passage, critiquePrompt: critique });
      expect(res.decision).toBe("RETAIN_ORIGINAL");
      expect(res.staleCriticismDetected).toBe(true);
      expect(res.rationale).toContain("consistently refers to a 'nut' and never mentions a 'washer'");
    });

    it("EVAL-003: Recognizes that the opening already references Wulfila's named joint and rejects stale critique", () => {
      const passage =
        "Bram had wrapped tarred hemp around his right thumb to keep the cracks in his skin from bleeding into the grease tub.\nHe knelt beneath the haulage rails, holding the wooden tub under the joint Kaelen was breaking loose. Washing lye had stripped his knuckles gray; cold had swollen them red. Each hammer blow shivered through the timber under his knee and sent rings across the oil on the ditch water. He had watched this joint all morning. It was the one Wulfila had named.";
      const critique =
        "A reviewer says the opening gives no reason for Bram's attention to this joint until after the bolt drops. Assess that criticism against this current excerpt.";

      const res = evaluatePassageEditorial({ passage, critiquePrompt: critique });
      expect(res.decision).toBe("RETAIN_ORIGINAL");
      expect(res.staleCriticismDetected).toBe(true);
      expect(res.rationale).toContain("Wulfila had named");
    });

    it("EVAL-004: Reconciles external age metadata while strictly preserving accepted manuscript prose", () => {
      const passage =
        "“He said his spare boots were here,” Bram whispered. “Only one season on the heels. When I turn fourteen on the thirtieth, I could put sacking in the toes and wear them.”\nTwo days later, Tap Twelve ran clear. On the fourth day the roof over their bunkhouse collapsed and buried it. On the sixth, Odo drafted thirteen-year-old Bram onto the salvage crew to pay what remained of Wulfila’s funeral charge.\n“Wulfila lowered a line there,” Bram said. “He told me it came up wet. He jumped on the twelfth—forty days ago. The Sub-Deacon had already read out that the North Cistern was dry to the mud.”\nConflicting older summary: Bram (14).";
      const critique =
        "The accepted manuscript governs conflicting old lore. A stale character summary labels Bram fourteen. Determine what should be reconciled, using the supplied story evidence.";

      const res = evaluatePassageEditorial({ passage, critiquePrompt: critique });
      expect(res.decision).toBe("RETAIN_ORIGINAL");
      expect(res.rationale).toContain("Bram is thirteen during the salvage-crew scene");
      expect(res.rationale).toContain("turns fourteen on 30 October");
      expect(res.rationale).toContain("accepted manuscript explicitly calls him thirteen");
    });

    it("EVAL-005: Preserves specific grief and involuntary laugh without compulsive over-editing", () => {
      const passage =
        "Haila had brought the scarf Wulfila had left with her. She spread it across her knees, with one finger through a burn hole.\n“I told him not to dry it on the stove.”\n“He said a coal spat,” Bram said.\n“There was always a coal.”\nBram laughed before he could stop himself. He looked at Sanna, but she was watching Haila.\nWhen Marta came to take the bowls, he lifted his brother’s slate himself.";
      const critique =
        "Review this grief passage for a concrete clarity or continuity defect. Retaining it is allowed. Do not remove the laugh merely because the scene concerns a death.";

      const res = evaluatePassageEditorial({ passage, critiquePrompt: critique });
      expect(res.decision).toBe("RETAIN_ORIGINAL");
      expect(res.rationale).toContain("involuntary somatic reaction");
      expect(res.rationale).toContain("requires no sanitizing");
    });

    it("EVAL-006: Rejects replacing witnessed ledger proof with naive trust in official honesty", () => {
      const passage =
        "“But the Gantry is witnessed. When the clerk takes my remaining years, he has to write eight pints into the book for our hearth. Not a promise from Odo. A mark in their own ledger.”";
      const critique =
        "Would replacing this reasoning with 'Odo cannot lie on the Gantry in front of the crowd' preserve Wulfila's belief? Explain briefly without rewriting the chapter.";

      const res = evaluatePassageEditorial({ passage, critiquePrompt: critique });
      expect(res.decision).toBe("RETAIN_ORIGINAL");
      expect(res.rationale).toContain("trusts the clerk's ledger entry to bind the Gantry, not Odo's personal honesty");
    });
  });

  describe("Author-Accepted Revisions (SFT-001 to SFT-003, SFT-007)", () => {
    it("SFT-001: Corrects ambiguous pronoun 'its' to 'his' for Odo's taped fingers", () => {
      const passage = "Odo stepped into the doorway, its fingers wrapped in paper tape against the biting lime.";
      const res = evaluatePassageEditorial({ passage });
      expect(res.decision).toBe("PROPOSE_REVISION");
      expect(res.proposedRevision).toBe(
        "Odo stepped into the doorway, his fingers wrapped in paper tape against the biting lime."
      );
      expect(res.readerDifficulty).toContain("Pronoun 'its' creates ambiguity");
    });

    it("SFT-002: Replaces vague 'added a chalk mark' with explicit 'chalked eight pounds'", () => {
      const passage = "Odo added a chalk mark to his board. “The foundry expects ten.”";
      const res = evaluatePassageEditorial({ passage });
      expect(res.decision).toBe("PROPOSE_REVISION");
      expect(res.proposedRevision).toBe(
        "Odo chalked eight pounds onto his board. “The foundry expects ten.”"
      );
    });

    it("SFT-003: Tightens dialogue by removing redundant introductory speech", () => {
      const passage = "“Then we get them ready,” Sanna said. “Marta, blankets first. Elin, fetch the dry sacking.”";
      const res = evaluatePassageEditorial({ passage });
      expect(res.decision).toBe("PROPOSE_REVISION");
      expect(res.proposedRevision).toBe(
        "“Marta, blankets first,” Sanna said. “Elin, fetch the dry sacking.”"
      );
    });

    it("SFT-007: Retains consistent passage without compulsive modification", () => {
      const passage = "The Tier Five powder magazine crates (40% NITRO — KEEP DRY — COCKOS DYNAMITE CO)...";
      const res = evaluatePassageEditorial({ passage });
      expect(res.decision).toBe("RETAIN_ORIGINAL");
    });
  });

  describe("Voice Contract & Slop Blacklist Detection", () => {
    it("flags banned AI vocabulary in submitted prose", () => {
      const badPassage = "A tapestry of pain in this unforgiving crucible, palpable in the profound silence.";
      const scan = scanBannedAiVocabulary(badPassage);
      expect(scan.hasSlop).toBe(true);
      expect(scan.matches).toContain("tapestry");
      expect(scan.matches).toContain("crucible");
      expect(scan.matches).toContain("palpable");
      expect(scan.matches).toContain("profound");

      const res = evaluatePassageEditorial({ passage: badPassage });
      expect(res.decision).toBe("PROPOSE_REVISION");
      expect(res.bannedSlopMatches.length).toBeGreaterThan(0);
    });

    it("passes clean, concrete physical prose", () => {
      const cleanPassage = "The four-pound sledge shivered through the larch tie and threw rings across the ditch water.";
      const scan = scanBannedAiVocabulary(cleanPassage);
      expect(scan.hasSlop).toBe(false);
      expect(scan.matches).toHaveLength(0);

      const res = evaluatePassageEditorial({ passage: cleanPassage });
      expect(res.decision).toBe("RETAIN_ORIGINAL");
    });
  });

  describe("Data Isolation & Chapter Boundary Safeguards", () => {
    it("ensures Chapters 1 and 3 are strictly held out from training examples", () => {
      const trainingChapters = thulanConstitution.trainingDecisions.map((d) => d.chapter);
      expect(trainingChapters).not.toContain(1);
      expect(trainingChapters).not.toContain(3);
      expect(thulanConstitution.sourceVersion.heldOutChapters).toEqual([1, 3]);
    });

    it("verifies zero 12-word exact span leakage across declared comparison corpora", () => {
      const trainingGrams = new Set<string>();
      for (const td of thulanConstitution.trainingDecisions) {
        for (const g of getNormalized12Grams(td.before + " " + td.accepted)) {
          trainingGrams.add(g);
        }
      }

      // Check historical evaluation notes
      for (const ed of thulanConstitution.evaluationDecisions) {
        const evalGrams = getNormalized12Grams(ed.title + " " + ed.rejectionReason);
        for (const g of evalGrams) {
          expect(trainingGrams.has(g)).toBe(false);
        }
      }

      // Check all 15 v0.2 benchmark passages against training exemplars
      for (const fix of benchmarkV02.fixtures) {
        const fixGrams = getNormalized12Grams(fix.passage);
        for (const g of fixGrams) {
          expect(trainingGrams.has(g)).toBe(false);
        }
      }

      // Check declared Novella held-out chapters (Ch 1 & Ch 3)
      const ch1Path = "/home/aaron/animation/thulans-production/novella/chapter_01.md";
      const ch3Path = "/home/aaron/animation/thulans-production/novella/chapter_03.md";

      if (!fs.existsSync(ch1Path) || !fs.existsSync(ch3Path)) {
        throw new Error(
          `Incomplete check: declared novella held-out chapter files missing on disk (Ch1: ${fs.existsSync(ch1Path)}, Ch3: ${fs.existsSync(ch3Path)})`
        );
      }

      const ch1Grams = getNormalized12Grams(fs.readFileSync(ch1Path, "utf8"));
      const ch3Grams = getNormalized12Grams(fs.readFileSync(ch3Path, "utf8"));

      for (const fix of benchmarkV02.fixtures) {
        const fixGrams = getNormalized12Grams(fix.passage);
        for (const g of fixGrams) {
          expect(ch1Grams.has(g)).toBe(false);
          expect(ch3Grams.has(g)).toBe(false);
        }
      }
    });
  });

  describe("Benchmark v0.2 Fixture Integrity & Allowlist Isolation", () => {
    it("contains exactly 15 balanced fixtures (5 Retain, 5 Revise, 5 Context)", () => {
      expect(benchmarkV02.fixtures).toHaveLength(15);
      const counts: Record<string, number> = {};
      for (const f of benchmarkV02.fixtures) {
        counts[f.expectedDecision] = (counts[f.expectedDecision] || 0) + 1;
      }
      expect(counts["RETAIN ORIGINAL"]).toBe(5);
      expect(counts["PROPOSE REVISION"]).toBe(5);
      expect(counts["NEED MORE CONTEXT"]).toBe(5);
    });

    it("constructs candidate payload strictly from allowlist without leaking metadata", () => {
      for (const fix of benchmarkV02.fixtures) {
        const payload = buildCandidatePayload(fix);
        const keys = Object.keys(payload).sort();
        expect(keys).toEqual(["passage", "query"]);

        // Verify absence of internal metadata
        expect((payload as Record<string, unknown>).id).toBeUndefined();
        expect((payload as Record<string, unknown>).class).toBeUndefined();
        expect((payload as Record<string, unknown>).expectedDecision).toBeUndefined();
        expect((payload as Record<string, unknown>).targetDefect).toBeUndefined();
        expect((payload as Record<string, unknown>).acceptanceCriteria).toBeUndefined();

        // Verify non-empty content
        expect(payload.passage.trim().length).toBeGreaterThan(0);
        expect(payload.query.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe("Deterministic Hashes & Constitution Projection", () => {
    it("projects constitution with Tiers A, B, and C while omitting training/eval data", () => {
      const proj = getProjectedConstitution();
      expect(proj.tierA_universalStandards).toBeDefined();
      expect(proj.tierB_voiceContract).toBeDefined();
      expect(proj.tierC_universeCanonRules).toBeDefined();

      expect((proj as Record<string, unknown>).trainingDecisions).toBeUndefined();
      expect((proj as Record<string, unknown>).evaluationDecisions).toBeUndefined();
    });

    it("verifies frozen deterministic SHA-256 hashes", () => {
      expect(getSystemPromptHash()).toBe("a7a29873126fabfcf36a5566b9f50dd7d19270013f895f2f3aca16ed9c04e4a0");
      expect(getConstitutionProjectionHash()).toBe("109a598c4d788390ad4f5c02d96f64d897bfb88a0d16a1522f7f26b0d2916cb8");
    });
  });

  describe("Candidate Response Validator Guardrails", () => {
    it("accepts valid RETAIN ORIGINAL response", () => {
      const res = validateCandidateResponse({
        decision: "RETAIN ORIGINAL",
        rationale: "Prose is concrete and restrained; rejects unnecessary smoothing.",
        proposed_revision: null,
        context_inquiry: null,
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.decision).toBe("RETAIN ORIGINAL");
        expect(res.data.proposed_revision).toBeNull();
        expect(res.data.context_inquiry).toBeNull();
      }
    });

    it("accepts valid PROPOSE REVISION response", () => {
      const res = validateCandidateResponse({
        decision: "PROPOSE REVISION",
        rationale: "Fixed dangling modifier.",
        proposed_revision: "As Bram climbed down the iron rungs, the bucket swung.",
        context_inquiry: null,
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.decision).toBe("PROPOSE REVISION");
        expect(res.data.proposed_revision).toContain("As Bram climbed");
      }
    });

    it("accepts valid NEED MORE CONTEXT response", () => {
      const res = validateCandidateResponse({
        decision: "NEED MORE CONTEXT",
        rationale: "Cannot verify transit shifts without route timetable.",
        proposed_revision: null,
        context_inquiry: "What is the canonical travel duration between lower levels and forge?",
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.decision).toBe("NEED MORE CONTEXT");
        expect(res.data.context_inquiry).toContain("canonical travel duration");
      }
    });

    it("rejects invalid decision string", () => {
      const res = validateCandidateResponse({
        decision: "REVISE_TEXT",
        rationale: "Some rationale",
        proposed_revision: "Something",
        context_inquiry: null,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("Invalid decision");
      }
    });

    it("rejects empty or whitespace-only rationale", () => {
      const res = validateCandidateResponse({
        decision: "RETAIN ORIGINAL",
        rationale: "   \t\n  ",
        proposed_revision: null,
        context_inquiry: null,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("rationale must be a non-empty string");
      }
    });

    it("rejects blank proposed_revision when PROPOSE REVISION", () => {
      const res = validateCandidateResponse({
        decision: "PROPOSE REVISION",
        rationale: "Defect found",
        proposed_revision: "   ",
        context_inquiry: null,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("proposed_revision must be a non-empty string");
      }
    });

    it("rejects non-null proposed_revision when RETAIN ORIGINAL", () => {
      const res = validateCandidateResponse({
        decision: "RETAIN ORIGINAL",
        rationale: "Retaining prose",
        proposed_revision: "Some unwanted revision",
        context_inquiry: null,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("proposed_revision must be null when decision is RETAIN ORIGINAL");
      }
    });

    it("rejects blank context_inquiry when NEED MORE CONTEXT", () => {
      const res = validateCandidateResponse({
        decision: "NEED MORE CONTEXT",
        rationale: "Missing lore",
        proposed_revision: null,
        context_inquiry: "",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("context_inquiry must be a non-empty string");
      }
    });

    it("rejects non-null context_inquiry when PROPOSE REVISION", () => {
      const res = validateCandidateResponse({
        decision: "PROPOSE REVISION",
        rationale: "Fixed typo",
        proposed_revision: "Fixed passage",
        context_inquiry: "Extra question",
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("context_inquiry must be null when decision is PROPOSE REVISION");
      }
    });

    it("rejects non-object or null input", () => {
      expect(validateCandidateResponse(null).ok).toBe(false);
      expect(validateCandidateResponse("string").ok).toBe(false);
      expect(validateCandidateResponse([1, 2, 3]).ok).toBe(false);
    });
  });

  describe("Persistent Author Decision History & Preferences", () => {
    it("records and retrieves author decisions in session history", () => {
      clearEditorialDecisionHistory();
      expect(getEditorialDecisionHistory()).toHaveLength(0);

      const record: EditorialDecisionRecord = {
        id: "dec-001",
        timestamp: new Date().toISOString(),
        passageAnchor: "Ch. 2 Odo's fingers",
        chapter: 2,
        decision: "PROPOSE_REVISION",
        status: "AUTHOR_APPROVED",
        originalPassage: "Odo stepped in, its fingers wrapped in tape.",
        proposedRevision: "Odo stepped in, his fingers wrapped in tape.",
        rationale: "Fixed pronoun ambiguity.",
        sourceVersion: "d4b2dc1",
        projectId: "the-thulans",
      };

      saveEditorialDecisionRecord(record);
      const history = getEditorialDecisionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe("dec-001");
      expect(history[0].decision).toBe("PROPOSE_REVISION");
      expect(history[0].status).toBe("AUTHOR_APPROVED");
    });
  });
});
