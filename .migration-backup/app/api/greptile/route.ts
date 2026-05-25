export const runtime = "edge";

import {
  analyzeRepository,
  queryRepositoryContext,
  explainCode,
  getSetupInstructions,
} from "@/lib/greptile/client";

export interface GreptileRequest {
  action: "analyze" | "query" | "explain-code" | "setup-instructions";
  repoUrl: string;
  query?: string;
  filePath?: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as GreptileRequest;
    const greptileKey = request.headers.get("x-greptile-key");

    if (!greptileKey) {
      return new Response(
        JSON.stringify({ error: "Greptile key não fornecido" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!body.action || !body.repoUrl) {
      return new Response(
        JSON.stringify({ error: "Campos 'action' e 'repoUrl' são obrigatórios" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let result;

    switch (body.action) {
      case "analyze": {
        result = await analyzeRepository(body.repoUrl, greptileKey);
        break;
      }

      case "query": {
        if (!body.query) {
          return new Response(
            JSON.stringify({ error: "Campo 'query' é obrigatório para action 'query'" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        result = await queryRepositoryContext(body.repoUrl, body.query, greptileKey);
        break;
      }

      case "explain-code": {
        if (!body.filePath) {
          return new Response(
            JSON.stringify({ error: "Campo 'filePath' é obrigatório para action 'explain-code'" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        result = await explainCode(body.repoUrl, body.filePath, greptileKey);
        break;
      }

      case "setup-instructions": {
        result = await getSetupInstructions(body.repoUrl, greptileKey);
        break;
      }

      default: {
        return new Response(
          JSON.stringify({ error: `Action '${body.action}' não suportada` }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

    return new Response(
      JSON.stringify({
        error: "Erro ao processar requisição Greptile",
        details: errorMessage,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
