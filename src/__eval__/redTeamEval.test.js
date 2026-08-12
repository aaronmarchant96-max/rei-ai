import { readFileSync } from "node:fs";
import { join } from "node:path";
import { scanRedTeamInput } from "../lib/redTeamScanner";
import { buildRouterDecision } from "../lib/nightShiftRouter";

const FIXTURE = readFileSync(join(__dirname, "fixtures", "redteam-corpus.json"), "utf8");
const CORPUS = JSON.parse(FIXTURE);

function evaluateCase(tc) {
  const scanResult = scanRedTeamInput(tc.input);
  const routerDecision = buildRouterDecision({
    input: tc.input,
    domain: tc.domain || "assistant",
    history: [],
    attachedRecord: "",
  });

  const wasAdversarialRoute = routerDecision.id === "adversarial-validation";
  const routeExpected = scanResult.escalateToD2;
  const routeCorrect = routeExpected === wasAdversarialRoute;

  return {
    id: tc.id,
    label: tc.label,
    input: tc.input,
    scanVerdict: scanResult.verdict,
    scanScore: scanResult.score,
    scanEscalated: scanResult.escalateToD2,
    scanFindings: scanResult.findings.length,
    scanCategories: scanResult.findings.map((f) => f.category),
    routeId: routerDecision.id,
    routeModel: routerDecision.model,
    wasAdversarialRoute,
    routeExpected,
    routeCorrect,
    notes: tc.notes || "",
    expected: {
      scannerVerdict: tc.expectedScannerVerdict,
      escalateToD2: tc.expectedEscalateToD2,
      routeToAdversarial: tc.expectedRouteToAdversarial,
      routeCorrect: tc.expectedRouteCorrect,
      categoriesHit: tc.categoriesHit,
    },
  };
}

function runCorpus() {
  return CORPUS.cases.map(evaluateCase);
}

describe("Red Team Eval — attack corpus → scanner → router → routeCorrect", () => {
  const results = runCorpus();

  // ── Individual case assertions ───────────────────────────────────────

  for (const r of results) {
    it(r.label, () => {
      expect(r.scanVerdict).toBe(r.expected.scannerVerdict);
      expect(r.scanEscalated).toBe(r.expected.escalateToD2);
      expect(r.wasAdversarialRoute).toBe(r.expected.routeToAdversarial);
      expect(r.routeCorrect).toBe(r.expected.routeCorrect);

      if (r.expected.categoriesHit.length > 0) {
        for (const cat of r.expected.categoriesHit) {
          expect(r.scanCategories).toContain(cat);
        }
      }
    });
  }

  // ── Aggregate assertions ─────────────────────────────────────────────

  it("every case reports routeCorrect consistently with expectations", () => {
    for (const r of results) {
      if (r.expected.routeCorrect) {
        expect(r.routeCorrect).toBe(true);
      } else {
        expect(r.routeCorrect).toBe(false);
      }
    }
  });

  it("detects all known high-risk categories in the corpus", () => {
    const allCategories = new Set(results.flatMap((r) => r.scanCategories));
    expect(allCategories.size).toBeGreaterThan(3);
  });

  it("does not double-count or lose entries", () => {
    expect(results.length).toBe(CORPUS.cases.length);
  });

  // ── Before/after artifact ────────────────────────────────────────────

  it("BEFORE/AFTER: direct injection now routes to adversarial (was a miss before ab7856f)", () => {
    const direct = results.find((r) => r.id === "direct-injection");
    expect(direct).toBeTruthy();
    expect(direct.wasAdversarialRoute).toBe(true);
    expect(direct.scanVerdict).toBe("high-risk");
    expect(direct.scanEscalated).toBe(true);
    expect(direct.routeCorrect).toBe(true);
    // The live eval loop caught this as routeCorrect=false before the
    // scanner escalation gate was added to isAdversarialRequest.
    // Commit ab7856f fixed it. This test locks the fix.
  });

  it("BEFORE/AFTER: educational framing does NOT escalate to adversarial", () => {
    const edu = results.find((r) => r.id === "educational-framing");
    expect(edu).toBeTruthy();
    expect(edu.wasAdversarialRoute).toBe(false);
    expect(edu.routeCorrect).toBe(true);
  });

  it("POST-FIX: no known router gaps remain — all escalated cases route to adversarial", () => {
    const escalated = results.filter((r) => r.scanEscalated);
    expect(escalated.length).toBeGreaterThan(0);
    const misses = escalated.filter((r) => !r.wasAdversarialRoute);
    // After the scanner escalation gate fix (ab7856f), every escalated case
    // is caught by isAdversarialRequest via scanRedTeamInput().escalateToD2.
    // If a miss appears here, it means a new D1 category has been added
    // whose confidence calculation differs — investigate before accepting.
    expect(misses.length).toBe(0);
    for (const e of escalated) {
      expect(e.wasAdversarialRoute).toBe(true);
      expect(e.routeCorrect).toBe(true);
    }
  });

  // ── Benchmark report ─────────────────────────────────────────────────

  describe("Benchmark Report — copyable for CLAIM_LEDGER", () => {
    it("RED-TEAM-EVAL: prints per-case result table and aggregate stats", () => {
      const total = results.length;
      const correct = results.filter((r) => r.routeCorrect).length;
      const incorrect = total - correct;
      const escalated = results.filter((r) => r.scanEscalated).length;
      const routedAdversarial = results.filter((r) => r.wasAdversarialRoute).length;
      const scannerHits = results.filter((r) => r.scanFindings > 0).length;
      const scannerClean = total - scannerHits;
      const routerMisses = results.filter((r) => r.scanEscalated && !r.wasAdversarialRoute).length;
      const falsePositives = results.filter((r) => !r.scanEscalated && r.wasAdversarialRoute).length;

      console.log("\n═══════════════════════════════════════════════════════");
      console.log(" RED-TEAM EVAL — deterministic router-vs-scanner audit");
      console.log("═══════════════════════════════════════════════════════");
      console.log(` Corpus:      ${total} cases`);
      console.log(` Route correct: ${correct}/${total} (${Math.round((correct / total) * 100)}%)`);
      console.log(` Route incorrect: ${incorrect}/${total}`);
      console.log(` Router false positives: ${falsePositives}`);
      console.log(` Router misses (scanner escalated, router didn't go adversarial): ${routerMisses}`);
      console.log(` Scanner hits: ${scannerHits}/${total}`);
      console.log(` Scanner clean: ${scannerClean}/${total}`);
      console.log(` Escalated to D2:  ${escalated}/${scannerHits}`);
      console.log(` Routed adversarial: ${routedAdversarial}/${routedAdversarial + (escalated - routerMisses)}`);
      console.log("───────────────────────────────────────────────────────");

      for (const r of results) {
        const check = r.routeCorrect ? "✓" : "✗";
        const adversarial = r.wasAdversarialRoute ? "ADV" : r.routeId.slice(0, 6);
        console.log(
          ` ${check} ${r.id.padEnd(28)} ${r.scanVerdict.padEnd(12)} ` +
          `${String(r.scanScore).padEnd(4)} esc:${String(r.scanEscalated).padEnd(6)} ` +
          `route:${adversarial.padEnd(6)} correct:${r.routeCorrect}`
        );
      }

      console.log("───────────────────────────────────────────────────────");
      console.log(" Before/after artifact: direct-injection fix (ab7856f)");
      console.log(` Deliberate gaps preserved: ${results.filter(r => !r.expected.routeCorrect).map(r => r.id).join(", ")}`);
      console.log(` Categories covered: ${new Set(results.flatMap(r => r.scanCategories)).size}`);
      console.log("═══════════════════════════════════════════════════════\n");
    });
  });
});
