import handler from "../../api/v1/chat/completions.js";
import * as kv from "../../shared/lib/kv.js";

// Mock kv storeTrace
jest.mock("../../shared/lib/kv.js", () => ({
  storeTrace: jest.fn().mockResolvedValue({ success: true })
}));

describe("Provider Fallback & Storyteller Resilience Acceptance Suite", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      REI_API_KEY: "test-rei-key",
      GROQ_API_KEY: "gsk_mock_groq_valid_test_key_12345",
      GEMINI_API_KEY: "AIzaSyMockGeminiKey12345",
      DEEPSEEK_API_KEY: "" // Simulate missing/unavailable DeepSeek in production
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("successfully falls back to Groq Llama-3.3-70B when primary DeepSeek is unavailable", async () => {
    // Mock global fetch to simulate DeepSeek 404/failure, then Groq success
    global.fetch = jest.fn().mockImplementation((url, options) => {
      if (url.includes("deepseek")) {
        return Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve("Model not found")
        });
      }
      if (url.includes("groq.com")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              id: "chatcmpl-groq-fallback",
              choices: [
                {
                  message: {
                    role: "assistant",
                    content: "The heavy wooden door stood solid against the cold stone floor."
                  },
                  finish_reason: "stop"
                }
              ],
              usage: { prompt_tokens: 45, completion_tokens: 30, total_tokens: 75 }
            })
        });
      }
      return Promise.resolve({ ok: false, status: 500 });
    });

    const req = {
      method: "POST",
      headers: {
        authorization: "Bearer test-rei-key"
      },
      body: {
        model: "rei-auto",
        messages: [
          {
            role: "user",
            content: "Write a 250-word opening scene for a psychological horror story."
          }
        ]
      }
    };

    let statusCode = 200;
    let responseBody = null;
    const headersSent = {};

    const res = {
      setHeader: (k, v) => {
        headersSent[k] = v;
      },
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseBody = data;
          }
        };
      },
      json: (data) => {
        responseBody = data;
      }
    };

    await handler(req, res);

    expect(statusCode).toBe(200);
    expect(responseBody.choices[0].message.content).toContain("wooden door");
    expect(headersSent["X-REI-Pathway"]).toBeDefined();
    expect(kv.storeTrace).toHaveBeenCalledTimes(1);
  });
});
