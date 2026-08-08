/** Per-file limit — keeps prompt bloat and model context exhaustion in check. */
export const MAX_FILE_SIZE = 500 * 1024; // 500 KB

/** Combined limit across all attached files in a single request. */
export const MAX_COMBINED_SIZE = 4 * 500 * 1024; // 2 MB

/** Maximum number of files that can be attached at once. */
export const MAX_FILE_COUNT = 4;

/** Files whose full name (lowercased) should be accepted even without an extension. */
const EXTENSIONLESS_NAMES = new Set([
  "makefile", "dockerfile", "license", "changelog", "readme",
  "contributing", "authors", "news", "codeowners", "security",
]);

const TEXT_EXTENSIONS = new Set([
  "js", "jsx", "mjs", "cjs", "ts", "tsx", "py", "pyx", "pxd", "pxi",
  "md", "mdx", "txt", "json", "jsonc", "json5", "css", "scss", "sass",
  "less", "styl", "html", "htm", "xml", "svg", "yaml", "yml", "toml",
  "csv", "sql", "rb", "go", "rs", "java", "c", "cpp", "cc", "cxx",
  "h", "hpp", "hh", "hxx", "php", "swift", "kt", "kts", "scala", "r",
  "lua", "zig", "nim", "ex", "exs", "erl", "hrl", "dart", "vue",
  "svelte", "astro", "graphql", "gql", "prisma", "env", "cfg", "ini",
  "conf", "cnf", "log", "tex", "bib", "bat", "cmd", "ps1", "sh",
  "bash", "zsh", "fish", "patch", "diff", "lock", "properties",
]);

function extension(name) {
  const i = name.lastIndexOf(".");
  return i === -1 ? name.toLowerCase() : name.slice(i + 1).toLowerCase();
}

/**
 * Read a File object as text. Rejects for binary/image files so the UI can
 * surface a clear error instead of silently injecting garbage — no OCR,
 * no vision, no false capability claim.
 */
export function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const nameLower = file.name.toLowerCase();
    const ext = extension(file.name);
    const nameOk = EXTENSIONLESS_NAMES.has(nameLower);
    const mimeOk =
      file.type.startsWith("text/") ||
      file.type === "application/json" ||
      file.type === "application/xml" ||
      file.type === "application/x-yaml" ||
      file.type === "application/javascript";

    if (!TEXT_EXTENSIONS.has(ext) && !nameOk && !mimeOk) {
      const hint = ext.length > 0 ? `.${ext} ` : "no extension ";
      reject(
        new Error(
          `"${file.name}" rejected — ${hint}not a supported text/code file type. Accepted: .js .ts .py .md .json .css .html .sh .rb .go .rs .java ... (extensions) or extensionless Makefile/Dockerfile`,
        ),
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      reject(new Error(`"${file.name}" is ${(file.size / 1024).toFixed(0)} KB — limit is ${MAX_FILE_SIZE / 1024} KB per file.`));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        content: /** @type {string} */ (reader.result),
        size: file.size,
      });
    };
    reader.onerror = () => reject(new Error(`Failed to read "${file.name}": ${reader.error?.message || "unknown error"}`));
    reader.readAsText(file);
  });
}
