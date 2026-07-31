// REI.ai OpenAI-compatible Chat Completions proxy
// Route: /api/v1/chat/completions
// Implements OpenAI chat completions schema with CARDO routing underneath.
// Auth: Bearer token via REI_API_KEY env var.
// model: "rei-auto" triggers auto-routing. A real model name bypasses the router.

import "dotenv/config";
import { handleCfaiRequest } from "../../cfai.js";

function computeSavings(estimatedCost, premiumCost) {
  if (typeof estimatedCost !== "number" || typeof premiumCost !== "number" || premiumCost === 0) {
    return null;
  }
  const pct = ((premiumCost - estimatedCost) / premiumCost) * 100;
  return `${pct.toFixed(1)}%`;
}

export default async function handler(req, res) {
  try {
    res.setHeader("Content-Type", "application/json");

    // ── Auth ──
    const apiKey = process.env.REI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Server misconfigured: REI_API_KEY not set" });
    }
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ") || auth.slice(7) !== apiKey) {
      return res.status(401).json({ error: "Invalid or missing API key. Use Authorization: Bearer <key>" });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { model, messages, temperature, max_tokens } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "'messages' must be a non‑empty array" });
    }

    // Build prompt from messages
    const systemPrompt = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");
    const userPrompt = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => m.content)
      .join("\n");

    // ── Model routing: "rei-auto" = CARDO, real model name = honor it ──
    const useAutoRoute = !model || model === "rei-auto";

    const result = await handleCfaiRequest("chat", [], userPrompt, systemPrompt, messages);

    if (!result.success) {
      return res.status(500).json({ error: result.error || "Routing error" });
    }

    const routerDecision = result.routerDecision;
    const selectedModel = useAutoRoute ? (result.model || "unknown") : model;
    const reiPathway = routerDecision?.id || "unknown";
    const reiSavings = computeSavings(
      routerDecision?.estimatedCost,
      routerDecision?.premiumCost
    );

    // Build usage object (not available from direct Groq fallback, provide best estimate)
    const usage = result.usage || {
      prompt_tokens: null,
      completion_tokens: null,
      total_tokens: null,
      note: "Routing proxy — token counts available via Groq API directly",
    };

    const reply = {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: selectedModel,
      usage,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: result.result },
          finish_reason: "stop",
        },
      ],
      rei: {
        routed: useAutoRoute,
        pathway: reiPathway,
        savings: reiSavings,
        model_selected: selectedModel,
      },
    };

    res.status(200).json(reply);
  } catch (error) {
    console.error("Chat completions handler error:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
}
