import { AlertTriangle, CheckCircle2, ChevronRight, Terminal, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { GitHubReposResult } from "@/components/tool-results/github/GitHubReposResult";
import type { AppToolCall } from "@/types/tools";

interface ToolResultRendererProps {
  call: AppToolCall;
}

function getStatusStyles(status: AppToolCall["status"]) {
  if (status === "error") {
    return {
      icon: <XCircle className="h-4 w-4 text-red-300" />,
      className: "border-red-400/25 bg-red-500/10 text-red-100",
      label: "Falha na ferramenta",
    };
  }

  if (status === "success") {
    return {
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-300" />,
      className: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
      label: "Ferramenta executada",
    };
  }

  return {
    icon: <Terminal className="h-4 w-4 text-cyan-300" />,
    className: "border-cyan-400/25 bg-cyan-500/10 text-cyan-100",
    label: "Executando ferramenta",
  };
}

function getErrorMessage(result: unknown) {
  if (typeof result === "string") return result;
  if (result && typeof result === "object") {
    const data = result as Record<string, any>;
    if (typeof data.error === "string") return data.error;
    if (typeof data.message === "string") return data.message;
    if (data.error && typeof data.error.message === "string") return data.error.message;
  }
  return "A ferramenta retornou um erro sem mensagem detalhada.";
}

function GenericToolResult({ call }: { call: AppToolCall }) {
  const status = getStatusStyles(call.status);

  if (call.status === "calling") {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`mt-3 rounded-2xl border p-3 text-xs ${status.className}`}>
        <div className="flex items-center gap-2 font-black uppercase tracking-[0.2em]">
          {status.icon}
          {status.label}
        </div>
        <p className="mt-2 text-slate-300">{call.name}</p>
      </motion.div>
    );
  }

  if (call.status === "error") {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100">
        <div className="flex items-center gap-2 font-black uppercase tracking-[0.2em]">
          <AlertTriangle className="h-4 w-4" />
          Erro em {call.name}
        </div>
        <p className="mt-2 text-red-100/90">{getErrorMessage(call.result)}</p>
        <details className="mt-3 rounded-xl border border-red-300/10 bg-black/25 p-3 text-xs text-red-100/80">
          <summary className="cursor-pointer font-semibold text-red-100">Ver detalhes técnicos</summary>
          <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words">{JSON.stringify({ args: call.args, result: call.result }, null, 2)}</pre>
        </details>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-2xl border border-slate-500/20 bg-slate-900/70 p-4 text-sm text-slate-200">
      <div className="flex items-center gap-2 font-black uppercase tracking-[0.2em] text-slate-300">
        <ChevronRight className="h-4 w-4 text-cyan-300" />
        Resultado de {call.name}
      </div>
      <details className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3 text-xs text-slate-300">
        <summary className="cursor-pointer font-semibold text-slate-100">Ver detalhes técnicos</summary>
        <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words">{typeof call.result === "string" ? call.result : JSON.stringify(call.result, null, 2)}</pre>
      </details>
    </motion.div>
  );
}

export function ToolResultRenderer({ call }: ToolResultRendererProps) {
  if (call.status === "success" && call.name === "github/list-repos") {
    return <GitHubReposResult result={call.result} />;
  }

  return <GenericToolResult call={call} />;
}
