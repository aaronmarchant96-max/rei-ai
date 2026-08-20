/**
 * @file replyParser.js
 * @description Structure-preserving CARDO response parser.
 * Extracts CARDO sections without flattening newlines or stripping user markdown formatting.
 */

export function parseAssistantStyleReply(text) {
  if (text == null) return { Hinge: "", Facts: "", Assumptions: "", Evaluation: "", ChangeMind: "", Move: "", intro: "" };
  const sections = { Hinge: "", Facts: "", Assumptions: "", Evaluation: "", ChangeMind: "", Move: "", intro: "" };

  // 1. Clean thinking tags if present
  let cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<think>[\s\S]*$/gi, "").trim();

  const lines = cleanText.split("\n");
  let current = "intro";

  const headerRegex = /^(?:#{1,6}\s+|(?:\d+\.|\*|-|•)\s+|\*\*)?(?:⚡\s*)?(?:The\s+)?(Hinge|Facts|Assumptions|Evaluation|Move|Next move|Next step|What would change my mind|What would change my mind\?)\s*(?:\*\*)?:?\s*(.*)$/i;

  const keyMap = {
    hinge: "Hinge",
    facts: "Facts",
    assumptions: "Assumptions",
    evaluation: "Evaluation",
    move: "Move",
    "next move": "Move",
    "next step": "Move",
    "what would change my mind": "ChangeMind",
    "what would change my mind?": "ChangeMind",
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const match = trimmed.match(headerRegex);
    if (match) {
      const normalized = match[1].trim().toLowerCase();
      const key = keyMap[normalized];
      if (key) {
        current = key;
        const remainder = match[2].trim().replace(/^\*\*|:\s*|\*\*$/g, "").trim();
        if (remainder) {
          sections[key] = sections[key] ? `${sections[key]}\n${remainder}` : remainder;
        }
        continue;
      }
    }

    if (current === "intro") {
      sections.intro = sections.intro ? `${sections.intro}\n${trimmed}` : trimmed;
    } else {
      sections[current] = sections[current] ? `${sections[current]}\n${trimmed}` : trimmed;
    }
  }

  // Clean sections (trim whitespace while preserving internal structure)
  for (const k of Object.keys(sections)) {
    sections[k] = sections[k].trim();
  }

  return sections;
}
