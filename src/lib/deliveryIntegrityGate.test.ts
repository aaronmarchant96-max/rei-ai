import { evaluateDeliveryIntegrity, normalizeFinishReason } from "./deliveryIntegrityGate";

describe("Delivery Integrity Gate — Unit & Fault Injection Battery", () => {
  describe("1. Finish Reason Normalization", () => {
    test("normalizes provider raw finish reasons correctly", () => {
      expect(normalizeFinishReason("stop")).toBe("stop");
      expect(normalizeFinishReason("END_TURN")).toBe("stop");
      expect(normalizeFinishReason("MAX_TOKENS")).toBe("length");
      expect(normalizeFinishReason("length")).toBe("length");
      expect(normalizeFinishReason("content_filter")).toBe("content_filter");
      expect(normalizeFinishReason("safety")).toBe("content_filter");
      expect(normalizeFinishReason(null)).toBe("unknown");
    });

    test("normalizes transport errors and status codes", () => {
      expect(normalizeFinishReason(null, 500)).toBe("provider_error");
      expect(normalizeFinishReason(null, 200, { name: "AbortError" })).toBe("cancelled");
      expect(normalizeFinishReason(null, 200, new Error("network down"))).toBe("transport_error");
    });
  });

  describe("2. Fault Injection Battery (6 Modes)", () => {
    test("Fault 1: provider length termination -> fails with provider_length_termination", () => {
      const res = evaluateDeliveryIntegrity({
        rawContent: "def longest_consecutive(nums):",
        displayContent: "def longest_consecutive(nums):",
        finishReason: "length"
      });
      expect(res.deliveryGatePassed).toBe(false);
      expect(res.terminationIntegrityPassed).toBe(false);
      expect(res.failureReasons).toContain("provider_length_termination");
    });

    test("Fault 2: stream cancellation -> fails with stream_cancelled", () => {
      const res = evaluateDeliveryIntegrity({
        rawContent: "def longest_consecutive(nums):",
        displayContent: "def longest_consecutive(nums):",
        finishReason: "cancelled",
        transportCompleted: false
      });
      expect(res.deliveryGatePassed).toBe(false);
      expect(res.failureReasons).toContain("stream_cancelled");
      expect(res.failureReasons).toContain("transport_interrupted");
    });

    test("Fault 3: missing SSE terminal event -> fails with missing_terminal_event", () => {
      const res = evaluateDeliveryIntegrity({
        rawContent: "some response",
        displayContent: "some response",
        finishReason: null
      });
      expect(res.deliveryGatePassed).toBe(false);
      expect(res.failureReasons).toContain("missing_terminal_event");
    });

    test("Fault 4: parser content loss -> fails with parser_content_loss", () => {
      const res = evaluateDeliveryIntegrity({
        rawContent: "```python\nprint('hello')\n```",
        displayContent: "",
        finishReason: "stop"
      });
      expect(res.deliveryGatePassed).toBe(false);
      expect(res.parseIntegrityPassed).toBe(false);
      expect(res.failureReasons).toContain("parser_content_loss");
    });

    test("Fault 5: missing required artifact -> fails with missing_required_artifact_type_hints", () => {
      const res = evaluateDeliveryIntegrity({
        rawContent: "```python\ndef longest_consecutive(nums):\n    pass\n```",
        displayContent: "```python\ndef longest_consecutive(nums):\n    pass\n```",
        finishReason: "stop",
        requiredArtifacts: {
          language: "python",
          functionName: "longest_consecutive",
          typeHints: true
        }
      });
      expect(res.deliveryGatePassed).toBe(false);
      expect(res.explicitArtifactsPassed).toBe(false);
      expect(res.failureReasons).toContain("missing_required_artifact_type_hints");
    });

    test("Fault 6: unclosed code fence -> fails with unclosed_code_fence", () => {
      const res = evaluateDeliveryIntegrity({
        rawContent: "```python\ndef longest_consecutive(nums):\n",
        displayContent: "```python\ndef longest_consecutive(nums):\n",
        finishReason: "stop"
      });
      expect(res.deliveryGatePassed).toBe(false);
      expect(res.markdownIntegrityPassed).toBe(false);
      expect(res.failureReasons).toContain("unclosed_code_fence");
    });
  });

  describe("3. Complete Valid Delivery Pass", () => {
    test("passes when all delivery criteria are satisfied", () => {
      const res = evaluateDeliveryIntegrity({
        rawContent: "Here is the code:\n```python\n\"\"\"Docstring\"\"\"\ndef longest_consecutive(nums: list[int]) -> int:\n    return len(nums)\n```",
        displayContent: "Here is the code:\n```python\n\"\"\"Docstring\"\"\"\ndef longest_consecutive(nums: list[int]) -> int:\n    return len(nums)\n```",
        finishReason: "stop",
        requiredArtifacts: {
          language: "python",
          functionName: "longest_consecutive",
          typeHints: true,
          docstring: true
        }
      });
      expect(res.deliveryGatePassed).toBe(true);
      expect(res.failureReasons).toEqual([]);
    });
  });
});
