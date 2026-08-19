import modelsHandler from "../../api/v1/models.js";

describe("OpenAI-compatible models list endpoint", () => {
  it("returns 200 and a list of available models including rei-auto", async () => {
    let statusCode = null;
    let jsonBody = null;
    const req = {};
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonBody = data;
        return this;
      },
      setHeader() {}
    };

    await modelsHandler(req, res);
    expect(statusCode).toBe(200);
    expect(jsonBody).toBeDefined();
    expect(jsonBody.object).toBe("list");
    expect(Array.isArray(jsonBody.data)).toBe(true);

    const modelIds = jsonBody.data.map((m) => m.id);
    expect(modelIds).toContain("rei-auto");
    expect(modelIds).toContain("llama-3.1-8b-instant");
    expect(modelIds).toContain("openai/gpt-oss-120b");
  });
});
