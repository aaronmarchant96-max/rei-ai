import 'dotenv/config';
import express from 'express';
import cfaiHandler from './api/cfai.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API endpoint
app.post('/api/cfai', async (req, res) => {
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
    console.error('API Error Stack Trace:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
  console.log(`Try: curl -X POST http://localhost:${PORT}/api/cfai -H "Content-Type: application/json" -d '{"command":"help"}'`);
});