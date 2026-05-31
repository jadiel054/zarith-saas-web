import { CalendarClock, ExternalLink, Rocket, Triangle, Zap } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { normalizeVercelProjectsResult } from "@/services/tools/formatForModel";
import type { VercelProjectSummary } from "@/types/tools";

interface VercelProjectsResultProps {
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

function statusStyles(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("ready") || normalized.includes("success") || normalized.includes("live")) {
    return {
      label: "Ready",
      className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15",
      dot: "bg-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.85)]",
    };
  }

  if (normalized.includes("error") || normalized.includes("fail") || normalized.includes("crash")) {
    return {
      label: "Error",
      className: "border-red-400/25 bg-red-400/10 text-red-100 hover:bg-red-400/15",
      dot: "bg-red-300 shadow-[0_0_14px_rgba(248,113,113,0.85)]",
    };
  }

  if (normalized.includes("building") || normalized.includes("queued") || normalized.includes("pending") || normalized.includes("deploy")) {
    return {
      label: normalized.includes("queued") || normalized.includes("pending") ? "Queued" : "Building",
      className: "border-amber-400/25 bg-amber-400/10 text-amber-100 hover:bg-amber-400/15",
      dot: "bg-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.85)]",
    };
  }

  return {
    label: status || "Unknown",
    className: "border-slate-400/25 bg-slate-400/10 text-slate-100 hover:bg-slate-400/15",
    dot: "bg-slate-300 shadow-[0_0_14px_rgba(203,213,225,0.5)]",
  };
}

function ProjectHeader({ project }: { project: VercelProjectSummary }) {
  const status = statusStyles(project.latest_deploy_status);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 pr-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-200 shadow-[0_0_18px_rgba(217,70,239,0.16)]">
          <Triangle className="h-4 w-4 fill-current" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black tracking-tight text-white">{project.name}</p>
          <p className="truncate text-xs text-slate-400">{project.production_url || "Sem URL de produção informada"}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge className={`${status.className} px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide`}>
          <span className={`mr-1.5 h-2 w-2 rounded-full ${status.dot}`} />
          {status.label}
        </Badge>
        <Badge className="border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan-100 hover:bg-cyan-400/15">
          <Zap className="mr-1 h-3 w-3" />
          {project.framework || "N/A"}
        </Badge>
      </div>
    </div>
  );
}

export function VercelProjectsResult({ result, maxVisible = 20 }: VercelProjectsResultProps) {
  const normalized = normalizeVercelProjectsResult(result, maxVisible);
  const hiddenCount = Math.max(normalized.total - normalized.displayed, 0);

  if (normalized.projects.length === 0) {
    return (
      <div className="mt-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100">
        Não encontrei projetos válidos no retorno da Vercel. Os detalhes técnicos continuam disponíveis no log da chamada.
      </div>
    );
  }

  return (
    <section className="mt-4 overflow-hidden rounded-3xl border border-fuchsia-400/20 bg-slate-950/70 shadow-[0_0_35px_rgba(217,70,239,0.10)] backdrop-blur-xl">
      <div className="border-b border-fuchsia-400/10 bg-gradient-to-r from-fuchsia-500/10 via-cyan-400/10 to-transparent p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-fuchsia-200">
              <Triangle className="h-4 w-4 fill-current" />
              Projetos Vercel
            </p>
            <h3 className="mt-1 text-base font-black text-white">
              {normalized.total} {normalized.total === 1 ? "projeto encontrado" : "projetos encontrados"}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Mostrando {normalized.displayed} resultado{normalized.displayed === 1 ? "" : "s"} com status do último deploy, framework e URL de produção.
            </p>
          </div>
          {hiddenCount > 0 && (
            <Badge className="w-fit border-cyan-400/25 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15">
              +{hiddenCount} ocultos
            </Badge>
          )}
        </div>
      </div>

      <Accordion type="multiple" className="divide-y divide-fuchsia-400/10">
        {normalized.projects.map((project, index) => (
          <AccordionItem key={`${project.name}-${index}`} value={`${project.name}-${index}`} className="border-b-0 px-4">
            <AccordionTrigger className="gap-3 py-4 text-left hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300/70">
              <ProjectHeader project={project} />
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-slate-300">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Rocket className="h-4 w-4 text-fuchsia-300" />
                    Último deploy <span className="font-semibold text-slate-200">{project.latest_deploy_status}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <CalendarClock className="h-4 w-4 text-cyan-300" />
                    Atualizado em <span className="font-semibold text-slate-200">{formatDate(project.updated_at)}</span>
                  </div>
                </div>

                <p className="mt-3 leading-relaxed text-slate-300">
                  Framework detectado: <span className="font-semibold text-slate-100">{project.framework || "não informado"}</span>.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {project.production_url ? (
                    <Button asChild size="sm" className="h-8 rounded-xl bg-fuchsia-400 text-black hover:bg-fuchsia-300">
                      <a href={project.production_url} target="_blank" rel="noreferrer">
                        Abrir produção <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </a>
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" className="h-8 rounded-xl border-white/10 bg-white/5 text-slate-200 hover:bg-white/10">
                    Ver deployments
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
