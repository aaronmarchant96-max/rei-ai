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

  it("reads a .JS file (case-insensitive extension match)", async () => {
    const blob = new Blob(["console.log(1);"], { type: "" });
    const file = new File([blob], "utils.JS", { type: "" });
    const result = await readTextFile(file);
    expect(result.name).toBe("utils.JS");
    expect(result.content).toBe("console.log(1);");
  });

  it("reads a .md file by extension even when MIME is empty", async () => {
    const blob = new Blob(["# Hello"], { type: "" });
    const file = new File([blob], "readme.md", { type: "" });
    const result = await readTextFile(file);
    expect(result.name).toBe("readme.md");
    expect(result.content).toBe("# Hello");
  });

  it("reads an extensionless Makefile by filename", async () => {
    const blob = new Blob(["all: build"], { type: "" });
    const file = new File([blob], "Makefile", { type: "" });
    const result = await readTextFile(file);
    expect(result.name).toBe("Makefile");
    expect(result.content).toBe("all: build");
  });

  it("reads an extensionless Dockerfile by filename", async () => {
    const blob = new Blob(["FROM node:20"], { type: "" });
    const file = new File([blob], "Dockerfile", { type: "" });
    const result = await readTextFile(file);
    expect(result.name).toBe("Dockerfile");
    expect(result.content).toBe("FROM node:20");
  });

  it("rejects binary/image files with a clear message", async () => {
    const blob = new Blob(["fake"], { type: "image/png" });
    const file = new File([blob], "screenshot.png", { type: "image/png" });
    await expect(readTextFile(file)).rejects.toThrow(
      /rejected.*not a supported/i,
    );
  });

  it("rejects files over the size limit", async () => {
    const bigContent = "a".repeat(MAX_FILE_SIZE + 1);
    const blob = new Blob([bigContent], { type: "text/plain" });
    const file = new File([blob], "big.txt", { type: "text/plain" });
    await expect(readTextFile(file)).rejects.toThrow(/KB.*limit/i);
  });

  it("rejects unsupported extensions with a clear message", async () => {
    const blob = new Blob(["data"], { type: "" });
    const file = new File([blob], "data.bin", { type: "" });
    await expect(readTextFile(file)).rejects.toThrow(
      /rejected.*not a supported/i,
    );
  });

  it("accepts .scss and .mdx extensions", async () => {
    const blob = new Blob(["$color: red;"], { type: "" });
    const file = new File([blob], "theme.scss", { type: "" });
    const result = await readTextFile(file);
    expect(result.content).toBe("$color: red;");

    const blob2 = new Blob(["## MDX"], { type: "" });
    const file2 = new File([blob2], "page.mdx", { type: "" });
    const result2 = await readTextFile(file2);
    expect(result2.content).toBe("## MDX");
  });

  it("rejects files with no extension that are not in the filename list", async () => {
    const blob = new Blob(["data"], { type: "" });
    const file = new File([blob], "somefile", { type: "" });
    await expect(readTextFile(file)).rejects.toThrow(
      /rejected.*not a supported/i,
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
