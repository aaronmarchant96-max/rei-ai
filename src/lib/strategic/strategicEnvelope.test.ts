import { extractStrategicEnvelope } from "./strategicEnvelope";

const situation = {
  schemaVersion: 1, detected: true,
  evidence: [],
  players: [
    { id: "finance", name: "Finance", role: "owner", power: "high", vetoCapability: false, exitCapability: false, objectives: [] },
    { id: "dev", name: "Developers", role: "users", power: "medium", vetoCapability: false, exitCapability: true, objectives: [] },
  ],
  rules: [], objectives: [], incentives: [], constraints: [], strategies: [], conflicts: [], alternatives: [],
  alignment: "unknown", falsificationConditions: [],
};
const envelope = (value: unknown) => `<rei-strategic-envelope>\n${JSON.stringify(value)}\n</rei-strategic-envelope>`;

test("strategic envelopes are trailing, singular, bounded, and fail closed without losing the answer", () => {
  const valid = extractStrategicEnvelope(`Visible answer.\n\n${envelope(situation)}`);
  expect(valid.visibleText).toBe("Visible answer.");
  expect(valid.strategicSituation?.players).toHaveLength(2);
  expect(valid.status).toBe("accepted");

  const rejected = [
    `Answer\n${envelope(situation)}\nextra`,
    `Answer\n${envelope(situation)}\n${envelope(situation)}`,
    `Answer\n${envelope({ ...situation, unknownField: true })}`,
    `Answer\n<rei-strategic-envelope>{bad json}</rei-strategic-envelope>`,
    `Answer\n\`\`\`text\n${envelope(situation)}\n\`\`\``,
    `Answer\n> ${envelope(situation)}`,
  ];
  for (const raw of rejected) {
    const result = extractStrategicEnvelope(raw);
    expect(result.strategicSituation).toBeNull();
    expect(result.status).toBe("rejected");
    expect(result.visibleText).toContain("Answer");
  }

  const absent = extractStrategicEnvelope("Ordinary answer only.");
  expect(absent).toEqual({ visibleText: "Ordinary answer only.", strategicSituation: null, status: "absent" });
});
