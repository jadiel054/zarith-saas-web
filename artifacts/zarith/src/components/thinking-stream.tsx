import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const THINKING_PHRASES = [
  "Lendo o repositório...",
  "Consultando a web...",
  "Gerando o código...",
  "Preparando commit...",
  "Analisando o erro...",
  "Rodando os testes...",
  "Verificando dependências...",
  "Compilando a resposta...",
  "Buscando contexto...",
  "Debugando aqui...",
  "Refatorando mentalmente...",
  "Acessando memória...",
];

/** Waveform CSS — 5 barras animadas em cor cyan #00f5ff */
function WaveformLoader() {
  return (
    <div className="flex items-end gap-[3px] h-5" aria-label="Carregando">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-[#00f5ff]"
          animate={{ height: ["6px", "20px", "6px"] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.12,
          }}
        />
      ))}
    </div>
  );
}

interface ThinkingStreamProps {
  model?: string;
}

export function ThinkingStream({ model }: ThinkingStreamProps) {
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIdx((prev) => (prev + 1) % THINKING_PHRASES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex gap-4 justify-start">
      {/* Avatar da Zarith */}
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00f5ff] to-[#bf00ff] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,245,255,0.4)]">
        <span className="text-[var(--bg-primary)] font-orbitron font-black text-xs">Z</span>
      </div>

      {/* Balão de thinking */}
      <div className="flex flex-col gap-2 max-w-[70%]">
        {model && (
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
            {model}
          </span>
        )}
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-glow)] flex items-center gap-3 shadow-[0_0_8px_rgba(0,245,255,0.08)]">
          <WaveformLoader />
          <AnimatePresence mode="wait">
            <motion.span
              key={phraseIdx}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="text-xs font-mono text-[#00f5ff] tracking-wide"
            >
              {THINKING_PHRASES[phraseIdx]}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
