// CFai API Route for Vercel Deployment
// Handles web requests and calls the CFai CLI tool or falls back to direct API routing.
import "dotenv/config";
import { REI_SYSTEM_PROMPT } from "../data/prompts/reiSystem.js";
const DEFAULT_MODEL = process.env.MODEL || null;
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import { buildRouterDecision, resolveRoutingModel } from "../src/lib/nightShiftRouter.js";

const execAsync = promisify(exec);
const CFAI_PATH = process.env.CFAI_PATH;

const MAX_INPUT_CHARS = 14000;

function selectGroqModel(prompt, routerDecision) {
  const decision = routerDecision || buildRouterDecision({ input: prompt });
  return resolveRoutingModel(decision) || DEFAULT_MODEL || "deepseek-chat";
}

// ── Backend dispatcher: model name → API provider ──

function getBackendForModel(model) {
  if (!model) return null;
  if (model.startsWith("gpt-")) return "openai";
  if (model.startsWith("deepseek")) return "deepseek";
  if (model.includes("gemini") || model.includes("gemma")) return "gemini";
  if (model.includes("llama") || model.includes("mixtral")) return "groq";
  return "deepseek";
}

// ── Per-backend callers ──

async function callDeepSeek(messages, maxTokens) {
  const key = process.env.DEEPSEEK_API_KEY || process.env.deepseek;
  if (!key) return null;
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "deepseek-chat", messages: messages, temperature: 0.7, max_tokens: maxTokens }),
  });
  if (!res.ok) {
    const err = await res.text().catch(function () { return "(unreadable)"; });
    console.warn("DeepSeek status " + res.status + ": " + err.slice(0, 300));
    return null;
  }
  const data = await res.json();
  return { content: data.choices?.[0]?.message?.content || "No content from DeepSeek.", model: "deepseek-chat" };
}

async function callGemini(messages, maxTokens) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !key.startsWith("AQ.")) return null;
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gemini-flash-latest", messages: messages, temperature: 0.7, max_tokens: maxTokens }),
  });
  if (!res.ok) {
    console.warn("Gemini status " + res.status);
    return null;
  }
  const data = await res.json();
  return { content: data.choices?.[0]?.message?.content || "No content from Gemini.", model: "gemini-flash-latest" };
}

async function callGroq(messages, maxTokens, model) {
  const key = process.env.GROQ_API_KEY;
  if (!key || key.includes("your_groq_api_key_here")) return null;
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ model: model || "llama-3.3-70b-versatile", messages: messages, temperature: 0.7, max_tokens: maxTokens }),
  });
  if (!res.ok) {
    console.warn("Groq status " + res.status);
    return null;
  }
  const data = await res.json();
  return { content: data.choices?.[0]?.message?.content || "No content from Groq.", model: model || "llama-3.3-70b-versatile" };
}

async function callOpenAI(messages, maxTokens) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o", messages: messages, temperature: 0.7, max_tokens: maxTokens }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return { content: data.choices?.[0]?.message?.content || "No content from OpenAI.", model: "gpt-4o" };
}

// ── Main API router: primary backend + fallback chain ──

async function callModelAPI(prompt, systemPrompt, history, routerDecision) {
  const formattedHistory = history.map(function (msg) {
    return {
      role: msg.role === "assistant" || msg.role === "system" ? msg.role : "user",
      content: msg.content,
    };
  });

  const messages = [
    { role: "system", content: systemPrompt || REI_SYSTEM_PROMPT },
    ...formattedHistory,
    { role: "user", content: prompt },
  ];

  const maxTokens = routerDecision?.maxTokens || 2048;
  const primaryModel = routerDecision?.model || "deepseek-chat";
  const primaryBackend = getBackendForModel(primaryModel);

  // Map of available backends
  var backends = {};
  if (process.env.DEEPSEEK_API_KEY || process.env.deepseek) backends.deepseek = function () { return callDeepSeek(messages, maxTokens); };
  if (process.env.GEMINI_API_KEY) backends.gemini = function () { return callGemini(messages, maxTokens); };
  if (process.env.GROQ_API_KEY) backends.groq = function () { return callGroq(messages, maxTokens, null); };
  if (process.env.OPENAI_API_KEY) backends.openai = function () { return callOpenAI(messages, maxTokens); };

  // Try primary backend first
  if (primaryBackend && backends[primaryBackend]) {
    var result = await backends[primaryBackend]();
    if (result) {
      return { content: result.content, model: primaryModel, routerDecision: routerDecision };
    }
  }

  // Fallback: try remaining backends in priority order
  var order = primaryBackend ? ["deepseek", "gemini", "groq", "openai"].filter(function (b) { return b !== primaryBackend; }) : ["deepseek", "gemini", "groq", "openai"];
  for (var i = 0; i < order.length; i++) {
    var backend = order[i];
    if (backends[backend]) {
      console.warn("Primary backend " + primaryBackend + " failed, falling back to " + backend);
      result = await backends[backend]();
      if (result) {
        return { content: result.content, model: result.model + " (fallback)", routerDecision: routerDecision };
      }
    }
  }

  // Final graceful error
  return {
    content: "[REI.AI NOTICE] All reasoning backends are unavailable. Please wait a moment and try again.",
    model: "none",
    routerDecision: routerDecision,
    rateLimited: true,
    attemptedModel: primaryModel,
    retryAfter: "~30s",
  };
}

export async function handleCfaiRequest(command, args, input, systemPrompt, history, routerDecision) {
  args = args || [];
  input = input || "";
  systemPrompt = systemPrompt || "";
  history = history || [];

  const localCliExists = CFAI_PATH && fs.existsSync(CFAI_PATH);

  if (!localCliExists) {
    try {
      const payload = input || (args.length > 0 ? args.join(" ") : "help");
      const response = await callModelAPI(payload, systemPrompt, history, routerDecision);
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
        error: "API error: " + apiError.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Local CLI Executable Execution (if present)
  try {
    const cleanArgs = args.map(function (arg) { return arg.replace(/["';`$()]/g, ""); });
    const commandStr = "\"" + CFAI_PATH + "\" " + command + " " + cleanArgs.join(" ");

    const { stdout, stderr } = await execAsync(commandStr, {
      env: Object.assign({}, process.env),
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
      error: "Local execution error: " + execError.message,
      timestamp: new Date().toISOString(),
    };
  }
}

export default async function handler(req, res) {
  try {
    res.setHeader("Content-Type", "application/json");

    if (req.method === "POST") {
      var body = req.body || {};
      var command = body.command;
      var args = body.args || [];
      var input = body.input || "";
      var systemPrompt = body.systemPrompt || "";
      var history = body.history || [];
      var routerDecision = body.routerDecision;

      if (typeof input === "string" && input.length > MAX_INPUT_CHARS) {
        return res.status(400).json({
          success: false,
          error: "Input too long (" + input.length + " chars, max " + MAX_INPUT_CHARS + "). If you pasted a large record, trim it to the relevant section.",
        });
      }

      const result = await handleCfaiRequest(command, args, input, systemPrompt, history, routerDecision);
      res.status(result.success ? 200 : 500).json(result);
      return;
    }

    if (req.method === "GET") {
      var url = new URL(req.url, "http://" + req.headers.host);
      var gcommand = url.searchParams.get("command") || "help";
      var gargsParam = url.searchParams.get("args");
      var gargs = gargsParam ? gargsParam.split(",") : [];

      const result = await handleCfaiRequest(gcommand, gargs);
      res.status(result.success ? 200 : 500).json(result);
      return;
    }

    res.status(405).json({
      success: false,
      error: "Method Not Allowed",
    });
  } catch (error) {
    console.error("Handler caught error stack:", error.stack);
    res.status(500).json({
      success: false,
      error: "Serverless execution error",
      details: error.message,
    });
  }
}
