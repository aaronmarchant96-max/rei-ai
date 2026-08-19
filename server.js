import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
dotenv.config({ path: "./.env.local", override: true });
process.env.REI_API_KEY = process.env.REI_API_KEY || "local-dev-key";
import express from "express";
import cfaiHandler from "./api/cfai.js";
import evalResultHandler from "./api/eval/result.js";
import evalStatusHandler from "./api/eval/status.js";
import chatCompletionsHandler from "./api/v1/chat/completions.js";
import modelsHandler from "./api/v1/models.js";
import healthHandler from "./api/health.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));

// Enable CORS for local tools, IDE extensions, and CLIs
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Session-Id, x-rei-route, x-rei-savings-derived");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// ── Standard OpenAI-Compatible Proxy Routes ──
const handleChatCompletions = async (req, res) => {
  try {
    const mockRes = {
      setHeader: (name, value) => res.setHeader(name, value),
      status: (code) => {
        res.status(code);
        return mockRes;
      },
      json: (data) => {
        res.json(data);
        return mockRes;
      }
    };
    await chatCompletionsHandler(req, mockRes);
  } catch (error) {
    console.error("OpenAI Proxy Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: { code: "CF_INTERNAL_ERROR", message: error.message } });
    }
  }
};

const handleModels = async (req, res) => {
  try {
    await modelsHandler(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: { code: "CF_INTERNAL_ERROR", message: error.message } });
    }
  }
};

const handleHealth = async (req, res) => {
  try {
    await healthHandler(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }
};

// Mount both standard /v1 and /api/v1 prefixes
app.post("/v1/chat/completions", handleChatCompletions);
app.post("/api/v1/chat/completions", handleChatCompletions);
app.get("/v1/models", handleModels);
app.get("/api/v1/models", handleModels);

// Mount health checks
app.get("/health", handleHealth);
app.get("/api/health", handleHealth);

// ── Native REI.ai Endpoints ──
app.post("/api/cfai", async (req, res) => {
  try {
    const mockRes = {
      setHeader: (name, value) => res.setHeader(name, value),
      status: (code) => {
        res.status(code);
        return mockRes;
      },
      json: (data) => {
        res.json(data);
        return mockRes;
      }
    };
    await cfaiHandler(req, mockRes);
  } catch (error) {
    console.error("API Error Stack Trace:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

app.post("/api/eval/result", async (req, res) => {
  try {
    await evalResultHandler(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

app.get("/api/eval/status", async (req, res) => {
  try {
    await evalStatusHandler(req, res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 REI.ai Cognitive Proxy running on http://localhost:${PORT}`);
  console.log(`   - OpenAI Base URL: http://localhost:${PORT}/v1`);
  console.log(`   - Available Models: http://localhost:${PORT}/v1/models`);
  console.log(`   - Native Endpoint: http://localhost:${PORT}/api/cfai\n`);
});