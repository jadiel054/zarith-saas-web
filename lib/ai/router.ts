/**
 * Orquestrador de IAs - Decide qual modelo usar com base no tipo de tarefa
 * Roteamento inteligente com fallbacks automáticos
 */

export type TaskType =
  | "chat"
  | "code-generation"
  | "debug"
  | "repository-analysis"
  | "refactoring";

export interface AIRouterOptions {
  taskType: TaskType;
  contextSize: number; // em tokens
}

export interface AIRouterResult {
  model: string;
  provider: "groq" | "openrouter" | "gemini";
  apiKey: string;
}

export interface AIResponse {
  reply: string;
  model: string;
  provider: "groq" | "openrouter" | "gemini";
  responseTime: number;
  tokensUsed?: number;
}

const MODELS = {
  GROQ_LLAMA: "llama-3.3-70b-versatile",
  QWEN_CODER: "qwen/qwen3-coder:free",
  DEEPSEEK_R1: "deepseek/deepseek-r1:free",
  GLM: "z-ai/glm-5.1",
  QWEN_235B: "qwen/qwen3-235b-a22b:free",
  GEMINI: "gemini-2.0-flash",
} as const;

/**
 * Tabela de roteamento: Tipo de tarefa → Modelo primário + Fallback
 */
const ROUTING_TABLE: Record<
  TaskType,
  {
    primary: { model: string; provider: "groq" | "openrouter" | "gemini" };
    fallback: { model: string; provider: "groq" | "openrouter" | "gemini" };
  }
> = {
  chat: {
    primary: { model: MODELS.GROQ_LLAMA, provider: "groq" },
    fallback: { model: MODELS.QWEN_235B, provider: "openrouter" },
  },
  "code-generation": {
    primary: { model: MODELS.QWEN_CODER, provider: "openrouter" },
    fallback: { model: MODELS.DEEPSEEK_R1, provider: "openrouter" },
  },
  debug: {
    primary: { model: MODELS.DEEPSEEK_R1, provider: "openrouter" },
    fallback: { model: MODELS.QWEN_CODER, provider: "openrouter" },
  },
  "repository-analysis": {
    primary: { model: MODELS.GEMINI, provider: "gemini" },
    fallback: { model: MODELS.GLM, provider: "openrouter" },
  },
  refactoring: {
    primary: { model: MODELS.GLM, provider: "openrouter" },
    fallback: { model: MODELS.DEEPSEEK_R1, provider: "openrouter" },
  },
};

/**
 * Roteia para o modelo apropriado com base na tarefa
 * Retorna modelo primário, com fallback disponível
 */
export function routeToModel(
  options: AIRouterOptions,
  apiKeys: {
    groqKey?: string;
    openrouterKey?: string;
    geminiKey?: string;
  }
): AIRouterResult {
  const routing = ROUTING_TABLE[options.taskType];

  // Tenta usar o modelo primário
  if (routing.primary.provider === "groq" && apiKeys.groqKey) {
    return {
      model: routing.primary.model,
      provider: "groq",
      apiKey: apiKeys.groqKey,
    };
  }

  if (routing.primary.provider === "openrouter" && apiKeys.openrouterKey) {
    return {
      model: routing.primary.model,
      provider: "openrouter",
      apiKey: apiKeys.openrouterKey,
    };
  }

  if (routing.primary.provider === "gemini" && apiKeys.geminiKey) {
    return {
      model: routing.primary.model,
      provider: "gemini",
      apiKey: apiKeys.geminiKey,
    };
  }

  // Fallback para modelo secundário
  if (routing.fallback.provider === "groq" && apiKeys.groqKey) {
    return {
      model: routing.fallback.model,
      provider: "groq",
      apiKey: apiKeys.groqKey,
    };
  }

  if (routing.fallback.provider === "openrouter" && apiKeys.openrouterKey) {
    return {
      model: routing.fallback.model,
      provider: "openrouter",
      apiKey: apiKeys.openrouterKey,
    };
  }

  if (routing.fallback.provider === "gemini" && apiKeys.geminiKey) {
    return {
      model: routing.fallback.model,
      provider: "gemini",
      apiKey: apiKeys.geminiKey,
    };
  }

  throw new Error(
    "Nenhuma API key configurada para o roteamento de modelos. Configure suas credenciais nas Configurações."
  );
}

/**
 * Estima tamanho do contexto em tokens
 * Aproximação: 1 token ≈ 4 caracteres
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Chama Groq com streaming
 */
export async function* callGroqStream(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  model: string = MODELS.GROQ_LLAMA
): AsyncGenerator<string> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    }),
  });

  if (response.status === 429) {
    throw new Error("RATE_LIMIT_429");
  }

  if (!response.ok) {
    throw new Error(`Groq error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data) as {
              choices: Array<{ delta: { content?: string } }>;
            };
            const content = parsed.choices[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // Ignorar linhas inválidas
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Chama OpenRouter com streaming
 */
export async function* callOpenRouterStream(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  model: string
): AsyncGenerator<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://zarith-saas-web.vercel.app",
      "X-Title": "Zarith VTuber AI",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    }),
  });

  if (response.status === 429) {
    throw new Error("RATE_LIMIT_429");
  }

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data) as {
              choices: Array<{ delta: { content?: string } }>;
            };
            const content = parsed.choices[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // Ignorar linhas inválidas
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Chama Gemini (sem streaming nativo, retorna completo)
 */
export async function callGemini(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  model: string = MODELS.GEMINI
): Promise<string> {
  const contents = messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (response.status === 429) {
    throw new Error("RATE_LIMIT_429");
  }

  if (!response.ok) {
    throw new Error(`Gemini error: ${response.status}`);
  }

  const data = (await response.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };

  return data.candidates[0].content.parts[0].text;
}

/**
 * Orquestrador principal com streaming
 */
export async function* orchestrateAIStream(
  messages: Array<{ role: string; content: string }>,
  taskType: TaskType,
  apiKeys: {
    groqKey?: string;
    openrouterKey?: string;
    geminiKey?: string;
  }
): AsyncGenerator<string> {
  const contextSize = estimateTokens(messages.map((m) => m.content).join(" "));
  const routing = routeToModel({ taskType, contextSize }, apiKeys);

  try {
    // Tenta modelo primário
    if (routing.provider === "groq") {
      yield* callGroqStream(messages, routing.apiKey, routing.model);
      return;
    }

    if (routing.provider === "openrouter") {
      yield* callOpenRouterStream(messages, routing.apiKey, routing.model);
      return;
    }

    if (routing.provider === "gemini") {
      const response = await callGemini(messages, routing.apiKey, routing.model);
      yield response;
      return;
    }

    throw new Error("Provider não suportado");
  } catch (primaryError) {
    // Se erro 429, tenta fallback
    if (
      primaryError instanceof Error &&
      primaryError.message.includes("RATE_LIMIT_429")
    ) {
      const fallbackRouting = ROUTING_TABLE[taskType].fallback;

      try {
        if (fallbackRouting.provider === "groq" && apiKeys.groqKey) {
          yield* callGroqStream(messages, apiKeys.groqKey, fallbackRouting.model);
          return;
        }

        if (fallbackRouting.provider === "openrouter" && apiKeys.openrouterKey) {
          yield* callOpenRouterStream(messages, apiKeys.openrouterKey, fallbackRouting.model);
          return;
        }

        if (fallbackRouting.provider === "gemini" && apiKeys.geminiKey) {
          const response = await callGemini(messages, apiKeys.geminiKey, fallbackRouting.model);
          yield response;
          return;
        }
      } catch (fallbackError) {
        throw new Error(
          `Fallback também falhou: ${fallbackError instanceof Error ? fallbackError.message : "Unknown error"}`
        );
      }
    }

    throw primaryError;
  }
}
