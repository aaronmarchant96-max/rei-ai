import handler from "../../api/v1/chat/completions.js";
import { buildServerRouterDecision } from "../../shared/lib/serverRouter.js";
import { clearProviderCooldown } from "../../api/cfai.js";

function createMockRes() {
  const res = {
    _status: 200,
    _headers: {},
    _body: null,
    status(c) {
      this._status = c;
      return this;
    },
    json(d) {
      this._body = d;
      return this;
    },
    setHeader(k, v) {
      this._headers[k] = v;
      return this;
    },
  };
  return res;
}

beforeEach(() => {
  global.fetch = jest.fn((url, options) => {
    let body = {};
    try {
      body = JSON.parse(options?.body || "{}");
    } catch {}
    
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          choices: [
            {
              message: { content: "Mock production implementation response" },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 150, completion_tokens: 200, total_tokens: 350 },
        }),
      text: () =>
        Promise.resolve(
          JSON.stringify({
            choices: [
              {
                message: { content: "Mock production implementation response" },
                finish_reason: "stop",
              },
            ],
            usage: { prompt_tokens: 150, completion_tokens: 200, total_tokens: 350 },
          })
        ),
    });
  });

  process.env.GROQ_API_KEY = "test-key";
  process.env.REI_API_KEYS = "rei_key_pilot:pilot:100:60";
  delete process.env.CFAI_PATH;
  jest.clearAllMocks();
  clearProviderCooldown();
});

describe("Multi-Turn State Isolation & Continuation Non-Leakage Contract", () => {
  it("Two-Turn Sequence: Turn 2 cache design prompt must route to coding-hinge, NOT simple-greeting from Turn 1", async () => {
    // Turn 1: Greeting
    const turn1Req = {
      method: "POST",
      headers: { authorization: "Bearer rei_key_pilot" },
      body: {
        model: "rei-auto",
        messages: [{ role: "user", content: "hello" }],
      },
    };
    const turn1Res = createMockRes();
    await handler(turn1Req, turn1Res);

    expect(turn1Res._status).toBe(200);
    expect(turn1Res._body.receipt.selected_model).toBe("llama-3.1-8b-instant");

    // Turn 2: Cache Design Prompt with Turn 1 History
    const cachePrompt =
      "Design a thread-safe, in-memory cache for a high-traffic web service handling 50,000 read requests per second and 5,000 write requests per second. Requirements: 1. TTL per entry. 2. LRU eviction. 3. Concurrent reads and writes in Go or Python. Walk me through your data structures and concurrency model.";

    const turn2Req = {
      method: "POST",
      headers: { authorization: "Bearer rei_key_pilot" },
      body: {
        model: "rei-auto",
        messages: [
          { role: "user", content: "hello" },
          { role: "assistant", content: "Hey there! Ready to engineer something awesome together?" },
          { role: "user", content: cachePrompt },
        ],
      },
    };
    const turn2Res = createMockRes();
    await handler(turn2Req, turn2Res);

    expect(turn2Res._status).toBe(200);
    expect(turn2Res._body.receipt.selected_model).not.toBe("llama-3.1-8b-instant");
    expect(turn2Res._body.receipt.selected_model).toMatch(/gemini|deepseek|llama-3\.3-70b/);
    expect(turn2Res._body.choices[0].message.content).not.toContain("simple-greeting");
    expect(turn2Res._body.choices[0].message.content).not.toContain("Continue exactly where");
    expect(turn2Res._body.choices[0].message.content).not.toContain("So we need to continue as if");
  });

  it("Metamorphic Routing Sequence: greeting -> coding -> story -> genealogy -> executive decision", async () => {
    const sequence = [
      {
        prompt: "hello there",
        expectedModelRegex: /llama-3\.1-8b|gpt-4o-mini|deepseek/,
        expectedRouteId: "simple-greeting",
      },
      {
        prompt: "Write a React component that maps through items and renders cards with tailwind styling.",
        expectedModelRegex: /gemini|deepseek|llama-3\.3-70b/,
        unexpectedRouteId: "simple-greeting",
      },
      {
        prompt: "Write a story about a travelling bard who discovers a lost artifact.",
        expectedModelRegex: /gemini|deepseek|llama-3\.3-70b/,
        unexpectedRouteId: "simple-greeting",
      },
      {
        prompt: "Did John Smith marry in 1846 and which census record is strongest for his lineage?",
        expectedModelRegex: /gemini|deepseek|llama-3\.3-70b/,
        unexpectedRouteId: "simple-greeting",
      },
      {
        prompt: "We have 6 months of runway vs 14 months for retraining. How do we break this deadlock with investors and ethics lead?",
        expectedModelRegex: /deepseek|llama-3\.3-70b|gemini/,
        unexpectedRouteId: "simple-greeting",
      },
    ];

    const accumulatedMessages = [];

    for (const step of sequence) {
      accumulatedMessages.push({ role: "user", content: step.prompt });

      const req = {
        method: "POST",
        headers: { authorization: "Bearer rei_key_pilot" },
        body: {
          model: "rei-auto",
          messages: [...accumulatedMessages],
        },
      };
      const res = createMockRes();
      await handler(req, res);

      expect(res._status).toBe(200);

      const decision = buildServerRouterDecision({ input: step.prompt });
      if (step.expectedRouteId) {
        expect(decision.id).toBe(step.expectedRouteId);
      }
      if (step.unexpectedRouteId === "simple-greeting") {
        expect(res._body.receipt.selected_model).not.toBe("llama-3.1-8b-instant");
      }

      accumulatedMessages.push({
        role: "assistant",
        content: res._body.choices[0].message.content,
      });
    }
  });

  it("Continuation Boundary: internal continuation instruction NEVER leaks into visible output", async () => {
    // Simulate a truncated first result that triggers continuation
    let callCount = 0;
    global.fetch = jest.fn(() => {
      callCount += 1;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              choices: [
                {
                  message: { content: "Initial partial output that was cut short" },
                  finish_reason: "length",
                },
              ],
              usage: { prompt_tokens: 50, completion_tokens: 50, total_tokens: 100 },
            }),
          text: () => Promise.resolve(""),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: { content: " and this is the completed rest of the text." },
                finish_reason: "stop",
              },
            ],
            usage: { prompt_tokens: 80, completion_tokens: 30, total_tokens: 110 },
          }),
        text: () => Promise.resolve(""),
      });
    });

    const req = {
      method: "POST",
      headers: { authorization: "Bearer rei_key_pilot" },
      body: {
        model: "rei-auto",
        messages: [{ role: "user", content: "Explain async/await in detail." }],
      },
    };
    const res = createMockRes();
    await handler(req, res);

    expect(res._status).toBe(200);
    const content = res._body.choices[0].message.content;

    // Assert internal instructions and meta-reasoning NEVER leak into user-visible output
    expect(content).not.toMatch(/Continue exactly where the previous response ended/i);
    expect(content).not.toMatch(/So we need to continue as if/i);
    expect(content).not.toMatch(/The prior message didn't contain any content/i);

    // Assert receipt delivery integrity
    expect(res._body.receipt).toBeDefined();
    expect(res._body.receipt.request_id).toBeDefined();
  });
});
