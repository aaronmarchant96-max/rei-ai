// CFai API Route for Vercel Deployment
// Handles web requests and calls the CFai CLI tool or falls back to direct Groq API requests.

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);
const CFAI_PATH = process.env.CFAI_PATH || '/home/potatoking/.local/bin/cfai';

function selectGroqModel(prompt = '') {
  const len = prompt.length;
  const lower = prompt.toLowerCase();
  
  // Ingest or long input (>6000 chars)
  if (len > 6000 || lower.includes("ingest") || lower.includes("--file")) {
    return "mixtral-8x7b-32768";
  }
  
  // Validate or score (latency optimized)
  if (lower.includes("validate") || lower.includes("score")) {
    return "llama-3.1-8b-instant";
  }
  
  // Discover or search (reasoning/accuracy optimized)
  if (lower.includes("discover") || lower.includes("search")) {
    return "llama-3.3-70b-versatile";
  }
  
  // Length fallback rules
  if (len < 1500) {
    return "llama-3.1-8b-instant";
  }
  
  return "llama-3.3-70b-versatile";
}

async function callGroqDirectly(prompt) {
  const isGptMode = prompt.toLowerCase().includes("proprietary model profiles") || prompt.toLowerCase().includes("gpt mode");
  
  if (isGptMode && process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are REI.AI, an illuminated truth assistant using the CARDO REI evaluation methodology (Collect, Analyze, Record, Distinguish, Organize, Review, Evaluate, Iterate). Present results clearly under evidence tiers."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2048
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          content: data.choices?.[0]?.message?.content || "No content returned from OpenAI.",
          model: "gpt-4o"
        };
      }
    } catch (e) {
      console.warn("OpenAI API routing failed, falling back to Groq:", e);
    }
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured in Vercel environment variables.");
  }

  const selectedModel = selectGroqModel(prompt);

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: [
        {
          role: "system",
          content: "You are REI.AI, an illuminated truth assistant using the CARDO REI evaluation methodology (Collect, Analyze, Record, Distinguish, Organize, Review, Evaluate, Iterate). Present results clearly under evidence tiers."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2048
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API returned status ${response.status}: ${errText}`);
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content || "No content returned from Groq.";
  
  if (isGptMode && !process.env.OPENAI_API_KEY) {
    content = `[REI.AI ROUTING WARNING: OPENAI_API_KEY not found in Vercel. Falling back to Open-Source Router: ${selectedModel}]\n\n${content}`;
  }

  return {
    content: content,
    model: selectedModel
  };
}

async function handleCfaiRequest(command, args = [], input = '') {
  try {
    // Check if CLI binary exists locally. If not, use direct Groq API fetch.
    if (!fs.existsSync(CFAI_PATH)) {
      const directResult = await callGroqDirectly(input || args.join(' '));
      return {
        success: true,
        result: directResult.content,
        model: directResult.model,
        command: "direct_groq_api_fallback",
        timestamp: new Date().toISOString()
      };
    }

    // Build the CFai command
    const cmdArgs = [command, ...args];
    const fullCommand = `${CFAI_PATH} ${cmdArgs.join(' ')}`;
    
    // Set environment variables for Groq
    const env = {
      ...process.env,
      GROQ_API_KEY: process.env.GROQ_API_KEY,
      CFAI_FORCE_REFRESH: '1' // Always fresh results for web
    };
    
    // Execute the command
    const { stdout, stderr } = await execAsync(fullCommand, { env });
    
    if (stderr && !stdout) {
      throw new Error(stderr);
    }
    
    return {
      success: true,
      result: stdout.trim(),
      command: fullCommand,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    // If CLI execution failed but we have GROQ_API_KEY, try direct fetch anyway
    if (process.env.GROQ_API_KEY) {
      try {
        const directResult = await callGroqDirectly(input || args.join(' '));
        return {
          success: true,
          result: directResult.content,
          model: directResult.model,
          command: "direct_groq_api_fallback_after_cli_error",
          timestamp: new Date().toISOString()
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: `CLI failed (${error.message}) & direct Groq API fallback failed (${fallbackError.message})`,
          command: `${CFAI_PATH} ${command} ${args.join(' ')}`,
          timestamp: new Date().toISOString()
        };
      }
    }

    return {
      success: false,
      error: error.message,
      command: `${CFAI_PATH} ${command} ${args.join(' ')}`,
      timestamp: new Date().toISOString()
    };
  }
}

export default async function handler(req, res) {
  try {
    // Set headers
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'POST') {
      const { command, args = [], input = '' } = req.body || {};
      const result = await handleCfaiRequest(command, args, input);
      return res.status(result.success ? 200 : 500).json(result);
    } 
    
    if (req.method === 'GET') {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const command = url.searchParams.get('command') || 'help';
      const argsParam = url.searchParams.get('args');
      const args = argsParam ? argsParam.split(',') : [];
      
      const result = await handleCfaiRequest(command, args);
      return res.status(result.success ? 200 : 500).json(result);
    }

    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Serverless execution error',
      details: error.message
    });
  }
}