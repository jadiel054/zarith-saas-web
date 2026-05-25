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
  ChevronDown,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";

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
      model: activeModel.name,
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const fullResponse = `Esta é uma resposta simulada via ${activeModel.name}. O streaming real token por token será integrado com as chaves de API fornecidas em Configurações.`;
      const tokens = fullResponse.split(" ");

      for (let i = 0; i < tokens.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
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
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      <Sidebar user={{ name: "Usuário" }} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-[var(--border-glow)] flex items-center px-6 bg-[var(--bg-secondary)] gap-4 shrink-0">
          <div className="flex-1" />
          <div className="relative">
            <button
              onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-xl hover:border-[var(--accent-cyan)] transition-all text-sm font-bold"
            >
              <span className="text-[var(--accent-cyan)]">{activeModel.icon}</span>
              {activeModel.name}
              <ChevronDown size={14} className={`transition-transform ${isModelMenuOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {isModelMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-64 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl shadow-2xl overflow-hidden z-50"
                >
                  {MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => { setActiveModel(model); setIsModelMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-card-hover)] transition-all text-left ${activeModel.id === model.id ? "text-[var(--accent-cyan)]" : ""}`}
                    >
                      <span>{model.icon}</span>
                      <div>
                        <p className="font-bold text-sm">{model.name}</p>
                        <p className="text-[10px] text-[var(--text-secondary)]">{model.desc}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setWebSearchEnabled(!webSearchEnabled)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-xs font-bold ${
              webSearchEnabled
                ? "bg-[var(--accent-cyan)]/10 border-[var(--accent-cyan)] text-[var(--accent-cyan)]"
                : "border-[var(--border-glow)] text-[var(--text-secondary)]"
            }`}
          >
            <Search size={14} />
            Web
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center glow-cyan">
                <Bot size={40} className="text-white" />
              </div>
              <h2 className="font-orbitron font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)]">
                ZARITH ONLINE
              </h2>
              <p className="text-[var(--text-secondary)] max-w-md">
                Sistema de IA pronto. Configure suas API keys em Configurações para ativar os modelos.
              </p>
            </div>
          )}

          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center shrink-0">
                  <Bot size={20} className="text-white" />
                </div>
              )}
              <div className={`max-w-[70%] space-y-2 ${message.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                {message.model && (
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                    {message.model}
                  </span>
                )}
                <div
                  className={`p-4 rounded-2xl font-mono text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-[var(--accent-cyan)]/20 to-[var(--accent-purple)]/20 border border-[var(--accent-cyan)]/30"
                      : "bg-[var(--bg-card)] border border-[var(--border-glow)]"
                  }`}
                >
                  {message.content || (
                    <span className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-bounce delay-75" />
                      <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-bounce delay-150" />
                    </span>
                  )}
                </div>
                {message.role === "assistant" && message.content && (
                  <div className="flex gap-2">
                    <button className="p-1.5 hover:text-[var(--accent-cyan)] text-[var(--text-secondary)] transition-colors">
                      <Copy size={14} />
                    </button>
                    <button className="p-1.5 hover:text-[var(--accent-cyan)] text-[var(--text-secondary)] transition-colors">
                      <RotateCcw size={14} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-[var(--border-glow)] bg-[var(--bg-secondary)]">
          <div className="max-w-4xl mx-auto relative">
            <div className="flex items-end gap-3 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl p-3 focus-within:border-[var(--accent-cyan)] transition-all">
              <button className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors">
                <Paperclip size={18} />
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Mensagem para Zarith..."
                className="flex-1 bg-transparent outline-none resize-none font-mono text-sm max-h-32 min-h-[24px]"
                rows={1}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="p-2 bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] text-[var(--bg-primary)] rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-center text-[10px] text-[var(--text-secondary)] mt-3 uppercase tracking-widest">
              Zarith pode cometer erros. Verifique informações importantes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
