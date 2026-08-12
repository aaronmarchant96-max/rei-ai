import { GENEALOGY_PROMPT } from "../../systemPrompts.js";

export default {
  id: "genealogy",
  label: "The Archivist",
  badge: "Active",
  subtitle: "Evidence-tiered genealogy",
  sessionLabel: "research analysis",
  description: "Evidence-tiered genealogy and disambiguating same-name profiles.",
  rules: ["Compare parent-child age limits", "Assign evidence tiers", "Log negative search results"],
  exemplar: "John Smith same-name disambiguation and parish register evaluation.",
  systemPrompt: GENEALOGY_PROMPT,
  matchTerms: ["ancestor", "descendant", "birth", "death", "marriage", "census", "familysearch", "find a grave", "record", "pedigree", "genealogy", "lineage", "same-name", "disambiguate", "archive", "parish", "baptism", "burial", "manifest", "ship.manifest", "arrival", "ellis island", "immigr", "naturalization", "passenger", "maternal", "paternal", "ancestry", "transcript", "voucher"],
  fingerprint: {
    id: "genealogy-deep-dive",
    jobType: "genealogy-deep-dive",
    label: "Genealogy Deep Dive",
    model: "llama-3.3-70b-versatile",
    maxTokens: 4000,
    costPer1k: 1.0,
    qualityGate: "Evidence tiers + citations",
    enforce: "EVIDENCE_TIERS",
    description: "Genealogy, archival record analysis, and evidence-tiered reasoning.",
    matchTerms: ["ancestor", "descendant", "birth", "death", "marriage", "census", "familysearch", "find a grave", "pedigree", "genealogy", "lineage", "archive", "parish", "baptism", "burial", "probate", "will", "surname", "provenance", "citation", "ancestry", "transcript", "voucher"],
    temperature: 0.2,
    fallbackPriority: "structured-reasoning"
  },
  components: {
    InputPanel: "IngestPanel"   // genealogy adds the record paste panel
  }
};
