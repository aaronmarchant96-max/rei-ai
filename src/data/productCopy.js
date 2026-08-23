export const PRODUCT_STORY = Object.freeze({
  eyebrow: "One workspace · multiple AI models · clear receipts",
  headlineLead: "One place to ask.",
  headlineAccent: "A model matched to the job.",
  summary: "Ask REI anything. It looks at the job, chooses an AI model suited to it, and shows you which model answered, why it was chosen, and what it cost.",
  benefit: "Easy questions can stay inexpensive. Hard or specialized work can get more capable handling.",
  workspaceHint: "Ask in your own words. REI will match the request to a model and show the route and cost after it answers.",
  modes: [
    {
      label: "Use it",
      title: "Chat with a specialist",
      description: "Choose everyday reasoning, coding, family-history research, storytelling, or legal precedent analysis.",
    },
    {
      label: "Connect it",
      title: "Route your existing AI tools",
      description: "Point an OpenAI-compatible app or agent at REI so each request can use a model suited to the job.",
    },
    {
      label: "Inspect it",
      title: "See every decision",
      description: "Review the selected model, the reason for the route, the response status, and the reported cost.",
    },
  ],
});

export const DOMAIN_PUBLIC_COPY = Object.freeze({
  assistant: {
    title: "The Generalist",
    eyebrow: "Everyday questions and decisions",
    description: "Ask everyday questions, compare choices, and turn uncertainty into a clear next step.",
    signal: "Clear next steps",
  },
  coding: {
    title: "The Engineer",
    eyebrow: "Build, debug, and improve code",
    description: "Build, debug, and improve code with verification built into the workflow.",
    signal: "Verified changes",
  },
  genealogy: {
    title: "The Archivist",
    eyebrow: "Research people and records",
    description: "Research family history while keeping records, clues, and assumptions clearly separated.",
    signal: "Evidence kept clear",
  },
  story: {
    title: "The Storyteller",
    eyebrow: "Write stronger stories",
    description: "Write stories, scenes, characters, and worlds with strong continuity and meaningful payoffs.",
    signal: "Continuity and payoff",
  },
  legal: {
    title: "The Precedent Engine",
    eyebrow: "Compare cases and precedents",
    description: "Compare cases, rules, and precedents while keeping sources, facts, and conclusions clear.",
    signal: "Sources and reasoning",
  },
});

export function getDomainPublicCopy(id) {
  return DOMAIN_PUBLIC_COPY[id] || DOMAIN_PUBLIC_COPY.assistant;
}
