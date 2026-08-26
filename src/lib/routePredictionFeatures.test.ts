import {
  derivePredictionFeatures,
  hingeBandForScore,
  adversarialBandForVerdict,
  inputSizeBandForLength,
} from "./routePredictionFeatures";

describe("derivePredictionFeatures — deterministic pre-execution derivation", () => {
  it("identical pre-execution input → identical feature vector", () => {
    const a = derivePredictionFeatures({ routeId: "structured-reasoning", hingeScore: 0.4, inputLength: 1200 });
    const b = derivePredictionFeatures({ routeId: "structured-reasoning", hingeScore: 0.4, inputLength: 1200 });
    expect(a).toEqual(b);
  });

  it("prompt wording changes that preserve signals produce the same vector", () => {
    // Length is what matters, not the words — a 1200-char prompt is a 1200-char prompt.
    const a = derivePredictionFeatures({ routeId: "legal-hinge", hingeScore: 0.2, inputLength: 1200 });
    const b = derivePredictionFeatures({ routeId: "legal-hinge", hingeScore: 0.2, inputLength: 1200 });
    expect(a).toEqual(b);
  });

  it("returns null when routeId is missing (feature derivation fails → no prediction)", () => {
    expect(derivePredictionFeatures({ routeId: "" })).toBeNull();
    expect(derivePredictionFeatures({ routeId: "   " })).toBeNull();
  });

  it("never persists the raw prompt — only the length-derived band", () => {
    const features = derivePredictionFeatures({ routeId: "r", inputLength: 800 });
    expect(features).not.toHaveProperty("prompt");
    expect(features).not.toHaveProperty("inputPreview");
    expect(features).not.toHaveProperty("text");
    expect(features?.inputSizeBand).toBe("small");
    expect(JSON.stringify(features)).not.toContain("prompt");
  });

  it("feature vector contains only pre-execution fields", () => {
    const features = derivePredictionFeatures({
      routeId: "r",
      domain: "assistant",
      selectedModel: "model-A",
      hingeScore: 0.4,
      structured: true,
      escalationExpected: false,
      adversarialVerdict: "clean",
      inputLength: 100,
    });
    const keys = Object.keys(features as object).sort();
    expect(keys).toEqual([
      "adversarialBand",
      "domain",
      "escalationExpected",
      "hingeBand",
      "inputSizeBand",
      "routeId",
      "schemaVersion",
      "selectedModel",
      "structured",
    ]);
    // None of these outcome-side fields may exist:
    for (const leak of ["resolvedModel", "actualCost", "actualTokens", "status", "truncated", "finalTruncated", "rescue", "continuations", "qualityScore", "safetyVerdict", "routeCorrect"]) {
      expect(features).not.toHaveProperty(leak);
    }
  });
});

describe("hingeBandForScore — reuses existing complexity thresholds", () => {
  test.each<[number | undefined, string]>([
    [0.0, "low"],
    [0.29, "low"],
    [0.3, "medium"],
    [0.49, "medium"],
    [0.5, "high"],
    [0.99, "high"],
    [undefined, "unknown"],
    [NaN, "unknown"],
  ])("score %s → %s", (score, expected) => {
    expect(hingeBandForScore(score)).toBe(expected);
  });
});

describe("adversarialBandForVerdict — maps D1 verdicts", () => {
  test.each<[string | null | undefined, string]>([
    ["clean", "clean"],
    ["suspicious", "suspicious"],
    ["high-risk", "high"],
    ["critical", "high"],
    [null, "unknown"],
    [undefined, "unknown"],
    ["garbage", "unknown"],
  ])("verdict %s → %s", (verdict, expected) => {
    expect(adversarialBandForVerdict(verdict)).toBe(expected);
  });
});

describe("inputSizeBandForLength — v1 size thresholds", () => {
  test.each<[number | undefined, string]>([
    [0, "tiny"],
    [250, "tiny"],
    [251, "small"],
    [1000, "small"],
    [1001, "medium"],
    [4000, "medium"],
    [4001, "large"],
    [16000, "large"],
    [16001, "very-large"],
    [undefined, "unknown"],
    [-1, "unknown"],
    [NaN, "unknown"],
  ])("length %s → %s", (length, expected) => {
    expect(inputSizeBandForLength(length)).toBe(expected);
  });
});

describe("derivePredictionFeatures — relevant changes alter only corresponding features", () => {
  const base = {
    routeId: "structured-reasoning",
    domain: "assistant",
    selectedModel: "model-A",
    hingeScore: 0.4,
    structured: true,
    escalationExpected: false,
    adversarialVerdict: "clean",
    inputLength: 1000,
  };

  it("hinge change alters hingeBand only", () => {
    const a = derivePredictionFeatures(base);
    const b = derivePredictionFeatures({ ...base, hingeScore: 0.9 });
    expect(b?.hingeBand).toBe("high");
    expect(a?.hingeBand).toBe("medium");
    expect({ ...b, hingeBand: a?.hingeBand }).toEqual(a);
  });

  it("size change alters inputSizeBand only", () => {
    const a = derivePredictionFeatures(base);
    const b = derivePredictionFeatures({ ...base, inputLength: 20000 });
    expect(b?.inputSizeBand).toBe("very-large");
    expect(a?.inputSizeBand).toBe("small");
    expect({ ...b, inputSizeBand: a?.inputSizeBand }).toEqual(a);
  });

  it("adversarial verdict change alters adversarialBand only", () => {
    const a = derivePredictionFeatures(base);
    const b = derivePredictionFeatures({ ...base, adversarialVerdict: "critical" });
    expect(b?.adversarialBand).toBe("high");
    expect(a?.adversarialBand).toBe("clean");
    expect({ ...b, adversarialBand: a?.adversarialBand }).toEqual(a);
  });
});
