/**
 * Build a source-code context block from the deployed source index.
 *
 * `sourceIndex.json` is a prebuild artifact (scripts/index-source.mjs) that
 * inlines a curated list of source files. This function dynamically imports it
 * (code-split — only loaded when triggered) and returns a formatted block
 * containing files whose paths match the user's query terms.
 *
 * Never touches the live filesystem or a network API. If the JSON artifact is
 * missing (first build, prebuild not run) it returns "" silently — no
 * injection, no break.
 *
 * @param query  user message text — terms are matched against file basenames
 * @returns       "## Source Code (...)" block, or "" if no matches / no index
 */
export async function buildSourceContext(query?: string): Promise<string> {
  try {
    const { default: index } = (await import("../data/sourceIndex.json")) as {
      default: { generatedAt: string; files: { path: string; content: string; size: number }[] };
    };

    const { files } = index || {};
    if (!files || files.length === 0) return "";

    let matched = files;

    if (query) {
      const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      // Also split on punctuation to catch bare filenames like "cfai.js"
      const tokens = query.toLowerCase().split(/[\s.,;:!?()\[\]{}'"]+/).filter(Boolean);
      const allTerms = [...new Set([...terms, ...tokens])];

      matched = files.filter((f) => {
        const base = f.path.split("/").pop()?.toLowerCase() || "";
        const stem = base.replace(/\.[^.]+$/, ""); // basename without extension
        return allTerms.some((t) => {
          if (t.length < 3) return false;
          if (stem === t) return true;
          if (stem.startsWith(t)) return true;
          if (t.length >= 4 && stem.includes(t)) return true;
          return false;
        });
      });
    }

    if (matched.length === 0) return "";

    const blocks = matched.map(
      (f) => `--- ${f.path} ---\n${f.content}\n--- end ${f.path} ---`,
    );

    return `\n\n## Source Code (from deployed build index — static snapshot, read-only; matches production)\n\n${blocks.join("\n\n")}`;
  } catch {
    return ""; // artifact missing — prebuild not run, skip cleanly
  }
}
