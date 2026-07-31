import { useState, useEffect } from "react";

function useMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 720);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

function titleCase(value) {
  if (!value) return "";
  if (["yes", "no"].includes(value.toLowerCase().trim())) return value.trim().toUpperCase();
  return value
    .trim()
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function cleanQuestion(q) {
  return q.trim().replace(/\s+/g, " ");
}

function toBase64Url(value) {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk)
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function makeSharePayload(question, sideA, sideB, intensity, debate) {
  return { v: 1, question, sideA, sideB, intensity, debate };
}

function buildShareLink(payload) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}#d=${toBase64Url(payload)}`;
}

function summarizeAiFailure(error) {
  const message = String(error?.message || "").toLowerCase();

  if (message.includes("missing gemini_api_key")) {
    return "AI generation was unavailable because GEMINI_API_KEY is not configured.";
  }

  if (message.includes("404")) {
    return "AI generation was unavailable because the /api/debate route was not found. Local vite dev does not serve the API route by itself.";
  }

  if (message.includes("failed to fetch")) {
    return "AI generation was unavailable because the debate API request failed before it reached Gemini.";
  }

  if (message.includes("403")) {
    return "AI generation was unavailable because Gemini rejected the request. Check the API key and deployment configuration.";
  }

  if (message.includes("429")) {
    return "AI generation was unavailable because Gemini rate-limited the request.";
  }

  if (message.includes("500")) {
    return "AI generation was unavailable because the debate API returned a server error.";
  }

  return "AI generation was unavailable, so The Furnace used its local fallback.";
}

function safelyReplaceUrl(url) {
  if (typeof window === "undefined" || !url) return;
  try {
    window.history.replaceState({}, "", url);
  } catch {
    window.history.replaceState({}, "", window.location.pathname);
  }
}
export { useMobile, titleCase, cleanQuestion, toBase64Url, fromBase64Url, makeSharePayload, buildShareLink, summarizeAiFailure, safelyReplaceUrl };
