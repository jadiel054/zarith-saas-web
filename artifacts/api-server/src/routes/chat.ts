import { Router, type Request, type Response } from "express";
import { getBody, required } from "./toolUtils";

const router = Router();

type IncomingChatMessage = {
  role?: string;
  content?: unknown;
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

function extractProviderError(status: number, text: string) {
  try {
    const data = text ? JSON.parse(text) : null;
    const message = data?.error?.message || data?.message || data?.error || text;
    return Object.assign(new Error(message || `Provider retornou HTTP ${status}`), { statusCode: status });
  } catch {
    return Object.assign(new Error(text || `Provider retornou HTTP ${status}`), { statusCode: status });
  }
}

async function pipeProviderStream(response: globalThis.Response, res: Response) {
  const reader = response.body?.getReader();

  if (!reader) {
    throw Object.assign(new Error("Provider não retornou stream legível."), { statusCode: 502 });
  }

  const decoder = new TextDecoder();
  let buffer = "";

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

      let parsed: any;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }

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

      if (thinking) ndjson(res, { type: "thinking", content: thinking });
      if (text) ndjson(res, { type: "text", content: text });
    }
  }

  if (buffer.trim().startsWith("data:")) {
    const data = buffer.trim().slice(5).trim();
    if (data && data !== "[DONE]") {
      try {
        const parsed: any = JSON.parse(data);
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

        if (thinking) ndjson(res, { type: "thinking", content: thinking });
        if (text) ndjson(res, { type: "text", content: text });
      } catch {
        // Ignora fragmento final inválido para preservar o stream do chat.
      }
    }
  }
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

    const messages = normalizeMessages(body);

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
        messages,
        stream: true,
      }),
    });

    if (!providerResponse.ok) {
      const errorText = await providerResponse.text();
      throw extractProviderError(providerResponse.status, errorText);
    }

    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    await pipeProviderStream(providerResponse, res);
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
