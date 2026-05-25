export const runtime = "edge";

import {
  getGitHubUser,
  getUserRepositories,
  searchRepositories,
  getRepository,
} from "@/lib/github/client";

export interface GitHubRequest {
  action: "get-user" | "list-repos" | "search-repos" | "get-repo";
  username?: string;
  query?: string;
  owner?: string;
  repo?: string;
  sort?: "updated" | "stars" | "forks";
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as GitHubRequest;
    const githubToken = request.headers.get("x-github-token");

    if (!githubToken) {
      return new Response(
        JSON.stringify({ error: "GitHub token não fornecido" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!body.action) {
      return new Response(
        JSON.stringify({ error: "Campo 'action' é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let result;

    switch (body.action) {
      case "get-user": {
        if (!body.username) {
          return new Response(
            JSON.stringify({ error: "Campo 'username' é obrigatório para get-user" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        result = await getGitHubUser(body.username, githubToken);
        break;
      }

      case "list-repos": {
        if (!body.username) {
          return new Response(
            JSON.stringify({ error: "Campo 'username' é obrigatório para list-repos" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        result = await getUserRepositories(body.username, githubToken, body.sort || "updated");
        break;
      }

      case "search-repos": {
        if (!body.query) {
          return new Response(
            JSON.stringify({ error: "Campo 'query' é obrigatório para search-repos" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        result = await searchRepositories(body.query, githubToken, body.sort || "stars");
        break;
      }

      case "get-repo": {
        if (!body.owner || !body.repo) {
          return new Response(
            JSON.stringify({
              error: "Campos 'owner' e 'repo' são obrigatórios para get-repo",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        result = await getRepository(body.owner, body.repo, githubToken);
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
        error: "Erro ao processar requisição GitHub",
        details: errorMessage,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
