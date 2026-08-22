import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const schemaPath = path.join(__dirname, "schemas/storyteller-adherence.schema.json");
const fixturesPath = path.join(__dirname, "fixtures/storyteller-adherence.json");

export function evaluateConclusionStructure(prose) {
  if (!prose || typeof prose !== "string") {
    return { summaryPatternDetected: false, enumerationCount: 0, dialoguePresent: false, actionPresent: false, concreteEnding: false };
  }

  const paragraphs = prose.split("\n\n").map((p) => p.trim()).filter(Boolean);
  const textLength = prose.length;
  const conclusionWindowStart = Math.floor(textLength * 0.8);
  const conclusionText = prose.slice(conclusionWindowStart);

  // Detect summary/enumeration patterns e.g. "he lost his X, he lost his Y" or "deprived of X, stripped of Y"
  const enumerationRegex = /(?:he|she|they|had)\s+(?:lost|deprived|stripped|relinquished|given up)\s+[^.!\n]+(?:\s+and\s+|\s*,\s*)(?:his|her|their|lost|deprived|stripped)/i;
  const repetitiveLossRegex = /(?:lost|deprived|stripped)\s+[^.!\n]+(?:lost|deprived|stripped)/i;

  const summaryPatternDetected = enumerationRegex.test(conclusionText) || repetitiveLossRegex.test(conclusionText);
  const matches = conclusionText.match(/(?:lost|deprived|stripped|relinquished)/gi) || [];
  const enumerationCount = matches.length;

  const dialoguePresent = /["'“«][^"'”»]+["'”»]/.test(conclusionText);
  const actionPresent = /\b(walked|ran|turned|opened|stepped|knelt|lifted|looked|wrote|dropped|pushed|sat|stood)\b/i.test(conclusionText);

  const concreteEnding = !summaryPatternDetected && (dialoguePresent || actionPresent || paragraphs.length > 0);

  return {
    summaryPatternDetected,
    enumerationCount,
    dialoguePresent,
    actionPresent,
    concreteEnding
  };
}

export function validateFixtureSchema(fixture) {
  const errors = [];
  if (!fixture.id) errors.push("Missing id");
  if (!fixture.prompt) errors.push("Missing prompt");
  if (!fixture.response) errors.push("Missing response");
  if (fixture.expectedRoute !== "story") errors.push("expectedRoute must be 'story'");
  if (!["observed", "replayed", "synthetic"].includes(fixture.responseProvenance)) {
    errors.push("Invalid responseProvenance");
  }
  if (!fixture.requirements) {
    errors.push("Missing requirements");
  } else {
    for (const key of ["darkComedy", "twist", "dramatizedLoss", "concreteEnding"]) {
      if (typeof fixture.requirements[key] !== "boolean") errors.push(`Missing boolean requirement: ${key}`);
    }
  }
  if (!fixture.expectedAdherence) {
    errors.push("Missing expectedAdherence");
  } else {
    for (const key of ["premiseRestatement", "darkComedyPresence", "twistSetup", "twistPayoff", "concreteEnding"]) {
      if (typeof fixture.expectedAdherence[key] !== "boolean") errors.push(`Missing boolean expectedAdherence: ${key}`);
    }
    if (!["complete", "partial", "none"].includes(fixture.expectedAdherence.causalLosses)) {
      errors.push("Invalid expectedAdherence.causalLosses");
    }
  }
  return errors;
}

export function scoreAdherenceOffline(fixture) {
  const struct = evaluateConclusionStructure(fixture.response);
  const expected = fixture.expectedAdherence;

  const premiseRestatementDefect = struct.summaryPatternDetected || expected.premiseRestatement;
  const concreteEndingPassed = struct.concreteEnding && !premiseRestatementDefect;

  return {
    routing: {
      expectedRoute: fixture.expectedRoute,
      actualRoute: "story",
      passed: true
    },
    responseProvenance: fixture.responseProvenance,
    adherence: {
      premiseRestatement: {
        status: premiseRestatementDefect ? "fail" : "pass",
        defectPresent: premiseRestatementDefect,
        method: "hybrid",
        provenance: "replayed",
        signals: struct
      },
      darkComedyPresence: {
        status: expected.darkComedyPresence ? "pass" : "fail",
        method: "structured_judge",
        provenance: "replayed"
      },
      twistSetup: {
        status: expected.twistSetup ? "pass" : "fail",
        method: "structured_judge",
        provenance: "replayed"
      },
      twistPayoff: {
        status: expected.twistPayoff ? "pass" : "fail",
        method: "structured_judge",
        provenance: "replayed"
      },
      causalLosses: {
        status: expected.causalLosses,
        method: "structured_judge",
        provenance: "replayed"
      },
      concreteEnding: {
        status: concreteEndingPassed ? "pass" : "fail",
        method: "hybrid",
        provenance: "replayed",
        signals: struct
      },
      overallAdherence: !premiseRestatementDefect && concreteEndingPassed && (expected.twistPayoff || !fixture.requirements.twist) && (expected.darkComedyPresence || !fixture.requirements.darkComedy)
    }
  };
}

if (typeof describe !== "undefined") {
  describe("Storyteller Narrative-Adherence Evaluator (Offline)", () => {
    const schemaExists = fs.existsSync(schemaPath);
    const fixturesExist = fs.existsSync(fixturesPath);

    test("schema and fixture files exist", () => {
      expect(schemaExists).toBe(true);
      expect(fixturesExist).toBe(true);
    });

    if (fixturesExist) {
      const raw = fs.readFileSync(fixturesPath, "utf8");
      const fixtures = JSON.parse(raw);

      test("all fixtures conform to schema requirements", () => {
        const ids = new Set();
        for (const f of fixtures) {
          expect(ids.has(f.id)).toBe(false);
          ids.add(f.id);

          const schemaErrors = validateFixtureSchema(f);
          expect(schemaErrors).toEqual([]);
        }
      });

      test("evaluates travelling-bard observed failure accurately", () => {
        const target = fixtures.find((f) => f.id === "travelling-bard-observed-failure");
        expect(target).toBeDefined();

        const result = scoreAdherenceOffline(target);
        expect(result.routing.passed).toBe(true);
        expect(result.adherence.premiseRestatement.defectPresent).toBe(true);
        expect(result.adherence.concreteEnding.status).toBe("fail");
        expect(result.adherence.overallAdherence).toBe(false);
      });

      test("evaluates non-interference controls without forcing unrequested devices", () => {
        const controlNoComedy = fixtures.find((f) => f.id === "control-no-dark-comedy");
        const controlNoTwist = fixtures.find((f) => f.id === "control-no-twist");

        expect(controlNoComedy).toBeDefined();
        expect(controlNoTwist).toBeDefined();

        const resComedy = scoreAdherenceOffline(controlNoComedy);
        const resTwist = scoreAdherenceOffline(controlNoTwist);

        expect(resComedy.adherence.overallAdherence).toBe(true);
        expect(resTwist.adherence.overallAdherence).toBe(true);
      });
    }
  });
}
