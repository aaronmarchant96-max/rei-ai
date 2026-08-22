// REI.ai System Health Endpoint
// Route: /api/health
// Public Minimal Health Probe — performs zero inference and incurs $0 cost.

import { buildServerRouterDecision } from "../shared/lib/serverRouter.js";

export default async function handler(req, res) {
  if (res.setHeader) {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store, max-age=0");
  }

  try {
    // 1. Test gateway boundary instantiation without performing inference
    const routerProbe = buildServerRouterDecision({ input: "health check" });
    const isReady = Boolean(routerProbe && routerProbe.model);

    if (req.method !== "GET" && req.method !== "HEAD") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    return res.status(isReady ? 200 : 503).json({
      status: isReady ? "ready" : "degraded",
      version: "40a244c",
      gateway: "chat-completions",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(503).json({
      status: "degraded",
      version: "40a244c",
      gateway: "chat-completions",
      timestamp: new Date().toISOString()
    });
  }
}
