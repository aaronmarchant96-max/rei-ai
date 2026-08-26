import { buildCanonicalAuditJson, buildAuditMarkdown } from "../../src/lib/pilotExport/index";
import { buildExecutivePilotReport } from "../../src/lib/pilotReport";
import type { CanonicalPilotRequest } from "../../src/lib/pilotIngest/types";
import { buildProvenance } from "../../src/lib/pilotIngest/contract";

describe("PR C1 Pilot Export — Canonical JSON & Markdown Suite", () => {
  const requests: CanonicalPilotRequest[] = [
    {
      id: "req_1",
      currency: "USD",
      model: "gpt-4o",
      prompt: "Analyze code",
      inputTokens: 100,
      outputTokens: 50,
      actualCost: 0.002,
      replayEligible: true,
      provenance: buildProvenance("openai", true, true, true),
    },
    {
      id: "req_2",
      currency: "USD",
      model: "gpt-4o",
      prompt: "Summarize text",
      inputTokens: 200,
      outputTokens: 80,
      actualCost: 0.004,
      replayEligible: true,
      provenance: buildProvenance("openai", true, true, true),
    },
    {
      id: "req_3",
      currency: "USD",
      model: "gpt-4o",
      prompt: "Extract data",
      inputTokens: 150,
      outputTokens: 60,
      actualCost: 0.003,
      replayEligible: true,
      provenance: buildProvenance("openai", true, true, true),
    },
    {
      id: "req_4",
      currency: "USD",
      model: "gpt-4o",
      // missing prompt
      inputTokens: 120,
      outputTokens: 30,
      replayEligible: false,
      exclusionCode: "no_routing_input",
      provenance: buildProvenance("openai", false, false, true),
    },
  ];

  it("generates machine-verifiable JSON export package with schemaVersion 2.0", () => {
    const report = buildExecutivePilotReport(requests);
    const jsonStr = buildCanonicalAuditJson(report);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.schemaVersion).toBe("2.0");
    expect(parsed.auditReport.totalRequestsEvaluated).toBe(4);
    expect(parsed.auditReport.replayEligibleRequests).toBe(3);
    expect(parsed.auditReport.excludedRequests).toBe(1);
  });

  it("generates structured executive Markdown containing the 3-bucket table and denominator audit", () => {
    const report = buildExecutivePilotReport(requests);
    const md = buildAuditMarkdown(report);

    expect(md).toContain("# REI.ai Decision Audit Report");
    expect(md).toContain("Candidate to Shadow");
    expect(md).toContain("Retain Current Tier");
    expect(md).toContain("Insufficient Evidence");
    expect(md).toContain("no_routing_input");
    expect(md).toContain("Why Trust This Audit?");
    expect(md).not.toContain("DEPLOY"); // Invariant: No raw "DEPLOY"
  });
});
