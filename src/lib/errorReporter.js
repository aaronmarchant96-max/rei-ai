var reported = new Set();

export function reportError(error, info) {
  if (typeof window === "undefined") return;
  var key = (error?.message || "unknown") + "|" + (info?.toolName || "");
  if (reported.has(key)) return;
  reported.add(key);

  var payload = {
    message: error?.message || "Unknown error",
    stack: typeof error?.stack === "string" ? error.stack.slice(0, 2000) : "",
    componentStack: typeof info?.componentStack === "string" ? info.componentStack.slice(0, 2000) : "",
    toolName: info?.toolName || "global",
    route: window.location.hash || "/",
    url: window.location.href,
    userAgent: navigator.userAgent || "",
    timestamp: new Date().toISOString(),
  };

  try {
    window.fetch("/api/error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(function () {});
    console.error("[REI error]", error?.message || "Unknown");
  } catch (e) {}
}

export function initGlobalErrorHandlers() {
  if (typeof window === "undefined") return;

  window.addEventListener("error", function (event) {
    if (event.error) {
      reportError(event.error, { toolName: "global" });
    }
  });

  window.addEventListener("unhandledrejection", function (event) {
    reportError(event.reason || new Error("Unhandled rejection"), { toolName: "global" });
  });
}
