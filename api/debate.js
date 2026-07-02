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

function buildPrompt(question, sideA, sideB, intensity, retry = false) {
  const base = `You generate structured debate reports for Debate Furnace.

Return valid JSON only. Do not use markdown. Do not include commentary outside JSON.

Debate Furnace does not decide objective truth. It pressure-tests both sides, finds the real tradeoff, and gives the decision back to the user.
Most people think they are in a facts fight when they are actually in a values fight. Debate Furnace shows which one they are in.

Question: ${question.trim()}
Side A: ${sideA?.trim() || "Infer a clear Side A position from the question"}
Side B: ${sideB?.trim() || "Infer a clear opposing Side B position from the question"}
Intensity: ${intensity}

Write tight, vivid, specific arguments. Keep each field short and punchy.
Use concrete examples, tradeoffs, and consequences. Avoid generic debate filler, hedging, and repeated phrasing.
Identify what each side is protecting and what each side fears losing.
Classify the deeper disagreement as one of: Value Collision, Factual Dispute, Definition Dispute, Risk Tradeoff, Trust Dispute, Identity Dispute, Policy Mechanism Dispute.
Name the exact hinge that would make a reasonable person switch sides.
Do not restate the question in every section. Do not use full-sentence compass values.
For the compass, use short noun phrases only.
Keep round arguments to 2-4 sentences each.
Make each takeaway a complete sentence starting with "Most people assume..." or "This debate revealed...".
The unresolved question must be a complete sentence that starts with "The real question neither side resolved is...".
Do not use labels, fragments, or one-word summaries for takeaways or the unresolved question.
Use this exact shape as a guide:
- "take": [["Most people assume X, but this debate revealed Y.", "Most people assume X, but this debate revealed Y."], ["This debate revealed X about the tradeoff.", "This debate revealed Y about the tradeoff."], ["Most people assume X, but this debate revealed Y.", "Most people assume X, but this debate revealed Y."]]
- "hinge": { "questionType": "Value Collision", "sideAProtects": "specific value or stake", "sideAFears": "specific loss or harm", "sideBProtects": "specific value or stake", "sideBFears": "specific loss or harm", "coreTension": "whether X justifies Y", "hingeClarityLevel": "High", "hingeClarityReason": "One sentence explaining why.", "bridgePoint": "One sentence both sides could accept." }
- "core": "The real question neither side resolved is whether ..."
- "comp": ["value A noun phrase", "value B noun phrase", "The real question neither side resolved is whether ..."]

Return exactly this JSON shape:
{
  "qType": "one of: product, policy, moral, practical, factual, extraordinary, open",
  "sideA": "",
  "sideB": "",
  "label": "",
  "icon": "",
  "criteria": ["", "", "", "", ""],
  "desc": "",
  "rounds": [
    { "aArg": "", "bArg": "" },
    { "aArg": "", "bArg": "" },
    { "aArg": "", "bArg": "" }
  ],
  "take": [
    ["Most people assume X", "Most people assume X, but this debate revealed Y."],
    ["This debate revealed X", "This debate revealed X about the tradeoff."],
    ["Most people assume X", "Most people assume X, but this debate revealed Y."]
  ],
  "strongA": "",
  "strongB": "",
  "crackA": "",
  "crackB": "",
  "verify": ["", "", "", ""],
  "changeA": ["", "", ""],
  "changeB": ["", "", ""],
  "hinge": {
    "questionType": "one of: Value Collision, Factual Dispute, Definition Dispute, Risk Tradeoff, Trust Dispute, Identity Dispute, Policy Mechanism Dispute",
    "sideAProtects": "",
    "sideAFears": "",
    "sideBProtects": "",
    "sideBFears": "",
    "coreTension": "",
    "hingeClarityLevel": "one of: High, Medium, Low",
    "hingeClarityReason": "",
    "bridgePoint": ""
  },
  "core": "The real question neither side resolved is whether ...",
  "comp": ["value A noun phrase", "value B noun phrase", "The real question neither side resolved is whether ..."]
}`;

  if (!retry) return base;
  return `${base}

Your previous answer was too generic. Rewrite it with topic-specific stakes, concrete examples, actual tradeoffs, and no meta-debate filler.`;
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
