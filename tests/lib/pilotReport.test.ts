import { buildExecutivePilotReport } from "../../src/lib/pilotReport";
import type { CanonicalPilotRequest } from "../../src/lib/pilotIngest/types";
import { buildProvenance } from "../../src/lib/pilotIngest/contract";

describe("PR B Pilot Report — 3-Bucket Traffic & Epistemic Audit Suite", () => {
  it("outputs SHADOW_PILOT_RECOMMENDED (never DEPLOY) for high-savings candidate traffic", () => {
    const requests: CanonicalPilotRequest[] = [
      {
        id: "req_1",
        currency: "USD",
        model: "gpt-4o",
        prompt: "Analyze market trend",
        inputTokens: 200,
        outputTokens: 50,
        actualCost: 0.005,
        replayEligible: true,
        provenance: buildProvenance("openai", true, true, true),
      },
      {
        id: "req_2",
        currency: "USD",
        model: "gpt-4o",
        prompt: "Summarize article",
        inputTokens: 300,
        outputTokens: 60,
        actualCost: 0.008,
        replayEligible: true,
        provenance: buildProvenance("openai", true, true, true),
      },
      {
        id: "req_3",
        currency: "USD",
        model: "gpt-4o",
        prompt: "Extract names",
        inputTokens: 150,
        outputTokens: 30,
        actualCost: 0.003,
        replayEligible: true,
        provenance: buildProvenance("openai", true, true, true),
      },
      {
        id: "req_4",
        currency: "USD",
        model: "gpt-4o",
        prompt: "Translate text",
        inputTokens: 180,
        outputTokens: 40,
        actualCost: 0.004,
        replayEligible: true,
        provenance: buildProvenance("openai", true, true, true),
      },
      {
        id: "req_5",
        currency: "USD",
        model: "gpt-4o",
        prompt: "Format CSV table",
        inputTokens: 220,
        outputTokens: 45,
        actualCost: 0.005,
        replayEligible: true,
        provenance: buildProvenance("openai", true, true, true),
      },
      {
        id: "req_6",
        currency: "USD",
        model: "gpt-4o",
        prompt: "Classify intent",
        inputTokens: 110,
        outputTokens: 20,
        actualCost: 0.002,
        replayEligible: true,
        provenance: buildProvenance("openai", true, true, true),
      },
    ];

    const report = buildExecutivePilotReport(requests);

    expect(report.recommendation).toBe("SHADOW_PILOT_RECOMMENDED");
    expect((report.recommendation as string)).not.toBe("DEPLOY");
    expect(report.segmentation.candidateToShadow.bucket).toBe("CANDIDATE_TO_SHADOW");
    expect(report.segmentation.candidateToShadow.requestCount).toBe(6);
    expect(report.sufficiency).toBe("LIMITED"); // Replay audit without outcome evidence is LIMITED
  });

  it("outputs CONTINUE_DATA_COLLECTION when data volume or evidence is insufficient", () => {
    const requests: CanonicalPilotRequest[] = [
      {
        id: "req_bad",
        currency: "USD",
        model: "gpt-4o",
        // missing prompt
        inputTokens: 100,
        outputTokens: 50,
        replayEligible: false,
        exclusionCode: "no_routing_input",
        provenance: buildProvenance("openai", false, false, true),
      },
    ];

    const report = buildExecutivePilotReport(requests);

    expect(report.recommendation).toBe("CONTINUE_DATA_COLLECTION");
    expect(report.sufficiency).toBe("INSUFFICIENT");
    expect(report.segmentation.insufficientEvidence.requestCount).toBe(1);
    expect(report.denominatorAudit.excludedCount).toBe(1);
    expect(report.denominatorAudit.exclusionBreakdown["no_routing_input"]).toBe(1);
  });

  it("classifies traffic cleanly across the 3 explicit buckets with exact denominator audit", () => {
    const requests: CanonicalPilotRequest[] = [
      // Candidate to shadow (premium model)
      {
        id: "req_1",
        currency: "USD",
        model: "gpt-4o",
        prompt: "Search web for news",
        inputTokens: 100,
        outputTokens: 50,
        actualCost: 0.002,
        replayEligible: true,
        provenance: buildProvenance("openai", true, true, true),
      },
      // Retain current tier (non-premium model)
      {
        id: "req_2",
        currency: "USD",
        model: "llama-3.1-8b",
        prompt: "Say hello",
        inputTokens: 10,
        outputTokens: 5,
        actualCost: 0.00001,
        replayEligible: true,
        provenance: buildProvenance("generic_json", true, true, true),
      },
      // Insufficient evidence (redacted prompt)
      {
        id: "req_3",
        currency: "USD",
        model: "gpt-4o",
        inputTokens: 200,
        outputTokens: 100,
        replayEligible: false,
        exclusionCode: "no_routing_input",
        provenance: buildProvenance("openai", false, false, true),
      },
    ];

    const report = buildExecutivePilotReport(requests);

    expect(report.totalRequestsEvaluated).toBe(3);
    expect(report.replayEligibleRequests).toBe(2);
    expect(report.excludedRequests).toBe(1);

    expect(report.segmentation.candidateToShadow.requestCount).toBe(1);
    expect(report.segmentation.retainCurrentTier.requestCount).toBe(1);
    expect(report.segmentation.insufficientEvidence.requestCount).toBe(1);
  });
});
