// Debate Furnace — theme constants, starter questions, heat levels
const T = {
  bg: "#080810",
  surface: "#0f0f1a",
  card: "#13131f",
  border: "#1e2235",
  ember: "#e8742a",
  brass: "#b8943a",
  gold: "#d4a83a",
  molten: "#f05020",
  charcoal: "#1a1a28",
  sideA: "#5b8dd9",
  sideB: "#c85858",
  smoke: "#f0a030",
  judge: "#4aaa70",
  muted: "#4a5068",
  text: "#d8dce8",
  textDim: "#7a8098",
  warn: "#e05050",
};

const STARTERS = [
  "Is ChatGPT better than Grok?",
  "Does gun control reduce harm?",
  "Is love real?",
  "Is AI art real art?",
  "Are UAPs most likely advanced non-human technology?",
  "Should governments regulate frontier AI more aggressively?",
  "Is remote work better than working in an office?",
  "Are seed oils actually bad for you?",
  "Is free will an illusion?",
  "Should college be free for everyone?",
  "Should parents be allowed to genetically modify their babies for intelligence or health?",
  "Should the 4-day workweek become standard for office jobs?",
  "Should prisons prioritize rehabilitation over punishment?",
  "Should social media be age-gated for teens under 16?",
  "Should housing be treated as a human right?",
  "Is pineapple on pizza acceptable?",
  "Does social media do more harm than good?",
  "Is money the root of all evil?",
  "Are cats better than dogs?",
  "Should capital punishment be abolished?",
  "Should encryption be a human right?",
];

const HEAT = {
  low: ["Low Heat", "Clean disagreement", T.sideA],
  medium: ["Medium Heat", "Contested assumptions", T.gold],
  high: ["High Heat", "Heavy flaws or unresolved claims", T.ember],
  critical: ["Critical Heat", "Core issue unresolved under pressure", T.sideB],
};
export { T, STARTERS, HEAT };
