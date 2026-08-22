import handler from "../../../api/v1/chat/completions.js";
import { clearProviderCooldown } from "../../../api/cfai.js";

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
  process.env.REI_API_KEYS = "rei_key_pilot:pilot:100:60";
  delete process.env.CFAI_PATH;
  jest.clearAllMocks();
  clearProviderCooldown();
});

describe("OpenAI-compatible chat completions endpoint", () => {
  it("rejects requests with missing Authorization header with 401", async () => {
    const req = {
      method: "POST",
      headers: { authorization: "" },
      body: { model: "rei-auto", messages: [{ role: "user", content: "hello" }] },
    };
    const res = { _status: null, _body: null, status(c) { this._status = c; return this; }, json(d) { this._body = d; }, setHeader() {} };
    await handler(req, res);
    expect(res._status).toBe(401);
    expect(res._body.error.code).toBe("CF_AUTH_REQUIRED");
  });

  it("rejects invalid Bearer tokens with 401", async () => {
    const req = {
      method: "POST",
      headers: { authorization: "Bearer invalid_wrong_key" },
      body: { model: "rei-auto", messages: [{ role: "user", content: "hello" }] },
    };
    const res = { _status: null, _body: null, status(c) { this._status = c; return this; }, json(d) { this._body = d; }, setHeader() {} };
    await handler(req, res);
    expect(res._status).toBe(401);
    expect(res._body.error.code).toBe("CF_AUTH_REQUIRED");
  });

  it("returns 200 for valid requests and includes receipt in response body", async () => {
    const req = {
      method: "POST",
      headers: { authorization: "Bearer rei_key_pilot" },
      body: { model: "rei-auto", messages: [{ role: "user", content: "hello" }] },
    };
    const res = { _status: null, _body: null, status(c) { this._status = c; return this; }, json(d) { this._body = d; }, setHeader() {} };
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(res._body.object).toBe("chat.completion");
    expect(res._body.choices[0].message.content).toBe("mock response");
    expect(res._body.receipt).toBeDefined();
    expect(res._body.receipt.savings_policy_version).toBe("delivery-gated-v1");
  });

  it("returns 400 for empty messages array", async () => {
    const req = {
      method: "POST",
      headers: { authorization: "Bearer rei_key_pilot" },
      body: { model: "rei-auto", messages: [] },
    };
    const res = { _status: null, _body: null, status(c) { this._status = c; return this; }, json(d) { this._body = d; }, setHeader() {} };
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it("returns 405 for non-POST methods", async () => {
    const req = {
      method: "GET",
      headers: { authorization: "Bearer rei_key_pilot" },
      body: {},
    };
    const res = { _status: null, _body: null, status(c) { this._status = c; return this; }, json(d) { this._body = d; }, setHeader() {} };
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  it("handles provider errors gracefully", async () => {
    mockFetch({ error: "Rate limited" }, 429, false);
    const req = {
      method: "POST",
      headers: { authorization: "Bearer rei_key_pilot" },
      body: { model: "rei-auto", messages: [{ role: "user", content: "hello" }] },
    };
    const res = { _status: null, _body: null, status(c) { this._status = c; return this; }, json(d) { this._body = d; }, setHeader() {} };
    await handler(req, res);
    expect(res._status).toBe(503);
  });

  it("includes usage field in response", async () => {
    const req = {
      method: "POST",
      headers: { authorization: "Bearer rei_key_pilot" },
      body: { model: "rei-auto", messages: [{ role: "user", content: "test" }] },
    };
    const res = { _status: null, _body: null, status(c) { this._status = c; return this; }, json(d) { this._body = d; }, setHeader() {} };
    await handler(req, res);
    expect(res._body.usage).toBeDefined();
    expect(res._body.usage.prompt_tokens).toBeGreaterThan(0);
  });
});
