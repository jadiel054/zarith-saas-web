import { Database, Layers3, Table2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { normalizeSupabaseTablesResult } from "@/services/tools/formatForModel";
import type { SupabaseTableSummary } from "@/types/tools";

interface SupabaseTablesResultProps {
  result: unknown;
  maxVisible?: number;
}

function schemaStyles(schema: string) {
  const normalized = schema.toLowerCase();
  if (normalized === "public") {
    return "border-cyan-400/25 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15";
  }
  if (normalized === "auth") {
    return "border-violet-400/25 bg-violet-400/10 text-violet-100 hover:bg-violet-400/15";
  }
  if (normalized === "zarith") {
    return "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-100 hover:bg-fuchsia-400/15";
  }
  if (normalized === "storage") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15";
  }
  if (normalized === "realtime") {
    return "border-amber-400/25 bg-amber-400/10 text-amber-100 hover:bg-amber-400/15";
  }
  return "border-slate-400/25 bg-slate-400/10 text-slate-100 hover:bg-slate-400/15";
}

function TableCard({ table }: { table: SupabaseTableSummary }) {
  return (
    <article className="group rounded-2xl border border-cyan-400/10 bg-black/25 p-4 transition duration-200 hover:border-cyan-300/30 hover:bg-cyan-400/[0.06] hover:shadow-[0_0_24px_rgba(0,245,255,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.14)] transition group-hover:scale-105">
            <Table2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black tracking-tight text-white">{table.table_name}</p>
            <p className="truncate text-xs text-slate-400">Tabela em {table.table_schema}</p>
          </div>
        </div>
        <Badge className={`${schemaStyles(table.table_schema)} shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide`}>
          {table.table_schema}
        </Badge>
      </div>
    </article>
  );
}

export function SupabaseTablesResult({ result, maxVisible = 60 }: SupabaseTablesResultProps) {
  const normalized = normalizeSupabaseTablesResult(result, maxVisible);
  const hiddenCount = Math.max(normalized.total - normalized.displayed, 0);

  if (normalized.tables.length === 0) {
    return (
      <div className="mt-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100">
        Não encontrei tabelas válidas no retorno do Supabase. Os detalhes técnicos continuam disponíveis no log da chamada.
      </div>
    );
  }

  return (
    <section className="mt-4 overflow-hidden rounded-3xl border border-emerald-400/20 bg-slate-950/70 shadow-[0_0_35px_rgba(52,211,153,0.10)] backdrop-blur-xl">
      <div className="border-b border-emerald-400/10 bg-gradient-to-r from-emerald-400/10 via-cyan-400/10 to-transparent p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-emerald-200">
              <Database className="h-4 w-4" />
              Tabelas Supabase
            </p>
            <h3 className="mt-1 text-base font-black text-white">
              {normalized.total} {normalized.total === 1 ? "tabela encontrada" : "tabelas encontradas"}
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Mostrando {normalized.displayed} resultado{normalized.displayed === 1 ? "" : "s"} com badges por schema e leitura visual rápida.
            </p>
          </div>
          {hiddenCount > 0 && (
            <Badge className="w-fit border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-100 hover:bg-fuchsia-400/15">
              +{hiddenCount} ocultas
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {normalized.tables.map((table, index) => (
          <TableCard key={`${table.table_schema}-${table.table_name}-${index}`} table={table} />
        ))}
      </div>

      <div className="border-t border-emerald-400/10 bg-black/20 px-4 py-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Layers3 className="h-4 w-4 text-emerald-300" />
          Schemas são destacados por cor para separar rapidamente áreas como auth, public, storage e zarith.
        </div>
      </div>
    </section>
  );
}
