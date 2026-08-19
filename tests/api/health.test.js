import healthHandler from "../../api/health.js";

describe("Health check endpoint", () => {
  it("returns 200 with healthy status and service telemetry", async () => {
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

    await healthHandler(req, res);
    expect(statusCode).toBe(200);
    expect(jsonBody).toBeDefined();
    expect(jsonBody.status).toBe("healthy");
    expect(jsonBody.service).toBe("rei-ai");
    expect(jsonBody.checks.router).toBe("operational");
    expect(jsonBody.checks.openaiProxy).toBe("operational");
  });
});
