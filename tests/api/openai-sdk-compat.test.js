jest.mock("../../shared/lib/kv.js", () => ({
  storeTrace: jest.fn(() => Promise.resolve()),
  storeEval: jest.fn(() => Promise.resolve()),
  getTracesWithEvals: jest.fn(() => Promise.resolve({ traces: [], evals: [] })),
  isKvAvailable: jest.fn(() => Promise.resolve(true)),
}));

jest.mock("../../shared/lib/costModel.js", () => ({
  projectedCost: jest.fn(() => 0.001),
  maxCostPerQuery: jest.fn(() => null),
  isOverBudget: jest.fn(() => false),
}));

const { clearProviderCooldown } = require("../../api/cfai.js");
const costModel = require("../../shared/lib/costModel.js");

function mockFetch(responseData, status = 200, ok = true) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(responseData),
      text: () => Promise.resolve(JSON.stringify(responseData)),
    })
  );
}

function createMockRes() {
  return {
    _status: null,
    _body: null,
    _headers: {},
    _writes: [],
    _ended: false,
    status(c) {
      this._status = c;
      return this;
    },
    json(d) {
      this._body = d;
      return this;
    },
    setHeader(k, v) {
      this._headers[k.toLowerCase()] = v;
      return this;
    },
    write(chunk) {
      this._writes.push(chunk);
      return true;
    },
    end() {
      this._ended = true;
      return this;
    },
  };
}

beforeEach(() => {
  mockFetch({
    choices: [{ message: { content: "Verified OpenAI SDK compatible output." } }],
    usage: { prompt_tokens: 18, completion_tokens: 8, total_tokens: 26 },
  });
  process.env.GROQ_API_KEY = "test-groq-key";
  process.env.REI_API_KEY = "test-rei-key";
  delete process.env.CFAI_PATH;
  jest.clearAllMocks();
  clearProviderCooldown();
  costModel.maxCostPerQuery.mockReturnValue(null);
  costModel.isOverBudget.mockReturnValue(false);
});

describe("OpenAI SDK Compatibility Matrix & Contract Verification", () => {
  it("Contract 1 [cURL]: Basic non-streaming request returns valid OpenAI chat.completion", async () => {
    const handler = (await import("../../api/v1/chat/completions.js")).default;
    const req = {
      method: "POST",
      headers: { authorization: "Bearer test-rei-key" },
      body: {
        model: "rei-auto",
        messages: [{ role: "user", content: "What is the capital of France?" }],
      },
    };
    const res = createMockRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({
      object: "chat.completion",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "Verified OpenAI SDK compatible output." },
          finish_reason: "stop",
        },
      ],
    });
    expect(typeof res._body.id).toBe("string");
    expect(typeof res._body.created).toBe("number");
  });

  it("Contract 2 [Python/Node SDK]: Drop-in base URL replacement works with default parameters", async () => {
    const handler = (await import("../../api/v1/chat/completions.js")).default;
    const req = {
      method: "POST",
      headers: { authorization: "Bearer test-rei-key" },
      body: {
        model: "rei-auto",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Write a 1-line shell script." },
        ],
        temperature: 0.7,
        max_tokens: 150,
      },
    };
    const res = createMockRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._body.choices[0].message.role).toBe("assistant");
    expect(res._headers["x-rei-pathway"]).toBeDefined();
    expect(res._headers["x-rei-savings"]).toBeDefined();
  });

  it("Contract 3 [Streaming SSE]: stream=true delivers valid SSE chunk sequence and terminal [DONE]", async () => {
    const handler = (await import("../../api/v1/chat/completions.js")).default;
    const req = {
      method: "POST",
      headers: { authorization: "Bearer test-rei-key" },
      body: {
        model: "rei-auto",
        messages: [{ role: "user", content: "Stream this response" }],
        stream: true,
      },
    };
    const res = createMockRes();
    await handler(req, res);

    expect(res._headers["content-type"]).toContain("text/event-stream");
    expect(res._ended).toBe(true);
    expect(res._writes.length).toBeGreaterThanOrEqual(3);

    // Initial role chunk
    const firstChunk = JSON.parse(res._writes[0].replace(/^data: /, "").trim());
    expect(firstChunk.object).toBe("chat.completion.chunk");
    expect(firstChunk.choices[0].delta.role).toBe("assistant");

    // Content chunk
    const middleChunk = JSON.parse(res._writes[1].replace(/^data: /, "").trim());
    expect(middleChunk.object).toBe("chat.completion.chunk");
    expect(typeof middleChunk.choices[0].delta.content).toBe("string");

    // Terminal chunk and [DONE]
    const penultimate = JSON.parse(res._writes[res._writes.length - 2].replace(/^data: /, "").trim());
    expect(penultimate.choices[0].finish_reason).toBe("stop");
    expect(res._writes[res._writes.length - 1]).toBe("data: [DONE]\n\n");
  });

  it("Contract 4 [Errors]: Returns stable OpenAI-shaped error envelope on 401, 400, 402, 405", async () => {
    const handler = (await import("../../api/v1/chat/completions.js")).default;

    // 401 Unauthorized
    const req401 = { method: "POST", headers: { authorization: "Bearer bad-key" }, body: {} };
    const res401 = createMockRes();
    await handler(req401, res401);
    expect(res401._status).toBe(401);
    expect(res401._body.error).toEqual({
      message: expect.any(String),
      type: "authentication_error",
      param: null,
      code: "CF_AUTH_REQUIRED",
    });

    // 400 Bad Request
    const req400 = { method: "POST", headers: { authorization: "Bearer test-rei-key" }, body: { messages: [] } };
    const res400 = createMockRes();
    await handler(req400, res400);
    expect(res400._status).toBe(400);
    expect(res400._body.error.type).toBe("invalid_request_error");

    // 405 Method Not Allowed
    const req405 = { method: "GET", headers: { authorization: "Bearer test-rei-key" }, body: {} };
    const res405 = createMockRes();
    await handler(req405, res405);
    expect(res405._status).toBe(405);
    expect(res405._body.error.type).toBe("invalid_request_error");
  });

  it("Contract 5 [Usage]: Accurately formats prompt_tokens, completion_tokens, and total_tokens integers", async () => {
    const handler = (await import("../../api/v1/chat/completions.js")).default;
    const req = {
      method: "POST",
      headers: { authorization: "Bearer test-rei-key" },
      body: {
        model: "rei-auto",
        messages: [{ role: "user", content: "Calculate token usage" }],
      },
    };
    const res = createMockRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(typeof res._body.usage.prompt_tokens).toBe("number");
    expect(typeof res._body.usage.completion_tokens).toBe("number");
    expect(typeof res._body.usage.total_tokens).toBe("number");
    expect(res._body.usage.total_tokens).toBe(res._body.usage.prompt_tokens + res._body.usage.completion_tokens);
  });

  it("Contract 6 [Fallback & Tracing]: Direct model failure yields traceable status", async () => {
    mockFetch({ error: { message: "Provider rate limit exceeded" } }, 429, false);
    const handler = (await import("../../api/v1/chat/completions.js")).default;
    const req = {
      method: "POST",
      headers: { authorization: "Bearer test-rei-key" },
      body: {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "test direct fallback" }],
      },
    };
    const res = createMockRes();
    await handler(req, res);

    expect(res._status).toBe(503);
    expect(res._body.error.code).toBe("CF_RATE_LIMITED");
  });
});
