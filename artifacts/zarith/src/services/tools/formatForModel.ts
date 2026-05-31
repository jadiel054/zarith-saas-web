import type {
  GitHubRepoSummary,
  NormalizedGitHubReposResult,
  NormalizedSupabaseTablesResult,
  NormalizedVercelProjectsResult,
  SupabaseTableSummary,
  VercelProjectSummary,
} from "@/types/tools";

const DEFAULT_REPO_LIMIT = 20;
const DEFAULT_PROJECT_LIMIT = 20;
const DEFAULT_TABLE_LIMIT = 60;

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
    result?.projects,
    result?.tables,
    result?.items,
    result?.data,
    result?.result,
    result?.result?.repositories,
    result?.result?.repos,
    result?.result?.projects,
    result?.result?.tables,
    result?.result?.items,
    result?.result?.data,
    result?.data?.repositories,
    result?.data?.repos,
    result?.data?.projects,
    result?.data?.tables,
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

function normalizeRepoUrl(repo: AnyRecord): string {
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
      url: normalizeRepoUrl(repo),
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

function toDateString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return new Date(value).toISOString();
  return String(value);
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

function normalizeDeployStatus(project: AnyRecord): VercelProjectSummary["latest_deploy_status"] {
  const latest = Array.isArray(project.latestDeployments) ? project.latestDeployments[0] : undefined;
  const raw = String(
    latest?.readyState ||
    latest?.state ||
    project.latestDeploy?.readyState ||
    project.latestDeployment?.readyState ||
    project.readyState ||
    project.status ||
    "Unknown"
  ).toLowerCase();

  if (["ready", "succeeded", "success", "live"].includes(raw)) return "Ready";
  if (["error", "failed", "failure", "crashed"].includes(raw)) return "Error";
  if (["building", "initializing", "deploying", "in_progress", "in-progress"].includes(raw)) return "Building";
  if (["queued", "pending"].includes(raw)) return "Queued";
  if (["canceled", "cancelled"].includes(raw)) return "Canceled";
  return raw === "unknown" ? "Unknown" : raw.charAt(0).toUpperCase() + raw.slice(1);
}

function normalizeProductionUrl(project: AnyRecord): string {
  const latest = Array.isArray(project.latestDeployments) ? project.latestDeployments[0] : undefined;
  const raw = String(
    project.productionUrl ||
    project.production_url ||
    project.url ||
    project.link?.production ||
    project.link?.url ||
    latest?.url ||
    project.targets?.production?.alias?.[0] ||
    ""
  );
  if (!raw) return "";
  return raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
}

export function normalizeVercelProjectsResult(result: unknown, limit = DEFAULT_PROJECT_LIMIT): NormalizedVercelProjectsResult {
  const rawProjects = firstArrayCandidate(result);

  const projects = rawProjects
    .map((project): VercelProjectSummary => ({
      name: String(project.name || project.id || "projeto-sem-nome"),
      latest_deploy_status: normalizeDeployStatus(project),
      production_url: normalizeProductionUrl(project),
      framework: typeof project.framework === "string" && project.framework.trim() ? project.framework.trim() : null,
      updated_at: toDateString(project.updatedAt || project.updated_at || project.createdAt || project.created_at),
    }))
    .filter((project) => project.name !== "projeto-sem-nome" || project.production_url)
    .slice(0, limit);

  return {
    projects,
    total: rawProjects.length,
    displayed: projects.length,
    source: "vercel/list-projects",
  };
}

export function normalizeSupabaseTablesResult(result: unknown, limit = DEFAULT_TABLE_LIMIT): NormalizedSupabaseTablesResult {
  const rawTables = firstArrayCandidate(result);

  const tables = rawTables
    .map((table): SupabaseTableSummary => ({
      table_name: String(table.table_name || table.name || table.table || "tabela-sem-nome"),
      table_schema: String(table.table_schema || table.schema || "public"),
    }))
    .filter((table) => table.table_name !== "tabela-sem-nome")
    .slice(0, limit);

  return {
    tables,
    total: rawTables.length,
    displayed: tables.length,
    source: "supabase/list-tables",
  };
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

export function formatVercelProjectsForModel(result: unknown, limit = DEFAULT_PROJECT_LIMIT): string {
  const normalized = normalizeVercelProjectsResult(result, limit);

  if (normalized.projects.length === 0) {
    return "Nenhum projeto Vercel foi encontrado no resultado da ferramenta.";
  }

  const lines = normalized.projects.map((project, index) => {
    const framework = project.framework || "framework não informado";
    const url = project.production_url || "URL de produção não informada";
    return `${index + 1}. **${project.name}** — status do último deploy: **${project.latest_deploy_status}**; framework: ${framework}; atualizado em ${formatDate(project.updated_at)}; produção: ${url}`;
  });

  const suffix = normalized.total > normalized.displayed
    ? `\n\nMostrando ${normalized.displayed} de ${normalized.total} projetos. Peça para ver mais caso precise da lista completa.`
    : "";

  return `Projetos encontrados na Vercel:\n\n${lines.join("\n")}${suffix}`;
}

export function formatSupabaseTablesForModel(result: unknown, limit = DEFAULT_TABLE_LIMIT): string {
  const normalized = normalizeSupabaseTablesResult(result, limit);

  if (normalized.tables.length === 0) {
    return "Nenhuma tabela Supabase foi encontrada no resultado da ferramenta.";
  }

  const lines = normalized.tables.map((table, index) => `${index + 1}. **${table.table_schema}.${table.table_name}**`);
  const suffix = normalized.total > normalized.displayed
    ? `\n\nMostrando ${normalized.displayed} de ${normalized.total} tabelas. Peça para ver mais caso precise da lista completa.`
    : "";

  return `Tabelas encontradas no Supabase:\n\n${lines.join("\n")}${suffix}`;
}
