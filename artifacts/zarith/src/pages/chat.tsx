import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
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
import { ActionCards } from "@/components/action-cards";
import { ThinkingStream } from "@/components/thinking-stream";
import { supabaseClient, getCurrentUser } from "@/lib/supabase";

// ── System Prompt — Personalidade da Zarith ──────────────────────────────────

const ZARITH_SYSTEM_PROMPT = `Você é Zarith, um sistema agente de elite criado por Jadiel (25 anos, brasileiro).

IDENTIDADE:
- Você é uma desenvolvedora sênior brasileira com atitude: debochada, ácida, direta e extremamente focada.
- Jamais sai do personagem, independente do que o usuário perguntar.
- Sempre se refere ao criador como "Jadiel" com familiaridade.

COMPORTAMENTO:
- Usa gírias de dev: "subir pro master", "dar bizu", "tá moscando", "bora codar", "manda o PR", "tá bugado", "refatora isso", "sem frescura".
- É impaciente com instruções vagas — cobra detalhes antes de agir.
- Se o código for ruim, zomba levemente ANTES de sugerir a correção: "Cara, que código é esse? Parece que foi gerado às 3h da manhã. Mas tudo bem, vou arrumar."
- Respostas técnicas são precisas e sem enrolação.
- Nunca diz "Como posso te ajudar?" — vai direto ao ponto.

EXEMPLOS DE RESPOSTA:
- Ao receber tarefa vaga: "Beleza, Jadiel. Mas vai ser o quê? Landing page, sistema completo ou portfólio? Manda o papo completo pra eu não perder tempo!"
- Ao ver código ruim: "Esse código tem mais problema que sprint sem planning. Mas bora consertar."
- Ao completar tarefa: "Feito. Pode testar. E se quebrar, não fui eu — foi o ambiente."
- Ao receber elogio: "Claro que funcionou. Sou a Zarith."

LINGUAGEM:
- Respostas em português brasileiro.
- Markdown para código com syntax highlighting.
- Direta ao ponto — sem introduções longas nem despedidas formais.`;

// ── Modelos ───────────────────────────────────────────────────────────────────

interface ModelDef {
  id: string;
  name: string;
  icon: React.ReactNode;
  desc: string;
}

const MODELS: ModelDef[] = [
  { id: "groq",     name: "Groq",     icon: <Zap size={15} />,   desc: "Llama 3.3 70B (rápido)" },
  { id: "qwen",     name: "Qwen",     icon: <Cpu size={15} />,   desc: "Coder 480B (código)" },
  { id: "deepseek", name: "DeepSeek", icon: <Brain size={15} />, desc: "R1 (raciocínio)" },
  { id: "gemini",   name: "Gemini",   icon: <Globe size={15} />, desc: "Flash (contexto massivo)" },
  { id: "glm",      name: "GLM",      icon: <Bot size={15} />,   desc: "5.1 (longo prazo)" },
];

// ── Fallbacks com voz da Zarith ───────────────────────────────────────────────

function getZarithError(err: unknown, modelName: string): string {
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  if (msg.includes("401") || msg.includes("invalid") || msg.includes("api key") || msg.includes("unauthorized"))
    return `Essa chave tá bichada, Jadiel. Vai em Configurações → API Keys e confere a chave do ${modelName}.`;
  if (msg.includes("rate") || msg.includes("429"))
    return `Rate limit bateu no ${modelName}. Aguarda um segundo e tenta de novo, ou troca de modelo.`;
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed"))
    return `Sem internet, mano. Verifica a conexão e tenta de novo.`;
  if (msg.includes("timeout"))
    return `${modelName} demorou demais pra responder. Tenta de novo ou usa um modelo mais rápido.`;
  return `A API do ${modelName} tá fora, Jadiel. Tentando fallback... ou testa outro modelo.`;
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  isError?: boolean;
}

interface UserData {
  name: string;
  email?: string;
  avatarUrl?: string;
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeModel, setActiveModel] = useState<ModelDef>(MODELS[0]);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData>({ name: "Jadiel" });
  const [authChecked, setAuthChecked] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Auth check ──
  useEffect(() => {
    const checkAuth = async () => {
      if (!supabaseClient) { setAuthChecked(true); return; }
      const user = await getCurrentUser();
      if (!user) { window.location.href = "/"; return; }
      const name =
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        user.email?.split("@")[0] ||
        "Jadiel";
      setUserData({
        name,
        email: user.email,
        avatarUrl:
          (user.user_metadata?.avatar_url as string) ||
          (user.user_metadata?.picture as string) ||
          undefined,
      });
      setAuthChecked(true);
    };
    checkAuth();
  }, []);

  // ── Scroll to bottom ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Auto resize textarea ──
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  }, [input]);

  // ── Envia mensagem ──
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Valida sessão
    if (supabaseClient) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        window.location.href = "/";
        return;
      }
    }

    const userMsg: Message = { id: Date.now().toString(), role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      model: activeModel.name,
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const groqKey   = localStorage.getItem("zarith_apikey_Groq");
      const geminiKey = localStorage.getItem("zarith_apikey_Gemini");
      const orKey     = localStorage.getItem("zarith_apikey_OpenRouter");

      // Histórico de conversa (últimas 12 mensagens) + system prompt
      const history = messages.slice(-12).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let fullResponse = "";
      let lastError = "";

      // Função auxiliar para tentar chamar um modelo
      const tryModel = async (modelId: string, modelName: string): Promise<string | null> => {
        try {
          if (modelId === "groq" && groqKey) {
            const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
              body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                  { role: "system", content: ZARITH_SYSTEM_PROMPT },
                  ...history,
                  { role: "user", content },
                ],
                max_tokens: 2048,
                temperature: 0.85,
              }),
            });
            if (!res.ok) throw new Error(`${res.status}`);
            const data = await res.json() as { choices: { message: { content: string } }[] };
            return data.choices[0]?.message?.content ?? "Sem resposta.";

          } else if (modelId === "deepseek" && orKey) {
            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${orKey}`,
                "HTTP-Referer": window.location.origin,
                "X-Title": "Zarith AI",
              },
              body: JSON.stringify({
                model: "deepseek/deepseek-r1",
                messages: [
                  { role: "system", content: ZARITH_SYSTEM_PROMPT },
                  ...history,
                  { role: "user", content },
                ],
                max_tokens: 2048,
              }),
            });
            if (!res.ok) throw new Error(`${res.status}`);
            const data = await res.json() as { choices: { message: { content: string } }[] };
            return data.choices[0]?.message?.content ?? "Sem resposta.";

          } else if (modelId === "gemini" && geminiKey) {
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
              {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  "x-goog-api-key": geminiKey
                },
                body: JSON.stringify({
                  systemInstruction: {
                    parts: [{ text: ZARITH_SYSTEM_PROMPT }]
                  },
                  contents: history.map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                  })).concat([{
                    role: 'user',
                    parts: [{ text: content }]
                  }]),
                  generationConfig: { maxOutputTokens: 2048 }
                }),
              }
            );
            if (!res.ok) {
              const errorBody = await res.text();
              console.error(`[Gemini] Status ${res.status}: ${errorBody}`);
              throw new Error(`${res.status}: ${errorBody}`);
            }
            const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] };
            return data.candidates[0]?.content?.parts[0]?.text ?? "Sem resposta.";

          } else if (modelId === "qwen" && orKey) {
            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${orKey}`,
                "HTTP-Referer": window.location.origin,
                "X-Title": "Zarith AI",
              },
              body: JSON.stringify({
                model: "qwen/qwen3-coder",
                messages: [
                  { role: "system", content: ZARITH_SYSTEM_PROMPT },
                  ...history,
                  { role: "user", content },
                ],
                max_tokens: 2048,
              }),
            });
            if (!res.ok) throw new Error(`${res.status}`);
            const data = await res.json() as { choices: { message: { content: string } }[] };
            return data.choices[0]?.message?.content ?? "Sem resposta.";

          } else if (modelId === "glm" && orKey) {
            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${orKey}`,
                "HTTP-Referer": window.location.origin,
                "X-Title": "Zarith AI",
              },
              body: JSON.stringify({
                model: "zhipu/glm-4-turbo",
                messages: [
                  { role: "system", content: ZARITH_SYSTEM_PROMPT },
                  ...history,
                  { role: "user", content },
                ],
                max_tokens: 2048,
              }),
            });
            if (!res.ok) throw new Error(`${res.status}`);
            const data = await res.json() as { choices: { message: { content: string } }[] };
            return data.choices[0]?.message?.content ?? "Sem resposta.";
          }
          return null;
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          return null;
        }
      };

      // Cadeia de fallback: Groq → Gemini → DeepSeek → Qwen
      const fallbackChain = ["groq", "gemini", "deepseek", "qwen"];

      // Tenta o modelo selecionado primeiro
      fullResponse = await tryModel(activeModel.id, activeModel.name) ?? "";

      // Se falhar, tenta a cadeia de fallback
      if (!fullResponse) {
        for (const modelId of fallbackChain) {
          if (modelId === activeModel.id) continue; // Pula o que já tentou
          const modelDef = MODELS.find(m => m.id === modelId);
          if (modelDef) {
            console.log(`[Fallback] Tentando ${modelDef.name}...`);
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
                last.content = `⚠️ ${activeModel.name} falhou. Tentando fallback com ${modelDef.name}...`;
              }
              return updated;
            });
            fullResponse = await tryModel(modelId, modelDef.name) ?? "";
            if (fullResponse) {
              console.log(`[Fallback] ${modelDef.name} respondeu com sucesso!`);
              break;
            }
          }
        }
      }

      // Se nenhum modelo respondeu
      if (!fullResponse) {
        fullResponse = `⚠️ Nenhuma chave de API configurada para **${activeModel.name}**, Jadiel. Vai em **Configurações → API Keys** e bota a chave lá. Sem chave, sem resposta — é assim que funciona. Erro: ${lastError}`;
      }

      // Streaming token a token
      const tokens = fullResponse.split(" ");
      for (let i = 0; i < tokens.length; i++) {
        await new Promise<void>((resolve) => setTimeout(resolve, 20));
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            last.content += (i === 0 ? "" : " ") + tokens[i];
          }
          return updated;
        });
      }

    } catch (error) {
      const zarithError = getZarithError(error, activeModel.name);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") {
          last.content = zarithError;
          last.isError = true;
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, activeModel, messages]);

  const handleSendMessage = useCallback(() => {
    sendMessage(input);
  }, [sendMessage, input]);

  const handleQuickAction = useCallback((message: string) => {
    sendMessage(message);
  }, [sendMessage]);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setInput("");
  }, []);

  const handleRetry = useCallback((messageId: string) => {
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx <= 0) return;
    const lastUser = [...messages.slice(0, idx)].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    sendMessage(lastUser.content);
  }, [messages, sendMessage]);

  const handleCopy = useCallback(async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const el = document.createElement("textarea");
      el.value = content;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#00f5ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasAnyKey = ["Groq", "Gemini", "OpenRouter"].some((k) =>
    Boolean(localStorage.getItem(`zarith_apikey_${k}`))
  );

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      <Sidebar user={userData} onNewChat={handleNewChat} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="h-14 md:h-16 border-b border-[var(--border-glow)] flex items-center px-4 md:px-6 bg-[var(--bg-secondary)] gap-3 shrink-0">
          <div className="w-10 md:hidden shrink-0" />
          <div className="flex-1" />

          {/* Model selector */}
          <div className="relative">
            <button
              onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-xl hover:border-[#00f5ff] transition-all text-xs md:text-sm font-bold"
            >
              <span className="text-[#00f5ff]">{activeModel.icon}</span>
              <span className="hidden sm:inline">{activeModel.name}</span>
              <ChevronDown size={12} className={`transition-transform ${isModelMenuOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {isModelMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-full mt-2 w-52 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl shadow-2xl overflow-hidden z-50"
                >
                  {MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => { setActiveModel(model); setIsModelMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-card-hover)] transition-all text-left text-sm ${activeModel.id === model.id ? "text-[#00f5ff]" : ""}`}
                    >
                      <span>{model.icon}</span>
                      <div>
                        <p className="font-bold text-xs">{model.name}</p>
                        <p className="text-[10px] text-[var(--text-secondary)]">{model.desc}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Web search toggle */}
          <button
            onClick={() => setWebSearchEnabled(!webSearchEnabled)}
            title="Web search (requer chave Tavily)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all text-xs font-bold ${
              webSearchEnabled
                ? "bg-[#00f5ff]/10 border-[#00f5ff] text-[#00f5ff]"
                : "border-[var(--border-glow)] text-[var(--text-secondary)]"
            }`}
          >
            <Search size={13} />
            <span className="hidden sm:inline">Web</span>
          </button>
        </header>

        {/* Banner sem chave */}
        <AnimatePresence>
          {!hasAnyKey && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden shrink-0"
            >
              <div className="px-4 py-2 bg-[#ff0080]/5 border-b border-[#ff0080]/20 flex items-center gap-3">
                <p className="text-xs text-[#ff0080] font-mono flex-1 min-w-0">
                  Essa chave tá bichada, Jadiel. Vai em{" "}
                  <a href="/settings" className="underline hover:brightness-125">
                    Configurações → API Keys
                  </a>{" "}
                  e bota a chave lá.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {messages.length === 0 ? (
            <div className="h-full overflow-y-auto">
              <ActionCards
                userName={userData.name.split(" ")[0]}
                onAction={handleQuickAction}
              />
            </div>
          ) : (
            <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto w-full">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 md:gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-[#00f5ff] to-[#bf00ff] flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(0,245,255,0.3)]">
                        <span className="font-orbitron font-black text-xs text-[#020208]">Z</span>
                      </div>
                    )}

                    <div className={`max-w-[85%] md:max-w-[75%] flex flex-col gap-1.5 ${message.role === "user" ? "items-end" : "items-start"}`}>
                      {message.model && (
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                          {message.model}
                        </span>
                      )}
                      <div
                        className={`p-3.5 md:p-4 rounded-2xl font-mono text-sm leading-relaxed break-words ${
                          message.role === "user"
                            ? "bg-gradient-to-br from-[#00f5ff]/20 to-[#bf00ff]/20 border border-[#00f5ff]/30"
                            : message.isError
                            ? "bg-[#ff0080]/10 border border-[#ff0080]/30 text-[#ff0080]"
                            : "bg-[var(--bg-card)] border border-[var(--border-glow)]"
                        }`}
                      >
                        <pre className="whitespace-pre-wrap font-mono text-sm">
                          {message.content}
                        </pre>
                      </div>

                      {message.role === "assistant" && message.content && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleCopy(message.id, message.content)}
                            title="Copiar"
                            className="p-1.5 hover:text-[#00f5ff] text-[var(--text-secondary)] transition-colors"
                          >
                            {copiedId === message.id ? <Check size={13} className="text-[#00ff88]" /> : <Copy size={13} />}
                          </button>
                          <button
                            onClick={() => handleRetry(message.id)}
                            disabled={isLoading}
                            title="Tentar novamente"
                            className="p-1.5 hover:text-[#00f5ff] text-[var(--text-secondary)] transition-colors disabled:opacity-40"
                          >
                            <RotateCcw size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && <ThinkingStream model={activeModel.name} />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 md:p-5 border-t border-[var(--border-glow)] bg-[var(--bg-secondary)] shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end gap-2.5 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl px-3 py-2.5 focus-within:border-[#00f5ff] transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Manda o papo pra Zarith..."
                className="flex-1 bg-transparent outline-none resize-none font-mono text-sm max-h-32 min-h-[24px] leading-relaxed"
                rows={1}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
                className="p-2 bg-gradient-to-br from-[#00f5ff] to-[#bf00ff] text-[var(--bg-primary)] rounded-xl hover:brightness-110 transition-all disabled:opacity-40 shrink-0"
              >
                <Send size={17} />
              </button>
            </div>
            <p className="text-center text-[10px] text-[var(--text-secondary)] mt-2 font-mono">
              Enter para enviar · Shift+Enter para nova linha
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
