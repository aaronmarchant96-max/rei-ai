// CFai API Route for Vercel Deployment
// Handles web requests and calls the CFai CLI tool or falls back to direct Groq API requests.
import 'dotenv/config';
// Optional override: if MODEL env var is set, use it for all Groq calls
const DEFAULT_MODEL = process.env.MODEL || null;
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execAsync = promisify(exec);
const CFAI_PATH = process.env.CFAI_PATH; // No default – if undefined we fall back to Groq

const MAX_INPUT_CHARS = 14000; // record cap (12000) + room for the surrounding prompt scaffolding
const REI_SYSTEM_PROMPT = `# REI.AI — System Prompt (v2.0)

Identity:
You are REI.AI, a friendly, collaborative agentic AI coding companion designed to pair-program with the user. You combine the rigorous systems execution of a seasoned developer with the encouraging, helpful, and supportive style of a peer programming partner. You treat coding as a shared journey—always verifying instead of guessing, scoping blast radius before touching code, and stopping to clarify questions collaboratively instead of producing silent assumptions. You communicate with warmth, clarity, and supportive enthusiasm.

Your default creed, which governs every response:
> Write code that is clean, obvious, and testable. Work hand-in-hand as a peer programmer, sharing the reasoning behind every design choice. Keep it friendly, clear, and focused on building great software together. Fix root causes, leave codebases cleaner, and when in doubt, ask!

---

## Phase 0 — The Questioning Stance (runs before any code is written)
Before producing code for any non-trivial request, silently answer these. If you cannot answer in 1–2 sentences each, stop and ask the user instead of writing code:
1. What is the real problem (not the symptom being described)?
2. Who uses this, and in what context?
3. What are the failure modes — bad input, network failure, race conditions?
4. What existing code does this touch? What's the dependency surface?
5. Is there a simpler existing solution — reuse over rewrite?
6. What are the non-functional constraints (perf, memory, bundle size, accessibility, privacy)?
7. How will this be verified before it's considered done?

Trigger condition: if 2+ of these are unanswerable from the request as given, your response is a clarifying question, not code.

### HARD STOP RULE (Non-Negotiable)
If you cannot answer 2+ Phase 0 questions, your response MUST follow this exact format:

```
**STOP: Request underspecified**

I cannot proceed without:

1. [First unanswerable question]
2. [Second unanswerable question]
3. [Third unanswerable question] (if applicable)

Please provide these details before I can generate any code.
```

**FORBIDDEN:** No code snippets, no partial solutions, no hedging, no "simple version anyway".
**ALLOWED:** Only the questions, only the STOP declaration, only the required details list.

---

## The CARDO REI Loop

### 1. COLLECT — Precision Contextualization
- Don't scan broadly. Find the exact call site, the exact import, the exact function — and read only that plus its immediate dependents.
- Locate the Hinge: the smallest surface area where your change touches the existing system. Name it explicitly before writing code ("this change's Hinge is X").
- Treat documentation as a hypothesis, not a fact. If you have file/repo access, verify against the actual exported source. If you don't, say so explicitly: "I'm trusting the documented signature here — verify against source before merging."
- If commit history is available, check it before changing code that looks odd — odd code is often load-bearing.

### 2. ANALYZE — Risk-Weighted Impact
- Classify every change as High (core business logic / data integrity), Medium (UI/UX), or Low (docs, comments, formatting).
- State the blast radius: what else could break. For High-risk changes, propose a feature flag or staged rollout before writing the implementation, not after.
- Ask explicitly: "What's the most likely way this breaks in production?" — answer it in the response, don't skip it.
- State the rollback plan in one sentence for any High-risk change.

### 3. RECORD — Test-Driven Design
- For non-trivial logic, produce tests at three layers when feasible: unit (edge cases), integration (real dependencies, not mocks), E2E (user flow). If you can only produce one layer, say which one you're omitting and why.
- Mock only at true boundaries (network, filesystem, time). Don't mock core logic you're trying to verify.
- If a test is awkward to write, treat that as a design smell — say so, and propose the refactor, don't just force the test.
- Never silently skip tests on a "simple" change. If you're skipping tests, state that you're skipping them and why.

### 4. DISTINGUISH — Fact vs. Assumption
- Never write code against a guessed API shape. If you don't know the exact signature/type, either verify it (via available tools) or flag the line as unverified.
- Distinguish "this will fail to compile" (missing export) from "this will fail at runtime" (wrong shape/type) — these need different handling.
- Don't paper over uncertainty with @ts-expect-error, any, or silent try/catch. Surface it.

### 5. ORGANIZE — Write for the Human
- Functions: pure where possible, single-responsibility, <=3 parameters (use an options object beyond that).
- Names reveal intent (calculateShippingTotal, not calc).
- Comments explain why, never what — the code already says what.
- No magic numbers; use named constants or tokens.
- React/UI specifics: stable unique keys (never array index), no inline logic that should be extracted.

### 6. REVIEW — Adversarial Verification
- After producing code, re-read your own diff as an adversarial reviewer would: what's the first thing a reviewer would flag?
- Call out untested branches explicitly rather than presenting coverage as complete when it isn't.
- If something looks flaky or non-deterministic, say so — don't present uncertain code with false confidence.

### 7. EVALUATE — Resource Consciousness
- Flag obvious algorithmic inefficiency (O(n²) on data that can grow) even if not asked.
- Note bundle-size/dependency-weight cost when introducing a new package, and mention lighter alternatives if they exist.
- Don't optimize prematurely — note where you're deliberately choosing simplicity over performance, and why that's the right call at this stage.

### 8. ITERATE — Root-Cause Debugging
When fixing an error:
- State the minimal reproduction first, even hypothetically, before proposing a fix.
- Distinguish the symptom (what the stack trace shows) from the root cause (why it's actually happening) — articulate both.
- After any fix, the full test suite — not just the previously-failing test — must be considered, not just the one line that changed.
- If the error traces into a third-party library, say so, and treat "is this a known issue upstream" as a real possibility, not an afterthought.

---

## Senior X-Factors (always-on behaviors, not phase-gated)
- **Warm and Supportive Peer Persona.** Speak with the friendly encouragement of a pair-programming partner. Share excitement for clean solutions, celebrate breakthroughs together, and treat debugging as a joint puzzle.
- Ask "why" before implementing. If a request seems like it's solving a symptom, say what you think the underlying problem is and offer the simpler alternative.
- Over-communicate trade-offs. Every non-trivial response states what you chose not to do and why.
- Bias toward small, shippable increments. If a request is large, propose how to split it rather than producing one massive diff.
- Flag technical debt out loud instead of quietly working around it.
- Self-critique before presenting. Catch your own mistakes before the user has to.

---

## Hard Constraints
- Never present guessed code as verified code. If you're inferring an API shape, library behavior, or file structure without evidence, say so plainly.
- Never skip Phase 0 silently. Either you can answer the questions, or you ask the user — there is no third option where you just proceed on assumptions.
- Never expand scope unasked. Fix what was asked; flag adjacent issues separately rather than fixing them inline.
- Boring beats clever, always, unless the user explicitly asks for a performance-critical or clever solution and accepts the readability trade-off.

---

## Note for Agent Environments
You have file and shell access — use it. Verify, don't assume, wherever a tool call can replace a guess.`;

function selectGroqModel(prompt = "") {
  // If an explicit model is provided via env, use it directly
  if (DEFAULT_MODEL) return DEFAULT_MODEL;
  const len = prompt.length;
  const lower = prompt.toLowerCase();

  // Ingest or long input (>6000 chars)
  if (len > 6000 || lower.includes("ingest") || lower.includes("--file")) {
    return "llama-3.3-70b-versatile";
  }

  // Coding Helper routes to the high-performance Llama model
  if (lower.includes("coding companion") || lower.includes("coding methodology")) {
    return "llama-3.3-70b-versatile";
  }

  // Genealogy Helper utilizes Llama 3.3 70B
  if (lower.includes("genealogical") || lower.includes("genealogy")) {
    return "llama-3.3-70b-versatile";
  }

  // Story Builder outline generation
  if (lower.includes("story architect") || lower.includes("story blueprint") || lower.includes("story builder")) {
    return "llama-3.3-70b-versatile";
  }

  // General Assistant (low-latency default)
  if (lower.includes("general assistant")) {
    return "llama-3.3-70b-versatile";
  }

  // Length fallback rules
  if (len < 1500) {
    return "llama-3.1-8b-instant";
  }

  return "llama-3.3-70b-versatile";
}

async function callGroqDirectly(prompt, systemPrompt = "", history = []) {
  const isGptMode =
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
  if (!apiKey || apiKey.includes('your_groq_api_key_here')) {
    // No real key – return a mock response
    return {
      content: `[REI.AI NOTICE] GROQ_API_KEY not set or placeholder. Mock response for prompt: ${prompt}`,
      model: 'mock',
    };
  }

  const selectedModel = selectGroqModel(prompt);

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
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
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API returned status ${response.status}: ${errText}`);
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content || "No content returned from Groq.";

  // Ensure content is not empty; provide fallback message
  if (!content || content.trim().length === 0) {
    content = "[REI.AI NOTICE] Empty response received; defaulting to placeholder message.";
  }

  if (isGptMode && !process.env.OPENAI_API_KEY) {
    content = `[REI.AI ROUTING WARNING: OPENAI_API_KEY not found in Vercel. Falling back to Open-Source Router: ${selectedModel}]\n\n${content}`;
  }

  return {
    content: content,
    model: selectedModel,
  };
}

async function handleCfaiRequest(command, args = [], input = "", systemPrompt = "", history = []) {
  // Check if CLI is available locally
  const localCliExists = CFAI_PATH && fs.existsSync(CFAI_PATH);

  if (!localCliExists) {
    try {
      // Fallback: execute direct Groq API routing
      const payload = input || (args.length > 0 ? args.join(" ") : "help");
      const response = await callGroqDirectly(payload, systemPrompt, history);
      return {
        success: true,
        result: response.content,
        model: response.model,
        timestamp: new Date().toISOString(),
      };
    } catch (apiError) {
      console.error('handleCfaiRequest apiError:', apiError);
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
      const { command, args = [], input = "", systemPrompt = "", history = [] } = req.body || {};
      
      // Backend length guard - never trust client-side validation alone
      if (typeof input === "string" && input.length > MAX_INPUT_CHARS) {
        return res.status(400).json({
          success: false,
          error: `Input too long (${input.length} chars, max ${MAX_INPUT_CHARS}). If you pasted a large record, trim it to the relevant section.`,
        });
      }
      
      const result = await handleCfaiRequest(command, args, input, systemPrompt, history);
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
    console.error('Handler caught error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: "Serverless execution error",
      details: error.message,
    });
    return;
  }
}
