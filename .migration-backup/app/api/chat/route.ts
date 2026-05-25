export const runtime = "edge";

import { orchestrateAIStream } from "@/lib/ai/router";

export interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  taskType?: "chat" | "code-generation" | "debug" | "repository-analysis" | "refactoring";
  stream?: boolean;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as ChatRequest;

    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(
        JSON.stringify({ error: "Campo 'messages' é obrigatório e deve ser um array" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const taskType = body.taskType || "chat";
    const shouldStream = body.stream !== false; // Default: true

    // Obter API keys do header (enviadas pelo cliente)
    const groqKey = request.headers.get("x-groq-key");
    const openrouterKey = request.headers.get("x-openrouter-key");
    const geminiKey = request.headers.get("x-gemini-key");

    if (!groqKey && !openrouterKey && !geminiKey) {
      return new Response(
        JSON.stringify({
          error: "Nenhuma API key fornecida. Configure suas credenciais nas Configurações.",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    if (shouldStream) {
      // Streaming com ReadableStream
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const generator = orchestrateAIStream(body.messages, taskType, {
              groqKey: groqKey || undefined,
              openrouterKey: openrouterKey || undefined,
              geminiKey: geminiKey || undefined,
            });

            for await (const chunk of generator) {
              const data = JSON.stringify({ token: chunk });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }

            // Enviar sinal de conclusão
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
            const errorData = JSON.stringify({
              error: "Erro ao processar streaming",
              details: errorMessage,
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    } else {
      // Resposta completa (não streaming)
      try {
        let fullReply = "";
        const generator = orchestrateAIStream(body.messages, taskType, {
          groqKey: groqKey || undefined,
          openrouterKey: openrouterKey || undefined,
          geminiKey: geminiKey || undefined,
        });

        for await (const chunk of generator) {
          fullReply += chunk;
        }

        return new Response(
          JSON.stringify({
            reply: fullReply,
            model: "unknown",
            provider: "unknown",
            responseTime: 0,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

        return new Response(
          JSON.stringify({
            error: "Erro ao processar requisição de chat",
            details: errorMessage,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

    return new Response(
      JSON.stringify({
        error: "Erro ao processar requisição de chat",
        details: errorMessage,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
