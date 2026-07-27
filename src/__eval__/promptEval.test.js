import { parseAssistantStyleReply, buildDomainSystemMessage, getAssistantWelcomeCopy } from "../REI.jsx";

const DOMAIN_PROFILES = [
  { id: "assistant", label: "The Generalist", description: "Everyday reasoning, judgment, and decision support.", rules: ["Short sentences", "Hinge first", "Facts with sources", "Flag uncertainty"] },
  { id: "coding", label: "The Hinge Finder", description: "Senior coding logic executing CARDO REI methodology.", rules: ["Verify API shapes", "Name hinges explicitly", "Stop and ask if underspecified"] },
  { id: "genealogy", label: "The Archivist", description: "Evidence-tiered genealogy and disambiguating same-name profiles.", rules: ["Compare parent-child age limits", "Assign evidence tiers", "Log negative search results"] },
  { id: "story", label: "The Storyteller", description: "Narrative architecture generating story blueprints.", rules: ["Establish blueprint structure", "Identify character driver hinges", "Avoid cliché tropes"] },
];

describe("Prompt Eval — domain system messages", () => {
  test("assistant welcome copy contains reasoning loop structure", () => {
    const copy = getAssistantWelcomeCopy();
    expect(copy).toContain("Rei");
    expect(copy).toContain("Record");
    expect(copy).toContain("Evaluate");
    expect(copy).toContain("Iterate");
  });

  test("assistant system message is initialized", () => {
    const msg = buildDomainSystemMessage("assistant", DOMAIN_PROFILES[0]);
    expect(msg).toMatch(/^System initialized/);
    expect(msg).toContain("REI is live");
  });

  test("coding system message mentions domain", () => {
    const msg = buildDomainSystemMessage("coding", DOMAIN_PROFILES[1]);
    expect(msg).toContain("coding session");
    expect(msg).toContain("Hinge Finder");
    expect(msg).toContain("CARDO REI");
  });

  test("genealogy system message mentions domain", () => {
    const msg = buildDomainSystemMessage("genealogy", DOMAIN_PROFILES[2]);
    expect(msg).toContain("research analysis");
    expect(msg).toContain("Archivist");
    expect(msg).toContain("Evidence");
  });

  test("story system message mentions domain", () => {
    const msg = buildDomainSystemMessage("story", DOMAIN_PROFILES[3]);
    expect(msg).toContain("story building");
    expect(msg).toContain("Storyteller");
  });

  test("unknown domain falls back gracefully", () => {
    const fallbackProfile = { id: "unknown", label: "Fallback", description: "generic" };
    const msg = buildDomainSystemMessage("unknown", fallbackProfile);
    expect(msg).toContain("System initialized");
  });
});

describe("Prompt Eval — response parser", () => {
  test("parses a full valid response with all sections", () => {
    const input = `Here's my analysis.

Hinge: The real question is whether speed matters more than accuracy.

Facts: We have two data points showing 2x improvement.

Assumptions: The cost stays flat at scale.

Evaluation: Strong case, moderate evidence.

What would change my mind: A third data point showing regression.

Move: Run one more test.`;
    const result = parseAssistantStyleReply(input);
    expect(result.Hinge).toContain("speed");
    expect(result.Facts).toContain("2x");
    expect(result.Assumptions).toContain("cost");
    expect(result.Evaluation).toContain("Strong");
    expect(result.ChangeMind).toContain("third");
    expect(result.Move).toContain("Run");
    expect(result.intro).toContain("analysis");
  });

  test("parses a minimal valid response with only hinge + move", () => {
    const input = "Hinge: This is the key point.\n\nMove: Take action.";
    const result = parseAssistantStyleReply(input);
    expect(result.Hinge).toContain("key point");
    expect(result.Move).toContain("Take action");
    expect(result.Facts).toBe("");
    expect(result.Assumptions).toBe("");
  });

  test("handles bold markdown in section headers", () => {
    const input = "**Hinge:** Bold hinge text.\n\n**Facts:** Bold facts.";
    const result = parseAssistantStyleReply(input);
    expect(result.Hinge).toContain("Bold hinge");
    expect(result.Facts).toContain("Bold facts");
  });

  test("handles bullet-point content within sections", () => {
    const input = "Hinge: Key pivot\n\nFacts:\n- Point one\n- Point two";
    const result = parseAssistantStyleReply(input);
    expect(result.Hinge).toContain("Key pivot");
    expect(result.Facts).toContain("Point one");
    expect(result.Facts).toContain("Point two");
  });

  test("parses 'Next move' and 'Next step' as Move section", () => {
    const input = "Hinge: X\n\nNext move: Do Y";
    const result1 = parseAssistantStyleReply(input);
    expect(result1.Move).toContain("Do Y");

    const input2 = "Hinge: X\n\nNext step: Do Z";
    const result2 = parseAssistantStyleReply(input2);
    expect(result2.Move).toContain("Do Z");
  });

  test("parses 'What would change my mind?' with question mark", () => {
    const input = "Hinge: X\n\nWhat would change my mind?: Better data.";
    const result = parseAssistantStyleReply(input);
    expect(result.ChangeMind).toContain("Better data");
  });

  test("accumulates multi-line content within a section", () => {
    const input = "Hinge: First line\nSecond line still in hinge\n\nFacts: Separate";
    const result = parseAssistantStyleReply(input);
    expect(result.Hinge).toContain("First line");
    expect(result.Hinge).toContain("Second line");
    expect(result.Facts).toContain("Separate");
  });

  test("handles empty input gracefully", () => {
    const result = parseAssistantStyleReply("");
    expect(result.Hinge).toBe("");
    expect(result.Facts).toBe("");
    expect(result.Assumptions).toBe("");
    expect(result.Evaluation).toBe("");
    expect(result.ChangeMind).toBe("");
    expect(result.Move).toBe("");
  });

  test("handles input with no recognized sections as intro", () => {
    const result = parseAssistantStyleReply("Just a plain sentence without any section markers.");
    expect(result.intro).toContain("plain sentence");
    expect(result.Hinge).toBe("");
  });

  test("parses 'Next move' with colon after newline", () => {
    const input = "Hinge: The hinge\nNext move:\nDo something";
    const result = parseAssistantStyleReply(input);
    expect(result.Move).toContain("Do something");
  });

  test("parses lowercase section headers", () => {
    const input = "hinge: lower hinge\n\nfacts: lower facts";
    const result = parseAssistantStyleReply(input);
    expect(result.Hinge).toContain("lower hinge");
    expect(result.Facts).toContain("lower facts");
  });
});

describe("Prompt Eval — edge cases", () => {
  test("null input returns empty sections", () => {
    const result = parseAssistantStyleReply(null);
    expect(result.Hinge).toBe("");
    expect(result.intro).toBe("");
  });

  test("undefined input returns empty sections", () => {
    const result = parseAssistantStyleReply();
    expect(result.Hinge).toBe("");
  });

  test("very long input does not crash", () => {
    const longText = "Hinge: Start\n" + "A".repeat(10000) + "\n\nMove: End";
    const result = parseAssistantStyleReply(longText);
    expect(result.Hinge).toBeDefined();
    expect(result.Move).toContain("End");
  });

  test("input with only whitespace returns empty sections", () => {
    const result = parseAssistantStyleReply("   \n  \n  ");
    expect(result.Hinge).toBe("");
  });

  test("input with special characters is handled", () => {
    const input = "Hinge: Price is $100.00 (was $120.00) — 20% off!\n\nFacts: SKU #1234-5678";
    const result = parseAssistantStyleReply(input);
    expect(result.Hinge).toContain("$100.00");
    expect(result.Facts).toContain("SKU");
  });
});
