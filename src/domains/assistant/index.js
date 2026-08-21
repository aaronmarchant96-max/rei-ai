import { GENERALIST_PROMPT } from "../../systemPrompts.js";

export default {
  id: "assistant",
  label: "The Generalist",
  badge: "Active",
  subtitle: "Everyday reasoning",
  description: "Everyday reasoning, judgment, and decision support.",
  rules: ["Short sentences", "Hinge first", "Facts with sources", "Flag uncertainty"],
  exemplar: "Turning loose thoughts into a clean, usable decision path.",
  systemPrompt: GENERALIST_PROMPT,
  matchTerms: [],
  fingerprint: {
    id: "structured-reasoning",
    jobType: "structured-reasoning",
    label: "Structured Reasoning",
    model: "deepseek-chat",
    maxTokens: 400,
    costPer1k: 1.0,
    qualityGate: "Hinge + Facts + Move",
    enforce: null,
    description: "Default routing for general decision support and analysis.",
    matchTerms: ["pump", "vibration", "sensor", "shutdown", "maintenance", "operational", "failure probability", "equipment", "preventive", "predictive", "risk score", "reliability", "downtime", "monolith", "microservices", "architecture", "rewrite", "refactor", "technical debt", "breach", "security breach", "cost-benefit", "saas", "legacy", "cto", "upfront cost", "annual probability"],
    temperature: 0.6,
    fallbackPriority: "adversarial-validation"
  },
  components: {}
};
