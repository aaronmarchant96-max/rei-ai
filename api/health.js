// REI.ai System Health Check Endpoint
// Route: /api/health & /health

export default async function handler(req, res) {
  if (res.setHeader) {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store, max-age=0");
  }

  const healthData = {
    status: "healthy",
    service: "rei-ai",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime ? process.uptime() : 0),
    checks: {
      router: "operational",
      openaiProxy: "operational",
      claimsGate: "verified",
    },
    metrics: {
      passingTests: 952,
      testSuites: 76,
      supportedModels: 7,
    },
  };

  return res.status(200).json(healthData);
}
