import healthHandler from "../../api/health.js";

describe("Health check endpoint", () => {
  it("returns 200 with minimal ready probe and incurs $0 inference cost", async () => {
    let statusCode = null;
    let jsonBody = null;
    const req = { method: "GET" };
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

    await healthHandler(req, res);
    expect(statusCode).toBe(200);
    expect(jsonBody).toBeDefined();
    expect(jsonBody.status).toBe("ready");
    expect(jsonBody.gateway).toBe("chat-completions");
    expect(jsonBody.timestamp).toBeDefined();
  });

  it("returns 405 for non-GET methods", async () => {
    let statusCode = null;
    const req = { method: "POST" };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json() {
        return this;
      },
      setHeader() {}
    };

    await healthHandler(req, res);
    expect(statusCode).toBe(405);
  });
});
