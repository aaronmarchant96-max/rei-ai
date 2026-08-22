import { CASE_HINGE_PROMPT } from "../../systemPrompts.js";

export default {
  id: "legal",
  label: "The Precedent Engine",
  badge: "Beta",
  subtitle: "Legal precedent analysis",
  sessionLabel: "precedent analysis",
  description: "Legal precedent analysis and case evaluation.",
  rules: ["Verified-index grounding", "Hinge before holding", "Flag unverified cases explicitly"],
  exemplar: "Extracting the decisive legal principle and what fact would have changed the outcome.",
  systemPrompt: CASE_HINGE_PROMPT,
  matchTerms: ["precedent", "holding", "dicta", "majority opinion", "dissent", "appeal", "court held", "ruling", "litigation", "overruled", "distinguish", "statute", "constitutional", "tort", "plaintiff", "defendant", "case law", "legal principle", "judicial review", "duty of care", "donoghue", "winterbottom", "carlill", "marbury", "brown v board", "rylands", "appellate", "en banc", "burden-shifting"],
  fingerprint: {
    id: "legal-hinge",
    jobType: "legal-hinge",
    label: "Legal Hinge",
    model: "deepseek-chat",
    maxTokens: 3000,
    costPer1k: 1.0,
    qualityGate: "Verified-index check + hinge-before-holding",
    enforce: null,
    description: "Case analysis grounded in the verified precedent index — flags anything outside it as unverified.",
    matchTerms: ["precedent", "holding", "dicta", "plaintiff", "defendant", "tort", "statute", "case law", "court held", "ruling", "litigation", "overruled", "distinguish", "donoghue", "winterbottom", "carlill", "marbury", "brown v board", "rylands", "judicial review", "duty of care"],
    temperature: 0.2,
    fallbackPriority: "structured-reasoning"
  },
  components: {}
};
