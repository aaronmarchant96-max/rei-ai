const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function extractJson(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) throw new Error("Empty model response");

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Model response did not contain JSON");
    return JSON.parse(match[0]);
  }
}

function truncate(value, limit = 600) {
  const text = String(value ?? "");
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
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

  const prompt = `You generate structured debate reports for Debate Furnace.

Return valid JSON only. Do not use markdown. Do not include commentary outside JSON.

Debate Furnace does not decide objective truth. It pressure-tests both sides, finds the real tradeoff, and gives the decision back to the user.

Question: ${question.trim()}
Side A: ${sideA?.trim() || "Infer a clear Side A position from the question"}
Side B: ${sideB?.trim() || "Infer a clear opposing Side B position from the question"}
Intensity: ${intensity}

Write tight, vivid, specific arguments. Keep each field short and punchy.
Use concrete examples, tradeoffs, and consequences. Avoid generic debate filler, hedging, and repeated phrasing.
Do not restate the question in every section. Do not use full-sentence compass values.
For the compass, use short noun phrases only.
Keep round arguments to 2-4 sentences each. Keep takeaways to brief clauses.

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
  "take": [["", ""], ["", ""], ["", ""]],
  "strongA": "",
  "strongB": "",
  "crackA": "",
  "crackB": "",
  "verify": ["", "", "", ""],
  "changeA": ["", "", ""],
  "changeB": ["", "", ""],
  "core": "",
  "comp": ["", "", ""]
}`;

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: intensity === "ruthless" ? 0.85 : intensity === "aggressive" ? 0.75 : 0.65,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[debate] Gemini API error", {
        status: response.status,
        statusText: response.statusText,
        body: truncate(errorText)
      });
      throw new Error(`Gemini API returned ${response.status}: ${truncate(errorText, 300)}`);
    }

    const body = await response.json();
    const text = body.candidates?.[0]?.content?.parts?.map((part) => part?.text || "").join("") || "";
    if (!text.trim()) {
      console.error("[debate] Empty Gemini candidate payload", {
        body: truncate(JSON.stringify(body))
      });
    }
    const debate = extractJson(text);
    return res.status(200).json(debate);
  } catch (error) {
    console.error("[debate] AI debate generation failed", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    });
    return res.status(500).json({
      error: "AI debate generation failed",
      detail: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
