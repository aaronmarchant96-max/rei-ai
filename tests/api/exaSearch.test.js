import { AVAILABLE_TOOLS, executeWebSearch } from "../../api/cfai.js";

describe("Exa Web Search & Tool Execution Integration", () => {
  it("exports web_search and fetch_url in AVAILABLE_TOOLS", () => {
    const toolNames = AVAILABLE_TOOLS.map((t) => t.function?.name);
    expect(toolNames).toContain("web_search");
    expect(toolNames).toContain("fetch_url");

    const webSearchTool = AVAILABLE_TOOLS.find((t) => t.function?.name === "web_search");
    expect(webSearchTool.function.parameters.required).toContain("query");
  });

  it("handles empty or invalid search queries gracefully", async () => {
    const res1 = await executeWebSearch("");
    expect(JSON.parse(res1).error).toBe("Invalid or empty search query.");

    const res2 = await executeWebSearch(null);
    expect(JSON.parse(res2).error).toBe("Invalid or empty search query.");
  });

  it("formats mock Exa search results into clean, token-efficient payload", async () => {
    const originalFetch = global.fetch;
    const mockExaResponse = {
      results: [
        {
          title: "AI Copyright Law Update 2026",
          url: "https://example.com/ai-copyright",
          publishedDate: "2026-08-01",
          author: "Legal Scholar",
          text: "Recent legal rulings have established new precedent regarding fair use in AI training datasets."
        }
      ]
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockExaResponse),
      text: jest.fn().mockResolvedValue(""),
    });

    process.env.EXA_API_KEY = "mock-exa-key";

    const res = await executeWebSearch("AI copyright fair use", 3);
    const parsed = JSON.parse(res);

    expect(parsed.engine).toBe("Exa Neural Search");
    expect(parsed.count).toBe(1);
    expect(parsed.results[0].title).toBe("AI Copyright Law Update 2026");
    expect(parsed.results[0].url).toBe("https://example.com/ai-copyright");

    // Restore
    delete process.env.EXA_API_KEY;
    global.fetch = originalFetch;
  });
});
