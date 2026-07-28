// CFai API Route for Vercel Deployment
// Handles web requests and calls the CFai CLI tool or falls back to direct Groq API requests.
import "dotenv/config";
import { REI_SYSTEM_PROMPT } from "../data/prompts/reiSystem.js";
// Optional override: if MODEL env var is set, use it for all Groq calls
const DEFAULT_MODEL = process.env.MODEL || null;
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import { buildRouterDecision, resolveRoutingModel } from "../src/lib/nightShiftRouter.js";

const execAsync = promisify(exec);
const CFAI_PATH = process.env.CFAI_PATH; // No default – if undefined we fall back to Groq

const MAX_INPUT_CHARS = 14000; // record cap (12000) + room for the surrounding prompt scaffolding

function selectGroqModel(prompt = "", routerDecision = null) {
  const decision = routerDecision || buildRouterDecision({ input: prompt });
  return resolveRoutingModel(decision) || DEFAULT_MODEL || "llama-3.3-70b-versatile";
}

async function callGroqDirectly(prompt, systemPrompt = "", history = [], routerDecision = null) {
  const isPremiumRoute = routerDecision?.model === "gpt-4o" || routerDecision?.id === "adversarial-validation";
  const isGptMode =
    isPremiumRoute ||
    prompt.toLowerCase().includes("proprietary model profiles") ||
    prompt.toLowerCase().includes("gpt mode");

  // Filter history to conform to OpenAI chat message roles (system, user, assistant)
  const formattedHistory = history.map(msg => ({
    role: msg.role === "assistant" || msg.role === "system" ? msg.role : "user",
    content: msg.content
  }));

  if (isGptMode && process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: systemPrompt || REI_SYSTEM_PROMPT,
            },
            ...formattedHistory,
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          content: data.choices?.[0]?.message?.content || "No content returned from OpenAI.",
          model: "gpt-4o",
        };
      }
    } catch (e) {
      console.warn("OpenAI API routing failed, falling back to Groq:", e);
    }
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes("your_groq_api_key_here")) {
    // No real key – return a mock response
    return {
      content: `[REI.AI NOTICE] GROQ_API_KEY not set or placeholder. Mock response for prompt: ${prompt}`,
      model: "mock",
      routerDecision,
    };
  }

  const selectedModel = selectGroqModel(prompt, routerDecision);
  const maxTokens = routerDecision?.maxTokens || 2048;

  const requestBody = {
    model: selectedModel,
    messages: [
      {
        role: "system",
        content: systemPrompt || REI_SYSTEM_PROMPT,
      },
      ...formattedHistory,
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: maxTokens,
  };

  // Retry transient failures (rate limits, 5xx) to avoid spiking the error rate.
  let lastError = null;
  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || "No content returned from Groq.";

      if (!content || content.trim().length === 0) {
        content = "[REI.AI NOTICE] Empty response received; defaulting to placeholder message.";
      }

      if (isGptMode && !process.env.OPENAI_API_KEY) {
        content = `[REI.AI ROUTING WARNING: OPENAI_API_KEY not found in Vercel. Falling back to Open-Source Router: ${selectedModel}]\n\n${content}`;
      }

      return { content, model: selectedModel, routerDecision };
    }

    const errText = await response.text();
    lastError = `Groq API returned status ${response.status}: ${errText}`;

    // Retry on rate limit or server errors; fail fast on auth/bad request.
    if (response.status !== 429 && response.status < 500) {
      break;
    }
  }

  // Return a graceful user-facing message instead of throwing a 500.
  // If Groq is rate limited and OpenAI is available, fall back to OpenAI.
  if (process.env.OPENAI_API_KEY) {
    try {
      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt || REI_SYSTEM_PROMPT },
            ...formattedHistory,
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: maxTokens,
        }),
      });

      if (openaiResponse.ok) {
        const data = await openaiResponse.json();
        return {
          content: `${data.choices?.[0]?.message?.content || "No content returned from OpenAI."}\n\n*Generated via OpenAI fallback (Groq was rate limited)*`,
          model: "gpt-4o-mini",
          routerDecision,
        };
      }
    } catch (openaiError) {
      console.warn("OpenAI fallback also failed:", openaiError);
    }
  }

  return {
    content: "[REI.AI NOTICE] The reasoning backend is temporarily busy (rate limit). Please wait a moment and try again.",
    model: "rate-limited",
    routerDecision,
    rateLimited: true,
  };
}

export async function handleCfaiRequest(command, args = [], input = "", systemPrompt = "", history = [], routerDecision = null) {
  // Check if CLI is available locally
  const localCliExists = CFAI_PATH && fs.existsSync(CFAI_PATH);

  if (!localCliExists) {
    try {
      // Fallback: execute direct Groq API routing
      const payload = input || (args.length > 0 ? args.join(" ") : "help");
      const response = await callGroqDirectly(payload, systemPrompt, history, routerDecision);
      return {
        success: true,
        result: response.content,
        model: response.model,
        routerDecision: response.routerDecision || routerDecision,
        timestamp: new Date().toISOString(),
      };
    } catch (apiError) {
      console.error("handleCfaiRequest apiError:", apiError);
      return {
        success: false,
        error: `CLI fallback error: ${apiError.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Local CLI Executable Execution (if present)
  try {
    const cleanArgs = args.map((arg) => arg.replace(/["';`$()]/g, ""));
    let commandStr = `"${CFAI_PATH}" ${command} ${cleanArgs.join(" ")}`;

    const { stdout, stderr } = await execAsync(commandStr, {
      env: { ...process.env },
      timeout: 10000,
    });

    if (stderr && stderr.trim()) {
      return {
        success: true,
        result: stdout.trim(),
        warning: stderr.trim(),
        timestamp: new Date().toISOString(),
      };
    }

    // Ensure stdout is not empty; provide fallback message
    const trimmedStdout = stdout.trim();
    const resultText = trimmedStdout.length > 0 ? trimmedStdout : "[REI.AI NOTICE] Empty CLI response; defaulting to placeholder.";
    return {
      success: true,
      result: resultText,
      timestamp: new Date().toISOString(),
    };
  } catch (execError) {
    return {
      success: false,
      error: `Local execution error: ${execError.message}`,
      timestamp: new Date().toISOString(),
    };
  }
}

export default async function handler(req, res) {
  try {
    // Set headers
    res.setHeader("Content-Type", "application/json");

    if (req.method === "POST") {
      const { command, args = [], input = "", systemPrompt = "", history = [], routerDecision } = req.body || {};
      
      // Backend length guard - never trust client-side validation alone
      if (typeof input === "string" && input.length > MAX_INPUT_CHARS) {
        return res.status(400).json({
          success: false,
          error: `Input too long (${input.length} chars, max ${MAX_INPUT_CHARS}). If you pasted a large record, trim it to the relevant section.`,
        });
      }
      
      const result = await handleCfaiRequest(command, args, input, systemPrompt, history, routerDecision);
      res.status(result.success ? 200 : 500).json(result);
      return;
    }

    if (req.method === "GET") {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const command = url.searchParams.get("command") || "help";
      const argsParam = url.searchParams.get("args");
      const args = argsParam ? argsParam.split(",") : [];

      const result = await handleCfaiRequest(command, args);
      res.status(result.success ? 200 : 500).json(result);
      return;
    }

    res.status(405).json({
      success: false,
      error: "Method Not Allowed",
    });
    return;
  } catch (error) {
    console.error("Handler caught error stack:", error.stack);
    res.status(500).json({
      success: false,
      error: "Serverless execution error",
      details: error.message,
    });
    return;
  }
}
