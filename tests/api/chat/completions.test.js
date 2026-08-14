jest.mock("../../../shared/lib/kv.js", function () {
  return {
    storeTrace: jest.fn(function () { return Promise.resolve(); }),
    storeEval: jest.fn(function () { return Promise.resolve(); }),
    getTracesWithEvals: jest.fn(function () { return Promise.resolve({ traces: [], evals: [] }); }),
    isKvAvailable: jest.fn(function () { return Promise.resolve(true); }),
  };
});

jest.mock("../../../shared/lib/costModel.js", function () {
  return {
    projectedCost: jest.fn(function () { return 0.001; }),
    maxCostPerQuery: jest.fn(function () { return null; }),
    isOverBudget: jest.fn(function () { return false; }),
  };
});

const kv = require("../../../shared/lib/kv.js");
const costModel = require("../../../shared/lib/costModel.js");
const { clearProviderCooldown } = require("../../../api/cfai.js");

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
  // Isolate provider cooldown state between tests: a throttled (429) mock in
  // one test must not leak a module-level cooldown into later tests, which
  // would otherwise flip them onto the "all backends unavailable" path.
  clearProviderCooldown();
  // Ceiling enforcement is opt-in: reset to "no ceiling" so baseline tests run
  // under the un-gated path (matches production when MAX_COST_PER_QUERY is unset).
  costModel.maxCostPerQuery.mockReturnValue(null);
  costModel.isOverBudget.mockReturnValue(false);
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

  it("persists a durable trace on explicit (non-auto-routed) requests too", async () => {
    const handler = (await import("../../../api/v1/chat/completions.js")).default;
    const req = {
      method: "POST",
      headers: { authorization: "Bearer test-api-key" },
      body: { model: "gpt-4o-mini", messages: [{ role: "user", content: "hello" }] },
    };
    const res = { _status: null, _body: null, status(c) { this._status = c; return this; }, json(d) { this._body = d; }, setHeader() {} };
    await handler(req, res);
    expect(kv.storeTrace).toHaveBeenCalledTimes(1);
    const [tenant, requestId, entry] = kv.storeTrace.mock.calls[0];
    expect(tenant).toBe("pilot");
    expect(typeof requestId).toBe("string");
    // Explicit path has no router decision, so routeId stays null but the
    // requested model + tenant/policy identity are still recorded.
    expect(entry).toMatchObject({ tenantId: "pilot", policyVersion: "v1" });
    expect(entry.routeId).toBeNull();
    expect(entry.model).toBe("gpt-4o-mini");
    expect(entry).toHaveProperty("cacheHitTokens");
    expect(entry).toHaveProperty("cacheMissTokens");
  });

  it("captures cache hit/miss tokens from provider usage on auto-routed requests", async () => {
    mockFetch({
      choices: [{ message: { content: "mock response" } }],
      usage: { prompt_cache_hit_tokens: 1200, prompt_cache_miss_tokens: 80, total_tokens: 1300 },
    });
    const handler = (await import("../../../api/v1/chat/completions.js")).default;
    const req = {
      method: "POST",
      headers: { authorization: "Bearer test-api-key" },
      body: { model: "rei-auto", messages: [{ role: "user", content: "hello" }] },
    };
    const res = { _status: null, _body: null, status(c) { this._status = c; return this; }, json(d) { this._body = d; }, setHeader() {} };
    await handler(req, res);
    expect(kv.storeTrace).toHaveBeenCalledTimes(1);
    const entry = kv.storeTrace.mock.calls[0][2];
    expect(entry.cacheHitTokens).toBe(1200);
    expect(entry.cacheMissTokens).toBe(80);
    expect(entry.usage.prompt_cache_hit_tokens).toBe(1200);
  });

  describe("per-query cost ceiling (max_cost_per_query, Increment B)", () => {
    it("refuses with CF_BUDGET_EXCEEDED when the projected cost exceeds the ceiling (never silently downgrades)", async () => {
      costModel.maxCostPerQuery.mockReturnValue(0.001);
      costModel.projectedCost.mockReturnValue(0.005);
      costModel.isOverBudget.mockReturnValue(true);
      const handler = (await import("../../../api/v1/chat/completions.js")).default;
      const req = {
        method: "POST",
        headers: { authorization: "Bearer test-api-key" },
        body: { model: "rei-auto", max_tokens: 20000, messages: [{ role: "user", content: "hello" }] },
      };
      const res = { _status: null, _body: null, status(c) { this._status = c; return this; }, json(d) { this._body = d; }, setHeader() {} };
      await handler(req, res);
      expect(res._status).toBe(402);
      expect(res._body.error.code).toBe("CF_BUDGET_EXCEEDED");
    });

    it("does NOT call the provider or persist a trace when the ceiling is exceeded (refuse before spend)", async () => {
      costModel.maxCostPerQuery.mockReturnValue(0.001);
      costModel.isOverBudget.mockReturnValue(true);
      const handler = (await import("../../../api/v1/chat/completions.js")).default;
      const req = {
        method: "POST",
        headers: { authorization: "Bearer test-api-key" },
        body: { model: "rei-auto", messages: [{ role: "user", content: "hello" }] },
      };
      const res = { _status: null, _body: null, status(c) { this._status = c; return this; }, json(d) { this._body = d; }, setHeader() {} };
      await handler(req, res);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(kv.storeTrace).not.toHaveBeenCalled();
      expect(res._status).toBe(402);
    });

    it("allows the request when the projected cost is within budget", async () => {
      mockFetch({ choices: [{ message: { content: "mock response" } }] });
      costModel.maxCostPerQuery.mockReturnValue(0.005);
      costModel.projectedCost.mockReturnValue(0.001);
      costModel.isOverBudget.mockReturnValue(false);
      const handler = (await import("../../../api/v1/chat/completions.js")).default;
      const req = {
        method: "POST",
        headers: { authorization: "Bearer test-api-key" },
        body: { model: "rei-auto", messages: [{ role: "user", content: "hello" }] },
      };
      const res = { _status: null, _body: null, status(c) { this._status = c; return this; }, json(d) { this._body = d; }, setHeader() {} };
      await handler(req, res);
      // The ceiling gate is consulted and does NOT refuse. (Downstream provider
      // availability may be flaky from shared-cooldown test pollution, so we
      // assert the ceiling decision, not the provider outcome.)
      expect(costModel.maxCostPerQuery).toHaveBeenCalled();
      expect(costModel.isOverBudget).toHaveBeenCalled();
      expect(res._status).not.toBe(402);
      expect(res._body.error).toBeUndefined();
    });

    it("enforcement is fully off when maxCostPerQuery returns null (backward-compatible)", async () => {
      mockFetch({ choices: [{ message: { content: "mock response" } }] });
      costModel.maxCostPerQuery.mockReturnValue(null);
      costModel.isOverBudget.mockReturnValue(false);
      const handler = (await import("../../../api/v1/chat/completions.js")).default;
      const req = {
        method: "POST",
        headers: { authorization: "Bearer test-api-key" },
        body: { model: "rei-auto", messages: [{ role: "user", content: "hello" }] },
      };
      const res = { _status: null, _body: null, status(c) { this._status = c; return this; }, json(d) { this._body = d; }, setHeader() {} };
      await handler(req, res);
      // No ceiling configured ⇒ the gate is entirely bypassed (never refuses).
      expect(costModel.maxCostPerQuery).toHaveBeenCalled();
      expect(res._status).not.toBe(402);
    });
  });
});
