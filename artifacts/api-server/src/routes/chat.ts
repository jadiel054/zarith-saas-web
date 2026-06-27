import { Router, type Request, type Response } from "express";
import { getBody, required } from "./toolUtils";

const router = Router();
const MAX_AGENT_ITERATIONS = 5;
const OPEN_TOOL_TAG = "<tool_call>";
const CLOSE_TOOL_TAG = "</tool_call>";

type IncomingChatMessage = {
  role?: string;
  content?: unknown;
};

type ConversationMessage = {
  role: string;
  content: string;
};

type ParsedToolCall = {
  tool: string;
  params: Record<string, any>;
};

type StreamAccumulator = {
  fullResponse: string;
  pendingDisplay: string;
  insideToolCall: boolean;
};

type ProviderConfig = {
  providerName: string;
  envNames: string[];
  endpoint: string;
  model: string;
  extraHeaders?: Record<string, string>;
};

const MODEL_CONFIG: Record<string, ProviderConfig> = {
  groq: {
    providerName: "Groq",
    envNames: ["GROQ_API_KEY"],
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
  },
  qwen: {
    providerName: "OpenRouter",
    envNames: ["OPENROUTER_API_KEY"],
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    model: "qwen/qwen2.5-coder-32b-instruct",
  },
  glm: {
    providerName: "Z.ai",
    envNames: ["GLM_API_KEY", "ZHIPU_API_KEY"],
    endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    model: "glm-4-plus",
  },
};

function envToken(envNames: string[]): string {
  for (const envName of envNames) {
    const value = process.env[envName];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

function normalizeMessages(body: Record<string, any>) {
  const history = Array.isArray(body.messages) ? body.messages : [];
  const systemPrompt = typeof body.systemPrompt === "string" ? body.systemPrompt.trim() : "";
  const userMessage = required(body.userMessage, "userMessage");

  const messages = history
    .filter((message: IncomingChatMessage) => typeof message?.role === "string")
    .map((message: IncomingChatMessage) => ({
      role: String(message.role),
      content:
        typeof message.content === "string"
          ? message.content
          : Array.isArray(message.content)
            ? message.content.join("\n")
            : String(message.content ?? ""),
    }))
    .filter((message) => message.content.trim().length > 0);

  if (systemPrompt) {
    messages.unshift({ role: "system", content: systemPrompt });
  }

  messages.push({ role: "user", content: userMessage });

  return messages;
}

function ndjson(res: Response, payload: Record<string, unknown>) {
  res.write(`${JSON.stringify(payload)}\n`);
}

function parseToolCalls(text: string) {
  const regex = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g;
  const calls: Array<{ tool: string; params: Record<string, any> }> = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (typeof parsed?.tool === "string" && parsed.tool.trim()) {
        calls.push({
          tool: parsed.tool.trim(),
          params: parsed?.params && typeof parsed.params === "object" ? parsed.params : {},
        });
      }
    } catch {
      // Ignora blocos inválidos sem interromper o fluxo.
    }
  }

  return calls;
}

function formatToolResult(tool: string, result: unknown) {
  let serialized = "";

  try {
    serialized = JSON.stringify(result, null, 2);
  } catch {
    serialized = JSON.stringify({ error: "resultado não serializável" }, null, 2);
  }

  return `<tool_result tool="${tool}">\n${serialized}\n</tool_result>`;
}

function longestSuffixPrefixLength(text: string, tag: string) {
  const max = Math.min(text.length, tag.length - 1);

  for (let length = max; length > 0; length -= 1) {
    if (text.endsWith(tag.slice(0, length))) {
      return length;
    }
  }

  return 0;
}

function extractDisplayText(chunk: string, state: StreamAccumulator) {
  const input = `${state.pendingDisplay}${chunk}`;
  state.pendingDisplay = "";

  let output = "";
  let cursor = 0;

  while (cursor < input.length) {
    if (state.insideToolCall) {
      const closeIndex = input.indexOf(CLOSE_TOOL_TAG, cursor);

      if (closeIndex === -1) {
        state.pendingDisplay = input.slice(cursor);
        return output;
      }

      cursor = closeIndex + CLOSE_TOOL_TAG.length;
      state.insideToolCall = false;
      continue;
    }

    const openIndex = input.indexOf(OPEN_TOOL_TAG, cursor);

    if (openIndex === -1) {
      const remaining = input.slice(cursor);
      const partialLength = longestSuffixPrefixLength(remaining, OPEN_TOOL_TAG);
      output += remaining.slice(0, remaining.length - partialLength);
      state.pendingDisplay = remaining.slice(remaining.length - partialLength);
      return output;
    }

    output += input.slice(cursor, openIndex);
    cursor = openIndex + OPEN_TOOL_TAG.length;
    state.insideToolCall = true;
  }

  return output;
}

function flushPendingDisplay(state: StreamAccumulator) {
  if (state.insideToolCall) {
    state.pendingDisplay = "";
    return "";
  }

  const partialLength = longestSuffixPrefixLength(state.pendingDisplay, OPEN_TOOL_TAG);
  const output = state.pendingDisplay.slice(0, state.pendingDisplay.length - partialLength);
  state.pendingDisplay = "";
  return output;
}

function extractProviderError(status: number, text: string) {
  try {
    const data = text ? JSON.parse(text) : null;
    const message = data?.error?.message || data?.message || data?.error || text;
    return Object.assign(new Error(message || `Provider retornou HTTP ${status}`), { statusCode: status });
  } catch {
    return Object.assign(new Error(text || `Provider retornou HTTP ${status}`), { statusCode: status });
  }
}

function extractProviderChunk(parsed: any) {
  const choice = parsed?.choices?.[0];
  const delta = choice?.delta || {};
  const text =
    typeof delta.content === "string"
      ? delta.content
      : typeof choice?.message?.content === "string"
        ? choice.message.content
        : "";
  const thinking =
    typeof delta.reasoning_content === "string"
      ? delta.reasoning_content
      : typeof delta.reasoning === "string"
        ? delta.reasoning
        : typeof choice?.message?.reasoning_content === "string"
          ? choice.message.reasoning_content
          : "";

  return { text, thinking };
}

function emitProviderChunk(parsed: any, res: Response, state: StreamAccumulator) {
  const { text, thinking } = extractProviderChunk(parsed);

  if (thinking) {
    ndjson(res, { type: "thinking", content: thinking });
  }

  if (text) {
    state.fullResponse += text;
    const displayText = extractDisplayText(text, state);
    if (displayText) {
      ndjson(res, { type: "text", content: displayText });
    }
  }
}

async function pipeProviderStream(response: globalThis.Response, res: Response) {
  const reader = response.body?.getReader();

  if (!reader) {
    throw Object.assign(new Error("Provider não retornou stream legível."), { statusCode: 502 });
  }

  const decoder = new TextDecoder();
  let buffer = "";
  const state: StreamAccumulator = {
    fullResponse: "",
    pendingDisplay: "",
    insideToolCall: false,
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || !line.startsWith("data:")) continue;

      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;

      try {
        emitProviderChunk(JSON.parse(data), res, state);
      } catch {
        // Ignora linhas inválidas para não interromper o stream.
      }
    }
  }

  if (buffer.trim().startsWith("data:")) {
    const data = buffer.trim().slice(5).trim();
    if (data && data !== "[DONE]") {
      try {
        emitProviderChunk(JSON.parse(data), res, state);
      } catch {
        // Ignora fragmento final inválido para preservar o stream do chat.
      }
    }
  }

  const trailingDisplay = flushPendingDisplay(state);
  if (trailingDisplay) {
    ndjson(res, { type: "text", content: trailingDisplay });
  }

  return state.fullResponse;
}

function resolveToolEndpoint(toolCall: ParsedToolCall) {
  const defaultParams = toolCall.params && typeof toolCall.params === "object" ? toolCall.params : {};

  const directMap: Record<string, { endpoint: string; params?: Record<string, any> }> = {
    "github/list-repos": { endpoint: "/api/github/list-repos" },
    "github/get-file": { endpoint: "/api/github/get-file" },
    "github/get-tree": { endpoint: "/api/github/get-tree" },
    "github/create-commit": { endpoint: "/api/github/create-commit" },
    "github/create-file": { endpoint: "/api/github/create-file" },
    "github/search-code": { endpoint: "/api/github/search-code" },
    "vercel/list-projects": { endpoint: "/api/vercel/list-projects" },
    "supabase/list-tables": { endpoint: "/api/supabase/list-tables" },
    "supabase/execute-sql": { endpoint: "/api/supabase/execute-sql" },
    "web/search": { endpoint: "/api/web/search" },
    "web/fetch-url": { endpoint: "/api/web/fetch-url" },
  };

  if (toolCall.tool === "vercel/get-logs") {
    return {
      endpoint: defaultParams.runtime ? "/api/vercel/get-runtime-logs" : "/api/vercel/get-build-logs",
      params: defaultParams,
    };
  }

  if (toolCall.tool === "vercel/get-env") {
    return {
      endpoint: "/api/vercel/get-env-vars",
      params: defaultParams,
    };
  }

  if (toolCall.tool === "vision/analyze") {
    if (typeof defaultParams.url === "string" && defaultParams.url.trim()) {
      return {
        endpoint: "/api/vision/analyze-url",
        params: defaultParams,
      };
    }

    const mimeType = String(defaultParams.mimeType || defaultParams.mime || "");
    const hasDocument = typeof defaultParams.document === "string" || mimeType.includes("pdf");

    return {
      endpoint: hasDocument ? "/api/vision/analyze-document" : "/api/vision/analyze-image",
      params: defaultParams,
    };
  }

  return directMap[toolCall.tool]
    ? { endpoint: directMap[toolCall.tool].endpoint, params: directMap[toolCall.tool].params || defaultParams }
    : null;
}

async function executeToolInternal(toolCall: ParsedToolCall, port: number) {
  const resolved = resolveToolEndpoint(toolCall);

  if (!resolved) {
    return { error: `tool não reconhecida: ${toolCall.tool}` };
  }

  const response = await fetch(`http://localhost:${port}${resolved.endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(resolved.params || {}),
  });

  const rawText = await response.text();
  let payload: unknown = rawText;

  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = rawText;
  }

  if (!response.ok) {
    const errorMessage =
      typeof payload === "object" && payload !== null
        ? (payload as Record<string, any>).message || (payload as Record<string, any>).error || `Falha HTTP ${response.status}`
        : rawText || `Falha HTTP ${response.status}`;

    throw Object.assign(new Error(String(errorMessage)), {
      statusCode: response.status,
      payload,
    });
  }

  return payload;
}

router.post("/", async (req: Request, res: Response) => {
  try {
    const body = getBody(req);
    const selectedModel = typeof body.selectedModel === "string" ? body.selectedModel.trim().toLowerCase() : "groq";
    const config = MODEL_CONFIG[selectedModel] || MODEL_CONFIG.groq;
    const token = envToken(config.envNames);

    if (!token) {
      throw Object.assign(
        new Error(`Token da ${config.providerName} não configurado (${config.envNames.join(" ou ")}).`),
        { statusCode: 401 },
      );
    }

    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    const port = Number(process.env.PORT || 10000);
    const conversationMessages: ConversationMessage[] = normalizeMessages(body);

    let hitIterationLimit = false;

    for (let iteration = 0; iteration < MAX_AGENT_ITERATIONS; iteration += 1) {
      const providerResponse = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...config.extraHeaders,
        },
        body: JSON.stringify({
          model: config.model,
          messages: conversationMessages,
          stream: true,
        }),
      });

      if (!providerResponse.ok) {
        const errorText = await providerResponse.text();
        throw extractProviderError(providerResponse.status, errorText);
      }

      const fullResponse = await pipeProviderStream(providerResponse, res);
      const toolCalls = parseToolCalls(fullResponse);

      if (toolCalls.length === 0) {
        break;
      }

      conversationMessages.push({ role: "assistant", content: fullResponse });

      for (const [index, toolCall] of toolCalls.entries()) {
        const toolCallId = `tool-${Date.now()}-${iteration}-${index}`;
        const baseToolCall = {
          id: toolCallId,
          name: toolCall.tool,
          args: toolCall.params,
        };

        ndjson(res, {
          type: "tool_call",
          toolCall: {
            ...baseToolCall,
            status: "calling",
          },
        });

        try {
          const result = await executeToolInternal(toolCall, port);
          const looksLikeErrorResult =
            typeof result === "object" &&
            result !== null &&
            "error" in result &&
            (!("success" in result) || (result as Record<string, any>).success !== true);

          if (looksLikeErrorResult) {
            ndjson(res, {
              type: "tool_call",
              toolCall: {
                ...baseToolCall,
                status: "error",
                result,
              },
            });

            conversationMessages.push({
              role: "user",
              content: formatToolResult(toolCall.tool, result),
            });

            continue;
          }

          ndjson(res, {
            type: "tool_call",
            toolCall: {
              ...baseToolCall,
              status: "success",
              result,
            },
          });

          conversationMessages.push({
            role: "user",
            content: formatToolResult(toolCall.tool, result),
          });
        } catch (toolError: any) {
          const result = {
            error: toolError?.message || `Falha ao executar ${toolCall.tool}.`,
            status: Number(toolError?.statusCode || toolError?.status || 500),
            data: toolError?.payload,
          };

          ndjson(res, {
            type: "tool_call",
            toolCall: {
              ...baseToolCall,
              status: "error",
              result,
            },
          });

          conversationMessages.push({
            role: "user",
            content: formatToolResult(toolCall.tool, result),
          });
        }
      }

      if (iteration === MAX_AGENT_ITERATIONS - 1) {
        hitIterationLimit = true;
      }
    }

    if (hitIterationLimit) {
      ndjson(res, {
        type: "text",
        content: "\n\n[Limite de iterações atingido. Resumindo o que foi executado até aqui.]",
      });
    }

    return res.end();
  } catch (error: any) {
    const status = Number(error?.statusCode || error?.status || 500);
    const message = error?.message || "Falha ao processar o chat.";

    if (!res.headersSent) {
      return res.status(status).json({
        success: false,
        error: message,
        message,
        status,
      });
    }

    ndjson(res, { type: "text", content: `\n[Erro] ${message}` });
    return res.end();
  }
});

export default router;
