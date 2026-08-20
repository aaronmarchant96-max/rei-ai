// REI.ai OpenAI-compatible Models List endpoint
// Route: /api/v1/models & /v1/models

export default async function handler(req, res) {
  if (res.setHeader) {
    res.setHeader("Content-Type", "application/json");
  }

  const modelsList = [
    {
      id: "rei-auto",
      object: "model",
      created: 1700000000,
      owned_by: "rei-ai",
      description: "REI Dynamic Cognitive Router (DeepSeek #1 Primary Gateway with multi-provider fallbacks)",
    },
    {
      id: "deepseek-v4-flash",
      object: "model",
      created: 1700000000,
      owned_by: "deepseek",
      description: "DeepSeek primary high-throughput reasoning engine (~$0.14 / 1M input tokens)",
    },
    {
      id: "deepseek-v4-pro",
      object: "model",
      created: 1700000000,
      owned_by: "deepseek",
      description: "DeepSeek flagship architectural reasoning engine",
    },
    {
      id: "deepseek-reasoner",
      object: "model",
      created: 1700000000,
      owned_by: "deepseek",
      description: "DeepSeek mathematical and algorithmic reasoning engine",
    },
    {
      id: "llama-3.1-8b-instant",
      object: "model",
      created: 1700000000,
      owned_by: "groq",
      description: "Fast-lane generalist engine (~$0.05 / 1M tokens)",
    },
    {
      id: "openai/gpt-oss-20b",
      object: "model",
      created: 1700000000,
      owned_by: "groq",
      description: "Medium-complexity code & prose engine (~$0.15 / 1M tokens)",
    },
    {
      id: "openai/gpt-oss-120b",
      object: "model",
      created: 1700000000,
      owned_by: "groq",
      description: "High-complexity narrative & engineering architect (~$0.90 / 1M tokens)",
    },
    {
      id: "gemini-3.6-flash",
      object: "model",
      created: 1700000000,
      owned_by: "google",
      description: "Long-context reasoning fallback engine",
    },
    {
      id: "zai/glm-5.2",
      object: "model",
      created: 1700000000,
      owned_by: "zhipu",
      description: "Multilingual & structured synthesis engine",
    }
  ];

  return res.status(200).json({
    object: "list",
    data: modelsList,
  });
}
