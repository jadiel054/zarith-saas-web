"use client";

export const dynamic = "force-dynamic";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, 
  Paperclip, 
  Copy, 
  RotateCcw, 
  Search, 
  Cpu, 
  Brain, 
  Zap, 
  Globe, 
  Bot,
  ChevronDown
} from "lucide-react";
import { Sidebar } from "./_components/sidebar";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
}

const MODELS = [
  { id: "groq", name: "Groq", icon: <Zap size={16} />, desc: "Llama 3.3 70B (rápido)" },
  { id: "qwen", name: "Qwen", icon: <Cpu size={16} />, desc: "Coder 480B (código)" },
  { id: "deepseek", name: "DeepSeek", icon: <Brain size={16} />, desc: "R1 (raciocínio)" },
  { id: "gemini", name: "Gemini", icon: <Globe size={16} />, desc: "Flash (contexto massivo)" },
  { id: "glm", name: "GLM", icon: <Bot size={16} />, desc: "5.1 (longo prazo)" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeModel, setActiveModel] = useState(MODELS[0]);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      model: activeModel.name
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // Simulação de streaming (em produção usaria Vercel AI SDK)
      const fullResponse = `Esta é uma resposta simulada via ${activeModel.name}. O streaming real token por token será integrado com as chaves de API fornecidas em Settings.`;
      const tokens = fullResponse.split(" ");
      
      for (let i = 0; i < tokens.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          last.content += (i === 0 ? "" : " ") + tokens[i];
          return updated;
        });
      }
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] overflow-hidden">
      <Sidebar user={{ name: "jadiel054" }} />

      <main className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="h-16 border-b border-[var(--border-glow)] flex items-center justify-between px-6 bg-[var(--bg-primary)] z-20">
          <div className="relative">
            <button 
              onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-glow)] rounded-xl hover:border-[var(--accent-cyan)] transition-all"
            >
              <span className="text-[var(--accent-cyan)]">{activeModel.icon}</span>
              <span className="font-bold text-sm">{activeModel.name}</span>
              <ChevronDown size={14} className={`transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isModelMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 mt-2 w-64 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-xl shadow-2xl overflow-hidden"
                >
                  {MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setActiveModel(model);
                        setIsModelMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-card-hover)] transition-all text-left"
                    >
                      <span className="text-[var(--accent-cyan)]">{model.icon}</span>
                      <div>
                        <p className="text-sm font-bold">{model.name}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{model.desc}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setWebSearchEnabled(!webSearchEnabled)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
                webSearchEnabled 
                ? 'bg-[var(--accent-cyan)]/10 border-[var(--accent-cyan)] text-[var(--accent-cyan)]' 
                : 'border-[var(--border-glow)] text-[var(--text-secondary)]'
              }`}
            >
              <Search size={14} />
              Web Search
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] rounded-3xl flex items-center justify-center mb-6 glow-cyan"
              >
                <Bot size={40} className="text-white" />
              </motion.div>
              <h2 className="font-orbitron text-3xl font-black mb-2">ZARITH CORE</h2>
              <p className="text-[var(--text-secondary)] mb-8 max-w-md">
                Pronta para processar. Escolha um modelo ou digite sua solicitação abaixo.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
                {[
                  "Explique computação quântica como um hacker",
                  "Crie um script Python para automação de rede",
                  "Analise o repositório jadiel054/zarith",
                  "Como otimizar o build do Next.js?"
                ].map((hint, i) => (
                  <button 
                    key={i}
                    onClick={() => setInput(hint)}
                    className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-glow)] rounded-xl hover:border-[var(--accent-cyan)] hover:bg-[var(--bg-card-hover)] transition-all text-sm text-left"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex gap-4 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center ${
                    msg.role === "user" 
                    ? "bg-[var(--bg-card)] border border-[var(--border-glow)]" 
                    : "bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] glow-cyan"
                  }`}>
                    {msg.role === "user" ? <User size={20} /> : <Bot size={20} className="text-white" />}
                  </div>
                  
                  <div className="space-y-2">
                    <div className={`p-4 rounded-2xl font-mono text-sm leading-relaxed ${
                      msg.role === "user"
                      ? "bg-[var(--bg-card)] border border-[var(--border-glow)] text-[var(--text-primary)]"
                      : "bg-[var(--bg-secondary)] border border-[var(--border-glow)] text-[var(--text-primary)]"
                    }`}>
                      {msg.content}
                      {isLoading && i === messages.length - 1 && (
                        <span className="inline-block w-2 h-4 bg-[var(--accent-cyan)] ml-1 animate-pulse" />
                      )}
                    </div>
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-3 px-2">
                        <span className="text-[10px] uppercase font-bold tracking-tighter text-[var(--text-secondary)]">
                          via {msg.model}
                        </span>
                        <button className="text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors">
                          <Copy size={12} />
                        </button>
                        <button className="text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors">
                          <RotateCcw size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-gradient-to-t from-[var(--bg-primary)] to-transparent">
          <div className="max-w-4xl mx-auto relative">
            <div className="absolute -top-10 left-0 flex gap-2">
              <button className="px-3 py-1 bg-[var(--bg-secondary)] border border-[var(--border-glow)] rounded-lg text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-all flex items-center gap-1">
                <Paperclip size={10} />
                ANEXAR REPO
              </button>
            </div>

            <div className="bg-[var(--bg-secondary)] border border-[var(--border-glow)] rounded-2xl p-2 focus-within:border-[var(--accent-cyan)] focus-within:glow-cyan transition-all">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Digite para a Zarith..."
                className="w-full bg-transparent border-none focus:ring-0 p-3 text-sm font-mono resize-none h-12 max-h-40"
                rows={1}
              />
              <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--border-glow)]/50">
                <div className="flex items-center gap-4 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                  <span>Shift + Enter para nova linha</span>
                  <span>~ {Math.floor(input.length / 4)} tokens</span>
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  className="p-2 bg-[var(--accent-cyan)] text-[var(--bg-primary)] rounded-xl hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Re-using User icon from Lucide
function User({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  );
}
