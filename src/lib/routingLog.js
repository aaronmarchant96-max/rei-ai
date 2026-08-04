const STORAGE_KEY = "rei_routing_log";
const MAX_ENTRIES = 500;

export function logRoutingDecision(entry) {
  if (typeof window === "undefined") return;
  try {
    const logs = getLogs();
    logs.unshift({
      timestamp: new Date().toISOString(),
      ...entry,
    });
    if (logs.length > MAX_ENTRIES) {
      logs.length = MAX_ENTRIES;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.warn("Unable to persist routing log:", e);
  }
}

export function getLogs() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearLogs() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
