import { STORY_PROMPT } from "../../systemPrompts.js";

export default {
  id: "story",
  label: "The Storyteller",
  badge: "Active",
  subtitle: "Narrative architecture",
  sessionLabel: "story building",
  description: "Narrative architecture generating story blueprints.",
  rules: ["Establish blueprint structure", "Identify character driver hinges", "Avoid cliché tropes"],
  exemplar: "Expanding historical inspiration seeds into multi-part character outlines.",
  systemPrompt: STORY_PROMPT,
  matchTerms: ["story", "plot", "character", "scene", "narrative", "outline", "dialogue", "arc", "worldbuilding", "conflict", "hero", "villain", "monologue", "noir", "detective", "magic.system", "atmospheric.pressure", "thriller", "submarine", "redemption", "gothic", "novel", "tropes", "beat sheet"],
  fingerprint: {
    id: "story-architect",
    jobType: "story-architect",
    label: "Story Architect",
    model: "openai/gpt-oss-120b",
    maxTokens: 4096,
    costPer1k: 1.0,
    qualityGate: "Character hinge + timeline",
    enforce: "NARRATIVE_BLUEPRINT",
    description: "Narrative planning, outlines, and story architecture.",
    matchTerms: ["story", "plot", "character", "scene", "narrative", "outline", "dialogue", "arc", "worldbuilding", "conflict", "hero", "villain"],
    temperature: 0.7,
    fallbackPriority: "structured-reasoning"
  },
  components: {}
};
