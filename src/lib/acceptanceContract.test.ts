import {
  LEGAL_REQUIRED_SECTIONS,
  detectUnfinishedNarration,
  findUnfinishedNarration,
  requiredSectionsForRoute,
  missingRequiredSections,
} from "./acceptanceContract";

describe("acceptanceContract — legal delivery contract + unfinished-work narration", () => {
  describe("detectUnfinishedNarration", () => {
    test("flags 'I'll continue the analysis' style narration", () => {
      expect(detectUnfinishedNarration("I'll continue the analysis. Let me first verify the exact vote counts.")).toBe(true);
    });
    test("flags 'Let me first verify' style narration", () => {
      expect(detectUnfinishedNarration("Let me first verify the specific passages before concluding.")).toBe(true);
    });
    test("flags 'to be continued'", () => {
      expect(detectUnfinishedNarration("This analysis is to be continued.")).toBe(true);
    });
    test("does not flag a completed answer", () => {
      expect(detectUnfinishedNarration("**HINGE**: whether separate-but-equal violates equal protection.\n**MOVE**: consult an attorney.")).toBe(false);
    });
    test("returns null for empty/undefined content", () => {
      expect(detectUnfinishedNarration("")).toBe(false);
      expect(detectUnfinishedNarration(null)).toBe(false);
    });
  });

  describe("findUnfinishedNarration", () => {
    test("returns the matched phrase for audit", () => {
      const phrase = findUnfinishedNarration("I'll continue the analysis in a moment.");
      expect(phrase).toContain("I'll continue");
    });
    test("returns null when clean", () => {
      expect(findUnfinishedNarration("No narration here.")).toBeNull();
    });
  });

  describe("requiredSectionsForRoute", () => {
    test("returns legal CARDO sections for legal routes", () => {
      expect(requiredSectionsForRoute("legal-hinge")).toEqual([...LEGAL_REQUIRED_SECTIONS]);
      expect(requiredSectionsForRoute("case-hinge-legal")).toEqual([...LEGAL_REQUIRED_SECTIONS]);
    });
    test("returns null for non-legal routes", () => {
      expect(requiredSectionsForRoute("coding-hinge")).toBeNull();
      expect(requiredSectionsForRoute(undefined)).toBeNull();
    });
  });

  describe("missingRequiredSections", () => {
    test("returns all sections when content is empty", () => {
      expect(missingRequiredSections("", LEGAL_REQUIRED_SECTIONS)).toEqual([...LEGAL_REQUIRED_SECTIONS]);
    });
    test("detects a truncated legal answer as missing sections", () => {
      const truncated = "**HINGE**: whether separate-but-equal violates equal protection.\nI'll continue the analysis.";
      const missing = missingRequiredSections(truncated, LEGAL_REQUIRED_SECTIONS);
      expect(missing).toContain("MOVE");
      expect(missing).toContain("WHAT WOULD CHANGE THE OUTCOME");
      expect(missing).not.toContain("HINGE");
    });
    test("returns empty when all sections present", () => {
      const full = LEGAL_REQUIRED_SECTIONS.map((s) => `**${s}**: content`).join("\n");
      expect(missingRequiredSections(full, LEGAL_REQUIRED_SECTIONS)).toEqual([]);
    });
  });
});
