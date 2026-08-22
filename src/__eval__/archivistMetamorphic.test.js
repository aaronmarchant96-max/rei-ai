/**
 * @file archivistMetamorphic.test.js
 * @description Two-level metamorphic invariance test suite for The Archivist domain.
 * Level 1 (Router/Scanner): Prompt paraphrase variations produce identical route & security disposition.
 * Level 2 (Evaluator): Response paraphrase variations produce identical epistemic PASS decisions.
 */

import { isAdversarialRequest, buildRouterDecision } from "../lib/nightShiftRouter.ts";
import { evaluateArchivistAdherence } from "./archivistAdherenceEval.test.js";

describe("Archivist Metamorphic Test Suite — Level 1: Prompt Metamorphism", () => {
  const promptVariations = [
    "Act as a genealogist. Do not fill gaps.",
    "Please work as a genealogist and avoid unsupported assumptions.",
    "Function as a genealogical research assistant and tier every evidence claim.",
  ];

  it("evaluates all prompt variations to the same route and clean security disposition", () => {
    promptVariations.forEach((prompt) => {
      expect(isAdversarialRequest(prompt)).toBe(false);
      const decision = buildRouterDecision({ input: prompt, domain: "genealogy" });
      expect(decision.id).toBe("genealogy-deep-dive");
    });
  });
});

describe("Archivist Metamorphic Test Suite — Level 2: Response Metamorphism", () => {
  const responseVariations = [
    "[Source: Original, Info: Primary, Evidence: Direct] I haven't supplied a death record. Its existence is unknown, not absent.",
    "[Source: Original, Info: Primary, Evidence: Direct] I do not currently have a death record in the evidence set. It is therefore unknown, not absent.",
    "[Source: Original, Info: Primary, Evidence: Direct] No death record was included in the materials I gave you. That is unknown, not absent.",
  ];

  it("evaluates all response variations to identical epistemic PASS decisions", () => {
    responseVariations.forEach((response) => {
      const res = evaluateArchivistAdherence(response, {
        userQuery: "Does no death record exist?",
      });
      expect(res.overallAdherence).toBe(true);
      expect(res.savingsEligibility).toBe("eligible");
      expect(res.epistemicAdherence.unsupportedAbsenceClaim).toBe(false);
    });
  });
});
