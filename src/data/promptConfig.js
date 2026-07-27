export const GENERALIST_PROMPTS = [
  "Help me sort this out",
  "What am I missing here?",
  "What is the real hinge?",
  "Separate facts from assumptions",
  "What would change my mind?"
];

export const REASONING_LOOP_STEPS = [
  { id: "facts", label: "Facts", detail: "What is known" },
  { id: "assumptions", label: "Assumptions", detail: "What remains uncertain" },
  { id: "evaluation", label: "Evaluation", detail: "How strong the case is" },
  { id: "change", label: "What changes it", detail: "What would flip the answer" },
  { id: "move", label: "Next move", detail: "Smallest useful step" },
];
