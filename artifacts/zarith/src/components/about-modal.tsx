import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Globe, Cpu, Brain } from "lucide-react";

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

export function AboutModal({ open, onClose }: AboutModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="w-full max-w-md bg-[#0a0a14] border border-[rgba(191,0,255,0.3)] rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(191,0,255,0.2)]"
          >
            {/* Header glow */}
            <div className="relative h-32 bg-gradient-to-br from-[rgba(0,245,255,0.15)] to-[rgba(191,0,255,0.25)] flex items-center justify-center overflow-hidden">
              {/* Grid pattern */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,245,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,245,255,0.08)_1px,transparent_1px)] bg-[size:20px_20px]" />

              {/* Logo central */}
              <div className="relative z-10 text-center">
                <div className="font-orbitron font-black text-4xl bg-gradient-to-r from-[#00f5ff] to-[#bf00ff] bg-clip-text text-transparent tracking-widest drop-shadow-[0_0_20px_rgba(0,245,255,0.5)]">
                  ZARITH
                </div>
                <div className="text-[10px] text-[rgba(0,245,255,0.6)] font-mono tracking-[0.4em] uppercase mt-1">
                  Sistema Agente Autônomo
                </div>
              </div>

              {/* Fechar */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 space-y-5">
              <p className="text-sm text-[rgba(224,224,255,0.8)] leading-relaxed text-center">
                Criada por{" "}
                <span className="text-[#00f5ff] font-bold">Jadiel</span>, 25 anos, para ser a
                inteligência definitiva em automação de código e infraestrutura.
              </p>

              {/* Powered by */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-[rgba(102,102,170,1)] uppercase tracking-widest text-center">
                  Powered by
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: <Zap size={14} />, label: "Groq", sub: "Llama 3.3 70B" },
                    { icon: <Globe size={14} />, label: "OpenRouter", sub: "100+ modelos" },
                    { icon: <Cpu size={14} />, label: "Gemini", sub: "Flash / Pro" },
                    { icon: <Brain size={14} />, label: "DeepSeek", sub: "R1 Raciocínio" },
                  ].map((p) => (
                    <div
                      key={p.label}
                      className="flex items-center gap-2 px-3 py-2 bg-[rgba(0,245,255,0.04)] border border-[rgba(0,245,255,0.1)] rounded-xl"
                    >
                      <span className="text-[#00f5ff]">{p.icon}</span>
                      <div>
                        <p className="text-xs font-bold text-[rgba(224,224,255,0.9)]">{p.label}</p>
                        <p className="text-[10px] text-[rgba(102,102,170,1)]">{p.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-center gap-3 py-3 bg-[rgba(0,255,136,0.05)] border border-[rgba(0,255,136,0.2)] rounded-xl">
                <span className="w-2 h-2 rounded-full bg-[#00ff88] shadow-[0_0_6px_rgba(0,255,136,0.8)] animate-pulse" />
                <span className="text-xs font-bold text-[#00ff88] tracking-widest uppercase">
                  Versão: Ativa
                </span>
              </div>

              {/* Footer */}
              <p className="text-[10px] text-center text-[rgba(102,102,170,0.6)] font-mono">
                zarith.ai · v2.0 · Build{" "}
                {new Date().toISOString().split("T")[0].replace(/-/g, "")}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
