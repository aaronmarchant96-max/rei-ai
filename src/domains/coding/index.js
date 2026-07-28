import { CODING_PROMPT } from "../../systemPrompts.js";

export default {
  id: "coding",
  label: "The Engineer",
  badge: "Active",
  subtitle: "Senior coding logic",
  sessionLabel: "coding session",
  description: "Senior coding logic executing CARDO REI methodology.",
  rules: ["Verify API shapes", "Name hinges explicitly", "Stop and ask if underspecified"],
  exemplar: "Decomposing complex requirements into small, testable coding iterations.",
  systemPrompt: CODING_PROMPT,
  matchTerms: ["implement", "debug", "fix", "refactor", "function", "component", "module", "api", "jest", "vite", "react", "node", "typescript", "javascript", "python", "test", "patch", "class", "service", "hook", "route", "query", "optimize", "index", "postgresql", "database", "concurrent", "rate.limit", "build.script", "build.error", "build.target", "next.js", "tailwind", "express", "middleware", "svelte", "deno", "turborepo", "monorepo", "kubernetes", "pytest", "jquery", "blueprint", "clean version", "source code", "load_users"],
  fingerprint: {
    id: "coding-hinge",
    jobType: "coding-hinge",
    label: "Coding Hinge",
    model: "llama-3.3-70b-versatile",
    maxTokens: 600,
    costPer1k: 1.0,
    qualityGate: "Phase 0 + HARD STOP",
    enforce: "HARD_STOP",
    description: "Coding tasks that need clarification, root-cause analysis, and explicit verification.",
    matchTerms: ["implement", "build", "debug", "fix", "refactor", "function", "component", "module", "api", "jest", "vite", "react", "node", "typescript", "javascript", "python", "test", "patch", "class", "service", "hook", "route", "blueprint", "clean version", "source code"],
    temperature: 0.3,
    fallbackPriority: "structured-reasoning"
  },
  components: {}
};
