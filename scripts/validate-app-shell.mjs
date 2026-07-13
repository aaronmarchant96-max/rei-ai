import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const appShellPath = path.join(repoRoot, "src", "AppShell.jsx");

const expectedStrings = [
  "PromptHound Labs",
  "Structured outputs for messy input.",
];

const expectedTabs = [
  {
    id: "tools",
    label: "Tools",
    subtitle: "Pick the slice you need.",
  },
  {
    id: "furnace",
    label: "Debate Furnace",
    subtitle: "Arguments get pressure-tested here.",
  },
  {
    id: "story-forge",
    label: "Story Forge",
    subtitle: "Old sources turn into story blueprints.",
  },
  {
    id: "storm-replay",
    label: "Storm Replay",
    subtitle: "Storm imagery gets a careful read.",
  },
  {
    id: "cardo-guard",
    label: "CARDO GUARD",
    subtitle: "AI scores get checked against cost.",
  },
  {
    id: "rei",
    label: "REI.ai",
    subtitle: "Platform reasoning layer.",
  },
  {
    id: "tracepoint",
    label: "Tracepoint",
    subtitle: "Industrial signals stay evidence-first.",
  },
];

function ensure(condition, message, errors) {
  if (!condition) errors.push(message);
}

async function main() {
  const errors = [];
  const source = await fs.readFile(appShellPath, "utf8");

  for (const text of expectedStrings) {
    ensure(source.includes(text), `AppShell is missing required copy: ${text}`, errors);
  }

  const topLevelMatch = source.match(/const TOP_LEVEL = \[(.*?)\];/s);
  ensure(Boolean(topLevelMatch), "AppShell TOP_LEVEL block was not found", errors);

  if (topLevelMatch) {
    const topLevelBlock = topLevelMatch[1];
    for (const tab of expectedTabs) {
      ensure(
        topLevelBlock.includes(`id: "${tab.id}"`),
        `Top-level tabs missing id ${tab.id}`,
        errors
      );
      ensure(
        topLevelBlock.includes(`label: "${tab.label}"`),
        `Top-level tabs missing label ${tab.label}`,
        errors
      );
      ensure(
        topLevelBlock.includes(`subtitle: "${tab.subtitle}"`),
        `Top-level tabs missing subtitle ${tab.subtitle}`,
        errors
      );
    }

    const idMatches = topLevelBlock.match(/id:\s*"/g) || [];
    ensure(
      idMatches.length === expectedTabs.length,
      `Top-level tabs should contain exactly ${expectedTabs.length} ids`,
      errors
    );
  }

  if (errors.length) {
    throw new Error(`App shell contract validation failed:\n- ${errors.join("\n- ")}`);
  }

  console.log("Validated AppShell contract");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
