import { motion, AnimatePresence } from "framer-motion";
import { Terminal, X, ChevronRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'info' | 'command' | 'success' | 'error' | 'thinking';
  message: string;
}

interface ExecutionLogsProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
}

export function ExecutionLogs({ isOpen, onClose, logs }: ExecutionLogsProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 bottom-0 w-full md:w-96 bg-[#0a0a0f] border-l border-[var(--border-glow)] z-[60] flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="p-4 border-b border-[var(--border-glow)] flex items-center justify-between bg-[#11111a]">
            <div className="flex items-center gap-2 text-[#00f5ff]">
              <Terminal size={18} />
              <span className="font-orbitron font-bold text-sm tracking-wider">LOGS DE EXECUÇÃO</span>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-[var(--text-secondary)] transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Logs List */}
          <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed space-y-3">
            {logs.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)] opacity-50">
                <Terminal size={40} className="mb-2" />
                <p>Nenhuma atividade registrada.</p>
              </div>
            )}
            {logs.map((log) => (
              <div key={log.id} className="flex gap-2 group">
                <span className="text-white/20 shrink-0 select-none">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {log.type === 'thinking' && <Loader2 size={10} className="text-[#bf00ff] animate-spin" />}
                    {log.type === 'command' && <ChevronRight size={10} className="text-[#00f5ff]" />}
                    {log.type === 'success' && <CheckCircle2 size={10} className="text-[#00ff88]" />}
                    {log.type === 'error' && <AlertCircle size={10} className="text-[#ff0080]" />}
                    <span className={`uppercase text-[9px] font-black px-1 rounded ${
                      log.type === 'thinking' ? 'bg-[#bf00ff]/20 text-[#bf00ff]' :
                      log.type === 'command' ? 'bg-[#00f5ff]/20 text-[#00f5ff]' :
                      log.type === 'success' ? 'bg-[#00ff88]/20 text-[#00ff88]' :
                      log.type === 'error' ? 'bg-[#ff0080]/20 text-[#ff0080]' :
                      'bg-white/10 text-white/60'
                    }`}>
                      {log.type}
                    </span>
                  </div>
                  <p className={`break-words ${
                    log.type === 'command' ? 'text-[#00f5ff]' :
                    log.type === 'error' ? 'text-[#ff0080]' :
                    'text-white/80'
                  }`}>
                    {log.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
