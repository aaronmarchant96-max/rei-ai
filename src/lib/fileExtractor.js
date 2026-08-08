/** Per-file limit — keeps prompt bloat and model context exhaustion in check. */
export const MAX_FILE_SIZE = 500 * 1024; // 500 KB

/** Combined limit across all attached files in a single request. */
export const MAX_COMBINED_SIZE = 4 * 500 * 1024; // 2 MB

/** Maximum number of files that can be attached at once. */
export const MAX_FILE_COUNT = 4;

const TEXT_EXTENSIONS = new Set([
  "js", "jsx", "ts", "tsx", "py", "md", "txt", "json", "css", "html",
  "sh", "yaml", "yml", "toml", "xml", "csv", "sql", "rb", "go", "rs",
  "java", "c", "cpp", "h", "hpp", "php", "swift", "kt", "scala", "r",
  "lua", "zig", "nim", "ex", "exs", "erl", "hrl", "dart", "vue", "svelte",
  "astro", "graphql", "prisma", "env", "cfg", "ini", "conf", "log",
  "Makefile", "Dockerfile", "dockerfile",
]);

/**
 * Read a File object as text. Rejects for binary/image files so the UI can
 * surface a clear error instead of silently injecting garbage — no OCR,
 * no vision, no false capability claim.
 */
export function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const textMime = file.type.startsWith("text/") || file.type === "application/json" || file.type === "application/xml";

    if (!TEXT_EXTENSIONS.has(ext) && !textMime) {
      reject(new Error(`Cannot read "${file.name}" — binary or unsupported image file. Text/code files only (${ext} not recognised).`));
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
