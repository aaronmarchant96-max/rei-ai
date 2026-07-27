import { parseEvidenceTiers, estimateEvidenceTokens } from "../components/EvidenceCard.jsx";

describe("Evidence Eval — parseEvidenceTiers", () => {
  test("single primary source claim", () => {
    const result = parseEvidenceTiers(
      "🟢 Primary Source: Charles Dyer served in the 12th Virginia Regiment."
    );
    expect(result).toHaveLength(1);
    expect(result[0].tier).toBe("primary");
    expect(result[0].label).toBe("Primary Source");
    expect(result[0].claim).toBe("Charles Dyer served in the 12th Virginia Regiment.");
  });

  test("multi-tier response with three claims", () => {
    const result = parseEvidenceTiers([
      "🟢 Primary Source: Census 1850 confirms residence in Davidson County.",
      "🔵 Strong Evidence: Land deed from 1823 names Josiah Ramsey Sr.",
      "🟠 Needs Review: Birth year disagrees across census records.",
    ].join("\n"));
    expect(result).toHaveLength(3);
    expect(result[0].tier).toBe("primary");
    expect(result[1].tier).toBe("strong");
    expect(result[2].tier).toBe("needs-review");
  });

  test("non-genealogy text returns empty array", () => {
    const result = parseEvidenceTiers(
      "Hinge: The API is broken.\nFacts: The endpoint returns 500.\nMove: Roll back the deploy."
    );
    expect(result).toHaveLength(0);
  });

  test("mixed family memory and primary source with correct order", () => {
    const result = parseEvidenceTiers([
      "🟡 Family Memory: My grandmother said Charles moved to Missouri in 1820.",
      "🟢 Primary Source: Census 1850 shows him in Kentucky, not Missouri.",
    ].join("\n"));
    expect(result).toHaveLength(2);
    expect(result[0].tier).toBe("family-memory");
    expect(result[0].claim).toContain("grandmother");
    expect(result[1].tier).toBe("primary");
  });

  test("text with emoji but not evidence markers returns empty", () => {
    const result = parseEvidenceTiers(
      "🌙 Night Shift routing says this should use llama-3.3-70b.\nThe 🔵 is just a decorative circle."
    );
    expect(result).toHaveLength(0);
  });

  test("two-tier evidence with trailing newline before next tier", () => {
    const result = parseEvidenceTiers([
      "🟢 Primary Source: Marriage certificate dated April 1846 names William Moore and Isabella Law.",
      "",
      "🔵 Strong Evidence: Church register corroborates the same date and witnesses.",
    ].join("\n\n"));
    expect(result).toHaveLength(2);
    expect(result[0].tier).toBe("primary");
    expect(result[0].claim).toContain("Marriage certificate");
    expect(result[1].tier).toBe("strong");
    expect(result[1].claim).toContain("Church register");
  });

  test("single claim with multi-sentence body", () => {
    const result = parseEvidenceTiers(
      "🟢 Primary Source: Thomas Ramsey appears in the 1840 census for Davidson County, Tennessee. He is listed as head of household with three dependents. His age is recorded as 44, placing his birth year at approximately 1796."
    );
    expect(result).toHaveLength(1);
    expect(result[0].tier).toBe("primary");
    expect(result[0].claim).toContain("1840 census");
    expect(result[0].claim).toContain("1796");
  });

  test("empty input returns empty array", () => {
    expect(parseEvidenceTiers("")).toHaveLength(0);
    expect(parseEvidenceTiers(null)).toHaveLength(0);
    expect(parseEvidenceTiers(undefined)).toHaveLength(0);
  });
});

describe("Evidence Eval — estimateEvidenceTokens", () => {
  test("returns token estimate based on text length", () => {
    const short = estimateEvidenceTokens("Hi");
    const long = estimateEvidenceTokens("A".repeat(400));
    expect(short).toBeLessThan(long);
    expect(short).toBe(1);
    expect(long).toBe(100);
  });

  test("handles empty input", () => {
    expect(estimateEvidenceTokens("")).toBe(0);
    expect(estimateEvidenceTokens(null)).toBe(0);
  });
});
