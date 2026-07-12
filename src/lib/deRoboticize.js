/**
 * Post-process filter — strips robotic formulaic openers from REI responses.
 * The prompt alone can't fully prevent "The hinge is..." because models
 * mutate banned phrases: "The hinge is..." → "The key thing is..." →
 * "Here's the hinge:". This is a deterministic strip at the API layer.
 */

const BANNED_OPENERS = [
  /^(here'?s\s+the\s+hinge[\s:,]*)\s*/i,
  /^(the\s+key\s+thing\s+is[\s:,]*)\s*/i,
  /^(the\s+key\s+issue\s+is[\s:,]*)\s*/i,
  /^(the\s+hinge\s+is[\s:,]*)\s*/i,
  /^(the\s+core\s+(idea|point|issue)\s+is[\s:,]*)\s*/i,
  /^(the\s+unsolved\s+nature\s+of[\s:,]*)\s*/i,
  /^(structured\s+reasoning[\s:,]*)\s*/i,
  /^(hinge[\s:,]*)\s*/i,
];

export function deRoboticize(text) {
  if (!text) return text;
  let out = text.trim();

  for (const re of BANNED_OPENERS) {
    out = out.replace(re, "").trim();
  }

  out = out.replace(/\s*\(Source:\s*[^)]+\)/g, "").trim();
  out = out.replace(/\s*\(source:\s*[^)]+\)/g, "").trim();

  if (out && out.length > 0) {
    out = out[0].toUpperCase() + out.slice(1);
  }
  return out;
}
