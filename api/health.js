// REI.ai System Health & Subsystem State Verification Endpoint
// Route: /api/health & /health

import fs from "node:fs";
import path from "node:path";

function loadJsonSafe(relativePath) {
  try {
    const fullPath = path.resolve(process.cwd(), relativePath);
    if (fs.existsSync(fullPath)) {
      return JSON.parse(fs.readFileSync(fullPath, "utf8"));
    }
  } catch {
    // Ignore and fallback
  }
  return null;
}

export default async function handler(req, res) {
  if (res.setHeader) {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store, max-age=0");
  }

  const startTime = Date.now();

  // 1. Verify Hinge Classifier Weights
  const ecsWeights = loadJsonSafe("data/ml/ecs_weights.json");
  const hingeOperational = !!(ecsWeights && ecsWeights.weights && typeof ecsWeights.weights.w0 === "number");

  // 2. Verify Semantic Domain Centroids
  const centroids = loadJsonSafe("data/ml/domain_centroids.json");
  const centroidsOperational = !!(centroids && centroids.vectorDim === 384 && centroids.domains);
  const domainList = centroids?.domains ? Object.keys(centroids.domains) : [];

  // 3. Verify Pricing Catalog
  const rates = loadJsonSafe("src/data/modelRates.json");
  const ratesOperational = !!(rates && typeof rates === "object");

  // 4. Memory Telemetry
  const memoryUsage = process.memoryUsage ? process.memoryUsage() : null;

  const isHealthy = hingeOperational && centroidsOperational && ratesOperational;

  const healthData = {
    status: isHealthy ? "healthy" : "degraded",
    service: "rei-ai",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime ? process.uptime() : 0),
    latencyMs: Date.now() - startTime,
    subsystems: {
      hingeClassifier: {
        status: hingeOperational ? "operational" : "unavailable",
        version: ecsWeights?.version || "unknown",
        parametersLoaded: ecsWeights?.weights ? Object.keys(ecsWeights.weights).length : 0,
        isolationVerified: ecsWeights?.metrics?.isolationVerified === true,
      },
      semanticCentroids: {
        status: centroidsOperational ? "operational" : "unavailable",
        vectorDim: centroids?.vectorDim || 0,
        clustersPerDomain: centroids?.k || 0,
        domains: domainList,
      },
      pricingCatalog: {
        status: ratesOperational ? "operational" : "unavailable",
        premiumBaseline: rates?._premium || "gpt-4o",
      },
      openaiProxy: {
        status: "operational",
        primaryGateway: "deepseek",
        deepseekConfigured: !!(process.env.DEEPSEEK_API_KEY || process.env.deepseek),
        supportedModels: 8,
        routeEndpoint: "/v1/chat/completions",
      }
    },
    system: {
      nodeVersion: process.version,
      heapUsedMb: memoryUsage ? +(memoryUsage.heapUsed / (1024 * 1024)).toFixed(2) : null,
      heapTotalMb: memoryUsage ? +(memoryUsage.heapTotal / (1024 * 1024)).toFixed(2) : null,
    }
  };

  const statusCode = isHealthy ? 200 : 503;
  return res.status(statusCode).json(healthData);
}
