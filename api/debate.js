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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
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

Write vivid, specific arguments. Avoid generic debate filler. Be fair to both sides. Make the final hinge about what the user values or refuses to trade away.

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
      throw new Error(`Gemini API returned ${response.status}: ${errorText.slice(0, 300)}`);
    }

    const body = await response.json();
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
    const debate = extractJson(text);
    return res.status(200).json(debate);
  } catch (error) {
    return res.status(500).json({
      error: "AI debate generation failed",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
