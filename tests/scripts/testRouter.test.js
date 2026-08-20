import { resolveRoute, parseGitDiffStatus, TIERS, INFRASTRUCTURE_PATTERNS } from "../../scripts/test-router.mjs";

describe("Deterministic Test Router — resolveRoute() Scenario Suite", () => {
  describe("1. Explicit Command-Line Targets", () => {
    test.each([
      ["full", "full-gate", true, false, false],
      ["gate", "full-gate", true, false, false],
      ["all", "full-gate", true, false, false],
      ["visual", "visual-layout", false, true, true],
      ["layout", "visual-layout", false, true, true],
      ["ui", "ui-workspace", false, true, false],
      ["core", "core-router", false, false, false],
      ["api", "api-serverless", false, false, false],
      ["security", "security-guard", false, false, false],
      ["eval", "eval-replay", false, false, false],
    ])("routes target '%s' to tier '%s'", (target, expectedId, expectedFull, expectedIncludeVisual, expectedVisualOnly) => {
      const decision = resolveRoute(target, []);
      expect(decision.tier.id).toBe(expectedId);
      expect(decision.isFull).toBe(expectedFull);
      expect(decision.includeVisual).toBe(expectedIncludeVisual);
      expect(decision.isVisualOnly).toBe(expectedVisualOnly);
    });

    it("routes custom path/pattern directly", () => {
      const decision = resolveRoute("src/lib/myCustom.test.js", []);
      expect(decision.tierKey).toBe("custom");
      expect(decision.patterns).toEqual(["src/lib/myCustom.test.js"]);
      expect(decision.isFull).toBe(false);
    });
  });

  describe("2. Single-Subsystem Git Diffs", () => {
    test.each([
      [["src/lib/nightShiftRouter.js"], "core", "core-router", false],
      [["src/lib/hingeClassifier.js"], "core", "core-router", false],
      [["src/domains/story.js"], "core", "core-router", false],
      [["data/fingerprints.json"], "core", "core-router", false],
      [["api/cfai.js"], "api", "api-serverless", false],
      [["api/v1/chat/completions.js"], "api", "api-serverless", false],
      [["shared/lib/kv.js"], "api", "api-serverless", false],
      [["src/lib/cardoGuard.js"], "security", "security-guard", false],
      [["src/lib/redTeamScanner.js"], "security", "security-guard", false],
      [["src/lib/costReplayStats.ts"], "eval", "eval-replay", false],
      [["src/lib/pilotEval.ts"], "eval", "eval-replay", false],
      [["docs/CLAIM_LEDGER.md"], "eval", "eval-replay", false],
      [["src/components/ErrorBoundary.jsx"], "ui", "ui-workspace", false],
    ])("routes %j to tier '%s' [%s]", (files, expectedTierKey, expectedId, expectedVisual) => {
      const decision = resolveRoute(null, files);
      expect(decision.tierKey).toBe(expectedTierKey);
      expect(decision.tier.id).toBe(expectedId);
      expect(decision.includeVisual).toBe(expectedVisual);
      expect(decision.isFull).toBe(false);
    });
  });

  describe("3. Layout & CSS Visual Triggering", () => {
    test.each([
      [["src/styles/reiTheme.css"]],
      [["src/style.css"]],
      [["src/AppShell.jsx"]],
      [["src/REI.jsx"]],
      [["src/modules/rei/components/WelcomePanel.jsx"]],
      [["src/components/InstrumentRail.jsx"]],
    ])("flags includeVisual: true for layout-sensitive diff %j", (files) => {
      const decision = resolveRoute(null, files);
      expect(decision.tierKey).toBe("ui");
      expect(decision.includeVisual).toBe(true);
      expect(decision.isVisualOnly).toBe(false);
    });
  });

  describe("4. Fail-Closed Infrastructure & Unclassified Routing", () => {
    test.each([
      [["package.json"]],
      [["package-lock.json"]],
      [["jest.config.cjs"]],
      [["tsconfig.json"]],
      [["babel.config.cjs"]],
      [["vite.config.js"]],
      [["scripts/test-router.mjs"]],
      [["scripts/gen-claims.mjs"]],
      [["scripts/validate-docs.mjs"]],
      [[".env"]],
      [[".gitlab-ci.yml"]],
      [["unrecognized_file.xyz"]],
      [["random/path/something.dat"]],
    ])("fails closed to full-gate for %j", (files) => {
      const decision = resolveRoute(null, files);
      expect(decision.isFull).toBe(true);
      expect(decision.tier.id).toBe("full-gate");
    });
  });

  describe("5. Direct Test Modifications & Unioning", () => {
    it("routes directly modified test files when only test files change", () => {
      const decision = resolveRoute(null, ["src/lib/nightShiftRouter.test.js", "tests/api/cfai.test.js"]);
      expect(decision.tierKey).toBe("direct-tests");
      expect(decision.patterns).toEqual(["src/lib/nightShiftRouter.test.js", "tests/api/cfai.test.js"]);
      expect(decision.isFull).toBe(false);
    });

    it("unions direct test files into selected subsystem patterns", () => {
      const decision = resolveRoute(null, ["src/REI.jsx", "tests/api/cfai.test.js"]);
      expect(decision.tierKey).toBe("ui");
      expect(decision.patterns).toContain("src/REI.test.jsx");
      expect(decision.patterns).toContain("tests/api/cfai.test.js");
      expect(decision.directTestFiles).toEqual(["tests/api/cfai.test.js"]);
    });
  });

  describe("6. Multi-Tier Subsystems", () => {
    it("combines patterns across multiple active subsystem domains", () => {
      const decision = resolveRoute(null, ["src/REI.jsx", "src/lib/nightShiftRouter.js"]);
      expect(decision.tierKey).toBe("multi-tier");
      expect(decision.patterns).toContain("src/REI.test.jsx");
      expect(decision.patterns).toContain("src/lib/nightShiftRouter.test.js");
      expect(decision.includeVisual).toBe(true); // From REI.jsx
      expect(decision.isFull).toBe(false);
    });
  });

  describe("7. Clean Branch & Rename Semantics", () => {
    it("routes clean branch with no diffs to core reasoning sanity route", () => {
      const decision = resolveRoute(null, []);
      expect(decision.tierKey).toBe("core");
      expect(decision.tier.id).toBe("core-router");
      expect(decision.isFull).toBe(false);
    });

    it("fails closed when unresolvable feature branch is flagged", () => {
      const decision = resolveRoute(null, ["__UNRESOLVABLE_FEATURE_BRANCH_BASE__"]);
      expect(decision.isFull).toBe(true);
      expect(decision.tier.id).toBe("full-gate");
    });

    it("correctly parses git diff rename records (R100 old new)", () => {
      const gitOutput = "R100\tsrc/lib/oldRouter.js\tsrc/lib/nightShiftRouter.js\nM\tapi/cfai.js";
      const files = parseGitDiffStatus(gitOutput);
      expect(files).toContain("src/lib/oldRouter.js");
      expect(files).toContain("src/lib/nightShiftRouter.js");
      expect(files).toContain("api/cfai.js");
      expect(files.length).toBe(3);
    });
  });
});
