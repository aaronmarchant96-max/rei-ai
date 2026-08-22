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

/**
 * Separates internal planning, blueprint, and CARDO scaffolding from the visible assistant deliverable.
 * Places scaffolding into metadata for the Inspect drawer while ensuring the conversation
 * displays ONLY the clean requested deliverable.
 */
export function extractDeliverableAndScaffolding(text) {
  if (text == null || typeof text !== "string") {
    return { deliverable: "", scaffolding: null };
  }

  let raw = text;
  const scaffoldingParts = [];

  // 1. Extract and strip <think>...</think> tags
  raw = raw.replace(/<think>([\s\S]*?)<\/think>/gi, (_, content) => {
    const trimmed = content.trim();
    if (trimmed) scaffoldingParts.push(trimmed);
    return "";
  }).replace(/<think>[\s\S]*$/gi, "");

  // 2. Extract and strip <details>...</details> blocks
  raw = raw.replace(/<details\b[^>]*>([\s\S]*?)<\/details>/gi, (_, content) => {
    const cleanContent = content.replace(/<summary\b[^>]*>[\s\S]*?<\/summary>/gi, "").trim();
    if (cleanContent) scaffoldingParts.push(cleanContent);
    return "";
  });

  // 3. Extract and strip any standalone <summary>...</summary> or unclosed <details>
  raw = raw.replace(/<summary\b[^>]*>[\s\S]*?<\/summary>/gi, "");
  raw = raw.replace(/<\/?details\b[^>]*>/gi, "");
  raw = raw.replace(/<\/?summary\b[^>]*>/gi, "");

  // 4. Extract and strip internal Phase 0 / Structural Blueprint / CARDO Hinge blocks if raw
  const scaffoldingBlockRegex = /^(?:\s*|\n*)(?:\*\*Phase 0[\s\S]*?(?:\*\*CARDO Hinge Analysis\*\*|\*\*Structural Blueprint\*\*|Structural Blueprint)[\s\S]*?)(?=\n---|\n\n[A-Z#]|$)/i;
  raw = raw.replace(scaffoldingBlockRegex, (match) => {
    const trimmed = match.trim();
    if (trimmed) scaffoldingParts.push(trimmed);
    return "";
  });

  // 5. Strip any leading markdown horizontal rules (--- or ***) and leading whitespace
  raw = raw.replace(/^(?:\s*[-*_]{3,}\s*)+/g, "").trim();

  // 6. Safely unescape accidental presentation backslash escapes on prose nodes only.
  // Code fences, inline code, URLs, Windows paths (e.g. C:\Users), and regexes remain 100% intact.
  raw = unescapeProseMarkdown(raw);

  const scaffolding = scaffoldingParts.join("\n\n").trim() || null;

  return {
    deliverable: raw,
    scaffolding,
  };
}

export function unescapeProseMarkdown(text) {
  if (!text || typeof text !== "string") return "";

  // 1. Unescape accidental backslash-escaped backticks (\``` or \`) in prose before code block extraction
  let processed = text.replace(/\\(`{1,3})/g, "$1");

  // 2. Split text by valid fenced code blocks (```...```) and inline code (`...`)
  const codeBlockRegex = /(```[\s\S]*?```|`[^`\n]+`)/g;
  const parts = processed.split(codeBlockRegex);

  return parts
    .map((part, index) => {
      // Odd indices are valid code blocks or inline code — preserve completely
      if (index % 2 === 1) return part;

      // Even indices are prose nodes — unescape presentation tokens while preserving Windows paths & regexes
      return part
        // Unescape headings: \# Heading -> # Heading
        .replace(/\\(#{1,6}\s)/g, "$1")
        // Unescape bold/italic formatting: \*\*bold\*\* -> **bold**
        .replace(/\\(\*\*|__)/g, "$1")
        // Unescape list items or escaped bold/italics: \* item or \*text\* -> * item / *text*
        // ONLY if not part of a Windows drive path (e.g. C:\Users) or regex backslash word char (\w, \s, \d)
        .replace(/(?<![A-Za-z]:\\)(?<!\\[A-Za-z0-9_]+)\\(\*|_|\[|\])/g, "$1");
    })
    .join("");
}
