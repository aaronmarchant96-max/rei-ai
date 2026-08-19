import healthHandler from "../../api/health.js";

describe("Health check endpoint", () => {
  it("returns 200 with internal state probes for classifier and centroids", async () => {
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
    expect(jsonBody.subsystems.hingeClassifier.status).toBe("operational");
    expect(jsonBody.subsystems.hingeClassifier.parametersLoaded).toBeGreaterThan(0);
    expect(jsonBody.subsystems.semanticCentroids.status).toBe("operational");
    expect(jsonBody.subsystems.semanticCentroids.vectorDim).toBe(384);
    expect(jsonBody.subsystems.openaiProxy.status).toBe("operational");
    expect(jsonBody.system.heapUsedMb).toBeGreaterThan(0);
  });
});
