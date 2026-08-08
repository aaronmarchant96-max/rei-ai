import { readTextFile, MAX_FILE_SIZE, MAX_FILE_COUNT, MAX_COMBINED_SIZE } from "./fileExtractor.js";

describe("readTextFile", () => {
  it("reads a .js file as text", async () => {
    const blob = new Blob(["const x = 1;"], { type: "text/javascript" });
    const file = new File([blob], "app.js", { type: "text/javascript" });
    const result = await readTextFile(file);
    expect(result.name).toBe("app.js");
    expect(result.content).toBe("const x = 1;");
    expect(result.size).toBe(12);
  });

  it("reads a .md file by extension even when MIME is empty", async () => {
    const blob = new Blob(["# Hello"], { type: "" });
    const file = new File([blob], "readme.md", { type: "" });
    const result = await readTextFile(file);
    expect(result.name).toBe("readme.md");
    expect(result.content).toBe("# Hello");
  });

  it("rejects binary/image files with a clear message", async () => {
    const blob = new Blob(["fake"], { type: "image/png" });
    const file = new File([blob], "screenshot.png", { type: "image/png" });
    await expect(readTextFile(file)).rejects.toThrow(
      /binary.*unsupported.*png not recognised/i,
    );
  });

  it("rejects files over the size limit", async () => {
    const bigContent = "a".repeat(MAX_FILE_SIZE + 1);
    const blob = new Blob([bigContent], { type: "text/plain" });
    const file = new File([blob], "big.txt", { type: "text/plain" });
    await expect(readTextFile(file)).rejects.toThrow(/exceeds|limit/i);
  });

  it("rejects unsupported extensions with a clear message", async () => {
    const blob = new Blob(["data"], { type: "" });
    const file = new File([blob], "data.bin", { type: "" });
    await expect(readTextFile(file)).rejects.toThrow(
      /binary|unsupported/i,
    );
  });
});

describe("limits", () => {
  it("MAX_FILE_SIZE is 500 KB", () => {
    expect(MAX_FILE_SIZE).toBe(500 * 1024);
  });

  it("MAX_FILE_COUNT is 4", () => {
    expect(MAX_FILE_COUNT).toBe(4);
  });

  it("MAX_COMBINED_SIZE is 2 MB", () => {
    expect(MAX_COMBINED_SIZE).toBe(4 * 500 * 1024);
  });
});
