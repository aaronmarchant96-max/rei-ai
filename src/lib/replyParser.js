export function parseAssistantStyleReply(text) {
  if (text == null) text = "";
  const sections = { Hinge: "", Facts: "", Assumptions: "", Evaluation: "", ChangeMind: "", Move: "", intro: "" };
  const cleaned = text.replace(/\*\*/g, "").replace(/^\s*[-*]\s+/gm, "• ");
  const lines = cleaned.split("\n").map((line) => line.trim()).filter(Boolean);
  let current = "intro";
  for (const rawLine of lines) {
    const line = rawLine.replace(/^•\s*/, "");
    const inlineMatch = line.match(/^(Hinge|Facts|Assumptions|Evaluation|Move|Next move|Next step|What would change my mind|What would change my mind\?):?\s*(.*)$/i);
    if (inlineMatch) {
      const normalized = inlineMatch[1].trim().toLowerCase();
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
      const key = keyMap[normalized] || null;
      const rest = inlineMatch[2].trim();
      if (key) {
        current = key;
        if (rest) {
          sections[key] = sections[key] ? `${sections[key]} ${rest}` : rest;
        }
        continue;
      }
    }
    if (current === "intro") {
      sections.intro = sections.intro ? `${sections.intro} ${line}` : line;
    } else {
      sections[current] = sections[current] ? `${sections[current]} ${line}` : line;
    }
  }
  return sections;
}
