import { deRoboticize } from "./deRoboticize";

describe("deRoboticize — anti-regression, locks current strip behavior", () => {
  it("strips 'the X is' formulaic openers", () => {
    expect(deRoboticize("the hinge is the cost split.")).toBe("The cost split.");
    expect(deRoboticize("The hinge is the cost split.")).toBe("The cost split.");
    expect(deRoboticize("The core idea is to separate routing from economics.")).toBe(
      "To separate routing from economics."
    );
  });

  it("does NOT strip 'the X:' colon forms (is is mandatory in the current regex)", () => {
    // Locked behavior: the regex requires the word 'is' after 'the hinge'.
    // A colon alone ('the hinge: ...') is NOT matched, so it survives verbatim.
    expect(deRoboticize("The hinge: pick the paid floor.")).toBe("The hinge: pick the paid floor.");
    expect(deRoboticize("The key thing: cache is the lever.")).toBe("The key thing: cache is the lever.");
  });

  it("strips standalone 'Hinge:'/'hinge' opener", () => {
    expect(deRoboticize("Hinge: the model choice.")).toBe("The model choice.");
    expect(deRoboticize("Hinge the model choice")).toBe("The model choice");
  });

  it("strips trailing source citations", () => {
    expect(deRoboticize("The ceiling is the premium-conservative rate. (Source: modelRates.json)")).toBe(
      "The ceiling is the premium-conservative rate."
    );
    expect(deRoboticize("Verified last week. (source: the csv)")).toBe("Verified last week.");
  });

  it("returns null / empty / undefined inputs unchanged", () => {
    expect(deRoboticize(null)).toBe(null);
    expect(deRoboticize("")).toBe("");
    expect(deRoboticize(undefined)).toBe(undefined);
  });

  it("leaves ordinary prose untouched", () => {
    const plain = "REI routes each request to the cheapest model that still passes the safety floor.";
    expect(deRoboticize(plain)).toBe(plain);
  });

  it("does NOT strip AI-slop patterns that are not openers (those belong to detectAISlop)", () => {
    // Complementary tools, non-overlapping: deRoboticize only removes leading
    // formulaic openers + trailing source citations. Mid-sentence AI-slop
    // phrasing ('Unleash ...') is untouched here.
    expect(deRoboticize("Unleash the full potential of your AI spend.")).toBe(
      "Unleash the full potential of your AI spend."
    );
  });
});
