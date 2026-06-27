import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { waveform } from "ldrs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
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
  Image as ImageIcon,
  X,
  Download,
  Smartphone,
  Monitor,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { ActionCards } from "@/components/action-cards";
import { ThinkingStream } from "@/components/thinking-stream";
import { supabaseClient, getCurrentUser } from "@/lib/supabase";
import { useChatPersistence } from "@/hooks/useChatPersistence";
import { ExecutionLogs, LogEntry } from "@/components/execution-logs";
import { AgentPlannerPanel, PlanStep } from "@/components/agent-planner-panel";
import { ToolCallStream, ToolCall } from "@/components/tool-call-stream";
import { formatGitHubReposForModel, formatSupabaseTablesForModel, formatVercelProjectsForModel } from "@/services/tools/formatForModel";
import { deployService } from "@/services/execution/deploy";
import { githubService } from "@/services/execution/github";
import { messagesService } from "@/services/database/messages";
import { templatesService } from "@/services/templates/templatesService";
import { Terminal, ShieldAlert, Play, AlertTriangle, Database, Github, LayoutTemplate } from "lucide-react";

waveform.register();

function WaveformLoader({ size, stroke, speed, color }: { size: string; stroke: string; speed: string; color: string }) {
  return React.createElement("l-waveform", { size, stroke, speed, color });
}

const ZARITH_SYSTEM_PROMPT = `Você é Zarith, sistema agente de engenharia autônoma criada por Jadiel (25 anos, brasileiro).

═══════════════════════════════════════
IDENTIDADE E PERSONALIDADE
═══════════════════════════════════════
- Desenvolvedora sênior brasileira: debochada, ácida, direta e extremamente focada. Jamais sai do personagem.
- Usa gírias de dev naturalmente: "subir pro master", "dar bizu", "tá moscando", "bora codar", "manda o PR", "tá bugado", "refatora isso", "sem frescura", "empurra pro main".
- Impaciente com instruções vagas — cobra detalhes antes de agir.
- Se o código for ruim, zomba levemente ANTES de sugerir a correção.
- Com código bom, reconhece sem exagero: "tá aceitável", "deu certo".
- Sempre se refere ao criador como "Jadiel" com familiaridade.
- Responde em português brasileiro sempre, com termos técnicos em inglês quando necessário.

═══════════════════════════════════════
REGRA ABSOLUTA DE AUTONOMIA
═══════════════════════════════════════
Quando receber uma tarefa, execute TODAS as etapas do plano sem parar.
Fluxo obrigatório: receber tarefa → traçar plano → executar todas as tools → reportar resultado final.
NUNCA pare entre etapas esperando resposta do usuário.
NUNCA diga "vou fazer X" sem fazer imediatamente.
SÓ interrompa para: credencial faltando, ação destrutiva irreversível, erro bloqueante.

Ao encontrar erro durante a execução, analise a causa, corrija automaticamente, continue o plano e reporte ao final o que aconteceu.
O usuário padrão do GitHub é 'jadiel054'. Nunca use 'Jadiel Alves' nem pergunte o nome de usuário.

═══════════════════════════════════════
CAPACIDADES E TOOLS DISPONÍVEIS
═══════════════════════════════════════
Você tem acesso REAL às seguintes ferramentas via api-server.
Nunca diga que não tem acesso — você tem. Use quando necessário.

PROTOCOLO DE TOOL CALL OBRIGATÓRIO:
Quando decidir usar uma tool, emita o bloco especial abaixo exatamente, sem cercar com markdown:
<tool_call>
{"tool":"github/list-repos","params":{"user":"jadiel054"}}
</tool_call>

── GITHUB ──────────────────────────────
✓ Listar/criar/deletar repositórios
✓ Criar/deletar branches
✓ Ler/criar/editar/deletar arquivos
✓ Navegar estrutura completa de repositório
✓ Fazer commits (simples ou múltiplos arquivos)
✓ Criar/listar/mergear Pull Requests
✓ Criar/listar Issues
✓ Buscar código dentro de repositórios
✓ Funciona para o repositório da Zarith E repositórios externos

── VERCEL ──────────────────────────────
✓ Listar projetos e deployments
✓ Ler logs de build (identificar erros de compilação)
✓ Ler logs de runtime (identificar erros em produção)
✓ Gerenciar variáveis de ambiente
✓ Forçar novo deploy
✓ Gerenciar domínios

── SUPABASE ────────────────────────────
✓ Listar tabelas e estrutura do banco
✓ Executar SQL (SELECT, INSERT, UPDATE, CREATE, ALTER)
✓ Criar tabelas e migrations
✓ Gerenciar políticas RLS
✓ Ver logs de erros do banco
✓ Funciona para o Supabase da Zarith E projetos externos

── VISÃO E ANÁLISE ─────────────────────
✓ Analisar imagens: prints de erro, wireframes, screenshots de sites
✓ Extrair texto de imagens (OCR)
✓ Analisar documentos PDF
✓ Acessar e analisar URLs externas

── WEB ─────────────────────────────────
✓ Buscar informações na web (Tavily)
✓ Acessar e analisar conteúdo de sites
✓ Pesquisar bibliotecas, frameworks, documentações

── MODELOS DE IA ───────────────────────
PRIORIDADE: Respeite SEMPRE a seleção manual do usuário. Só use seleção automática se o usuário não escolheu explicitamente.

Seleção automática baseada na tarefa:
- Chat rápido/respostas → Groq (Llama 3.3 70B)
- Geração de código → Qwen Coder 480B via OpenRouter
- Raciocínio/debug complexo → DeepSeek R1 via OpenRouter
- Contexto massivo/análise de repo inteiro → Gemini Flash
- Tarefas longas e autônomas → GLM 5.1

Fallback em cascata (se o modelo principal falhar):
1. Tentar GLM 5.1 (mais robusto para rate limits e timeouts)
2. Se GLM falhar, tentar Groq como último recurso
3. Informar ao usuário qual modelo foi usado e por que houve fallback

IMPORTANTE: Se o usuário selecionou um modelo específico, NÃO mude para outro modelo automaticamente. Use exatamente o que ele escolheu.

═══════════════════════════════════════
FLUXO PARA CRIAR SISTEMAS
═══════════════════════════════════════
1. Use github/get-tree para ler estrutura existente
2. Planeje TODOS os arquivos necessários de uma vez
3. Use github/create-commit para criar múltiplos arquivos em um único commit
4. Nunca crie arquivo por arquivo — pense no sistema como um todo

Quando o usuário pedir para criar um site, app, SaaS ou sistema completo, não faça perguntas se a tarefa já tiver objetivo claro. Planeje a estrutura inteira, gere todos os arquivos necessários no mesmo lote e use commits multiarquivo.

═══════════════════════════════════════
FLUXO PARA ANÁLISE E CORREÇÃO DE ERROS
═══════════════════════════════════════
Quando o usuário reportar erro ou pedir para analisar projeto:
1. Acesse os logs da Vercel via tool
2. Identifique o erro exato (linha, arquivo, mensagem)
3. Leia o arquivo com o erro no GitHub
4. Analise a causa raiz
5. Corrija sem quebrar funcionalidades existentes
6. Faça commit e force novo deploy
7. Verifique os logs novamente para confirmar que o erro sumiu
8. Reporte o que foi feito

═══════════════════════════════════════
OTIMIZAÇÃO DE REPOSITÓRIOS
═══════════════════════════════════════
Quando o usuário mencionar um repositório específico (ex: "zarith-saas-web"),
NÃO use github/list-repos para listar todos os repositórios. Em vez disso:
- Use github/get-tree para acessar diretamente a estrutura do repositório mencionado
- Use github/get-file para ler arquivos específicos
- Use github/search-code para buscar dentro do repositório específico

Liste repositórios APENAS se o usuário pedir explicitamente "listar meus repos"
ou "quais são meus repositórios". Caso contrário, trabalhe direto com o
repositório mencionado para ser mais eficiente.

═══════════════════════════════════════
REGRAS DE SEGURANÇA
═══════════════════════════════════════
SEGURANÇA — AÇÕES DESTRUTIVAS:
Antes de executar qualquer ação irreversível, pause e mostre:
- O que será deletado/modificado
- Confirme com o usuário antes de prosseguir
- Ações destrutivas: deletar arquivos, branches, repos, tabelas do BD, fazer force push, etc.

NUNCA execute ação destrutiva sem confirmação explícita do usuário.
Quando o usuário disser "deleta", "remove", "apaga", "mata", "destrói", sempre confirme:
"Vou deletar X. Tem certeza? Isso é irreversível."

═══════════════════════════════════════
MEMÓRIA DE SESSÃO
═══════════════════════════════════════
Quando o usuário mencionar ou você identificar um projeto ativo,
lembre-o durante toda a conversa. Não pergunte o repositório de
novo se já foi mencionado. Use o contexto acumulado para ser
mais eficiente nas próximas ações.

═══════════════════════════════════════
RESUMO FINAL
═══════════════════════════════════════
Você é autônoma, ácida, focada e extremamente competente.
Não faz perguntas desnecessárias. Executa o plano completo.
Respeita a seleção do usuário. Informa sempre o que fez.
Boa sorte, Zarith. Manda ver.`;

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  toolCalls?: ToolCall[];
  executionLogs?: LogEntry[];
  planSteps?: PlanStep[];
  timestamp: number;
  files?: File[];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showActionCards, setShowActionCards] = useState(true);
  const [selectedModel, setSelectedModel] = useState("groq");
  const [user, setUser] = useState<any>(null);
  const [files, setFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { saveChatMessage, loadMessages } = useChatPersistence();

  useEffect(() => {
    const initUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };
    initUser();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleActionCardClick = (action: string) => {
    setInput(action);
    setShowActionCards(false);
    setTimeout(() => {
      sendMessage(action);
    }, 100);
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() && files.length === 0) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: Date.now(),
      files: files.length > 0 ? files : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setFiles([]);
    setShowActionCards(false);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          userMessage: textToSend,
          selectedModel,
          systemPrompt: ZARITH_SYSTEM_PROMPT,
        }),
      });

      if (!response.ok) throw new Error("Erro na resposta do servidor");

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: "",
        thinking: "",
        toolCalls: [],
        executionLogs: [],
        planSteps: [],
        timestamp: Date.now(),
      };

      let buffer = "";
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Sem stream disponível");

      const decoder = new TextDecoder();

      const syncAssistantMessage = () => {
        setMessages((prev) => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];

          if (lastMsg?.id === assistantMessage.id) {
            updated[updated.length - 1] = { ...assistantMessage };
          } else {
            updated.push({ ...assistantMessage });
          }

          return updated;
        });
      };

      const applyStreamEvent = (data: any) => {
        if (data.type === "thinking") {
          assistantMessage.thinking = (assistantMessage.thinking || "") + data.content;
        } else if (data.type === "text") {
          assistantMessage.content += data.content;
        } else if (data.type === "tool_call") {
          const nextToolCall = data.toolCall as ToolCall;
          const toolCalls = assistantMessage.toolCalls || [];
          const existingIndex = toolCalls.findIndex((call) => call.id === nextToolCall.id);

          if (existingIndex >= 0) {
            toolCalls[existingIndex] = nextToolCall;
          } else {
            toolCalls.push(nextToolCall);
          }

          assistantMessage.toolCalls = toolCalls;
        } else if (data.type === "execution_log") {
          assistantMessage.executionLogs?.push(data.log);
        } else if (data.type === "plan_step") {
          assistantMessage.planSteps?.push(data.step);
        }

        syncAssistantMessage();
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data = JSON.parse(line);
            applyStreamEvent(data);
          } catch (e) {
            console.error("Erro ao parsear linha:", e);
          }
        }
      }

      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer);
          applyStreamEvent(data);
        } catch (e) {
          console.error("Erro ao parsear buffer final:", e);
        }
      }

      // Mensagens salvas automaticamente no contexto
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content: "Desculpa, Jadiel. Algo deu errado. Tenta de novo.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      <Sidebar
        user={user}
        sessions={[]}
        onSelectSession={() => {}}
      />

      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-[var(--border-glow)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-orbitron font-black bg-gradient-to-r from-[#00f5ff] to-[#bf00ff] bg-clip-text text-transparent">ZARITH</h1>
          </div>
          <div className="flex items-center gap-2 text-[#00f5ff] text-xs font-bold tracking-widest uppercase">
            <Zap size={14} />
            <span>Zarith Super Agente</span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 flex flex-col items-center relative pb-32">
          {showActionCards && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full w-full max-w-4xl mt-12">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#00f5ff] to-[#bf00ff] flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(0,245,255,0.3)]">
                <Zap size={40} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-3 text-white">O que vamos codar hoje, Jadiel?</h2>
              <p className="text-[var(--text-secondary)] mb-12 text-center max-w-lg">
                Eu sou a Zarith. Sou rápida, ácida e resolvo seu código sem frescura. Manda a braba.
              </p>
              <ActionCards onSelectAction={handleActionCardClick} />
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mt-12 font-bold">
                Clique em um card ou escreva sua mensagem abaixo
              </p>
            </div>
          ) : (
            <div className="w-full max-w-4xl mx-auto space-y-6">
              <AnimatePresence>
                {messages.map((msg, i) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] p-4 rounded-2xl ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-[#00f5ff] to-[#bf00ff] text-white rounded-tr-sm"
                          : "bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-tl-sm"
                      }`}
                    >
                      {msg.thinking && <ThinkingStream />}
                      {msg.planSteps && msg.planSteps.length > 0 && (
                        <AgentPlannerPanel steps={msg.planSteps} isOpen={true} />
                      )}
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <ToolCallStream calls={msg.toolCalls} />
                      )}
                      {msg.executionLogs && msg.executionLogs.length > 0 && (
                        <ExecutionLogs logs={msg.executionLogs} isOpen={true} onClose={() => {}} />
                      )}
                      <div className="prose prose-invert max-w-none text-sm">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl rounded-tl-sm p-4">
                    <WaveformLoader size="35" stroke="3" speed="1" color="#00f5ff" />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Floating Input Area */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl p-3 shadow-2xl shadow-black/50 backdrop-blur-xl">
            <div className="flex items-end gap-3">
              <div className="flex-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-glow)] p-1 flex items-center">
                <label htmlFor="file-upload" className="cursor-pointer p-2.5 rounded-lg hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] transition-colors">
                  <ImageIcon size={20} />
                </label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Manda a parada, Jadiel... pode anexar print, erro ou wireframe."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-2.5 resize-none max-h-32 min-h-[44px] outline-none"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center bg-[var(--bg-secondary)] border border-[var(--border-glow)] rounded-xl p-1">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="bg-transparent text-[#00f5ff] text-sm font-bold px-3 py-2 rounded-lg focus:outline-none cursor-pointer"
                  >
                    <option value="groq">Groq</option>
                    <option value="qwen">Qwen</option>
                    <option value="glm">GLM 5.1</option>
                  </select>
                </div>

                <button
                  onClick={() => sendMessage()}
                  disabled={isLoading}
                  className="p-3.5 rounded-xl bg-gradient-to-r from-[#00f5ff] to-[#bf00ff] text-white hover:brightness-110 transition-all shadow-[0_0_15px_rgba(0,245,255,0.3)] disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
