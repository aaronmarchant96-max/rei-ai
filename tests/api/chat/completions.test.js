jest.mock("../../../shared/lib/kv.js", function () {
  return {
    storeTrace: jest.fn(function () { return Promise.resolve(); }),
    storeEval: jest.fn(function () { return Promise.resolve(); }),
    getTracesWithEvals: jest.fn(function () { return Promise.resolve({ traces: [], evals: [] }); }),
    isKvAvailable: jest.fn(function () { return Promise.resolve(true); }),
  };
});

const kv = require("../../../shared/lib/kv.js");

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

beforeEach(() => {
  mockFetch({ choices: [{ message: { content: "mock response" } }] });
  process.env.GROQ_API_KEY = "test-key";
  process.env.REI_API_KEY = "test-api-key";
  delete process.env.CFAI_PATH;
  jest.clearAllMocks();
});

describe("OpenAI-compatible chat completions endpoint", () => {
  it("rejects requests with no Authorization header", async () => {
    delete process.env.REI_API_KEY;
    const handler = (await import("../../../api/v1/chat/completions.js")).default;
    const req = {
      method: "POST",
      headers: { authorization: "" },
      body: { model: "rei-auto", messages: [{ role: "user", content: "hello" }] },
    };
    const res = { _status: null, _body: null, status(c) { this._status = c; return this; }, json(d) { this._body = d; }, setHeader() {} };
    await handler(req, res);
    expect(res._status).toBe(500); // missing REI_API_KEY
  });

  it("rejects invalid Bearer tokens with 401", async () => {
    const handler = (await import("../../../api/v1/chat/completions.js")).default;
    const req = {
      method: "POST",
      headers: { authorization: "Bearer wrong-key" },
      body: { model: "rei-auto", messages: [{ role: "user", content: "hello" }] },
    };
    const res = { _status: null, _body: null, status(c) { this._status = c; return this; }, json(d) { this._body = d; }, setHeader() {} };
    await handler(req, res);
    expect(res._status).toBe(401);
  });

  it("returns 200 for valid requests and includes CARDO routing in response body", async () => {
    const handler = (await import("../../../api/v1/chat/completions.js")).default;
    const req = {
      method: "POST",
      headers: { authorization: "Bearer test-api-key" },
      body: { model: "rei-auto", messages: [{ role: "user", content: "hello" }] },
    };
    const res = { _status: null, _body: null, status(c) { this._status = c; return this; }, json(d) { this._body = d; }, setHeader() {} };
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(res._body.object).toBe("chat.completion");
    expect(res._body.choices[0].message.content).toBe("mock response");
    expect(res._body.rei).toBeDefined();
    expect(res._body.rei.routed).toBe(true);
    expect(res._body.rei.pathway).toBeDefined();
  });

  it("returns 400 for empty messages array", async () => {
    const handler = (await import("../../../api/v1/chat/completions.js")).default;
    const req = {
      method: "POST",
      headers: { authorization: "Bearer test-api-key" },
      body: { model: "rei-auto", messages: [] },
    };
    const res = { _status: null, _body: null, status(c) { this._status = c; return this; }, json(d) { this._body = d; }, setHeader() {} };
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it("returns 405 for non-POST methods", async () => {
    const handler = (await import("../../../api/v1/chat/completions.js")).default;
    const req = {
      method: "GET",
      headers: { authorization: "Bearer test-api-key" },
      body: {},
    };
    const res = { _status: null, _body: null, status(c) { this._status = c; return this; }, json(d) { this._body = d; }, setHeader() {} };
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  it("handles Groq API errors gracefully", async () => {
    mockFetch({ error: "Rate limited" }, 429, false);
    const handler = (await import("../../../api/v1/chat/completions.js")).default;
    const req = {
      method: "POST",
      headers: { authorization: "Bearer test-api-key" },
      body: { model: "rei-auto", messages: [{ role: "user", content: "hello" }] },
    };
    const res = { _status: null, _body: null, status(c) { this._status = c; return this; }, json(d) { this._body = d; }, setHeader() {} };
    await handler(req, res);
    expect(res._status).toBe(200); // graceful fallback, not 500
  });

  it("includes usage field in response", async () => {
    const handler = (await import("../../../api/v1/chat/completions.js")).default;
    const req = {
      method: "POST",
      headers: { authorization: "Bearer test-api-key" },
      body: { model: "rei-auto", messages: [{ role: "user", content: "test" }] },
    };
    const res = { _status: null, _body: null, status(c) { this._status = c; return this; }, json(d) { this._body = d; }, setHeader() {} };
    await handler(req, res);
    expect(res._body.usage).toBeDefined();
  });

  it("persists a durable trace (storeTrace) on auto-routed requests for the savings dashboard", async () => {
    const handler = (await import("../../../api/v1/chat/completions.js")).default;
    const req = {
      method: "POST",
      headers: { authorization: "Bearer test-api-key" },
      body: { model: "rei-auto", messages: [{ role: "user", content: "hello" }] },
    };
    const res = { _status: null, _body: null, status(c) { this._status = c; return this; }, json(d) { this._body = d; }, setHeader() {} };
    await handler(req, res);
    expect(kv.storeTrace).toHaveBeenCalledTimes(1);
    const [tenant, requestId, entry] = kv.storeTrace.mock.calls[0];
    expect(tenant).toBe("pilot");
    expect(typeof requestId).toBe("string");
    expect(entry).toMatchObject({
      tenantId: "pilot",
      policyVersion: "v1",
    });
    // The entry must carry the routing shape expected by the savings ledger.
    expect(entry).toHaveProperty("routeId");
    expect(entry).toHaveProperty("model");
    expect(entry).toHaveProperty("timestamp");
    expect(entry).toHaveProperty("estimatedCost");
    expect(entry).toHaveProperty("premiumCost");
  });

  it("does NOT persist a trace on explicit (non-auto-routed) requests", async () => {
    const handler = (await import("../../../api/v1/chat/completions.js")).default;
    const req = {
      method: "POST",
      headers: { authorization: "Bearer test-api-key" },
      body: { model: "gpt-4o-mini", messages: [{ role: "user", content: "hello" }] },
    };
    const res = { _status: null, _body: null, status(c) { this._status = c; return this; }, json(d) { this._body = d; }, setHeader() {} };
    await handler(req, res);
    expect(kv.storeTrace).not.toHaveBeenCalled();
  });
});
