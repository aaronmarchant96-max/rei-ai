# REI.ai OpenAI-Compatible Proxy Quickstart

The REI.ai proxy is a drop-in replacement for OpenAI's `https://api.openai.com/v1/chat/completions` endpoint. It sits in front of your LLM calls and executes deterministic, cost-aware routing (CARDO Night Shift Router) before token spend.

---

## 1. Fast cURL Check (5 Seconds)

```bash
curl https://prompthound-labs.vercel.app/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $REI_API_KEY" \
  -d '{
    "model": "rei-auto",
    "messages": [
      {"role": "user", "content": "Explain the difference between SQL and NoSQL in 2 sentences."}
    ]
  }'
```

**Response includes OpenAI-compatible completion plus cost savings headers:**
```json
{
  "id": "chatcmpl-1724210000000",
  "object": "chat.completion",
  "created": 1724210000,
  "model": "deepseek-chat",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "SQL databases are relational, table-based systems that use structured query language and strict schemas. NoSQL databases are non-relational, document or key-value stores designed for flexible, unstructured data and horizontal scaling."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 28,
    "completion_tokens": 42,
    "total_tokens": 70
  },
  "rei": {
    "routed": true,
    "pathway": "structured-reasoning",
    "savings": "95.4%",
    "model_selected": "deepseek-chat"
  }
}
```

---

## 2. Python SDK (Official `openai` package)

Install the official OpenAI package if you haven't already:
```bash
pip install openai
```

### Non-Streaming Example:
```python
import os
from openai import OpenAI

client = OpenAI(
    base_url="https://prompthound-labs.vercel.app/api/v1",
    api_key=os.environ.get("REI_API_KEY", "your-rei-api-key"),
)

response = client.chat.completions.create(
    model="rei-auto",  # Use "rei-auto" for automatic CARDO cost routing
    messages=[
        {"role": "system", "content": "You are an expert software engineer."},
        {"role": "user", "content": "Write a Python function to check if a number is prime."},
    ],
    temperature=0.2,
)

print(response.choices[0].message.content)
```

### Streaming Example (`stream=True`):
```python
import os
from openai import OpenAI

client = OpenAI(
    base_url="https://prompthound-labs.vercel.app/api/v1",
    api_key=os.environ.get("REI_API_KEY", "your-rei-api-key"),
)

stream = client.chat.completions.create(
    model="rei-auto",
    messages=[
        {"role": "user", "content": "Outline a 3-act story about an autonomous satellite."},
    ],
    stream=True,
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
print()
```

---

## 3. Node.js / TypeScript SDK (Official `openai` package)

Install the official OpenAI package:
```bash
npm install openai
```

### Non-Streaming Example:
```typescript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://prompthound-labs.vercel.app/api/v1",
  apiKey: process.env.REI_API_KEY || "your-rei-api-key",
});

async function main() {
  const completion = await client.chat.completions.create({
    model: "rei-auto",
    messages: [
      { role: "system", content: "You are a concise engineering assistant." },
      { role: "user", content: "How do I debounce an input in React?" },
    ],
  });

  console.log(completion.choices[0].message.content);
}

main();
```

### Streaming Example (`stream: true`):
```typescript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://prompthound-labs.vercel.app/api/v1",
  apiKey: process.env.REI_API_KEY || "your-rei-api-key",
});

async function main() {
  const stream = await client.chat.completions.create({
    model: "rei-auto",
    messages: [
      { role: "user", content: "Explain vector embeddings simply." },
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }
  console.log();
}

main();
```

---

## 4. Cursor / Cline / LangChain Setup

- **OpenAI Base URL**: `https://prompthound-labs.vercel.app/api/v1`
- **API Key**: `$REI_API_KEY`
- **Model Name**: `rei-auto` (or explicit models like `deepseek-chat`, `llama-3.3-70b-versatile`, `gemini-3.6-flash`)

---

## 5. Standard Error Handling

All errors adhere to OpenAI's structured error envelope:

```json
{
  "error": {
    "message": "Invalid or missing API key. Use Authorization: Bearer <key>",
    "type": "authentication_error",
    "param": null,
    "code": "CF_AUTH_REQUIRED"
  }
}
```

| HTTP Status | Error Type | Description |
| :--- | :--- | :--- |
| `401` | `authentication_error` | Missing or invalid `Authorization: Bearer <key>` |
| `400` | `invalid_request_error` | Missing messages array or malformed body |
| `402` | `budget_exceeded_error` | Query projected to exceed configured `MAX_COST_PER_QUERY` |
| `405` | `invalid_request_error` | Non-POST HTTP method |
| `503` | `rate_limit_error` / `server_error` | Upstream provider outage / fallback recovery |
| `500` | `server_error` | Internal execution exception |

---

## 6. Zero-Retention Privacy Invariant

- By default, **no raw prompt content is persisted** to KV or external logs.
- The proxy computes SHA-256 message hashes for routing analytics and cache verification without retaining customer plaintext.
