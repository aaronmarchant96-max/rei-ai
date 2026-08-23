import { validateGameDefinition } from "./gameDefinition";
import type { StrategicSituation } from "./strategicTypes";

const OPEN_TAG = "<rei-strategic-envelope>";
const CLOSE_TAG = "</rei-strategic-envelope>";
const MAX_ENVELOPE_BYTES = 16_384;
const MAX_DEPTH = 8;
const MAX_ARRAY_LENGTH = 50;
const MAX_STRING_LENGTH = 4_000;

export interface StrategicEnvelopeResult {
  visibleText: string;
  strategicSituation: StrategicSituation | null;
  status: "absent" | "accepted" | "rejected";
  rejectionReason?: string;
}

function protectedRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const pattern of [/```[\s\S]*?(?:```|$)/g, /`[^`\n]*`/g]) {
    for (const match of text.matchAll(pattern)) {
      ranges.push([match.index || 0, (match.index || 0) + match[0].length]);
    }
  }
  return ranges;
}

function isProtected(text: string, index: number, ranges: Array<[number, number]>): boolean {
  if (ranges.some(([start, end]) => index >= start && index < end)) return true;
  const lineStart = text.lastIndexOf("\n", index - 1) + 1;
  return text.slice(lineStart, index).trimStart().startsWith(">");
}

function unprotectedTagIndexes(text: string, tag: string, ranges: Array<[number, number]>): number[] {
  const indexes: number[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const index = text.indexOf(tag, cursor);
    if (index < 0) break;
    if (!isProtected(text, index, ranges)) indexes.push(index);
    cursor = index + tag.length;
  }
  return indexes;
}

function validateBounds(value: unknown, depth = 0): string | null {
  if (depth > MAX_DEPTH) return "maximum object depth exceeded";
  if (typeof value === "string" && value.length > MAX_STRING_LENGTH) return "maximum string length exceeded";
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_LENGTH) return "maximum array length exceeded";
    for (const item of value) {
      const error = validateBounds(item, depth + 1);
      if (error) return error;
    }
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      const error = validateBounds(item, depth + 1);
      if (error) return error;
    }
  }
  return null;
}

function rejected(raw: string, reason: string): StrategicEnvelopeResult {
  return { visibleText: raw.trim(), strategicSituation: null, status: "rejected", rejectionReason: reason };
}

export function extractStrategicEnvelope(rawInput: string): StrategicEnvelopeResult {
  const raw = String(rawInput || "");
  const ranges = protectedRanges(raw);
  const opens = unprotectedTagIndexes(raw, OPEN_TAG, ranges);
  const closes = unprotectedTagIndexes(raw, CLOSE_TAG, ranges);
  const containsAnyTag = raw.includes(OPEN_TAG) || raw.includes(CLOSE_TAG);
  if (opens.length === 0 && closes.length === 0) {
    return containsAnyTag ? rejected(raw, "envelope is embedded in protected content") : {
      visibleText: raw,
      strategicSituation: null,
      status: "absent",
    };
  }
  if (opens.length !== 1 || closes.length !== 1 || closes[0] < opens[0]) return rejected(raw, "exactly one envelope is required");
  if (raw.slice(closes[0] + CLOSE_TAG.length).trim()) return rejected(raw, "envelope must be trailing");

  const jsonText = raw.slice(opens[0] + OPEN_TAG.length, closes[0]).trim();
  if (new TextEncoder().encode(jsonText).length > MAX_ENVELOPE_BYTES) return rejected(raw, "maximum envelope size exceeded");
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return rejected(raw, "envelope JSON is malformed");
  }
  const boundsError = validateBounds(parsed);
  if (boundsError) return rejected(raw, boundsError);
  const validation = validateGameDefinition(parsed);
  if (!validation.valid || !validation.value) return rejected(raw, validation.errors.join("; "));
  return {
    visibleText: raw.slice(0, opens[0]).trimEnd(),
    strategicSituation: validation.value,
    status: "accepted",
  };
}
