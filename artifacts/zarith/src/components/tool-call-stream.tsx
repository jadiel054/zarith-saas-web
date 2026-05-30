import { motion } from "framer-motion";
import { Terminal as TerminalIcon, ChevronRight, CheckCircle2, XCircle } from "lucide-react";

export interface ToolCall {
  id: string;
  name: string;
  args: any;
  status: "calling" | "success" | "error";
  result?: any;
}

interface ToolCallStreamProps {
  calls: ToolCall[];
}

function WaveformLoader() {
  return (
    <div className="flex items-end gap-0.5 h-4" aria-label="Executando">
      {[0, 1, 2, 3, 4].map((bar) => (
        <motion.span
          key={bar}
          animate={{ height: [5, 16, 7, 13, 5], opacity: [0.45, 1, 0.55] }}
          transition={{ repeat: Infinity, duration: 0.85, delay: bar * 0.08, ease: "easeInOut" }}
          className="w-1 rounded-full bg-[#00f5ff] shadow-[0_0_8px_rgba(0,245,255,0.7)]"
        />
      ))}
    </div>
  );
}

function getActionLabel(name: string) {
  const labels: Record<string, string> = {
    "github/list-repos": "Listando repositórios",
    "github/get-file": "Lendo arquivo no GitHub",
    "github/create-file": "Criando arquivo no GitHub",
    "github/update-file": "Atualizando arquivo no GitHub",
    "github/create-commit": "Criando commit",
    "vercel/get-build-logs": "Lendo logs de build",
    "vercel/trigger-deploy": "Disparando deploy",
    "supabase/list-tables": "Listando tabelas",
    "supabase/execute-sql": "Executando SQL",
    "vision/analyze-image": "Analisando imagem",
    "web/search": "Pesquisando na web",
    "files/read": "Lendo arquivo do workspace",
    "files/write": "Escrevendo arquivo no workspace",
    "files/run-command": "Executando comando",
  };
  return labels[name] || `Executando: ${name}`;
}

export function ToolCallStream({ calls }: ToolCallStreamProps) {
  if (calls.length === 0) return null;

  return (
    <div className="my-4 space-y-2 font-mono">
      {calls.map((call) => (
        <motion.div
          key={call.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`p-3 rounded-2xl border text-xs flex flex-col gap-2 shadow-lg ${
            call.status === "error"
              ? "bg-red-500/5 border-red-500/30"
              : call.status === "success"
              ? "bg-emerald-500/5 border-emerald-500/30"
              : "bg-cyan-500/5 border-cyan-500/30"
          }`}
        >
          <div className="flex items-center gap-2">
            {call.status === "success" ? (
              <CheckCircle2 size={14} className="text-emerald-400" />
            ) : call.status === "error" ? (
              <XCircle size={14} className="text-red-400" />
            ) : (
              <TerminalIcon size={14} className="text-cyan-400" />
            )}
            <span className="font-black text-gray-300 uppercase tracking-tighter">{getActionLabel(call.name)}</span>
            <span className={call.status === "error" ? "text-red-400" : call.status === "success" ? "text-emerald-300" : "text-cyan-300"}>{call.name}</span>
            {call.status === "calling" && <WaveformLoader />}
          </div>

          <div className="bg-black/40 p-2 rounded-xl text-[10px] text-gray-400 overflow-x-auto whitespace-pre border border-white/5">
            {JSON.stringify(call.args, null, 2)}
          </div>

          {call.result && (
            <div className="border-t border-cyan-500/10 pt-2 mt-1">
              <div className="flex items-center gap-1 mb-1">
                <ChevronRight size={10} className="text-gray-500" />
                <span className="text-[10px] text-gray-500 uppercase">Resultado:</span>
              </div>
              <pre className="text-[10px] text-gray-300 max-h-32 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                {typeof call.result === "string" ? call.result : JSON.stringify(call.result, null, 2)}
              </pre>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
