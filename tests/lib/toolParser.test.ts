import {
  extractThinkingAndContent,
  validateToolArguments,
  parseToolCalls,
  isPrivateHostname,
} from "../../src/lib/toolParser";

describe("toolParser & thinking tag extraction", () => {
  describe("isPrivateHostname", () => {
    it("identifies private and localhost domains", () => {
      expect(isPrivateHostname("localhost")).toBe(true);
      expect(isPrivateHostname("127.0.0.1")).toBe(true);
      expect(isPrivateHostname("192.168.1.1")).toBe(true);
      expect(isPrivateHostname("10.0.0.1")).toBe(true);
      expect(isPrivateHostname("172.16.0.1")).toBe(true);
      expect(isPrivateHostname("169.254.169.254")).toBe(true);
      expect(isPrivateHostname("internal.service.local")).toBe(true);
    });

    it("allows public domains", () => {
      expect(isPrivateHostname("google.com")).toBe(false);
      expect(isPrivateHostname("github.com")).toBe(false);
      expect(isPrivateHostname("api.exa.ai")).toBe(false);
    });
  });

  describe("extractThinkingAndContent", () => {
    it("cleanly extracts closed <think>...</think> blocks", () => {
      const text = "<think>Calculating the optimal route...</think>Here is the final answer.";
      const { cleanContent, thinking } = extractThinkingAndContent(text);
      expect(cleanContent).toBe("Here is the final answer.");
      expect(thinking).toBe("Calculating the optimal route...");
    });

    it("handles unclosed trailing <think> blocks without crashing", () => {
      const text = "Prose before.<think>Unfinished thoughts cut off by token limit";
      const { cleanContent, thinking } = extractThinkingAndContent(text);
      expect(cleanContent).toBe("Prose before.");
      expect(thinking).toBe("Unfinished thoughts cut off by token limit");
    });

    it("handles thinking tokens without prose", () => {
      const text = "<think>Only internal chain of thought here</think>";
      const { cleanContent, thinking } = extractThinkingAndContent(text);
      expect(cleanContent).toBe("");
      expect(thinking).toBe("Only internal chain of thought here");
    });

    it("handles multiple thinking blocks", () => {
      const text = "<think>Step 1</think>Middle<think>Step 2</think>End";
      const { cleanContent, thinking } = extractThinkingAndContent(text);
      expect(cleanContent).toBe("MiddleEnd");
      expect(thinking).toContain("Step 1");
      expect(thinking).toContain("Step 2");
    });
  });

  describe("validateToolArguments", () => {
    it("validates web_search with valid query", () => {
      const res = validateToolArguments("web_search", { query: "latest Super Bowl winner", num_results: 4 });
      expect(res.valid).toBe(true);
      expect(res.cleanArgs).toEqual({ query: "latest Super Bowl winner", num_results: 4 });
    });

    it("rejects web_search with missing or empty query", () => {
      expect(validateToolArguments("web_search", {}).valid).toBe(false);
      expect(validateToolArguments("web_search", { query: "   " }).valid).toBe(false);
      expect(validateToolArguments("web_search", { query: 123 }).valid).toBe(false);
    });

    it("validates fetch_url with valid public URL", () => {
      const res = validateToolArguments("fetch_url", { url: "https://example.com/docs" });
      expect(res.valid).toBe(true);
      expect(res.cleanArgs?.url).toBe("https://example.com/docs");
    });

    it("rejects fetch_url with private or malformed URL", () => {
      expect(validateToolArguments("fetch_url", { url: "http://localhost:8080/admin" }).valid).toBe(false);
      expect(validateToolArguments("fetch_url", { url: "ftp://example.com" }).valid).toBe(false);
      expect(validateToolArguments("fetch_url", { url: "not-a-url" }).valid).toBe(false);
    });

    it("rejects unknown tool", () => {
      expect(validateToolArguments("execute_bash", { cmd: "ls" }).valid).toBe(false);
    });
  });

  describe("parseToolCalls", () => {
    it("parses native OpenAI tool_calls structure", () => {
      const result = {
        content: "I will search for that.",
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: {
              name: "web_search",
              arguments: JSON.stringify({ query: "TypeScript 5.9 features" }),
            },
          },
        ],
      };

      const parsed = parseToolCalls(result);
      expect(parsed.validToolCalls).toHaveLength(1);
      expect(parsed.validToolCalls[0].function.name).toBe("web_search");
      expect(parsed.validToolCalls[0].parsedArgs.query).toBe("TypeScript 5.9 features");
      expect(parsed.validationErrors).toHaveLength(0);
    });

    it("parses inline <tool_call> JSON envelopes", () => {
      const result = {
        content: '<tool_call>{"name": "fetch_url", "arguments": {"url": "https://react.dev"}}</tool_call>',
      };

      const parsed = parseToolCalls(result);
      expect(parsed.validToolCalls).toHaveLength(1);
      expect(parsed.validToolCalls[0].function.name).toBe("fetch_url");
      expect(parsed.validToolCalls[0].parsedArgs.url).toBe("https://react.dev/");
      expect(parsed.cleanContent).toBe("");
    });

    it("parses inline <function=NAME><parameter=KEY>VAL</parameter></function>", () => {
      const result = {
        content: '<function=web_search><parameter=query>Rust async channels</parameter></function>',
      };

      const parsed = parseToolCalls(result);
      expect(parsed.validToolCalls).toHaveLength(1);
      expect(parsed.validToolCalls[0].function.name).toBe("web_search");
      expect(parsed.validToolCalls[0].parsedArgs.query).toBe("Rust async channels");
    });

    it("rejects malformed XML/JSON without silent failure", () => {
      const result = {
        content: '<tool_call>{"name": "web_search", "arguments": {}}</tool_call>',
      };

      const parsed = parseToolCalls(result);
      expect(parsed.validToolCalls).toHaveLength(0);
      expect(parsed.validationErrors.length).toBeGreaterThan(0);
      expect(parsed.validationErrors[0]).toContain("query");
    });
  });
});
