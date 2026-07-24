// REI.ai OpenAI-compatible Chat Completions proxy
// Implements /api/v1/chat/completions route for Vercel serverless deployment.
// It routes the request through REI's routing engine and returns a response
// compatible with the OpenAI Chat Completions schema. Additionally it sets
// two custom headers:
//   X-REI-Pathway – the selected routing pathway (cheap, medium, premium, etc.)
//   X-REI-Savings – percentage cost saved compared to the most expensive
//                   model in the catalog, based on the routing decision.

import 'dotenv/config';
import { handleCfaiRequest } from '../cfai.js'; // Re‑use the core request handler

/**
 * Helper: compute savings percentage between the premium cost and the selected
 * cost. Returns a string like "23.45%" or "0%" if data is missing.
 */
function computeSavings(estimatedCost, premiumCost) {
  if (typeof estimatedCost !== 'number' || typeof premiumCost !== 'number' || premiumCost === 0) {
    return '0%';
  }
  const saved = premiumCost - estimatedCost;
  const pct = (saved / premiumCost) * 100;
  return `${pct.toFixed(2)}%`;
}

export default async function handler(req, res) {
  try {
    // Ensure JSON response
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Method Not Allowed' });
      return;
    }

    const { model, messages, temperature, max_tokens, stream, ...rest } = req.body || {};

    // Basic validation – OpenAI expects a non‑empty messages array
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ success: false, error: 'Invalid request: "messages" field is required and must be a non‑empty array.' });
      return;
    }

    // Build a simple prompt from the messages – system messages first, then user.
    const systemPrompt = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n');
    const userPrompt = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => m.content)
      .join('\n');

    // Use the shared request handler. The "chat" command triggers the normal
    // routing pipeline. We forward the combined prompt as input.
    const result = await handleCfaiRequest('chat', [], userPrompt, systemPrompt, messages, null, null, null, null, null);

    // Attach custom REI headers if routing info is present.
    if (result.routerDecision) {
      const pathway = result.routerDecision.pathway || 'unknown';
      const savings = computeSavings(result.routerDecision.estimatedCost, result.routerDecision.premiumCost);
      res.setHeader('X-REI-Pathway', pathway);
      res.setHeader('X-REI-Savings', savings);
    }

    // Shape response to OpenAI format – keep it simple.
    if (result.success) {
      const reply = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: result.model || model || 'unknown',
        usage: result.usage || undefined,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: result.result,
            },
            finish_reason: 'stop',
          },
        ],
      };
      res.status(200).json(reply);
    } else {
      res.status(500).json({ success: false, error: result.error || 'Internal routing error' });
    }
  } catch (error) {
    console.error('Chat completions handler error:', error);
    res.status(500).json({ success: false, error: 'Server error', details: error.message });
  }
}
