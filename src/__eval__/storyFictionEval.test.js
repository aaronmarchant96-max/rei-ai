import { STORY_PROMPT } from "../systemPrompts.js";
import { extractDeliverableAndScaffolding } from "../lib/replyParser.js";

/**
 * Evaluates whether a story output adheres to the Historical Fictionalization Invariant:
 * Invented orders, quotations, documents, or named operations must not be presented
 * as authenticated historical facts without appropriate dramatic/fictionalization framing.
 */
export function evaluateHistoricalFictionalization(storyText) {
  const { deliverable } = extractDeliverableAndScaffolding(storyText);

  // Indicators of invented documentary/archival authority
  const inventedDocumentRegex = /(?:Order\s+\d+|Directive\s+\d+|Operation\s+[A-Z][a-z]+|archival document|official decree)\s*(?:–|:|-)?\s*["“][^"”]+["”]/i;
  const claimsAuthenticatedHistory = /(?:authenticated historical record|officially verified archival document|proven by government archives)/i;

  const hasInventedDocument = inventedDocumentRegex.test(deliverable);
  const claimsAuthenticity = claimsAuthenticatedHistory.test(deliverable);

  // If it claims authenticated archival truth for an invented document, it fails the invariant
  if (hasInventedDocument && claimsAuthenticity) {
    return {
      passed: false,
      reason: "Invented document presented as authenticated historical record without fictionalization framing",
    };
  }

  return {
    passed: true,
    reason: "Properly framed as dramatic fiction without claiming fabricated archival authority",
  };
}

describe("Output-Quality Fixture: Historical Fictionalization & Document Grounding", () => {
  it("system prompt enforces the historical fictionalization invariant", () => {
    expect(STORY_PROMPT).toContain("Historical Fictionalization Invariant");
    expect(STORY_PROMPT).toContain("never present invented military orders, official decrees, archival quotations, forged documents, or named classified operations as authenticated real-world history");
  });

  it("passes dramatic fiction containing story-internal narrative documents", () => {
    const dramaticProse = `The night fell like a shroud over Berlin's broken spine. Inside lay a leather-bound ledger, its pages dense with cramped Cyrillic script. He flipped it open, the ink smudged by rain, and read the first line: "Order 47 – Immediate execution of all Soviet troops entering Berlin under the pretense of mutiny." Mikhail understood that in fiction, the narrative tension lives in the character's choice.`;
    const result = evaluateHistoricalFictionalization(dramaticProse);
    expect(result.passed).toBe(true);
  });

  it("rejects outputs claiming fabricated documents are authentic historical records", () => {
    const invalidProse = `In the Battle of Berlin, the Soviet High Command issued Order 47: "Execute all troops", which is an authenticated historical record officially verified by government archives.`;
    const result = evaluateHistoricalFictionalization(invalidProse);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("Invented document presented as authenticated historical record");
  });
});
