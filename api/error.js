export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "GET") {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    var raw = "";
    try {
      if (typeof req.body === "string") {
        raw = req.body;
      } else if (Buffer.isBuffer(req.body)) {
        raw = req.body.toString();
      } else if (req.body && typeof req.body === "object") {
        raw = JSON.stringify(req.body);
      }
    } catch (e) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    var body;
    try {
      body = JSON.parse(raw);
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON" });
    }

    if (!body.message) {
      return res.status(400).json({ error: "Missing required field: message" });
    }

    var entry = {
      timestamp: body.timestamp || new Date().toISOString(),
      message: String(body.message).slice(0, 500),
      stack: String(body.stack || "").slice(0, 2000),
      componentStack: String(body.componentStack || "").slice(0, 2000),
      toolName: String(body.toolName || "unknown").slice(0, 100),
      route: String(body.route || "").slice(0, 200),
      url: String(body.url || "").slice(0, 500),
    };

    console.log("[REI error]", JSON.stringify(entry));
    return res.status(200).json({ logged: true });
  } catch (err) {
    console.error("[REI error endpoint failure]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
