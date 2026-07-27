const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const GENERIC_PHRASES = [
  "the exact claim matters",
  "definitions do work",
  "definitions do real work",
  "uncertainty is not a verdict",
  "the original question survived",
  "a clearer standard of proof",
  "the real question is whether",
  "what this really depends on",
];

function extractJson(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) throw new Error("Empty model response");

  try {
    return JSON.parse(trimmed);
  } catch {
    const cleaned = trimmed
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Model response did not contain JSON");
      return JSON.parse(match[0]);
    }
  }
}

function truncate(value, limit = 600) {
  const text = String(value ?? "");
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function containsGenericPhrasing(value) {
  const text = String(value ?? "").toLowerCase();
  return GENERIC_PHRASES.some((phrase) => text.includes(phrase));
}

function isGenericDebate(debate) {
  if (!debate || typeof debate !== "object") return false;

  const fields = [
    debate.desc,
    debate.core,
    debate.hinge?.sideAProtects,
    debate.hinge?.sideAFears,
    debate.hinge?.sideBProtects,
    debate.hinge?.sideBFears,
    debate.hinge?.coreTension,
    debate.hinge?.bridgePoint,
    debate.strongA,
    debate.strongB,
    debate.crackA,
    debate.crackB,
    ...(Array.isArray(debate.take) ? debate.take.flat() : []),
    ...(Array.isArray(debate.changeA) ? debate.changeA : []),
    ...(Array.isArray(debate.changeB) ? debate.changeB : []),
    ...(Array.isArray(debate.rounds)
      ? debate.rounds.flatMap((round) => {
        if (Array.isArray(round)) return round;
        return [round?.aArg, round?.bArg];
      })
      : []),
  ];

  return fields.some(containsGenericPhrasing);
}

/**
 * Builds debate prompt following Fortis et Liber:
 * 1. Leverage - Focuses on core tension
 * 2. Parity - Balanced argument structure
 * 3. Conservation - Right-sized prompt
 * 4. Recoil - Explicit challenge points
 */
/**
 * Debate Prompt Builder - Fortis et Liber Principles:
 * 
 * 1. Leverage - Focuses debate on:
 *    - Core tension identification
 *    - Explicit hinge points
 *    - Concrete tradeoffs
 * 
 * 2. Parity - Balanced structure with:
 *    - Equal argument weighting
 *    - Symmetrical analysis
 *    - Fair challenge points
 * 
 * 3. Recoil - Built-in pushback via:
 *    - Generic phrasing detection
 *    - Automatic retry mechanism
 *    - Concrete example requirements
 * 
 * 4. Conservation - Efficient prompting:
 *    - Minimal template overhead
 *    - Right-sized responses
 *    - Token budgeting
 */
const DEBATE_TEMPLATE = {
  system: "Generate structured debate reports in JSON format",
  rules: [
    "Focus on core tension",
    "Use concrete examples", 
    "Avoid meta-commentary"
  ],
  defaults: {
    hinge: {
      questionType: "Value Collision",
      sideAProtects: "",
      sideAFears: "", 
      sideBProtects: "",
      sideBFears: "",
      coreTension: "whether [specific condition] justifies [specific action]",
      hingeClarityLevel: "Medium",
      hingeClarityReason: "Depends on definitions",
      bridgePoint: "Both sides agree [common ground]"
    },
    rounds: [
      { aArg: "", bArg: "" },
      { aArg: "", bArg: "" },
      { aArg: "", bArg: "" }
    ]
  }
};

function buildPrompt(question, sideA, sideB, intensity, retry = false) {
  const base = {
    ...DEBATE_TEMPLATE,
    question: question.trim().slice(0, 200),
    sideA: sideA?.trim().slice(0, 150) || "Infer from question",
    sideB: sideB?.trim().slice(0, 150) || "Infer opposing view",
    intensity,
    retry,
    constraints: {
      maxTokensPerArg: 75,
      maxExamples: 1,
      maxCriteria: 5
    }
  };

  if (retry) {
    return {
      ...base,
      system: `${base.system}\n\nPrevious response was too generic. Rewrite with:\n- Specific tradeoffs\n- Concrete examples\n- Zero meta-commentary`
    };
  }

  return base;
}

async function requestGemini(apiKey, prompt, temperature) {
  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[debate] Gemini API error", {
      status: response.status,
      statusText: response.statusText,
      body: truncate(errorText),
    });
    throw new Error(`Gemini API returned ${response.status}: ${truncate(errorText, 300)}`);
  }

  const body = await response.json();
  const text = body.candidates?.[0]?.content?.parts?.map((part) => part?.text || "").join("") || "";
  if (!text.trim()) {
    console.error("[debate] Empty Gemini candidate payload", {
      body: truncate(JSON.stringify(body)),
    });
  }
  return extractJson(text);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[debate] Missing GEMINI_API_KEY");
    return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
  }

  const { question, sideA, sideB, intensity = "balanced" } = req.body || {};
  if (!question || !question.trim()) {
    return res.status(400).json({ error: "Question is required" });
  }

  try {
    const temperature = intensity === "ruthless" ? 0.85 : intensity === "aggressive" ? 0.75 : 0.65;
    const prompt = buildPrompt(question, sideA, sideB, intensity, false);
    let debate = await requestGemini(apiKey, prompt, temperature);

    if (isGenericDebate(debate)) {
      console.warn("[debate] Generic debate detected, retrying once with stricter prompt");
      debate = await requestGemini(
        apiKey,
        buildPrompt(question, sideA, sideB, intensity, true),
        Math.max(0.35, temperature - 0.15)
      );
    }

    return res.status(200).json(debate);
  } catch (error) {
    console.error("[debate] AI debate generation failed", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({
      error: "AI debate generation failed",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
