export const UNCERTAINTY_TERMS = ["uncertain", "unclear", "missing", "unknown", "not sure", "unsure", "doubt", "uncertainty"];

export const HIGH_STRUCTURE_TERMS = [
  "what am i missing",
  "what would change my mind",
  "what would make this wrong",
  "real hinge",
  "how do i know",
  "how reliable",
  "prove it wrong",
  "why is this uncertain",
  "what evidence",
  "what matters most",
];

export function isSimpleGreeting(text = "") {
  return /^(hi|hello|hey|yo|hiya|howdy|sup|heya|greetings|(good )?(morning|afternoon|evening))([\s!.?]|$)/i.test(text.trim());
}
