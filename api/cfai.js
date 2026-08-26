import "dotenv/config";
import { REI_SYSTEM_PROMPT } from "../data/prompts/reiSystem.js";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import { parseToolCalls, extractThinkingAndContent, isPrivateHostname } from "../shared/lib/toolParser.js";
import { BoundedConcurrencyPool } from "../src/lib/concurrencyPool.mjs";
import { SingleFlightGroup, computeSingleFlightKey } from "../src/lib/singleFlight.mjs";

export const maxDuration = 60;

const execAsync = promisify(exec);
const CFAI_PATH = process.env.CFAI_PATH;

const MAX_INPUT_CHARS = 14000;
const PROVIDER_TIMEOUT_MS = 25000;

export const geminiPool = new BoundedConcurrencyPool({ name: "gemini", maxConcurrent: 4, maxQueueDepth: 20, acquireDeadlineMs: 10000 });
export const groqPool = new BoundedConcurrencyPool({ name: "groq", maxConcurrent: 4, maxQueueDepth: 20, acquireDeadlineMs: 10000 });
export const singleFlightGroup = new SingleFlightGroup();

var providerCooldown = new Map();
var THROTTLE_COOLDOWN_MS = 15000;
var INTER_FALLBACK_MS = 300;

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function recordThrottle(provider) {
  providerCooldown.set(provider, Date.now() + THROTTLE_COOLDOWN_MS);
  console.warn(provider + " rate-limited — cooling down for " + (THROTTLE_COOLDOWN_MS / 1000) + "s");
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
  if (!model) return "deepseek";
  if (model.startsWith("deepseek") || model.includes("deepseek")) return "deepseek";
  if (model.startsWith("openai/gpt-oss") || model.includes("gpt-oss") || model.includes("qwen") || model.startsWith("groq/")) return "groq";
  if (model.startsWith("gpt-")) return "openai";
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
      name: "web_search",
      description: "Searches the live web via Exa neural search for real-time information, breaking news, legal precedents, court rulings, documentation, benchmarks, and current facts.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The specific search query string to look up on the web."
          },
          num_results: {
            type: "number",
            description: "Number of top results to return (default 3, max 5)."
          }
        },
        required: ["query"]
      }
    }
  },
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

const URL_TIMEOUT_MS = 3500;
const MAX_FETCH_CHARS = 6000;

export function isPrivateIpOrHost(hostname) {
  return isPrivateHostname(hostname);
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

  // Structure-preserving tag replacements
  cleaned = cleaned
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/li>/gi, "")
    .replace(/<tr[^>]*>/gi, "\n")
    .replace(/<\/(td|th)>/gi, " | ")
    .replace(/<\/(h[1-6]|p|div|article|section|header)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n");

  cleaned = cleaned
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  cleaned = cleaned
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();

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
      return JSON.stringify({
        provider: "direct_fetch",
        transport: "direct_api",
        url: parsedUrl.href,
        content: cleanContent,
        results: [{
          title: parsedUrl.hostname,
          url: parsedUrl.href,
          snippet: cleanContent.slice(0, 350),
        }]
      });
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

export async function executeWebSearch(query, numResults = 3) {
  if (!query || typeof query !== "string") {
    return JSON.stringify({ error: "Invalid or empty search query." });
  }

  const exaKey = (process.env.EXA_API_KEY || "").replace(/^"|"$/g, "").trim();
  const limit = Math.min(Math.max(Number(numResults) || 3, 1), 5);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), URL_TIMEOUT_MS);

  // 1. Primary: Exa Neural Search (AI Gateway)
  if (exaKey) {
    try {
      const res = await fetch("https://api.exa.ai/search", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "x-api-key": exaKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query,
          type: "auto",
          numResults: limit,
          contents: {
            highlights: true
          }
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const results = (data.results || []).slice(0, 3).map((r, i) => ({
          title: r.title || "Untitled",
          url: r.url,
          highlights: Array.isArray(r.highlights) ? r.highlights.join(" ").slice(0, 350) : (r.text || "").slice(0, 350),
        }));

        return JSON.stringify({
          provider: "exa",
          transport: "direct_api",
          engine: "Exa Neural Search",
          query,
          count: results.length,
          results,
        });
      }
    } catch (err) {
      console.warn("Exa Search error, falling back:", err?.message || err);
    }
  }

  // 2. Authoritative Fallback: Wikipedia Direct API (instant, structured, zero CAPTCHAs)
  try {
    const wikiUrl = "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + encodeURIComponent(query) + "&utf8=&format=json&srlimit=" + limit;
    const res = await fetch(wikiUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "REI-Bot/1.0 (https://rei.ai)" }
    });
    if (res.ok) {
      const data = await res.json();
      const wikiResults = (data.query?.search || []).map(r => ({
        title: r.title,
        url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(r.title.replace(/ /g, "_")),
        highlights: (r.snippet || "").replace(/<[^>]+>/g, "").replace(/&quot;/g, "\"").replace(/&#039;/g, "'").slice(0, 350),
        snippet: (r.snippet || "").replace(/<[^>]+>/g, "").replace(/&quot;/g, "\"").replace(/&#039;/g, "'").slice(0, 350),
      }));
      if (wikiResults.length > 0) {
        return JSON.stringify({
          provider: "wikipedia",
          transport: "direct_api",
          engine: "Wikipedia Reference API",
          query,
          count: wikiResults.length,
          results: wikiResults,
        });
      }
    }
  } catch (err) {
    console.warn("Wikipedia search fallback error:", err?.message || err);
  }

  // 3. Resilient Fallback: DuckDuckGo HTML Instant Search
  try {
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(ddgUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 REI-Bot/1.0"
      }
    });

    if (res.ok) {
      const html = await res.text();
      if (!html.toLowerCase().includes("captcha") && !html.toLowerCase().includes("bots use duckduckgo")) {
        const cleanSnippet = cleanHtmlToText(html).slice(0, 1000);
        return JSON.stringify({
          provider: "duckduckgo",
          transport: "direct_api",
          engine: "DuckDuckGo HTML Fallback",
          query,
          count: 1,
          results: [{
            title: "DuckDuckGo Web Result",
            url: ddgUrl,
            snippet: cleanSnippet.slice(0, 350),
          }],
        });
      }
    }
  } catch (err) {
    console.warn("Web search fallback error:", err?.message || err);
  } finally {
    clearTimeout(timer);
  }

  return JSON.stringify({
    provider: "unavailable",
    transport: "direct_api",
    engine: "web_search",
    query,
    error: "Web search query timed out or returned no results.",
    results: []
  });
}

// ── Per-backend callers ──

async function callDeepSeek(messages, maxTokens, modelOverride, temperature = 0.7, tools = null) {
  const key = process.env.DEEPSEEK_API_KEY || process.env.deepseek;
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, PROVIDER_TIMEOUT_MS);
  try {
    const requestedModel = modelOverride || "deepseek-chat";
    const payload = {
      model: requestedModel,
      messages: messages,
      temperature: temperature,
      max_tokens: maxTokens,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    };
    if (tools && tools.length > 0) payload.tools = tools;
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      if (res.status === 429) { recordThrottle("deepseek"); }
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
      model: requestedModel,
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
  return geminiPool.run(async function () {
    const rawKey = process.env.GEMINI_API_KEY;
    if (!rawKey || rawKey.includes("your_gemini_api_key_here")) return null;
  const key = rawKey.replace(/^"|"$/g, "").trim();

  const candidateModels = [
    modelOverride,
    process.env.GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-2.5-pro",
  ].filter(Boolean);

  const uniqueCandidates = Array.from(new Set(candidateModels));

  for (let m = 0; m < uniqueCandidates.length; m++) {
    const model = uniqueCandidates[m];
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, PROVIDER_TIMEOUT_MS);
    try {
      const effectiveMaxTokens = Math.min(maxTokens, 2048);
      const payload = { model: model, messages: messages, temperature: temperature, max_tokens: effectiveMaxTokens };
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
          recordThrottle("gemini");
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
});
}

async function callGroq(messages, maxTokens, modelOverride, temperature = 0.7, tools = null) {
  return groqPool.run(async function () {
    const rawKey = process.env.GROQ_API_KEY;
    if (!rawKey || rawKey.includes("your_groq_api_key_here")) return null;
    const key = rawKey.replace(/^"|"$/g, "");

    const candidateModels = [
      modelOverride,
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "qwen/qwen3.6-27b",
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
    ].filter(Boolean);

    const uniqueCandidates = Array.from(new Set(candidateModels));

    for (let m = 0; m < uniqueCandidates.length; m++) {
      const model = uniqueCandidates[m];
      const controller = new AbortController();
      const timer = setTimeout(function () { controller.abort(); }, PROVIDER_TIMEOUT_MS);
      try {
        const hasToolsOrFollowUp = Array.isArray(messages) && messages.some(m => m.role === "tool" || m.tool_calls);
        const effectiveMaxTokens = hasToolsOrFollowUp ? Math.min(maxTokens, 2048) : maxTokens;
        const payload = { model: model, messages: messages, temperature: temperature, max_tokens: effectiveMaxTokens };
        if (tools && tools.length > 0) payload.tools = tools;
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          if (res.status === 429) {
            recordThrottle("groq");
            return null;
          }
          if (res.status === 404 || res.status === 413) {
            // Model deprecated on Groq or payload too large — try next candidate model
            continue;
          }
          console.warn("Groq status " + res.status);
          continue;
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
          console.warn("Groq timed out after " + PROVIDER_TIMEOUT_MS + "ms");
        } else {
          console.warn("Groq request error: " + (err && err.message ? err.message : err));
        }
      } finally {
        clearTimeout(timer);
      }
    }
    return null;
  });
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
      if (res.status === 429) { recordThrottle("openai"); }
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
      if (res.status === 429) { recordThrottle("glm"); }
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

export function sanitizeContinuationOutput(text) {
  if (!text || typeof text !== "string") return "";
  let cleaned = text
    .replace(/^\s*(?:\)\.\s*|\bSo we need to continue as if\b|\bContinue exactly where\b|\bThe prior message didn't contain\b|\bProvide detailed design, code snippets\b|\bSince there was no content\b|\bShould be consistent with being REI persona\b)[^\n]*\n?/gi, "")
    .replace(/Continue exactly where the previous response ended\.[^\n]*\n?/gi, "")
    .trim();
  return cleaned;
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

  var sanitized = sanitizeContinuationOutput(full);

  return {
    content: sanitized || full,
    usage: usage,
    truncated: stillTruncated,
    finishReason: finishReason,
    continuation: { attempted: true, chunks: chunks, truncatedChunks: truncatedChunks, finalTruncated: stillTruncated },
  };
}

// ── Autonomous Tool-Execution Loop ──

const MAX_TOOL_ROUNDS = 3;

export function extractToolCalls(result) {
  const parsed = parseToolCalls(result);
  return parsed.validToolCalls.length > 0 ? parsed.validToolCalls : null;
}

async function completeWithToolsAndContinuation(runBackend, messages, firstResult, routerDecision, backends) {
  let currentResult = firstResult;
  let currentMessages = messages.slice();
  let toolRounds = 0;
  let accumulatedUsage = sumUsage(null, firstResult.usage);

  const initialReason =
    routerDecision?.domain === "coding"
      ? "url_verification_required"
      : routerDecision?.domain === "genealogy"
      ? "external_source_required"
      : routerDecision?.domain === "story"
      ? "domain_grounding_required"
      : "freshness_required";

  const executedResearch = {
    invoked: false,
    status: "not_required",
    provider: null,
    transport: "direct_api",
    reason: initialReason,
    queries: [],
    sources: [],
    resultCount: 0,
    budget: {
      excerptCharacters: 0,
      excerptTokensEstimated: 0,
      tokenAccounting: "measured",
      truncationApplied: false,
    },
    provenance: "observed",
  };

  while (toolRounds < MAX_TOOL_ROUNDS) {
    const parseResult = parseToolCalls(currentResult);
    const activeToolCalls = parseResult.validToolCalls;

    if (activeToolCalls.length === 0) {
      if (parseResult.validationErrors.length > 0 && toolRounds === 0) {
        toolRounds += 1;
        const retryPrompt = `Tool execution rejected: ${parseResult.validationErrors.join("; ")}. Please provide valid arguments or respond directly.`;
        currentMessages = currentMessages.concat([
          {
            role: "assistant",
            content: parseResult.cleanContent || null,
          },
          {
            role: "user",
            content: retryPrompt,
          }
        ]);
        currentResult = await runBackend(currentMessages, currentResult.systemPrompt || null, currentResult.model || null);
        accumulatedUsage = sumUsage(accumulatedUsage, currentResult.usage);
        continue;
      }
      break;
    }

    toolRounds += 1;

    currentMessages = currentMessages.concat([
      {
        role: "assistant",
        content: parseResult.cleanContent || null,
        tool_calls: activeToolCalls,
      }
    ]);

    for (const toolCall of activeToolCalls) {
      let output = "";
      const args = toolCall.parsedArgs || {};
      if (toolCall.function?.name === "web_search") {
        output = await executeWebSearch(args.query, args.num_results);
      } else if (toolCall.function?.name === "fetch_url") {
        output = await executeFetchUrl(args.url);
      } else {
        output = JSON.stringify({ error: `Unknown tool: ${toolCall.function?.name}` });
      }

      // Lossless multi-tool accumulation in exact execution order
      let parsed = null;
      try {
        parsed = JSON.parse(output);
      } catch {}

      if (parsed) {
        executedResearch.invoked = true;
        executedResearch.status = "executed";
        if (parsed.provider && parsed.provider !== "unavailable") {
          executedResearch.provider = parsed.provider;
        }
        if (parsed.transport) {
          executedResearch.transport = parsed.transport;
        }
        const recordedQuery = parsed.query || parsed.url || toolCall.function?.arguments;
        if (recordedQuery && typeof recordedQuery === "string") {
          executedResearch.queries.push(recordedQuery);
        }
        if (Array.isArray(parsed.results)) {
          for (const s of parsed.results) {
            executedResearch.sources.push({
              title: s.title || "Untitled",
              url: s.url || undefined,
              publishedDate: s.publishedDate || null,
              author: s.author || null,
              highlights: s.highlights || s.snippet || undefined,
              snippet: s.snippet || s.highlights || undefined,
            });
          }
        }
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

    // Flatten tool results into clean synthesis messages to guarantee fast, direct prose generation
    if (executedResearch.invoked && executedResearch.sources.length > 0) {
      const researchSnippets = executedResearch.sources
        .map(function (s, idx) { return `[SOURCE ${idx + 1}: ${s.title}] (${s.url || "web"}):\n${s.highlights || s.snippet || ""}`; })
        .join("\n\n");
      const activeSys = messages.find(m => m.role === "system")?.content || REI_SYSTEM_PROMPT;
      const cleanSys = activeSys.replace(/\[CAPABILITIES & TOOLS\][\s\S]*$/, "").trim();
      const synthesisMessages = [
        {
          role: "system",
          content: cleanSys + "\n\nOutput the requested narrative blueprint and finished story prose directly without thinking tags or preamble."
        },
        ...messages.filter(m => m.role !== "system"),
        {
          role: "user",
          content: `[VERIFIED RESEARCH EVIDENCE]:\n${researchSnippets}\n\nPlease generate the full, detailed requested story/response now using this verified background evidence.`
        }
      ];

      let synthDone = false;
      if (backends?.groq) {
        try {
          const synthResult = await backends.groq(synthesisMessages, null, "openai/gpt-oss-20b");
          const synthClean = (synthResult?.content || "").replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "").trim();
          if (synthClean && synthClean.length > 20) {
            accumulatedUsage = sumUsage(accumulatedUsage, synthResult.usage);
            currentResult = { ...synthResult, content: synthClean };
            synthDone = true;
          }
        } catch {}
      }

      if (!synthDone) {
        try {
          const synthResult = await runBackend(synthesisMessages, null);
          const synthClean = (synthResult?.content || "").replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "").trim();
          if (synthClean && synthClean.length > 20) {
            accumulatedUsage = sumUsage(accumulatedUsage, synthResult.usage);
            currentResult = { ...synthResult, content: synthClean };
            synthDone = true;
          }
        } catch {}
      }

      if (synthDone) {
        break;
      }
    }

    const nextResult = await runBackend(currentMessages, null);
    if (!nextResult) {
      break;
    }
    accumulatedUsage = sumUsage(accumulatedUsage, nextResult.usage);
    currentResult = nextResult;
  }

  if (executedResearch.invoked) {
    executedResearch.resultCount = executedResearch.sources.length;
    const totalChars = executedResearch.sources.reduce(
      (acc, s) => acc + ((s.highlights || s.snippet || "").length),
      0
    );
    executedResearch.budget = {
      excerptCharacters: totalChars,
      excerptTokensEstimated: Math.round(totalChars / 4),
      tokenAccounting: "estimated",
      truncationApplied: false,
    };
  }

  // Fallback: If tool completion step returned empty content or only thinking tags, synthesize final response from gathered research evidence
  // Fallback: If tool completion step returned empty content or only thinking tags, synthesize final response
  const cleanContent = (currentResult?.content || "").replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "").trim();
  if (!cleanContent || cleanContent.length < 20) {
    if (backends) {
      const researchSnippets = (executedResearch?.sources || [])
        .map(function (s, idx) { return `[SOURCE ${idx + 1}: ${s.title}] (${s.url || "web"}):\n${s.highlights || s.snippet || ""}`; })
        .join("\n\n");
      const synthesisMessages = [
        {
          role: "system",
          content: "You are The Storyteller. Narrative architecture generating story blueprints and rich cinematic prose. Do not output reasoning or <think> tags. Write the completed narrative blueprint and story directly."
        },
        ...messages.filter(m => m.role !== "system"),
        ...(researchSnippets ? [{
          role: "user",
          content: `[VERIFIED RESEARCH EVIDENCE]:\n${researchSnippets}\n\nPlease generate the full, detailed requested story/response now using this verified background evidence. Output the finished story prose directly.`
        }] : [{
          role: "user",
          content: "Please generate the full, detailed requested story/response now. Output the finished narrative blueprint and story prose directly without preamble."
        }])
      ];

      if (backends.groq) {
        try {
          const synthResult = await backends.groq(synthesisMessages, null, "openai/gpt-oss-20b");
          const synthClean = (synthResult?.content || "").replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "").trim();
          if (synthClean && synthClean.length > 20) {
            accumulatedUsage = sumUsage(accumulatedUsage, synthResult.usage);
            currentResult = { ...synthResult, content: synthClean };
          }
        } catch {}
      }

      if (!currentResult || !currentResult.content || currentResult.content.trim().length < 20) {
        const fallbackList = ["gemini", "glm", "deepseek", "openai"];
        for (let i = 0; i < fallbackList.length; i++) {
          const b = fallbackList[i];
          if (backends[b]) {
            try {
              const synthResult = await backends[b](synthesisMessages, null);
              const synthClean = (synthResult?.content || "").replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "").trim();
              if (synthClean && synthClean.length > 20) {
                accumulatedUsage = sumUsage(accumulatedUsage, synthResult.usage);
                currentResult = { ...synthResult, content: synthClean };
                break;
              }
            } catch {}
          }
        }
      }
    }
  }

  if (currentResult?.truncated) {
    const contResult = await completeWithContinuation(runBackend, currentMessages, currentResult);
    contResult.usage = sumUsage(accumulatedUsage, contResult.usage);
    contResult.research = executedResearch;
    return contResult;
  }

  if (currentResult) {
    currentResult.usage = accumulatedUsage;
    currentResult.research = executedResearch;
  }
  return currentResult;
}

function finalizeResult(result, runBackend, messages, modelLabel, routerDecision, backends) {
  const toolCalls = extractToolCalls(result);
  if (toolCalls && toolCalls.length > 0) {
    return completeWithToolsAndContinuation(runBackend, messages, result, routerDecision, backends).then(function (done) {
      const rawText = done ? done.content : (result.content || "");
      const cleanText = rawText
        .replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "")
        .replace(/<tool_call>[\s\S]*?(?:<\/tool_call>|$)/gi, "")
        .trim();
      return {
        content: cleanText || rawText,
        model: modelLabel,
        routerDecision: routerDecision,
        usage: done && done.usage ? done.usage : (result.usage || null),
        research: done && done.research ? done.research : null,
        truncated: done ? (done.truncated || false) : false,
        finishReason: done ? (done.finishReason || null) : null,
        continuation: done && done.continuation ? done.continuation : { attempted: false, chunks: 1, truncatedChunks: 0, finalTruncated: false },
      };
    });
  }

  if (result && result.truncated) {
    return completeWithContinuation(runBackend, messages, result).then(function (done) {
      const rawText = done.content || "";
      const cleanText = rawText
        .replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "")
        .replace(/<tool_call>[\s\S]*?(?:<\/tool_call>|$)/gi, "")
        .trim();
      return {
        content: cleanText || rawText,
        model: modelLabel,
        routerDecision: routerDecision,
        usage: done.usage || null,
        truncated: done.truncated || false,
        finishReason: done.finishReason || null,
        continuation: done.continuation,
      };
    });
  }

  const rawContent = result ? result.content : "";
  const cleanFinal = rawContent
    .replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "")
    .replace(/<tool_call>[\s\S]*?(?:<\/tool_call>|$)/gi, "")
    .trim();
  return Promise.resolve({
    content: cleanFinal || rawContent,
    model: modelLabel,
    routerDecision: routerDecision,
    usage: result && result.usage ? result.usage : null,
    truncated: result ? (result.truncated || false) : false,
    finishReason: result && result.finishReason ? result.finishReason : null,
    continuation: { attempted: false, chunks: 1, truncatedChunks: 0, finalTruncated: false },
  });
}

// ── Main API router: primary backend + fallback chain ──

const STORY_DELIVERY_CONTRACT = `

[STORY DELIVERY CONTRACT]
- [SENIOR EDITOR PASS — perform silently before answering]
  1. Write a one-sentence premise built around a specific contradiction rather than a stock genre setup.
  2. Identify the protagonist's concrete want, private fear, decisive hinge, and the causal chain that makes the ending possible.
  3. Build a causal tonal braid: requested tones must affect the same events and consequences, not appear as disconnected passages.
  4. Introduce a small, memorable detail early. Make it matter to what happens later. By the ending, it should mean something different. Let the story's genre and tone decide how its meaning changes; it does not always have to turn a joke into tragedy.
  5. Draft the story, then revise it as a senior editor. Remove generic rescue beats, convenient strangers, inherited mentor slogans, redundant atmospheric description, and any paragraph that does not change the situation.
  6. Limit the prose to a small set of memorable images. Prefer precise recurring objects with changing meaning over a stream of interchangeable similes.
  7. Check the state ledger, causal continuity, genre fulfillment, and ending. Return only the revised story—never the brief, blueprint, checklist, or editorial notes.
- Treat every explicitly requested genre and tone as a binding acceptance criterion. When comedy and tragedy are both requested, include at least two distinct comic beats arising from character or circumstance and one irreversible tragic consequence caused by an event in the story.
- Maintain a silent state ledger for every named character, object, injury, location, and resolved event. A character who dies or becomes incapacitated must not speak, laugh, move, or attack later unless the story explicitly establishes why.
- Do not repeat an action beat, sentence frame, sensory image, or dramatic exchange merely to extend the response. Every paragraph must change the situation.
- Resolve conspicuous setups before concluding. End once, after the decisive consequence, on a concrete action, image, line of dialogue, or revelation. Do not restart the action or introduce a new unresolved beat after the ending.
- Before returning prose, silently revise once for genre adherence, repeated language, causal continuity, and ending completeness. Return only the finished story.`;

function isStoryRoute(routerDecision) {
  return routerDecision?.domain === "story" || routerDecision?.id === "story-architect";
}

function storyNeedsResearch(prompt) {
  return /\b(?:historical|history|real[- ]world|actual|authentic|period[- ]accurate|battle of|war of|in \d{4}|\d{4}s)\b/i.test(prompt || "");
}

async function callModelAPI(prompt, systemPrompt, history, routerDecision, messagesOverride, modelOverride) {
  const isGreeting = routerDecision?.id === "simple-greeting";
  const isStory = isStoryRoute(routerDecision);
  const toolsToPass = isGreeting || (isStory && !storyNeedsResearch(prompt)) ? null : AVAILABLE_TOOLS;
  var messages;
  if (messagesOverride && Array.isArray(messagesOverride) && messagesOverride.length > 0) {
    messages = messagesOverride;
  } else {
    const formattedHistory = (history || []).slice(-6).map(function (msg, idx, arr) {
      let content = msg.content || "";
      // If this is an older turn (not the immediate prior turn) and has massive content, truncate to 1,500 chars to conserve context
      if (idx < arr.length - 2 && content.length > 1500) {
        content = content.slice(0, 1500) + "... [prior story context compressed]";
      }
      return {
        role: msg.role === "assistant" || msg.role === "system" ? msg.role : "user",
        content: content,
      };
    });
    const toolDirective = toolsToPass
      ? "\n\n[CAPABILITIES & TOOLS]: You have access to two autonomous tools:\n1. web_search: Searches the live web via Exa neural search. Use it whenever you need authentic historical facts, real-world locations, period details, technical terminology, current events, or lore to ground your response.\n2. fetch_url: Fetches and reads live web pages or GitHub repository documentation from URLs.\nAlways execute tool calls directly when real-world facts or links are relevant."
      : "";
    const storyContract = isStory ? STORY_DELIVERY_CONTRACT : "";
    const activeSystemPrompt = (systemPrompt || REI_SYSTEM_PROMPT) + storyContract + toolDirective;
    messages = [
      { role: "system", content: activeSystemPrompt },
      ...formattedHistory,
      { role: "user", content: prompt },
    ];
  }

  const targetModel = modelOverride || routerDecision?.model || "deepseek-chat";
  const maxTokens = Math.max(routerDecision?.maxTokens || 4096, isGreeting ? 200 : 50);
  const primaryModel = targetModel;
  const primaryBackend = getBackendForModel(primaryModel);
  const temperature = routerDecision?.temperature ?? 0.7;
  
  const deepseekModel = primaryBackend === "deepseek" ? primaryModel : "deepseek-chat";
  const groqModel = primaryBackend === "groq" ? primaryModel : "llama-3.3-70b-versatile";
  const geminiModel = primaryBackend === "gemini" ? primaryModel : "gemini-1.5-flash";

  // Map of available backends (each accepts an optional message override so
  // the continuation & tool loops can re-call the SAME backend with appended turns)
  var backends = {};
  if (process.env.DEEPSEEK_API_KEY || process.env.deepseek) backends.deepseek = function (msgs, passTools, mOverride) { return callDeepSeek(msgs || messages, maxTokens, mOverride !== undefined ? mOverride : deepseekModel, temperature, passTools !== undefined ? passTools : toolsToPass); };
  if (process.env.GROQ_API_KEY) backends.groq = function (msgs, passTools, mOverride) { return callGroq(msgs || messages, maxTokens, mOverride !== undefined ? mOverride : groqModel, temperature, passTools !== undefined ? passTools : toolsToPass); };
  if (process.env.GEMINI_API_KEY) backends.gemini = function (msgs, passTools) { return callGemini(msgs || messages, maxTokens, geminiModel, temperature, passTools !== undefined ? passTools : toolsToPass); };
  if (process.env.GLM_API_KEY || process.env.AI_GATEWAY_TOKEN || process.env.VERCEL_OIDC_TOKEN) backends.glm = function (msgs, passTools) { return callGLM(msgs || messages, maxTokens, temperature, passTools !== undefined ? passTools : toolsToPass); };
  if (process.env.OPENAI_API_KEY) backends.openai = function (msgs, passTools) { return callOpenAI(msgs || messages, maxTokens, temperature, passTools !== undefined ? passTools : toolsToPass); };

  // Try primary backend first (unless in cooldown)
  if (primaryBackend && backends[primaryBackend]) {
    var cooldownUntil = providerCooldown.get(primaryBackend);
    if (cooldownUntil && Date.now() < cooldownUntil) {
      console.warn("Skipping primary backend " + primaryBackend + " — in cooldown (" + Math.ceil((cooldownUntil - Date.now()) / 1000) + "s remaining)");
    } else {
      var result = await backends[primaryBackend]();
      if (result) {
        providerCooldown.delete(primaryBackend);
        return await finalizeResult(result, backends[primaryBackend], messages, primaryModel, routerDecision, backends);
      }
    }
  }

  // Fallback: try remaining backends in priority order (DeepSeek #1)
  var order = primaryBackend ? ["deepseek", "groq", "gemini", "glm", "openai"].filter(function (b) { return b !== primaryBackend; }) : ["deepseek", "groq", "gemini", "glm", "openai"];
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
        const finalRes = await finalizeResult(result, backends[backend], messages, result.model || "deepseek-chat", routerDecision, backends);
        finalRes.fallbackExecuted = true;
        return finalRes;
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
  if (process.env.DEEPSEEK_API_KEY || process.env.deepseek) backends.deepseek = function (msgs) { return callDeepSeek(msgs || messages, maxT, model, temp); };
  if (process.env.GROQ_API_KEY) backends.groq = function (msgs) { return callGroq(msgs || messages, maxT, model, temp); };
  if (process.env.GEMINI_API_KEY) backends.gemini = function (msgs) { return callGemini(msgs || messages, maxT, model, temp); };
  if (process.env.OPENAI_API_KEY) backends.openai = function (msgs) { return callOpenAI(msgs || messages, maxT, temp); };

  if (primaryBackend && backends[primaryBackend]) {
    var cooldownUntil = providerCooldown.get(primaryBackend);
    if (cooldownUntil && Date.now() < cooldownUntil) {
      console.warn("Skipping direct model backend " + primaryBackend + " — in cooldown");
    } else {
      var result = await backends[primaryBackend]();
      if (result) {
        providerCooldown.delete(primaryBackend);
        return {
          content: result.content,
          model: model,
          usage: result.usage,
          truncated: result.truncated || false,
          finishReason: result.finishReason || null,
          rateLimited: false,
          fallbackExecuted: false,
        };
      }
    }
  }

  var order = primaryBackend ? ["deepseek", "groq", "gemini", "openai"].filter(function (b) { return b !== primaryBackend; }) : ["deepseek", "groq", "gemini", "openai"];
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
        const finalRes = await finalizeResult(result, backends[backend], messages, result.model || model, null, backends);
        finalRes.fallbackExecuted = true;
        return finalRes;
      }
      await sleep(INTER_FALLBACK_MS);
    }
  }

  return {
    content: "[REI.AI NOTICE] Model execution failed for " + model + ".",
    model: model,
    rateLimited: true,
  };
}

export async function handleCfaiRequest(command, args, input, systemPrompt, history, routerDecision, messagesOverride) {
  let modelOverride = null;
  if (command && typeof command === "object" && !Array.isArray(command)) {
    const opts = command;
    input = opts.prompt || opts.input || "";
    systemPrompt = opts.systemPrompt || "";
    history = opts.history || [];
    routerDecision = opts.routerDecision || opts.router || null;
    messagesOverride = opts.messagesOverride || opts.messages || null;
    modelOverride = opts.modelOverride || opts.model || null;
    command = opts.command || "chat";
    args = opts.args || [];
  } else {
    args = args || [];
    input = input || "";
    systemPrompt = systemPrompt || "";
    history = history || [];
  }

  const localCliExists = CFAI_PATH && fs.existsSync(CFAI_PATH);

  if (!localCliExists) {
    try {
      const payload = input || (args.length > 0 ? args.join(" ") : "help");
      const response = await callModelAPI(payload, systemPrompt, history, routerDecision, messagesOverride, modelOverride);
      return {
        success: true,
        result: response.content,
        model: response.model,
        routerDecision: response.routerDecision || routerDecision,
        usage: response.usage || null,
        research: response.research || null,
        truncated: response.truncated || false,
        finishReason: response.finishReason || (response.truncated ? "length" : null),
        fallbackExecuted: Boolean(response.fallbackExecuted),
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
