// CFai API Route for Vercel Deployment
// Handles web requests and calls the CFai CLI tool

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CFAI_PATH = process.env.CFAI_PATH || '/home/potatoking/.local/bin/cfai';

async function handleCfaiRequest(command, args = [], input = '') {
  try {
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
    return {
      success: false,
      error: error.message,
      command: `${CFAI_PATH} ${command} ${args.join(' ')}`,
      timestamp: new Date().toISOString()
    };
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const command = searchParams.get('command') || 'help';
  const args = searchParams.get('args') ? searchParams.get('args').split(',') : [];
  
  const result = await handleCfaiRequest(command, args);
  
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
    status: result.success ? 200 : 500
  });
}

export async function POST(request) {
  try {
    const { command, args = [], input = '' } = await request.json();
    
    const result = await handleCfaiRequest(command, args, input);
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: result.success ? 200 : 500
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid request format',
      details: error.message
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400
    });
  }
}