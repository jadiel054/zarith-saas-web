import type { GitHubRepoSummary, NormalizedGitHubReposResult } from "@/types/tools";

const DEFAULT_REPO_LIMIT = 20;

type AnyRecord = Record<string, any>;

function asArray(value: unknown): AnyRecord[] {
  if (Array.isArray(value)) return value.filter((item): item is AnyRecord => Boolean(item) && typeof item === "object");
  return [];
}

function firstArrayCandidate(result: any): AnyRecord[] {
  if (Array.isArray(result)) return asArray(result);

  const candidates = [
    result?.repositories,
    result?.repos,
    result?.items,
    result?.data,
    result?.result,
    result?.result?.repositories,
    result?.result?.repos,
    result?.result?.items,
    result?.result?.data,
    result?.data?.repositories,
    result?.data?.repos,
    result?.data?.items,
    result?.data?.data,
  ];

  for (const candidate of candidates) {
    const list = asArray(candidate);
    if (list.length > 0) return list;
  }

  return [];
}

function normalizeVisibility(repo: AnyRecord): GitHubRepoSummary["visibility"] {
  if (typeof repo.visibility === "string" && repo.visibility.trim()) return repo.visibility.trim();
  if (typeof repo.private === "boolean") return repo.private ? "private" : "public";
  if (typeof repo.isPrivate === "boolean") return repo.isPrivate ? "private" : "public";
  return "public";
}

function normalizeUrl(repo: AnyRecord): string {
  return String(repo.html_url || repo.url || repo.web_url || repo.clone_url || repo.ssh_url || "");
}

export function normalizeGitHubReposResult(result: unknown, limit = DEFAULT_REPO_LIMIT): NormalizedGitHubReposResult {
  const rawRepos = firstArrayCandidate(result);

  const repositories = rawRepos
    .map((repo): GitHubRepoSummary => ({
      name: String(repo.name || repo.full_name || repo.slug || "repositório-sem-nome"),
      description: typeof repo.description === "string" && repo.description.trim() ? repo.description.trim() : null,
      language: typeof repo.language === "string" && repo.language.trim() ? repo.language.trim() : null,
      visibility: normalizeVisibility(repo),
      url: normalizeUrl(repo),
      updated_at: String(repo.updated_at || repo.updatedAt || repo.pushed_at || repo.created_at || "") || null,
    }))
    .filter((repo) => repo.name !== "repositório-sem-nome" || repo.url)
    .slice(0, limit);

  return {
    repositories,
    total: rawRepos.length,
    displayed: repositories.length,
    source: "github/list-repos",
  };
}

function formatDate(value: string | null): string {
  if (!value) return "sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatGitHubReposForModel(result: unknown, limit = DEFAULT_REPO_LIMIT): string {
  const normalized = normalizeGitHubReposResult(result, limit);

  if (normalized.repositories.length === 0) {
    return "Nenhum repositório GitHub foi encontrado no resultado da ferramenta.";
  }

  const lines = normalized.repositories.map((repo, index) => {
    const description = repo.description ? ` — ${repo.description}` : "";
    const language = repo.language || "linguagem não informada";
    const url = repo.url || "link não informado";
    return `${index + 1}. **${repo.name}** (${language}, ${repo.visibility}, atualizado em ${formatDate(repo.updated_at)})${description}. Link: ${url}`;
  });

  const suffix = normalized.total > normalized.displayed
    ? `\n\nMostrando ${normalized.displayed} de ${normalized.total} repositórios. Peça para ver mais caso precise da lista completa.`
    : "";

  return `Repositórios encontrados no GitHub:\n\n${lines.join("\n")}${suffix}`;
}
