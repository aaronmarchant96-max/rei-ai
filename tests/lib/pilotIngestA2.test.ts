import {
  normalizePilotTraffic,
  detectFormat,
} from "../../src/lib/pilotIngest/index";

describe("PR A2 Pilot Ingestion — Adapter & Provider Normalization Suite", () => {
  describe("OpenAI Log Normalization", () => {
    it("normalizes OpenAI chat completion response logs into CanonicalPilotRequest[]", () => {
      const payload = [
        {
          id: "chatcmpl-123",
          object: "chat.completion",
          created: 1724626800,
          model: "gpt-4o",
          choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Hello world" } }],
          usage: { prompt_tokens: 120, completion_tokens: 45 },
          messages: [{ role: "user", content: "Say hello" }],
        },
      ];

      const res = normalizePilotTraffic(payload);
      expect(res.source).toBe("openai");
      expect(res.totalParsed).toBe(1);
      expect(res.replayEligibleCount).toBe(1);
      expect(res.canonicalRequests[0].model).toBe("gpt-4o");
      expect(res.canonicalRequests[0].inputTokens).toBe(120);
      expect(res.canonicalRequests[0].outputTokens).toBe(45);
      expect(res.canonicalRequests[0].prompt).toBe("Say hello");
      expect(res.canonicalRequests[0].provenance.source).toBe("openai");
    });
  });

  describe("Anthropic Log Normalization", () => {
    it("normalizes Anthropic message response logs into CanonicalPilotRequest[]", () => {
      const payload = [
        {
          id: "msg_123",
          type: "message",
          model: "claude-3-5-sonnet-20240620",
          usage: { input_tokens: 250, output_tokens: 80 },
          messages: [{ role: "user", content: "Summarize paper" }],
        },
      ];

      const res = normalizePilotTraffic(payload);
      expect(res.source).toBe("anthropic");
      expect(res.totalParsed).toBe(1);
      expect(res.replayEligibleCount).toBe(1);
      expect(res.canonicalRequests[0].model).toBe("claude-3-5-sonnet-20240620");
      expect(res.canonicalRequests[0].inputTokens).toBe(250);
      expect(res.canonicalRequests[0].outputTokens).toBe(80);
      expect(res.canonicalRequests[0].prompt).toBe("Summarize paper");
    });
  });

  describe("Gemini Log Normalization", () => {
    it("normalizes Google Gemini response logs into CanonicalPilotRequest[]", () => {
      const payload = [
        {
          model: "gemini-1.5-pro",
          usageMetadata: { promptTokenCount: 500, candidatesTokenCount: 150 },
          contents: [{ role: "user", parts: [{ text: "Write code" }] }],
        },
      ];

      const res = normalizePilotTraffic(payload);
      expect(res.source).toBe("gemini");
      expect(res.totalParsed).toBe(1);
      expect(res.replayEligibleCount).toBe(1);
      expect(res.canonicalRequests[0].model).toBe("gemini-1.5-pro");
      expect(res.canonicalRequests[0].inputTokens).toBe(500);
      expect(res.canonicalRequests[0].outputTokens).toBe(150);
    });
  });

  describe("CSV & Generic JSON Normalization", () => {
    it("parses CSV strings with quoted delimiters and BOM headers", () => {
      const csvStr = `\uFEFFmodel,prompt,input_tokens,output_tokens,actual_cost\n"gpt-4o","Hello, ""world""",100,50,0.0015`;

      const res = normalizePilotTraffic(csvStr);
      expect(res.source).toBe("csv");
      expect(res.totalParsed).toBe(1);
      expect(res.replayEligibleCount).toBe(1);
      expect(res.canonicalRequests[0].model).toBe("gpt-4o");
      expect(res.canonicalRequests[0].prompt).toBe('Hello, "world"');
      expect(res.canonicalRequests[0].inputTokens).toBe(100);
      expect(res.canonicalRequests[0].actualCost).toBe(0.0015);
    });
  });

  describe("Fail-Closed Ingestion & Resource Limits", () => {
    it("fails closed with payload_too_large when string input exceeds maxSizeBytes", () => {
      const largeStr = "a".repeat(100);
      const res = normalizePilotTraffic(largeStr, { maxSizeBytes: 50 });

      expect(res.excludedCount).toBe(0);
      expect(res.errors[0].code).toBe("payload_too_large");
    });

    it("fails closed with excessive_rows when payload row count exceeds maxRows", () => {
      const rows = Array(15).fill({ model: "gpt-4o", inputTokens: 10, outputTokens: 10 });
      const res = normalizePilotTraffic(rows, { maxRows: 10 });

      expect(res.errors[0].code).toBe("excessive_rows");
    });

    it("ensures error messages never expose raw prompt content", () => {
      const badRow = {
        model: "gpt-4o",
        prompt: "SECRET_API_KEY_DO_NOT_LOG",
        // missing inputTokens
      };

      const res = normalizePilotTraffic([badRow]);
      expect(res.errors.length).toBeGreaterThan(0);
      const serializedError = JSON.stringify(res.errors);
      expect(serializedError).not.toContain("SECRET_API_KEY_DO_NOT_LOG");
    });
  });
});
