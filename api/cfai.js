// CFai API Route for Vercel Deployment
// Handles web requests and calls the CFai CLI tool or falls back to direct API routing.
import "dotenv/config";
import { REI_SYSTEM_PROMPT } from "../data/prompts/reiSystem.js";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execAsync = promisify(exec);
const CFAI_PATH = process.env.CFAI_PATH;

const MAX_INPUT_CHARS = 14000;
const PROVIDER_TIMEOUT_MS = 30000;

var providerCooldown = new Map();
var THROTTLE_COOLDOWN_MS = 15000;
var INTER_FALLBACK_MS = 300;
var DEFAULT_RETRY_AFTER_MS = 1500;

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function parseRetryAfter(res) {
  try {
    var header = res.headers.get("Retry-After");
    if (!header) return DEFAULT_RETRY_AFTER_MS;
    var seconds = Number(header);
    if (!isNaN(seconds) && seconds > 0) return seconds * 1000;
    var date = Date.parse(header);
    if (!isNaN(date)) return Math.max(0, date - Date.now());
  } catch (_) { /* fall through */ }
  return DEFAULT_RETRY_AFTER_MS;
}

function recordThrottle(provider, res) {
  var retryAfter = parseRetryAfter(res);
  providerCooldown.set(provider, Date.now() + THROTTLE_COOLDOWN_MS);
  console.warn(provider + " rate-limited — cooling down for " + (THROTTLE_COOLDOWN_MS / 1000) + "s");
  return sleep(retryAfter);
}

export function getProviderCooldown() {
  return Array.from(providerCooldown.entries()).map(function (entry) {
    return { provider: entry[0], until: entry[1], remaining: Math.max(0, entry[1] - Date.now()) };
  });
}

export function clearProviderCooldown() {
  providerCooldown.clear();
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

async function callDeepSeek(messages, maxTokens, temperature = 0.7) {
  const key = process.env.DEEPSEEK_API_KEY || process.env.deepseek;
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, PROVIDER_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "deepseek-v4-flash", messages: messages, temperature: temperature, max_tokens: maxTokens }),
    });
    if (!res.ok) {
      if (res.status === 429) { await recordThrottle("deepseek", res); }
      else {
        var errText = await res.text().catch(function () { return "(unreadable)"; });
        console.warn("DeepSeek status " + res.status + ": " + errText.slice(0, 300));
      }
      return null;
    }
    const data = await res.json();
    var finishReason = data.choices?.[0]?.finish_reason || null;
    return { content: data.choices?.[0]?.message?.content || "No content from DeepSeek.", model: "deepseek-v4-flash", usage: data.usage || null, truncated: finishReason === "length", finishReason: finishReason };
  } catch (err) {
    if (err && err.name === "AbortError") {
      console.warn("DeepSeek timed out after " + PROVIDER_TIMEOUT_MS + "ms");
    } else {
      console.warn("DeepSeek request error: " + (err && err.message ? err.message : err));
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(messages, maxTokens, temperature = 0.7) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.includes("your_gemini_api_key_here")) return null;

  const candidateModels = [
    process.env.GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ].filter(Boolean);

  for (let m = 0; m < candidateModels.length; m++) {
    const model = candidateModels[m];
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, PROVIDER_TIMEOUT_MS);
    try {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
        body: JSON.stringify({ model: model, messages: messages, temperature: temperature, max_tokens: maxTokens }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          await recordThrottle("gemini", res);
          return null;
        }
        const errText = await res.text().catch(function () { return ""; });
        console.warn("Gemini model " + model + " returned " + res.status + ": " + errText.slice(0, 200));
        // If 404 model not found, continue to next candidate model
        if (res.status === 404 && m < candidateModels.length - 1) {
          continue;
        }
        return null;
      }
      const data = await res.json();
      var finishReason = data.choices?.[0]?.finish_reason || null;
      return { content: data.choices?.[0]?.message?.content || "No content from Gemini.", model: model, usage: data.usage || null, truncated: finishReason === "length", finishReason: finishReason };
    } catch (err) {
      if (err && err.name === "AbortError") {
        console.warn("Gemini timed out after " + PROVIDER_TIMEOUT_MS + "ms");
        return null;
      } else {
        console.warn("Gemini request error: " + (err && err.message ? err.message : err));
        return null;
      }
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

async function callGroq(messages, maxTokens, model, temperature = 0.7) {
  const key = process.env.GROQ_API_KEY;
  if (!key || key.includes("your_groq_api_key_here")) return null;
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, PROVIDER_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ model: model || "llama-3.3-70b-versatile", messages: messages, temperature: temperature, max_tokens: maxTokens }),
    });
    if (!res.ok) {
      if (res.status === 429) { await recordThrottle("groq", res); }
      else { console.warn("Groq status " + res.status); }
      return null;
    }
    const data = await res.json();
    var finishReason = data.choices?.[0]?.finish_reason || null;
    return { content: data.choices?.[0]?.message?.content || "No content from Groq.", model: model || "llama-3.3-70b-versatile", usage: data.usage || null, truncated: finishReason === "length", finishReason: finishReason };
  } catch (err) {
    if (err && err.name === "AbortError") {
      console.warn("Groq timed out after " + PROVIDER_TIMEOUT_MS + "ms");
    } else {
      console.warn("Groq request error: " + (err && err.message ? err.message : err));
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAI(messages, maxTokens, temperature = 0.7) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, PROVIDER_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o", messages: messages, temperature: temperature, max_tokens: maxTokens }),
    });
    if (!res.ok) {
      if (res.status === 429) { await recordThrottle("openai", res); }
      return null;
    }
    const data = await res.json();
    var finishReason = data.choices?.[0]?.finish_reason || null;
    return { content: data.choices?.[0]?.message?.content || "No content from OpenAI.", model: "gpt-4o", usage: data.usage || null, truncated: finishReason === "length", finishReason: finishReason };
  } catch (err) {
    if (err && err.name === "AbortError") {
      console.warn("OpenAI timed out after " + PROVIDER_TIMEOUT_MS + "ms");
    } else {
      console.warn("OpenAI request error: " + (err && err.message ? err.message : err));
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ── Controlled continuation (NEVER SILENTLY TRUNCATE) ──
// When a provider returns finish_reason === "length", the model hit its
// OUTPUT token cap mid-response. Rather than silently returning a cut-off
// answer, REI continues the SAME model on the SAME backend, feeding the
// partial assistant turn back into context with a deterministic "Continue
// exactly where you left off" instruction. This is a controlled fallback:
// capped at MAX_CONTINUATION_CHUNKS total chunks, sticky to the original
// route/model/provider (never re-routed per chunk), and if the cap is hit
// while still truncated the final response is surfaced honestly as
// truncated rather than presented as complete.

const MAX_CONTINUATION_CHUNKS = 3;
const CONTINUATION_INSTRUCTION =
  "Continue exactly where the previous response ended. Do not repeat, summarize, restart, or preface the continuation. Preserve the established style, characters, facts, formatting, and narrative state.";

function sumUsage(acc, usage) {
  if (!usage) return acc;
  var out = acc || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  out.prompt_tokens += usage.prompt_tokens || 0;
  out.completion_tokens += usage.completion_tokens || 0;
  out.total_tokens += usage.total_tokens || 0;
  return out;
}

function appendContinuationTurns(messages, partialContent) {
  return messages.concat([
    { role: "assistant", content: partialContent },
    { role: "user", content: CONTINUATION_INSTRUCTION },
  ]);
}

// firstResult is an already-obtained truncated chunk. Continues on the SAME
// backend (runBackend) up to MAX_CONTINUATION_CHUNKS total chunks.
async function completeWithContinuation(runBackend, messages, firstResult) {
  var full = firstResult.content || "";
  var usage = sumUsage(null, firstResult.usage);
  var chunks = 1;
  var truncatedChunks = 1;
  // We only enter here when the first chunk is truncated, so the response
  // stays "truncated" until a continuation chunk completes cleanly.
  var stillTruncated = true;
  var finishReason = firstResult.finishReason || null;
  var currentMessages = appendContinuationTurns(messages, firstResult.content || "");

  while (chunks < MAX_CONTINUATION_CHUNKS) {
    var result = await runBackend(currentMessages);
    if (!result) {
      // Provider error mid-continuation: keep the partial, stay truncated,
      // never fabricate a completion.
      break;
    }
    chunks += 1;
    full += result.content || "";
    usage = sumUsage(usage, result.usage);
    finishReason = result.finishReason || finishReason;

    if (result.truncated) {
      truncatedChunks += 1;
      if (chunks >= MAX_CONTINUATION_CHUNKS) {
        break; // hit the cap while still truncated
      }
      currentMessages = appendContinuationTurns(currentMessages, result.content || "");
    } else {
      stillTruncated = false;
      break;
    }
  }

  return {
    content: full,
    usage: usage,
    truncated: stillTruncated,
    finishReason: finishReason,
    continuation: { attempted: true, chunks: chunks, truncatedChunks: truncatedChunks, finalTruncated: stillTruncated },
  };
}

function finalizeResult(result, runBackend, messages, modelLabel, routerDecision) {
  if (result && result.truncated) {
    return completeWithContinuation(runBackend, messages, result).then(function (done) {
      return {
        content: done.content,
        model: modelLabel,
        routerDecision: routerDecision,
        usage: done.usage || null,
        truncated: done.truncated || false,
        finishReason: done.finishReason || null,
        continuation: done.continuation,
      };
    });
  }
  return Promise.resolve({
    content: result ? result.content : "",
    model: modelLabel,
    routerDecision: routerDecision,
    usage: result && result.usage ? result.usage : null,
    truncated: result ? (result.truncated || false) : false,
    finishReason: result && result.finishReason ? result.finishReason : null,
    continuation: { attempted: false, chunks: 1, truncatedChunks: 0, finalTruncated: false },
  });
}

// ── Main API router: primary backend + fallback chain ──

async function callModelAPI(prompt, systemPrompt, history, routerDecision, messagesOverride) {
  var messages;
  if (messagesOverride && Array.isArray(messagesOverride) && messagesOverride.length > 0) {
    messages = messagesOverride;
  } else {
    const formattedHistory = history.map(function (msg) {
      return {
        role: msg.role === "assistant" || msg.role === "system" ? msg.role : "user",
        content: msg.content,
      };
    });
    messages = [
      { role: "system", content: systemPrompt || REI_SYSTEM_PROMPT },
      ...formattedHistory,
      { role: "user", content: prompt },
    ];
  }

  const maxTokens = routerDecision?.maxTokens || 2048;
  const primaryModel = routerDecision?.model || "deepseek-v4-flash";
  const primaryBackend = getBackendForModel(primaryModel);
  const temperature = routerDecision?.temperature ?? 0.7;
  // Only pass the routed model to Groq when Groq IS the primary backend —
  // as a fallback it must use the default model (a non-Groq routed model
  // like deepseek-v4-flash would be rejected by Groq's API).
  const groqModel = primaryBackend === "groq" ? primaryModel : null;

  // Map of available backends (each accepts an optional message override so
  // the continuation loop can re-call the SAME backend with appended turns)
  var backends = {};
  if (process.env.DEEPSEEK_API_KEY || process.env.deepseek) backends.deepseek = function (msgs) { return callDeepSeek(msgs || messages, maxTokens, temperature); };
  if (process.env.GEMINI_API_KEY) backends.gemini = function (msgs) { return callGemini(msgs || messages, maxTokens, temperature); };
  if (process.env.GROQ_API_KEY) backends.groq = function (msgs) { return callGroq(msgs || messages, maxTokens, groqModel, temperature); };
  if (process.env.OPENAI_API_KEY) backends.openai = function (msgs) { return callOpenAI(msgs || messages, maxTokens, temperature); };

  // Try primary backend first (unless in cooldown)
  if (primaryBackend && backends[primaryBackend]) {
    var cooldownUntil = providerCooldown.get(primaryBackend);
    if (cooldownUntil && Date.now() < cooldownUntil) {
      console.warn("Skipping primary backend " + primaryBackend + " — in cooldown (" + Math.ceil((cooldownUntil - Date.now()) / 1000) + "s remaining)");
    } else {
      var result = await backends[primaryBackend]();
      if (result) {
        providerCooldown.delete(primaryBackend);
        return await finalizeResult(result, backends[primaryBackend], messages, primaryModel, routerDecision);
      }
    }
  }

  // Fallback: try remaining backends in priority order
  var order = primaryBackend ? ["groq", "gemini", "deepseek", "openai"].filter(function (b) { return b !== primaryBackend; }) : ["groq", "gemini", "deepseek", "openai"];
  for (var i = 0; i < order.length; i++) {
    var backend = order[i];
    if (backends[backend]) {
      var fbCooldown = providerCooldown.get(backend);
      if (fbCooldown && Date.now() < fbCooldown) {
        console.warn("Skipping fallback " + backend + " — in cooldown (" + Math.ceil((fbCooldown - Date.now()) / 1000) + "s remaining)");
        continue;
      }
      console.warn("Primary backend " + primaryBackend + " failed, falling back to " + backend);
      result = await backends[backend]();
      if (result) {
        providerCooldown.delete(backend);
        return await finalizeResult(result, backends[backend], messages, result.model + " (fallback)", routerDecision);
      }
      await sleep(INTER_FALLBACK_MS);
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

// ── Direct model API: called when an explicit model bypasses the router cascade ──

export async function callModelDirect(model, messages, maxTokens, temperature) {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return { content: "[REI.AI NOTICE] No messages provided.", model: "none", rateLimited: false };
  }
  const maxT = maxTokens || 2048;
  const temp = temperature ?? 0.7;
  const primaryBackend = getBackendForModel(model);

  var backends = {};
  if (process.env.DEEPSEEK_API_KEY || process.env.deepseek) backends.deepseek = function (msgs) { return callDeepSeek(msgs || messages, maxT, temp); };
  if (process.env.GEMINI_API_KEY) backends.gemini = function (msgs) { return callGemini(msgs || messages, maxT, temp); };
  if (process.env.GROQ_API_KEY) backends.groq = function (msgs) { return callGroq(msgs || messages, maxT, model, temp); };
  if (process.env.OPENAI_API_KEY) backends.openai = function (msgs) { return callOpenAI(msgs || messages, maxT, temp); };

  if (primaryBackend && backends[primaryBackend]) {
    var cooldownUntil = providerCooldown.get(primaryBackend);
    if (cooldownUntil && Date.now() < cooldownUntil) {
      console.warn("Skipping primary backend " + primaryBackend + " — in cooldown (" + Math.ceil((cooldownUntil - Date.now()) / 1000) + "s remaining)");
    } else {
      var result = await backends[primaryBackend]();
      if (result) {
        providerCooldown.delete(primaryBackend);
        return await finalizeResult(result, backends[primaryBackend], messages, model, null);
      }
    }
  }

  var order = primaryBackend ? ["groq", "gemini", "deepseek", "openai"].filter(function (b) { return b !== primaryBackend; }) : ["groq", "gemini", "deepseek", "openai"];
  for (var i = 0; i < order.length; i++) {
    var backend = order[i];
    if (backends[backend]) {
      var fbCooldown = providerCooldown.get(backend);
      if (fbCooldown && Date.now() < fbCooldown) {
        console.warn("Skipping fallback " + backend + " — in cooldown (" + Math.ceil((fbCooldown - Date.now()) / 1000) + "s remaining)");
        continue;
      }
      console.warn("Primary backend " + primaryBackend + " failed, falling back to " + backend);
      result = await backends[backend]();
      if (result) {
        providerCooldown.delete(backend);
        return await finalizeResult(result, backends[backend], messages, result.model + " (fallback)", null);
      }
      await sleep(INTER_FALLBACK_MS);
    }
  }

  return {
    content: "[REI.AI NOTICE] All reasoning backends are unavailable. Please wait a moment and try again.",
    model: "none",
    rateLimited: true,
    retryAfter: "~30s",
  };
}

export async function handleCfaiRequest(command, args, input, systemPrompt, history, routerDecision, messagesOverride) {
  args = args || [];
  input = input || "";
  systemPrompt = systemPrompt || "";
  history = history || [];

  const localCliExists = CFAI_PATH && fs.existsSync(CFAI_PATH);

  if (!localCliExists) {
    try {
      const payload = input || (args.length > 0 ? args.join(" ") : "help");
      const response = await callModelAPI(payload, systemPrompt, history, routerDecision, messagesOverride);
      return {
        success: true,
        result: response.content,
        model: response.model,
        routerDecision: response.routerDecision || routerDecision,
        usage: response.usage || null,
        truncated: response.truncated || false,
        finishReason: response.finishReason || null,
        continuation: response.continuation || { attempted: false, chunks: 1, truncatedChunks: 0, finalTruncated: false },
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

// ── Evaluation-plane persistence ──
// Stores durable server-side traces so the evaluation plane can answer
// longitudinal questions instead of only client-side localStorage snapshots.
// See docs/POLICY_LOOP.md for the evaluation plane boundary.

import { storeTrace } from "../shared/lib/kv.js";
import { requireApiKey } from "../shared/lib/auth.js";
const POLICY_VERSION = "v1";
const PILOT_TENANT = "pilot";

function resolveProvider(modelName) {
  if (!modelName) return null;
  const m = modelName.toLowerCase().replace(/\s*\(fallback\)\s*/g, "");
  if (m.includes("deepseek")) return "deepseek";
  if (m.includes("gemini")) return "gemini";
  if (m.includes("llama") || m.includes("groq")) return "groq";
  if (m.includes("gpt") || m.includes("openai")) return "openai";
  return "unknown";
}

export default async function handler(req, res) {
  try {
    res.setHeader("Content-Type", "application/json");

    if (!requireApiKey(req, res)) return;

    if (req.method === "POST") {
      var body = req.body || {};
      var command = body.command;
      var args = body.args || [];
      var input = body.input || "";
      var systemPrompt = body.systemPrompt || "";
      var history = body.history || [];
      var routerDecision = body.routerDecision;
      var messagesOverride = body.messagesOverride;
      var startTime = Date.now();

      if (typeof input === "string" && input.length > MAX_INPUT_CHARS) {
        return res.status(400).json({
          success: false,
          error: "Input too long (" + input.length + " chars, max " + MAX_INPUT_CHARS + "). If you pasted a large record, trim it to the relevant section.",
        });
      }

      const result = await handleCfaiRequest(command, args, input, systemPrompt, history, routerDecision, messagesOverride);

      // Persist a durable trace entry to the evaluation plane.  Non-blocking:
      // the response is prepared before the KV write, but Vercel waits for
      // unresolved promises before terminating the function.
      const requestId = body.requestId ||
        (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "req-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10));
      const tracePromise = storeTrace(PILOT_TENANT, requestId, {
        requestId: requestId,
        clientRequestId: body.requestId || null,
        policyVersion: POLICY_VERSION,
        tenantId: PILOT_TENANT,
        timestamp: new Date().toISOString(),
        prompt: (input || "").slice(0, 500),
        domain: routerDecision?.domain || null,
        routeId: routerDecision?.id || null,
        model: routerDecision?.model || null,
        estimatedCost: routerDecision?.estimatedCost ?? null,
        premiumCost: routerDecision?.premiumCost ?? null,
        hingeScore: routerDecision?.hingeScore ?? null,
        responseModel: result.model || null,
        provider: resolveProvider(result.model),
        truncated: result.truncated || false,
        finishReason: result.finishReason || null,
        usage: result.usage || null,
        continuationAttempted: result.continuation?.attempted || false,
        totalChunks: result.continuation?.chunks ?? 1,
        truncatedChunks: result.continuation?.truncatedChunks ?? (result.truncated ? 1 : 0),
        finalTruncated: result.continuation?.finalTruncated ?? (result.truncated || false),
        latencyMs: Date.now() - startTime,
        // The client writes actualCost + rescue to the routing log AFTER
        // receiving this response; the trace captures what the server
        // observed at decision time.
      });

      res.status(result.success ? 200 : 500).json(result);

      // Await after sending the response — the client gets its data while
      // the trace persists. Vercel keeps the function alive for this.
      try {
        await tracePromise;
      } catch (e) {
        console.warn("[eval-plane] Trace persistence deferred:", e.message);
      }
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
