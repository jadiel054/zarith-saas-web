import { ExternalLink, Github, GitBranch, Lock, Unlock, CalendarClock, Code2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { normalizeGitHubReposResult } from "@/services/tools/formatForModel";
import type { GitHubRepoSummary } from "@/types/tools";

interface GitHubReposResultProps {
  result: unknown;
  maxVisible?: number;
}

function formatDate(value: string | null) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function visibilityLabel(visibility: GitHubRepoSummary["visibility"]) {
  return String(visibility).toLowerCase() === "private" ? "Privado" : String(visibility).toLowerCase() === "internal" ? "Interno" : "Público";
}

function VisibilityIcon({ visibility }: { visibility: GitHubRepoSummary["visibility"] }) {
  return String(visibility).toLowerCase() === "private" ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />;
}

function RepoHeader({ repo }: { repo: GitHubRepoSummary }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 pr-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-200 shadow-[0_0_18px_rgba(0,245,255,0.16)]">
          <Github className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black tracking-tight text-white">{repo.name}</p>
          <p className="truncate text-xs text-slate-400">{repo.description || "Sem descrição no GitHub"}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge className="border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-100 hover:bg-cyan-400/15">
          <Code2 className="mr-1 h-3 w-3" />
          {repo.language || "N/A"}
        </Badge>
        <Badge className="border-violet-400/20 bg-violet-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-100 hover:bg-violet-400/15">
          <VisibilityIcon visibility={repo.visibility} />
          <span className="ml-1">{visibilityLabel(repo.visibility)}</span>
        </Badge>
      </div>
    </div>
  );
}

export function GitHubReposResult({ result, maxVisible = 20 }: GitHubReposResultProps) {
  const normalized = normalizeGitHubReposResult(result, maxVisible);
  const hiddenCount = Math.max(normalized.total - normalized.displayed, 0);

  if (normalized.repositories.length === 0) {
    return (
      <div className="mt-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100">
        Não encontrei repositórios válidos no retorno do GitHub. Os detalhes técnicos continuam disponíveis no log da chamada.
      </div>
    );
  }

  return (
    <section className="mt-4 overflow-hidden rounded-3xl border border-cyan-400/20 bg-slate-950/70 shadow-[0_0_35px_rgba(0,245,255,0.10)] backdrop-blur-xl">
      <div className="border-b border-cyan-400/10 bg-gradient-to-r from-cyan-400/10 via-fuchsia-500/10 to-transparent p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-cyan-200">
              <Github className="h-4 w-4" />
              Repositórios GitHub
            </p>
            <h3 className="mt-1 text-base font-black text-white">
              {normalized.total} {normalized.total === 1 ? "repositório encontrado" : "repositórios encontrados"}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Mostrando {normalized.displayed} resultado{normalized.displayed === 1 ? "" : "s"} com resumo visual. Expanda um card para ver links e detalhes.
            </p>
          </div>
          {hiddenCount > 0 && (
            <Badge className="w-fit border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-100 hover:bg-fuchsia-400/15">
              +{hiddenCount} ocultos
            </Badge>
          )}
        </div>
      </div>

      <Accordion type="multiple" className="divide-y divide-cyan-400/10">
        {normalized.repositories.map((repo, index) => (
          <AccordionItem key={`${repo.name}-${index}`} value={`${repo.name}-${index}`} className="border-b-0 px-4">
            <AccordionTrigger className="gap-3 py-4 text-left hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70">
              <RepoHeader repo={repo} />
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-slate-300">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <CalendarClock className="h-4 w-4 text-cyan-300" />
                    Atualizado em <span className="font-semibold text-slate-200">{formatDate(repo.updated_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <GitBranch className="h-4 w-4 text-fuchsia-300" />
                    Linguagem principal <span className="font-semibold text-slate-200">{repo.language || "não informada"}</span>
                  </div>
                </div>

                <p className="mt-3 leading-relaxed text-slate-300">{repo.description || "Este repositório não possui descrição cadastrada no GitHub."}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {repo.url ? (
                    <Button asChild size="sm" className="h-8 rounded-xl bg-cyan-400 text-black hover:bg-cyan-300">
                      <a href={repo.url} target="_blank" rel="noreferrer">
                        Abrir repositório <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </a>
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" className="h-8 rounded-xl border-white/10 bg-white/5 text-slate-200 hover:bg-white/10">
                    Analisar este repo
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 rounded-xl text-cyan-200 hover:bg-cyan-400/10 hover:text-cyan-100">
                    Ler README
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
