/**
 * @file toolParser.ts
 * @description Schema-validated tool call and thinking-tag extraction engine.
 * Eliminates brittle regex and silent failures by strictly validating tool payloads.
 */

export interface ValidatedToolFunction {
  name: "web_search" | "fetch_url";
  arguments: string;
}

export interface ValidatedToolCall {
  id: string;
  type: "function";
  function: ValidatedToolFunction;
  parsedArgs: Record<string, any>;
}

export interface ToolParseResult {
  cleanContent: string;
  thinking: string | null;
  validToolCalls: ValidatedToolCall[];
  validationErrors: string[];
}

export function isPrivateHostname(hostname: string): boolean {
  if (!hostname) return true;
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return true;
  if (h === "0.0.0.0" || h === "::1" || /^fc00:/i.test(h)) return true;
  return false;
}

/**
 * Cleanly extract <think>...</think> reasoning traces from model output,
 * handling closed tags, unclosed trailing tags, and multi-block thinking.
 */
export function extractThinkingAndContent(text: string): { cleanContent: string; thinking: string | null } {
  if (!text) return { cleanContent: "", thinking: null };

  const thinkBlocks: string[] = [];
  let remaining = text;

  // 1. Match closed <think>...</think> blocks
  const closedThinkRegex = /<think>([\s\S]*?)<\/think>/gi;
  let match;
  while ((match = closedThinkRegex.exec(text)) !== null) {
    if (match[1]?.trim()) {
      thinkBlocks.push(match[1].trim());
    }
  }
  remaining = remaining.replace(closedThinkRegex, "").trim();

  // 2. Match unclosed trailing <think>... (e.g. truncated token generation)
  const unclosedMatch = remaining.match(/<think>([\s\S]*)$/i);
  if (unclosedMatch) {
    if (unclosedMatch[1]?.trim()) {
      thinkBlocks.push(unclosedMatch[1].trim());
    }
    remaining = remaining.replace(/<think>[\s\S]*$/i, "").trim();
  }

  // 3. Remove standalone orphaned </think> tags
  remaining = remaining.replace(/<\/think>/gi, "").trim();

  return {
    cleanContent: remaining,
    thinking: thinkBlocks.length > 0 ? thinkBlocks.join("\n\n---\n\n") : null,
  };
}

/**
 * Validate parsed arguments against strict tool schemas.
 */
export function validateToolArguments(
  toolName: string,
  rawArgs: unknown
): { valid: boolean; error?: string; cleanArgs?: Record<string, any> } {
  if (!rawArgs || typeof rawArgs !== "object") {
    return { valid: false, error: `Invalid arguments for tool '${toolName}': expected a JSON object.` };
  }

  const args = rawArgs as Record<string, any>;

  if (toolName === "web_search") {
    if (typeof args.query !== "string" || !args.query.trim()) {
      return { valid: false, error: "Validation failed for 'web_search': 'query' must be a non-empty string." };
    }
    const num_results = typeof args.num_results === "number" && args.num_results > 0 ? Math.min(args.num_results, 5) : 3;
    return {
      valid: true,
      cleanArgs: {
        query: args.query.trim(),
        num_results,
      },
    };
  }

  if (toolName === "fetch_url") {
    if (typeof args.url !== "string" || !args.url.trim()) {
      return { valid: false, error: "Validation failed for 'fetch_url': 'url' must be a non-empty string." };
    }
    try {
      const parsedUrl = new URL(args.url.trim());
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return { valid: false, error: "Validation failed for 'fetch_url': protocol must be http or https." };
      }
      if (isPrivateHostname(parsedUrl.hostname)) {
        return { valid: false, error: "Validation failed for 'fetch_url': access to local/private IP addresses is blocked." };
      }
      return {
        valid: true,
        cleanArgs: {
          url: parsedUrl.href,
        },
      };
    } catch {
      return { valid: false, error: `Validation failed for 'fetch_url': '${args.url}' is not a valid URL.` };
    }
  }

  return { valid: false, error: `Unknown or unsupported tool: '${toolName}'. Supported tools: web_search, fetch_url.` };
}

/**
 * Parse and schema-validate tool calls from raw model response or native tool_calls array.
 */
export function parseToolCalls(result: { content?: string; tool_calls?: any[] } | null): ToolParseResult {
  if (!result) {
    return { cleanContent: "", thinking: null, validToolCalls: [], validationErrors: [] };
  }

  const rawContent = result.content || "";
  const { cleanContent: contentWithoutThinking, thinking } = extractThinkingAndContent(rawContent);

  const validToolCalls: ValidatedToolCall[] = [];
  const validationErrors: string[] = [];

  // 1. Native OpenAI tool_calls structure
  if (Array.isArray(result.tool_calls) && result.tool_calls.length > 0) {
    for (const tc of result.tool_calls) {
      const fnName = tc.function?.name || "";
      let rawArgs: any = tc.function?.arguments;
      if (typeof rawArgs === "string") {
        try {
          rawArgs = JSON.parse(rawArgs);
        } catch (e: any) {
          validationErrors.push(`Failed to parse JSON arguments for native tool call '${fnName}': ${e.message}`);
          continue;
        }
      }

      const validation = validateToolArguments(fnName, rawArgs);
      if (validation.valid && validation.cleanArgs) {
        validToolCalls.push({
          id: tc.id || `call_${Date.now()}_${validToolCalls.length}`,
          type: "function",
          function: {
            name: fnName as any,
            arguments: JSON.stringify(validation.cleanArgs),
          },
          parsedArgs: validation.cleanArgs,
        });
      } else if (validation.error) {
        validationErrors.push(validation.error);
      }
    }

    return {
      cleanContent: contentWithoutThinking,
      thinking,
      validToolCalls,
      validationErrors,
    };
  }

  // 2. Structured JSON <tool_call>...</tool_call> tags
  let workingContent = contentWithoutThinking;
  const toolCallTagRegex = /<tool_call>([\s\S]*?)<\/tool_call>/gi;
  let match;
  while ((match = toolCallTagRegex.exec(contentWithoutThinking)) !== null) {
    const rawTag = match[1].trim();
    try {
      const parsed = JSON.parse(rawTag);
      const fnName = parsed.name || parsed.tool;
      const rawArgs = parsed.arguments || parsed.parameters || parsed.args || parsed;

      const validation = validateToolArguments(fnName, rawArgs);
      if (validation.valid && validation.cleanArgs) {
        validToolCalls.push({
          id: `call_${Date.now()}_${validToolCalls.length}`,
          type: "function",
          function: {
            name: fnName as any,
            arguments: JSON.stringify(validation.cleanArgs),
          },
          parsedArgs: validation.cleanArgs,
        });
      } else if (validation.error) {
        validationErrors.push(validation.error);
      }
    } catch (e: any) {
      validationErrors.push(`Malformed JSON inside <tool_call>: ${e.message}`);
    }
  }

  // 3. XML style <function=NAME><parameter=KEY>VAL</parameter></function>
  const xmlFunctionRegex = /<function=([a-zA-Z0-9_-]+)>([\s\S]*?)<\/function>/gi;
  while ((match = xmlFunctionRegex.exec(contentWithoutThinking)) !== null) {
    const fnName = match[1].trim();
    const inner = match[2].trim();

    let extractedArgs: Record<string, any> = {};
    const paramRegex = /<parameter=([a-zA-Z0-9_-]+)>([\s\S]*?)<\/parameter>/gi;
    let paramMatch;
    let foundParams = false;

    while ((paramMatch = paramRegex.exec(inner)) !== null) {
      foundParams = true;
      let val: any = paramMatch[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      } else if (!isNaN(Number(val))) {
        val = Number(val);
      }
      extractedArgs[paramMatch[1]] = val;
    }

    if (!foundParams) {
      try {
        extractedArgs = JSON.parse(inner);
      } catch {
        extractedArgs = {};
      }
    }

    const validation = validateToolArguments(fnName, extractedArgs);
    if (validation.valid && validation.cleanArgs) {
      validToolCalls.push({
        id: `call_${Date.now()}_${validToolCalls.length}`,
        type: "function",
        function: {
          name: fnName as any,
          arguments: JSON.stringify(validation.cleanArgs),
        },
        parsedArgs: validation.cleanArgs,
      });
    } else if (validation.error) {
      validationErrors.push(validation.error);
    }
  }

  // 4. DSML style <｜｜DSML｜｜invoke name="NAME"><｜｜DSML｜｜parameter name="KEY">VAL</｜｜DSML｜｜parameter></｜｜DSML｜｜invoke>
  const dsmlInvokeRegex = /<[|｜]{2}DSML[|｜]{2}invoke name="([^"]+)">([\s\S]*?)<\/[|｜]{2}DSML[|｜]{2}invoke>/gi;
  while ((match = dsmlInvokeRegex.exec(contentWithoutThinking)) !== null) {
    const fnName = match[1].trim();
    const inner = match[2].trim();

    let extractedArgs: Record<string, any> = {};
    const dsmlParamRegex = /<[|｜]{2}DSML[|｜]{2}parameter name="([^"]+)"(?:\s+string="(?:true|false)")?>([\s\S]*?)<\/[|｜]{2}DSML[|｜]{2}parameter>/gi;
    let paramMatch;
    while ((paramMatch = dsmlParamRegex.exec(inner)) !== null) {
      let val: any = paramMatch[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      } else if (!isNaN(Number(val))) {
        val = Number(val);
      }
      extractedArgs[paramMatch[1]] = val;
    }

    const validation = validateToolArguments(fnName, extractedArgs);
    if (validation.valid && validation.cleanArgs) {
      validToolCalls.push({
        id: `call_${Date.now()}_${validToolCalls.length}`,
        type: "function",
        function: {
          name: fnName as any,
          arguments: JSON.stringify(validation.cleanArgs),
        },
        parsedArgs: validation.cleanArgs,
      });
    } else if (validation.error) {
      validationErrors.push(validation.error);
    }
  }

  // Strip tool envelopes from clean content
  workingContent = workingContent
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, "")
    .replace(/<function=[a-zA-Z0-9_-]+>[\s\S]*?<\/function>/gi, "")
    .replace(/<[|｜]{2}DSML[|｜]{2}tool_calls>[\s\S]*?<\/[|｜]{2}DSML[|｜]{2}tool_calls>/gi, "")
    .replace(/<[|｜]{2}DSML[|｜]{2}invoke name="[^"]+">[\s\S]*?<\/[|｜]{2}DSML[|｜]{2}invoke>/gi, "")
    .trim();

  return {
    cleanContent: workingContent,
    thinking,
    validToolCalls,
    validationErrors,
  };
}
