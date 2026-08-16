// CFai API Route for Vercel Deployment
// Handles web requests and calls the CFai CLI tool or falls back to direct API routing.
import "dotenv/config";
import { REI_SYSTEM_PROMPT } from "../data/prompts/reiSystem.js";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

export const maxDuration = 60;

const execAsync = promisify(exec);
const CFAI_PATH = process.env.CFAI_PATH;

const MAX_INPUT_CHARS = 14000;
const PROVIDER_TIMEOUT_MS = 8000;

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
  if (model.includes("glm") || model.includes("zai")) return "glm";
  if (model.includes("llama") || model.includes("mixtral")) return "groq";
  return "deepseek";
}

// ── Tools & Autonomous Function Calling ──

export const AVAILABLE_TOOLS = [
  {
    type: "function",
    function: {
      name: "fetch_url",
      description: "Fetches and reads the text content of a public web page or document URL. Use when you need real-time data, web content, articles, or documentation from a specific link.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The full HTTP/HTTPS URL of the web page to fetch."
          }
        },
        required: ["url"]
      }
    }
  }
];

const URL_TIMEOUT_MS = 8000;
const MAX_FETCH_CHARS = 6000;

export function isPrivateIpOrHost(hostname) {
  if (!hostname) return true;
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return true;
  if (h === "0.0.0.0" || h === "::1" || /^fc00:/i.test(h)) return true;
  return false;
}

export function cleanHtmlToText(html) {
  if (!html) return "";
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "";

  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "");

  cleaned = cleaned
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  cleaned = cleaned.replace(/\s+/g, " ").trim();
  const truncated = cleaned.slice(0, MAX_FETCH_CHARS);
  return title ? `Title: ${title}\n\n${truncated}` : truncated;
}

const MAX_REDIRECTS = 3;

export async function executeFetchUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") {
    return JSON.stringify({ error: "Invalid or empty URL provided." });
  }

  let currentUrl = rawUrl;
  let redirectsFollowed = 0;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), URL_TIMEOUT_MS);

  try {
    while (redirectsFollowed <= MAX_REDIRECTS) {
      let parsedUrl;
      try {
        parsedUrl = new URL(currentUrl);
      } catch {
        return JSON.stringify({ error: "Malformed URL. Must be a valid http:// or https:// URL." });
      }

      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return JSON.stringify({ error: "Only http and https protocols are supported." });
      }

      if (isPrivateIpOrHost(parsedUrl.hostname)) {
        return JSON.stringify({ error: "Access to local, internal, and private IP addresses is blocked for security." });
      }

      // GitHub repository fast-path: fetch raw README.md directly for instant 200ms parsing
      if (parsedUrl.hostname === "github.com") {
        const ghMatch = parsedUrl.pathname.match(/^\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/?$/);
        if (ghMatch) {
          const owner = ghMatch[1];
          const repo = ghMatch[2];
          try {
            const rawReadmeUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`;
            const rawRes = await fetch(rawReadmeUrl, {
              signal: controller.signal,
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" }
            });
            if (rawRes.ok) {
              const rawText = await rawRes.text();
              const truncated = rawText.slice(0, MAX_FETCH_CHARS);
              return JSON.stringify({
                url: parsedUrl.href,
                content: `GitHub Repository: ${owner}/${repo}\n\nREADME.md Content:\n${truncated}`
              });
            }
          } catch {
            // Fall through to standard HTML fetch
          }
        }
      }

      const res = await fetch(parsedUrl.href, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 REI-Bot/1.0",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
        }
      });

      // Handle redirects manually to prevent SSRF bypass via 301/302/307/308
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) {
          return JSON.stringify({ error: `Received HTTP ${res.status} redirect without a Location header.` });
        }

        redirectsFollowed += 1;
        if (redirectsFollowed > MAX_REDIRECTS) {
          return JSON.stringify({ error: `Too many redirects (exceeded limit of ${MAX_REDIRECTS}).` });
        }

        // Resolve relative redirects against current URL
        try {
          const nextUrl = new URL(location, parsedUrl.href);
          currentUrl = nextUrl.href;
          continue;
        } catch {
          return JSON.stringify({ error: `Invalid redirect target URL: ${location}` });
        }
      }

      if (!res.ok) {
        return JSON.stringify({ error: `HTTP ${res.status} ${res.statusText || "Error"} from server.` });
      }

      const text = await res.text();
      const cleanContent = cleanHtmlToText(text);
      return JSON.stringify({ url: parsedUrl.href, content: cleanContent });
    }

    return JSON.stringify({ error: "Too many redirects." });
  } catch (err) {
    if (err && err.name === "AbortError") {
      return JSON.stringify({ error: `URL fetch timed out after ${URL_TIMEOUT_MS}ms.` });
    }
    return JSON.stringify({ error: `Failed to fetch URL: ${err.message || String(err)}` });
  } finally {
    clearTimeout(timer);
  }
}

// ── Per-backend callers ──

async function callDeepSeek(messages, maxTokens, temperature = 0.7, tools = null) {
  const key = process.env.DEEPSEEK_API_KEY || process.env.deepseek;
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, PROVIDER_TIMEOUT_MS);
  try {
    const payload = { model: "deepseek-v4-flash", messages: messages, temperature: temperature, max_tokens: maxTokens };
    if (tools && tools.length > 0) payload.tools = tools;
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
    return {
      content: data.choices?.[0]?.message?.content || "",
      model: "deepseek-v4-flash",
      usage: data.usage || null,
      truncated: finishReason === "length",
      finishReason: finishReason,
      tool_calls: data.choices?.[0]?.message?.tool_calls || null
    };
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

async function callGemini(messages, maxTokens, modelOverride, temperature = 0.7, tools = null) {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.includes("your_gemini_api_key_here")) return null;

  const candidateModels = [
    modelOverride,
    process.env.GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-2.5-pro",
    "gemini-1.5-pro",
  ].filter(Boolean);

  const uniqueCandidates = Array.from(new Set(candidateModels));

  for (let m = 0; m < uniqueCandidates.length; m++) {
    const model = uniqueCandidates[m];
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, PROVIDER_TIMEOUT_MS);
    try {
      const payload = { model: model, messages: messages, temperature: temperature, max_tokens: maxTokens };
      if (tools && tools.length > 0) payload.tools = tools;
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: "Bearer " + key,
          "x-goog-api-key": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        if (res.status === 429) {
          await recordThrottle("gemini", res);
          return null;
        }

        let errObj = null;
        let errRaw = "";
        try {
          errRaw = await res.text();
          errObj = JSON.parse(errRaw);
        } catch {
          // errRaw is raw string if non-JSON
        }

        const errDetail = errObj?.error || {};
        const errStatus = errDetail.status || "";
        const errCode = errDetail.code || res.status;
        const errMsg = errDetail.message || errRaw;

        console.warn(`Gemini model ${model} returned HTTP ${res.status} [status=${errStatus || "N/A"}]: ${errMsg.slice(0, 200)}`);

        if (res.status !== 401 && res.status !== 403 && m < uniqueCandidates.length - 1) {
          continue;
        }
        return null;
      }
      const data = await res.json();
      var finishReason = data.choices?.[0]?.finish_reason || null;
      return {
        content: data.choices?.[0]?.message?.content || "",
        model: model,
        usage: data.usage || null,
        truncated: finishReason === "length",
        finishReason: finishReason,
        tool_calls: data.choices?.[0]?.message?.tool_calls || null
      };
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

async function callGroq(messages, maxTokens, model, temperature = 0.7, tools = null) {
  const key = process.env.GROQ_API_KEY;
  if (!key || key.includes("your_groq_api_key_here")) return null;
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, PROVIDER_TIMEOUT_MS);
  try {
    const payload = { model: model || "llama-3.3-70b-versatile", messages: messages, temperature: temperature, max_tokens: maxTokens };
    if (tools && tools.length > 0) payload.tools = tools;
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      if (res.status === 429) { await recordThrottle("groq", res); }
      else { console.warn("Groq status " + res.status); }
      return null;
    }
    const data = await res.json();
    var finishReason = data.choices?.[0]?.finish_reason || null;
    return {
      content: data.choices?.[0]?.message?.content || "",
      model: model || "llama-3.3-70b-versatile",
      usage: data.usage || null,
      truncated: finishReason === "length",
      finishReason: finishReason,
      tool_calls: data.choices?.[0]?.message?.tool_calls || null
    };
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

async function callOpenAI(messages, maxTokens, temperature = 0.7, tools = null) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, PROVIDER_TIMEOUT_MS);
  try {
    const payload = { model: "gpt-4o", messages: messages, temperature: temperature, max_tokens: maxTokens };
    if (tools && tools.length > 0) payload.tools = tools;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      if (res.status === 429) { await recordThrottle("openai", res); }
      return null;
    }
    const data = await res.json();
    var finishReason = data.choices?.[0]?.finish_reason || null;
    return {
      content: data.choices?.[0]?.message?.content || "",
      model: "gpt-4o",
      usage: data.usage || null,
      truncated: finishReason === "length",
      finishReason: finishReason,
      tool_calls: data.choices?.[0]?.message?.tool_calls || null
    };
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

async function callGLM(messages, maxTokens, temperature = 0.7, tools = null) {
  const key = process.env.GLM_API_KEY || process.env.AI_GATEWAY_TOKEN || process.env.VERCEL_OIDC_TOKEN;
  if (!key || key.includes("your_glm_api_key_here")) return null;
  const baseUrl = process.env.GLM_BASE_URL || "https://ai-gateway.vercel.sh/v1/chat/completions";
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, PROVIDER_TIMEOUT_MS);
  try {
    const payload = { model: "zai/glm-5.2", messages: messages, temperature: temperature, max_tokens: maxTokens };
    if (tools && tools.length > 0) payload.tools = tools;
    const res = await fetch(baseUrl, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      if (res.status === 429) { await recordThrottle("glm", res); }
      else {
        const errText = await res.text().catch(function () { return ""; });
        console.warn("GLM status " + res.status + ": " + errText.slice(0, 200));
      }
      return null;
    }
    const data = await res.json();
    var finishReason = data.choices?.[0]?.finish_reason || null;
    return {
      content: data.choices?.[0]?.message?.content || "",
      model: "zai/glm-5.2",
      usage: data.usage || null,
      truncated: finishReason === "length",
      finishReason: finishReason,
      tool_calls: data.choices?.[0]?.message?.tool_calls || null
    };
  } catch (err) {
    if (err && err.name === "AbortError") {
      console.warn("GLM timed out after " + PROVIDER_TIMEOUT_MS + "ms");
    } else {
      console.warn("GLM request error: " + (err && err.message ? err.message : err));
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ── Controlled continuation (NEVER SILENTLY TRUNCATE) ──

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

async function completeWithContinuation(runBackend, messages, firstResult) {
  var full = firstResult.content || "";
  var usage = sumUsage(null, firstResult.usage);
  var chunks = 1;
  var truncatedChunks = 1;
  var stillTruncated = true;
  var finishReason = firstResult.finishReason || null;
  var currentMessages = appendContinuationTurns(messages, firstResult.content || "");

  while (chunks < MAX_CONTINUATION_CHUNKS) {
    var result = await runBackend(currentMessages);
    if (!result) {
      break;
    }
    chunks += 1;
    full += result.content || "";
    usage = sumUsage(usage, result.usage);
    finishReason = result.finishReason || finishReason;

    if (result.truncated) {
      truncatedChunks += 1;
      if (chunks >= MAX_CONTINUATION_CHUNKS) {
        break;
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

// ── Autonomous Tool-Execution Loop ──

const MAX_TOOL_ROUNDS = 3;

export function extractToolCalls(result) {
  if (!result) return null;
  if (result.tool_calls && Array.isArray(result.tool_calls) && result.tool_calls.length > 0) {
    return result.tool_calls;
  }

  const content = result.content || "";
  if (!content) return null;

  const toolCalls = [];
  // Catch <function=fetch_url>{"url": "..."}</function> (LLaMA/Groq raw text format)
  const functionCallRegex = /<function=([a-zA-Z0-9_-]+)>([\s\S]*?)<\/function>/g;
  let match;
  while ((match = functionCallRegex.exec(content)) !== null) {
    toolCalls.push({
      id: `call_${Date.now()}_${toolCalls.length}`,
      type: "function",
      function: {
        name: match[1],
        arguments: match[2].trim(),
      },
    });
  }

  // Catch <tool_call>{"name": "fetch_url", "arguments": ...}</tool_call>
  const toolCallTagRegex = /<tool_call>([\s\S]*?)<\/tool_call>/g;
  while ((match = toolCallTagRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.name) {
        toolCalls.push({
          id: `call_${Date.now()}_${toolCalls.length}`,
          type: "function",
          function: {
            name: parsed.name,
            arguments: typeof parsed.arguments === "string" ? parsed.arguments : JSON.stringify(parsed.arguments || {}),
          },
        });
      }
    } catch {}
  }

  return toolCalls.length > 0 ? toolCalls : null;
}

async function completeWithToolsAndContinuation(runBackend, messages, firstResult) {
  let currentResult = firstResult;
  let currentMessages = messages.slice();
  let toolRounds = 0;
  let accumulatedUsage = sumUsage(null, firstResult.usage);

  let activeToolCalls = extractToolCalls(currentResult);

  while (activeToolCalls && activeToolCalls.length > 0 && toolRounds < MAX_TOOL_ROUNDS) {
    toolRounds += 1;

    // Clean inline XML tags from the assistant turn so the context stays clean
    const cleanAssistantContent = (currentResult.content || "")
      .replace(/<function=[a-zA-Z0-9_-]+>[\s\S]*?<\/function>/g, "")
      .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "")
      .trim();

    currentMessages = currentMessages.concat([
      {
        role: "assistant",
        content: cleanAssistantContent || null,
        tool_calls: activeToolCalls,
      }
    ]);

    for (const toolCall of activeToolCalls) {
      let output = "";
      if (toolCall.function?.name === "fetch_url") {
        let args = {};
        try {
          args = typeof toolCall.function.arguments === "string"
            ? JSON.parse(toolCall.function.arguments)
            : (toolCall.function.arguments || {});
        } catch {
          args = {};
        }
        output = await executeFetchUrl(args.url);
      } else {
        output = JSON.stringify({ error: `Unknown tool: ${toolCall.function?.name}` });
      }

      currentMessages = currentMessages.concat([
        {
          role: "tool",
          tool_call_id: toolCall.id || `call_${Date.now()}`,
          name: toolCall.function?.name || "fetch_url",
          content: output,
        }
      ]);
    }

    const nextResult = await runBackend(currentMessages);
    if (!nextResult) {
      break;
    }
    accumulatedUsage = sumUsage(accumulatedUsage, nextResult.usage);
    currentResult = nextResult;
    activeToolCalls = extractToolCalls(currentResult);
  }

  if (currentResult?.truncated) {
    const contResult = await completeWithContinuation(runBackend, currentMessages, currentResult);
    contResult.usage = sumUsage(accumulatedUsage, contResult.usage);
    return contResult;
  }

  if (currentResult) {
    currentResult.usage = accumulatedUsage;
  }
  return currentResult;
}

function finalizeResult(result, runBackend, messages, modelLabel, routerDecision) {
  const toolCalls = extractToolCalls(result);
  if (toolCalls && toolCalls.length > 0) {
    return completeWithToolsAndContinuation(runBackend, messages, result).then(function (done) {
      return {
        content: done ? done.content : (result.content || ""),
        model: modelLabel,
        routerDecision: routerDecision,
        usage: done && done.usage ? done.usage : (result.usage || null),
        truncated: done ? (done.truncated || false) : false,
        finishReason: done ? (done.finishReason || null) : null,
        continuation: done && done.continuation ? done.continuation : { attempted: false, chunks: 1, truncatedChunks: 0, finalTruncated: false },
      };
    });
  }

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
    const formattedHistory = (history || []).map(function (msg) {
      return {
        role: msg.role === "assistant" || msg.role === "system" ? msg.role : "user",
        content: msg.content,
      };
    });
    const toolDirective = "\n\n[CAPABILITIES & TOOLS]: You have access to the fetch_url tool. When the user provides a web URL (such as a GitHub repository link, website, article, or documentation) or asks to inspect/review an online resource, call fetch_url to retrieve and review the live content directly rather than saying you cannot access the link.";
    const activeSystemPrompt = (systemPrompt || REI_SYSTEM_PROMPT) + toolDirective;
    messages = [
      { role: "system", content: activeSystemPrompt },
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
  const geminiModel = primaryBackend === "gemini" ? primaryModel : null;

  // Map of available backends (each accepts an optional message override so
  // the continuation & tool loops can re-call the SAME backend with appended turns)
  var backends = {};
  if (process.env.DEEPSEEK_API_KEY || process.env.deepseek) backends.deepseek = function (msgs) { return callDeepSeek(msgs || messages, maxTokens, temperature, AVAILABLE_TOOLS); };
  if (process.env.GEMINI_API_KEY) backends.gemini = function (msgs) { return callGemini(msgs || messages, maxTokens, geminiModel, temperature, AVAILABLE_TOOLS); };
  if (process.env.GLM_API_KEY || process.env.AI_GATEWAY_TOKEN || process.env.VERCEL_OIDC_TOKEN) backends.glm = function (msgs) { return callGLM(msgs || messages, maxTokens, temperature, AVAILABLE_TOOLS); };
  if (process.env.GROQ_API_KEY) backends.groq = function (msgs) { return callGroq(msgs || messages, maxTokens, groqModel, temperature, AVAILABLE_TOOLS); };
  if (process.env.OPENAI_API_KEY) backends.openai = function (msgs) { return callOpenAI(msgs || messages, maxTokens, temperature, AVAILABLE_TOOLS); };

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
  var order = primaryBackend ? ["groq", "gemini", "glm", "deepseek", "openai"].filter(function (b) { return b !== primaryBackend; }) : ["groq", "gemini", "glm", "deepseek", "openai"];
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
  if (process.env.GEMINI_API_KEY) backends.gemini = function (msgs) { return callGemini(msgs || messages, maxT, model, temp); };
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
