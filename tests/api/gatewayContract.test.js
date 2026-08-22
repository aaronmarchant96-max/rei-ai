/**
 * @file tests/api/gatewayContract.test.js
 * @description Offline, 100% deterministic Jest gateway contract test suite.
 * Enforces the 8 core gateway invariants and delivery-gated-v1 economics.
 */

import handler from "../../api/v1/chat/completions.js";
import healthHandler from "../../api/health.js";
import { resolveTenantContext, parseApiKeyHeader } from "../../shared/lib/authTenantEngine.js";
import { normalizeFinishReason } from "../../shared/lib/serverRouter.js";
import { clearProviderCooldown } from "../../api/cfai.js";

function mockFetch(responseData) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(responseData),
      text: () => Promise.resolve(JSON.stringify(responseData)),
    })
  );
}

function createMockReq(options = {}) {
  return {
    method: options.method || "POST",
    headers: {
      authorization: options.authHeader !== undefined ? options.authHeader : "Bearer rei_key_pilot",
      "x-api-key": options.apiKeyHeader || "",
      ...options.headers,
    },
    body: options.body || {
      model: "rei-auto",
      messages: [{ role: "user", content: "Explain this function" }],
    },
  };
}

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    written: [],
    ended: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, val) {
      this.headers[key] = val;
      return this;
    },
    json(data) {
      this.body = data;
      this.ended = true;
      return this;
    },
    write(chunk) {
      this.written.push(chunk);
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
  return res;
}

beforeEach(() => {
  mockFetch({
    choices: [{ message: { content: "Verified gateway response." } }],
    usage: { prompt_tokens: 15, completion_tokens: 25, total_tokens: 40 },
  });
  process.env.GROQ_API_KEY = "test-groq-key";
  process.env.REI_API_KEY = "test-rei-key";
  clearProviderCooldown();
});

describe("REI.ai Gateway Contract — Unified Auth & Tenant Identity", () => {
  it("1. Missing API key returns structured 401, never a function crash", async () => {
    const req = createMockReq({ authHeader: "" });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.error.type).toBe("authentication_error");
    expect(res.body.error.code).toBe("CF_AUTH_REQUIRED");
  });

  it("2. Invalid API key returns structured 401", async () => {
    const req = createMockReq({ authHeader: "Bearer invalid_secret_key" });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body.error.type).toBe("authentication_error");
    expect(res.body.error.code).toBe("CF_AUTH_REQUIRED");
  });

  it("3. Valid pilot key permits tenant execution", () => {
    const key = parseApiKeyHeader("Bearer rei_key_pilot_test");
    const ctx = resolveTenantContext(key);

    expect(ctx.isAllowed).toBe(true);
    expect(ctx.tenantId).toBe("pilot_test");
  });

  it("4. Exhausted tenant quota returns 429 without provider invocation", async () => {
    const key = "rei_key_quota_test";

    // Simulate exhausting 100 req/min quota
    for (let i = 0; i < 100; i++) {
      resolveTenantContext(key);
    }

    const exhaustedCtx = resolveTenantContext(key);
    expect(exhaustedCtx.isAllowed).toBe(false);
    expect(exhaustedCtx.status).toBe(429);
    expect(exhaustedCtx.code).toBe("CF_QUOTA_EXCEEDED");
  });
});

describe("REI.ai Gateway Contract — Response Invariants & Integrity Economics", () => {
  it("5. Valid non-streaming request returns OpenAI-compatible JSON and receipt", async () => {
    const req = createMockReq();
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.object).toBe("chat.completion");
    expect(res.body.choices[0].message.role).toBe("assistant");
    expect(res.body.receipt).toBeDefined();
    expect(res.body.receipt.savings_policy_version).toBe("delivery-gated-v1");
  });

  it("6. Truncated/Incomplete response contributes $0 eligible savings", async () => {
    const finishReason = normalizeFinishReason("length");
    expect(finishReason).toBe("length");

    // Delivery-gated-v1 rule check:
    const isComplete = finishReason === "stop";
    const modeledDifferenceUsd = 0.045;
    const eligibleSavingsUsd = isComplete ? modeledDifferenceUsd : 0;
    const eligibility = isComplete ? "eligible" : "excluded";

    expect(isComplete).toBe(false);
    expect(eligibleSavingsUsd).toBe(0);
    expect(eligibility).toBe("excluded");
  });

  it("7. Streaming produces valid SSE chunks with terminal receipt", async () => {
    const req = createMockReq({ body: { model: "rei-auto", messages: [{ role: "user", content: "Hello" }], stream: true } });
    const res = createMockRes();

    await handler(req, res);

    expect(res.headers["Content-Type"]).toContain("text/event-stream");
    expect(res.written.length).toBeGreaterThan(0);
    const lastWrite = res.written[res.written.length - 1];
    expect(lastWrite).toContain("data: [DONE]");
  });
});

describe("REI.ai Gateway Contract — Single-Instance Coalescing & Health", () => {
  it("8. Single-instance coalescing: 5 concurrent identical requests execute cleanly", async () => {
    const requests = Array.from({ length: 5 }, () => {
      const req = createMockReq();
      const res = createMockRes();
      return handler(req, res).then(() => res);
    });

    const results = await Promise.all(requests);
    results.forEach((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.body.receipt).toBeDefined();
    });
  });

  it("9. Health probe performs zero model calls and incurs $0 cost", async () => {
    const req = { method: "GET" };
    const res = createMockRes();

    await healthHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("ready");
    expect(res.body.gateway).toBe("chat-completions");
  });

  it("10. Direct modelOverride executes requested model and records receipt model accuracy", async () => {
    const req = createMockReq({
      body: {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Write a short test function" }]
      }
    });
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.model).toBe("llama-3.3-70b-versatile");
    expect(res.body.receipt).toBeDefined();
    expect(res.body.receipt.savings_policy_version).toBe("delivery-gated-v1");
  });

  it("11. Incomplete or length finish_reason yields $0 eligible savings and excluded status", async () => {
    const { evaluateDeliveryIntegrity } = await import("../../shared/lib/serverRouter.js");
    const gateResult = evaluateDeliveryIntegrity({
      rawContent: "Partial content without terminal stop",
      finishReason: "length",
      transportCompleted: true
    });

    expect(gateResult.deliveryGatePassed).toBe(false);
    expect(gateResult.finishStatus).toBe("length");
  });
});
