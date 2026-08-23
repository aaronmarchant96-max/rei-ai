import { detectStrategicSituation } from "./detectStrategicSituation";
import { validateGameDefinition } from "./gameDefinition";

test("strategic detection is conservative and game definitions enforce epistemic discipline", () => {
  const cases = [
    ["Explain photosynthesis.", false],
    ["Alice and Bob discovered photosynthesis together.", false],
    ["Why won't our salespeople adopt the cheaper CRM even though management requires it?", true],
    ["Finance wants lower cost, but developers require override control. What will each group do?", true],
  ] as const;
  for (const [input, expected] of cases) {
    const result = detectStrategicSituation(input);
    expect(result.detected).toBe(expected);
    expect(result.reason).toEqual(expect.any(String));
  }

  const valid = validateGameDefinition({
    schemaVersion: 1,
    detected: true,
    evidence: [{ id: "user:1", statement: "Finance wants lower cost", sourceType: "user_statement", relation: "supports", claimRefs: ["i1"] }],
    players: [
      { id: "finance", name: "Finance", role: "budget owner", power: "high", vetoCapability: false, exitCapability: false, objectives: [] },
      { id: "developers", name: "Developers", role: "users", power: "medium", vetoCapability: false, exitCapability: true, objectives: [] },
    ],
    rules: [], objectives: [], constraints: [], strategies: [], conflicts: [], alternatives: [],
    incentives: [{
      actorId: "finance",
      direction: "toward",
      strength: "moderate",
      claim: { id: "i1", statement: "Finance favors lower cost", epistemicStatus: "inferred", evidenceRefs: ["user:1"], confidence: "moderate" },
    }],
    alignment: "conflicted",
    falsificationConditions: ["Finance rejects verified savings"],
  });
  expect(valid.valid).toBe(true);

  const invalid = validateGameDefinition({
    ...valid.value,
    incentives: [{
      actorId: "missing-actor",
      direction: "toward",
      strength: "strong",
      claim: { id: "i2", statement: "A proven secret motive", epistemicStatus: "observed", evidenceRefs: [], confidence: "strong" },
    }],
  });
  expect(invalid.valid).toBe(false);
  expect(invalid.errors).toEqual(expect.arrayContaining([
    expect.stringContaining("known player"),
    expect.stringContaining("observed claims require evidence"),
  ]));
});
