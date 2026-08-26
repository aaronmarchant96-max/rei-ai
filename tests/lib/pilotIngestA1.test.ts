import {
  generateDeterministicRequestId,
  validateRequestReplayEligibility,
  buildProvenance,
  DEFAULT_MAX_SIZE_BYTES,
  DEFAULT_MAX_ROWS,
} from "../../src/lib/pilotIngest/contract";
import type { CanonicalPilotRequest } from "../../src/lib/pilotIngest/types";

describe("PR A1 Pilot Ingestion — Contract & Determinism Suite", () => {
  describe("Invariant 1: ingestable ≠ replay-routable", () => {
    it("marks empty, undefined, or whitespace-only prompt as replayEligible: false with exclusionCode: 'no_routing_input'", () => {
      const resUndefined = validateRequestReplayEligibility(undefined);
      expect(resUndefined.replayEligible).toBe(false);
      expect(resUndefined.exclusionCode).toBe("no_routing_input");

      const resEmpty = validateRequestReplayEligibility("");
      expect(resEmpty.replayEligible).toBe(false);
      expect(resEmpty.exclusionCode).toBe("no_routing_input");

      const resWhitespace = validateRequestReplayEligibility("   \n\t ");
      expect(resWhitespace.replayEligible).toBe(false);
      expect(resWhitespace.exclusionCode).toBe("no_routing_input");
    });

    it("marks non-empty prompt text as replayEligible: true without exclusionCode", () => {
      const resValid = validateRequestReplayEligibility("What is the capital of France?");
      expect(resValid.replayEligible).toBe(true);
      expect(resValid.exclusionCode).toBeUndefined();
    });
  });

  describe("Deterministic Request Identity", () => {
    it("produces byte-equivalent hash IDs for identical row payloads", () => {
      const id1 = generateDeterministicRequestId("openai", "gpt-4o", 150, 45, "2026-08-26T00:00:00Z", "Analyze prompt");
      const id2 = generateDeterministicRequestId("openai", "gpt-4o", 150, 45, "2026-08-26T00:00:00Z", "Analyze prompt");

      expect(id1).toBe(id2);
      expect(id1).toMatch(/^req_ope_[0-9a-f]{8}$/);
    });

    it("produces distinct hash IDs when timestamp, tokens, or model differ", () => {
      const id1 = generateDeterministicRequestId("openai", "gpt-4o", 150, 45, "2026-08-26T00:00:00Z", "Analyze prompt");
      const id2 = generateDeterministicRequestId("openai", "gpt-4o", 151, 45, "2026-08-26T00:00:00Z", "Analyze prompt");
      const id3 = generateDeterministicRequestId("anthropic", "gpt-4o", 150, 45, "2026-08-26T00:00:00Z", "Analyze prompt");

      expect(id1).not.toBe(id2);
      expect(id1).not.toBe(id3);
    });
  });

  describe("Field-Level Provenance Construction", () => {
    it("constructs accurate multi-axis provenance objects", () => {
      const provObserved = buildProvenance("openai", true, true, true);
      expect(provObserved).toEqual({
        source: "openai",
        traffic: "observed",
        cost: "observed",
        routingInput: "observed",
        tokens: "observed",
      });

      const provRedacted = buildProvenance("csv", false, false, true);
      expect(provRedacted).toEqual({
        source: "csv",
        traffic: "observed",
        cost: "derived",
        routingInput: "redacted",
        tokens: "observed",
      });
    });
  });

  describe("Resource Limit Defaults", () => {
    it("exports 50MB max file size and 100,000 max row bounds", () => {
      expect(DEFAULT_MAX_SIZE_BYTES).toBe(50 * 1024 * 1024);
      expect(DEFAULT_MAX_ROWS).toBe(100000);
    });
  });

  describe("Canonical Request Type Compliance", () => {
    it("instantiates a valid CanonicalPilotRequest object", () => {
      const req: CanonicalPilotRequest = {
        id: "req_ope_12345678",
        currency: "USD",
        model: "gpt-4o",
        inputTokens: 100,
        outputTokens: 50,
        replayEligible: true,
        provenance: buildProvenance("openai", true, true, true),
      };

      expect(req.currency).toBe("USD");
      expect(req.replayEligible).toBe(true);
      expect(req.exclusionCode).toBeUndefined();
    });
  });
});
