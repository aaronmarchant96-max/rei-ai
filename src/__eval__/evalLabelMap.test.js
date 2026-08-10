/**
 * evalLabelMap.test.js — regression tests for the canonical route registry.
 *
 * Locks in the two historical failures this gate exists to catch:
 *   (1) the phantom "Fact Check" route — a canonical category that maps to a
 *       fingerprint id that does not exist (b2ed578 measurement contamination);
 *   (2) the "Coding Hinge" → "The Engineer" rename — a fingerprint label with
 *       no intentional mapping, or a legacy alias that drifts to a different
 *       canonical category.
 */
import {
  LABEL_TO_CATEGORY,
  CATEGORY_TO_ROUTE_ID,
  EXCLUDED_CATEGORIES,
  LEGACY_ALIASES,
  normalizeLabel,
  normalizeRouteId,
  validateEvalIntegrity,
} from "./evalLabelMap";

// The real 7-route catalog from data/fingerprints.json (id → label).
const REAL_FINGERPRINTS = [
  { id: "simple-greeting", label: "Simple Greeting" },
  { id: "structured-reasoning", label: "Structured Reasoning" },
  { id: "coding-hinge", label: "The Engineer" },
  { id: "genealogy-deep-dive", label: "Genealogy Deep Dive" },
  { id: "story-architect", label: "Story Architect" },
  { id: "adversarial-validation", label: "Adversarial Validation" },
  { id: "legal-hinge", label: "Legal Hinge" },
];

describe("evalLabelMap registry", () => {
  test("healthy against the real fingerprint catalog", () => {
    const issues = validateEvalIntegrity(REAL_FINGERPRINTS);
    expect(issues).toEqual([]);
  });

  test("renamed label keeps its backwards-compatible alias at the same category", () => {
    expect(LABEL_TO_CATEGORY["Coding Hinge"]).toBe("coding");
    expect(LABEL_TO_CATEGORY["The Engineer"]).toBe("coding");
    expect(LEGACY_ALIASES["Coding Hinge"]).toBe("The Engineer");
  });

  test("phantom route fails the gate unless declared excluded", () => {
    // The exact historical failure class: a display label normalizes to a
    // category that has NO fingerprint route and is NOT declared excluded.
    // Simulate it by adding a ghost label to the registry and re-validating.
    const ghost = "Ghost Check";
    try {
      LABEL_TO_CATEGORY[ghost] = "ghostCheck"; // not in CATEGORY_TO_ROUTE_ID nor EXCLUDED_CATEGORIES
      const issues = validateEvalIntegrity(REAL_FINGERPRINTS);
      expect(issues.some((i) => i.type === "error" && i.message.includes("ghostCheck"))).toBe(true);
    } finally {
      delete LABEL_TO_CATEGORY[ghost];
    }
  });

  test("a fingerprint renamed with no mapping fails the gate", () => {
    // Simulate the catalog renaming "The Engineer" to something the registry
    // does not know: every fingerprint label must have an intentional mapping.
    const renamed = [
      { id: "coding-hinge", label: "The Magician" }, // not in LABEL_TO_CATEGORY
    ];
    const issues = validateEvalIntegrity(renamed);
    expect(issues.some((i) => i.type === "error" && i.message.includes("The Magician"))).toBe(true);
  });

  test("legacy alias that drifts category fails the gate", () => {
    // Temporarily drift the alias to a different canonical category than its
    // replacement; the gate must flag it. Restored in finally.
    const goodCategory = LABEL_TO_CATEGORY["Coding Hinge"];
    try {
      LABEL_TO_CATEGORY["Coding Hinge"] = "creative"; // drift vs "The Engineer"→"coding"
      const issues = validateEvalIntegrity(REAL_FINGERPRINTS);
      expect(issues.some((i) => i.type === "error" && i.message.includes("legacy alias"))).toBe(true);
    } finally {
      LABEL_TO_CATEGORY["Coding Hinge"] = goodCategory;
    }
  });

  test("excluded category carries a reason", () => {
    expect(EXCLUDED_CATEGORIES.factCheck).toBeTruthy();
  });

  test("normalizeLabel resolves labels and degrades to unknown", () => {
    expect(normalizeLabel("The Engineer")).toBe("coding");
    expect(normalizeLabel("Coding Hinge")).toBe("coding");
    expect(normalizeLabel("Story Architect")).toBe("creative");
    expect(normalizeLabel("Made Up Label")).toBe("unknown");
  });

  test("normalizeRouteId resolves route ids and degrades to unknown", () => {
    expect(normalizeRouteId("coding-hinge")).toBe("coding");
    expect(normalizeRouteId("simple-greeting")).toBe("greeting");
    expect(normalizeRouteId("nope")).toBe("unknown");
  });

  test("every canonical category maps to a route id present in the catalog", () => {
    const routeIds = new Set(REAL_FINGERPRINTS.map((f) => f.id));
    for (const routeId of Object.values(CATEGORY_TO_ROUTE_ID)) {
      expect(routeIds.has(routeId)).toBe(true);
    }
  });
});
