import { useState, useRef, useEffect, useCallback } from "react";
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
  Check,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { supabaseClient, getCurrentUser } from "@/lib/supabase";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
}

interface UserData {
  name: string;
  email?: string;
  avatarUrl?: string;
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData>({ name: "Usuário" });
  const [authChecked, setAuthChecked] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Proteção de rota — redireciona para login se não autenticado
  useEffect(() => {
    const checkAuth = async () => {
      if (!supabaseClient) {
        // Sem Supabase configurado, permite acesso (modo dev)
        setAuthChecked(true);
        return;
      }
      const user = await getCurrentUser();
      if (!user) {
        window.location.href = "/";
        return;
      }
      // Popula dados reais do usuário
      const name =
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        user.email?.split("@")[0] ||
        "Usuário";
      const avatarUrl =
        (user.user_metadata?.avatar_url as string) ||
        (user.user_metadata?.picture as string) ||
        undefined;
      setUserData({ name, email: user.email, avatarUrl });
      setAuthChecked(true);
    };
    checkAuth();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
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
      // Tenta usar chave da API salva no localStorage
      const groqKey = localStorage.getItem("zarith_apikey_Groq");
      const geminiKey = localStorage.getItem("zarith_apikey_Gemini");

      let fullResponse: string;

      if (activeModel.id === "groq" && groqKey) {
        // Chama a API Groq real com a chave salva
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              ...messages.map((m) => ({ role: m.role, content: m.content })),
              { role: "user", content: userMessage.content },
            ],
            max_tokens: 1024,
          }),
        });
        if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
        const data = await res.json() as { choices: { message: { content: string } }[] };
        fullResponse = data.choices[0]?.message?.content || "Sem resposta.";
      } else if (activeModel.id === "gemini" && geminiKey) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: userMessage.content }] }],
            }),
          }
        );
        if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
        const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] };
        fullResponse = data.candidates[0]?.content?.parts[0]?.text || "Sem resposta.";
      } else {
        fullResponse = `⚠️ Configure sua chave de API para ${activeModel.name} em Configurações → API Keys para ativar respostas reais. Por enquanto, este é um modo de demonstração.`;
      }

      // Simula streaming token a token
      const tokens = fullResponse.split(" ");
      for (let i = 0; i < tokens.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 30));
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant") {
            last.content += (i === 0 ? "" : " ") + tokens[i];
          }
          return updated;
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro desconhecido.";
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          last.content = `❌ Erro ao conectar com ${activeModel.name}: ${msg}`;
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, activeModel, messages]);

  const handleRetry = useCallback(async (messageId: string) => {
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx <= 0) return;
    // Pega a última mensagem de usuário antes desta resposta
    const prevUser = messages.slice(0, idx).findLast((m) => m.role === "user");
    if (!prevUser) return;
    // Remove a mensagem de assistente atual e reenvia
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    setInput(prevUser.content);
  }, [messages]);

  const handleCopy = useCallback(async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback para browsers antigos
      const el = document.createElement("textarea");
      el.value = content;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Aguarda verificação de auth antes de renderizar
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      <Sidebar user={userData} />

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
            title={webSearchEnabled ? "Web search ativo (requer chave Tavily em Configurações)" : "Ativar web search"}
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
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center">
                <Bot size={36} className="text-white" />
              </div>
              <h2 className="font-orbitron font-black text-2xl tracking-widest text-glow-cyan">
                ZARITH
              </h2>
              <p className="text-[var(--text-secondary)] text-sm max-w-sm">
                Olá, {userData.name}! Selecione um modelo acima e comece a conversar.
                {!localStorage.getItem("zarith_apikey_Groq") && !localStorage.getItem("zarith_apikey_Gemini") && (
                  <span className="block mt-2 text-[var(--accent-pink)] text-xs">
                    ⚠️ Nenhuma chave de API configurada. Acesse Configurações → API Keys.
                  </span>
                )}
              </p>
            </div>
          )}

          <AnimatePresence>
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
                      <span className="flex gap-1 items-center">
                        <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-bounce" />
                        <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-bounce delay-75" />
                        <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-bounce delay-150" />
                      </span>
                    )}
                  </div>
                  {message.role === "assistant" && message.content && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(message.id, message.content)}
                        title="Copiar resposta"
                        className="p-1.5 hover:text-[var(--accent-cyan)] text-[var(--text-secondary)] transition-colors"
                      >
                        {copiedId === message.id ? <Check size={14} className="text-[var(--accent-green)]" /> : <Copy size={14} />}
                      </button>
                      <button
                        onClick={() => handleRetry(message.id)}
                        title="Tentar novamente"
                        disabled={isLoading}
                        className="p-1.5 hover:text-[var(--accent-cyan)] text-[var(--text-secondary)] transition-colors disabled:opacity-40"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-[var(--border-glow)] bg-[var(--bg-secondary)]">
          <div className="max-w-4xl mx-auto relative">
            <div className="flex items-end gap-3 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl p-3 focus-within:border-[var(--accent-cyan)] transition-all">
              <label
                htmlFor="file-upload"
                title="Anexar arquivo (em breve)"
                className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors cursor-not-allowed opacity-50"
              >
                <Paperclip size={18} />
              </label>
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
