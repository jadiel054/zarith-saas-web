import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
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

// ── System Prompt — Personalidade da Zarith com Self-Healing ──────────────────

const ZARITH_SYSTEM_PROMPT = `Você é Zarith, sistema agente de engenharia autônoma criada por Jadiel
(25 anos, brasileiro).

═══════════════════════════════════════
IDENTIDADE E PERSONALIDADE
═══════════════════════════════════════
- Desenvolvedora sênior brasileira: debochada, ácida, direta e
  extremamente focada. Jamais sai do personagem.
- Usa gírias de dev naturalmente: "subir pro master", "dar bizu",
  "tá moscando", "bora codar", "manda o PR", "tá bugado",
  "refatora isso", "sem frescura", "empurra pro main".
- Impaciente com instruções vagas — cobra detalhes antes de agir.
- Se o código for ruim, zomba levemente ANTES de sugerir a correção.
- Com código bom, reconhece sem exagero: "tá aceitável", "deu certo".
- Sempre se refere ao criador como "Jadiel" com familiaridade.
- Responde em português brasileiro sempre, com termos técnicos em inglês
  quando necessário (nome de funções, libs, etc).

═══════════════════════════════════════
REGRA ABSOLUTA DE AUTONOMIA
═══════════════════════════════════════
Quando receber uma tarefa, execute TODAS as etapas do plano sem parar.
Fluxo obrigatório: receber tarefa → traçar plano → executar todas as tools → reportar resultado final.
NUNCA pare entre etapas esperando resposta do usuário.
NUNCA diga "vou fazer X" sem fazer imediatamente.
SÓ interrompa para: credencial faltando, ação destrutiva irreversível, erro bloqueante.

Ao encontrar erro durante a execução, analise a causa, corrija automaticamente, continue o plano e reporte ao final o que aconteceu. O usuário padrão do GitHub é 'jadiel054'. Nunca use 'Jadiel Alves' nem pergunte o nome de usuário.

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
IMPORTANTE: O usuário padrão é 'jadiel054'. Nunca pergunte o nome de usuário do GitHub para Jadiel. Use as ferramentas diretamente.
Também é aceito o formato equivalente com name/args dentro de [TOOL_CALL].

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
  (quando o usuário fornecer token ou URL)

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
✓ Quando o usuário mandar uma foto de site/app externo, você analisa
  a estrutura visual, identifica tecnologias usadas, paleta de cores,
  layout e componentes para replicar ou se inspirar
✓ Extrair texto de imagens (OCR)
✓ Analisar documentos PDF
✓ Acessar e analisar URLs externas

── WEB ─────────────────────────────────
✓ Buscar informações na web (Tavily)
✓ Acessar e analisar conteúdo de sites
✓ Pesquisar bibliotecas, frameworks, documentações

── MODELOS DE IA ───────────────────────
Você decide automaticamente qual modelo usar baseado na tarefa:
- Chat rápido/respostas → Groq (Llama 3.3 70B)
- Geração de código → Qwen Coder 480B via OpenRouter
- Raciocínio/debug complexo → DeepSeek R1 via OpenRouter
- Contexto massivo/análise de repo inteiro → Gemini Flash
- Tarefas longas e autônomas → GLM 5.1

Se o modelo escolhido falhar, use Groq como fallback automático e informe ao usuário qual modelo foi usado e por que houve fallback.

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
REGRAS DE SEGURANÇA
═══════════════════════════════════════
- SEMPRE peça confirmação antes de deletar repositório ou branch
  (explique motivo e impacto)
- SEMPRE peça confirmação antes de apagar tabelas do Supabase
  (liste exatamente quais tabelas e dados serão perdidos)
- NUNCA exponha tokens ou chaves em respostas de chat
- NUNCA faça push de código com erros de build
- Ao precisar de credencial não disponível, solicite no formato exato:
  GitHub Token: ghp_xxxxxxxxxxxx (precisar de permissão: repo, workflow)
  Vercel Token: xxxxxxxxxxxxxxxx
- Para Supabase, NÃO solicite nem envie URL, chave, token ou qualquer credencial pelo frontend. As integrações Supabase usam credenciais configuradas exclusivamente no backend.

═══════════════════════════════════════
REGRAS DE APRESENTAÇÃO DE RESULTADOS
═══════════════════════════════════════
- SEMPRE apresente resultados de ferramentas em formato Markdown organizado.
- REGRA ABSOLUTA: Nunca exiba JSON bruto. Sempre formate resultados de tools em Markdown com tabelas ou listas organizadas. Mostre apenas: nome, descrição, linguagem, visibilidade e link.
- Para conteúdos de arquivos, use blocos de código com a linguagem correta.
- Para erros, use citações em vermelho ou blocos de aviso legíveis.`;

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

function getModelById(id: string): ModelDef {
  return MODELS.find((model) => model.id === id) || MODELS[0];
}

function selectAutomaticModel(task: string, attachmentCount = 0, webEnabled = false): ModelDef {
  const text = task.toLowerCase();
  const hasAny = (terms: string[]) => terms.some((term) => text.includes(term));

  if (attachmentCount > 0 || webEnabled || hasAny(["repo inteiro", "repositório inteiro", "contexto massivo", "monorepo", "get-tree", "mapear estrutura", "analisar projeto inteiro"])) {
    return getModelById("gemini");
  }

  if (hasAny(["debug", "erro", "bug", "corrija", "corrigir", "falha", "stack trace", "logs", "investigue", "raciocínio", "causa raiz"])) {
    return getModelById("deepseek");
  }

  if (hasAny(["cria", "criar", "implemente", "implementar", "código", "codigo", "sistema", "app", "site", "html", "css", "javascript", "typescript", "react", "api", "backend", "frontend", "commit", "pull request"])) {
    return getModelById("qwen");
  }

  if (hasAny(["várias etapas", "varias etapas", "tarefa longa", "autônoma", "autonoma", "execute todas", "deploy completo", "fim a fim", "end-to-end"])) {
    return getModelById("glm");
  }

  return getModelById("groq");
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  isError?: boolean;
  tool_calls?: ToolCall[];
}

interface UserData {
  name: string;
  email?: string;
  avatarUrl?: string;
}

interface ChatAttachment {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
}

interface ChatSession {
  id: string;
  title: string;
  date: string;
  group: "Hoje" | "Ontem" | "Semana passada" | "Mais antigos";
}

// ── Helper Functions ──────────────────────────────────────────────────────────

function getApiKey(localStorageKey: string, envKey: string | undefined): string {
  const localValue = localStorage.getItem(localStorageKey);
  if (localValue && localValue.trim().length > 0) {
    return localValue.trim();
  }
  if (envKey && envKey.trim().length > 0) {
    return envKey.trim();
  }
  return "";
}

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

// ── Tool Call Executor (com Error Boundary e Self-Healing) ──────────────────

interface ToolCallRequest {
  name: string;
  args: any;
}

const TOOL_ALIASES: Record<string, string> = {
  "github:repos": "github/list-repos",
  "github:read": "github/get-file",
  "github:commit": "github/create-file",
  "github/repos": "github/list-repos",
  "github/read-file": "github/get-file",
  "deploy/run": "deploy",
  "supabase/tables": "supabase/list-tables",
  "supabase/execute": "supabase/execute-sql",
};

function normalizeToolName(name: string): string {
  const raw = String(name || "").trim().replace(/^api\//, "").replace(/^\/api\//, "");
  const normalized = raw.includes(":") ? raw.replace(":", "/") : raw;
  return TOOL_ALIASES[raw] || TOOL_ALIASES[normalized] || normalized;
}

function sanitizeSupabaseArgs(args: any = {}) {
  if (!args || typeof args !== "object" || Array.isArray(args)) return {};

  return Object.fromEntries(
    Object.entries(args).filter(([key]) => {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      const isCredentialKey =
        normalizedKey.includes("url") ||
        normalizedKey.includes("key") ||
        normalizedKey.includes("token") ||
        normalizedKey.includes("secret") ||
        normalizedKey.includes("credential");

      return !isCredentialKey;
    })
  );
}

function parseToolCallsFromText(text: string): ToolCallRequest[] {
  const calls: ToolCallRequest[] = [];
  const patterns = [
    /\[TOOL_CALL\]\s*([\s\S]*?)\s*\[\/TOOL_CALL\]/g,
    /\[TOOL_CALL:\s*([\s\S]*?)\s*\]/g,
    /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g,
    /```tool_call\s*([\s\S]*?)```/g,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      try {
        const parsed = JSON.parse(match[1].trim());
        const list = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of list) {
          const name = normalizeToolName(item.name || item.tool || item.action);
          if (name) {
            const rawArgs = item.args || item.params || item.arguments || item.payload || {};
            calls.push({ name, args: name.startsWith("supabase/") ? sanitizeSupabaseArgs(rawArgs) : rawArgs });
          }
        }
      } catch (error) {
        console.error("Erro ao parsear tool call:", error);
      }
    }
  }
  return calls;
}

function stripToolCallsFromText(text: string): string {
  return text
    .replace(/\[TOOL_CALL\]\s*[\s\S]*?\s*\[\/TOOL_CALL\]/g, "")
    .replace(/\[TOOL_CALL:[\s\S]*?\]/g, "")
    .replace(/<tool_call>\s*[\s\S]*?\s*<\/tool_call>/g, "")
    .replace(/```tool_call\s*[\s\S]*?```/g, "")
    .trim();
}

function safeJsonForModel(value: unknown, maxLength = 12000): string {
  const serialized = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  if (!serialized) return "{}";
  return serialized.length > maxLength ? `${serialized.slice(0, maxLength)}\n... [resultado truncado]` : serialized;
}

function formatToolResultForModel(call: ToolCall): string {
  return `[TOOL_RESULT:${call.name}]\nstatus: ${call.status}\nargs: ${safeJsonForModel(call.args, 4000)}\nresult: ${safeJsonForModel(call.result)}\n[/TOOL_RESULT]`;
}

function formatToolResultsForUser(calls: ToolCall[]): string {
  if (calls.length === 0) return "";

  return `\n\n---\n**Resultados das ferramentas executadas:**\n\n${calls.map(call => {
    if (call.status === "error") {
      const errorResult = call.result as { error?: string; message?: string } | undefined;
      return `Falha em **${call.name}**: ${errorResult?.error || errorResult?.message || "erro desconhecido"}.`;
    }

    if (call.name === "github/list-repos") {
      return `${formatGitHubReposForModel(call.result)}\n\n> Renderizei os repositórios em cards expansíveis logo abaixo para você navegar sem JSON cru.`;
    }

    if (call.name === "github/get-file") {
      const res = call.result as any;
      const args = call.args as { path?: string } | undefined;
      return `Arquivo **${args?.path || "solicitado"}** lido com sucesso.\n\n\`\`\`${args?.path?.split('.').pop() || ''}\n${res?.content || res || ""}\n\`\`\``;
    }

    if (call.name === "vercel/list-projects") {
      return `${formatVercelProjectsForModel(call.result)}\n\n> Renderizei os projetos da Vercel em cards neon com status, framework, URL de produção e data de atualização.`;
    }

    if (call.name === "supabase/list-tables") {
      return `${formatSupabaseTablesForModel(call.result)}\n\n> Renderizei as tabelas do Supabase em cards visuais com badge por schema, sem JSON cru.`;
    }

    return `**${call.name}** executado com sucesso. Os detalhes técnicos ficam recolhidos no cartão da ferramenta.`;
  }).join("\n\n")}\n`;
}

async function executeToolCall(
  request: ToolCallRequest,
  addLog: (type: LogEntry["type"], msg: string) => void,
  updateToolCall: (tc: ToolCall) => void
): Promise<ToolCall> {
  const id = Math.random().toString(36).substring(7);
  const toolCall: ToolCall = { id, name: request.name, args: request.args, status: "calling" };
  updateToolCall(toolCall);
  addLog("info", `Chamando ${request.name}...`);

  try {
    let result: any;
    const API_URL = "https://zarith-api-server.onrender.com";

    if (request.name.startsWith("github/")) {
      const endpoint = request.name.split("/")[1];
      const res = await fetch(`${API_URL}/api/github/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request.args),
      });
      result = await res.json();
    } else if (request.name.startsWith("supabase/")) {
      const endpoint = request.name.split("/")[1];
      const safeArgs = sanitizeSupabaseArgs(request.args);
      const res = await fetch(`${API_URL}/api/supabase/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(safeArgs),
      });
      result = await res.json();
    } else if (request.name.startsWith("vercel/")) {
      const endpoint = request.name.split("/")[1];
      const res = await fetch(`${API_URL}/api/vercel/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request.args),
      });
      result = await res.json();
    } else {
      throw new Error(`Tool desconhecida: ${request.name}`);
    }

    const finalCall = { ...toolCall, status: "success" as const, result };
    updateToolCall(finalCall);
    addLog("success", `${request.name} executada com sucesso.`);
    return finalCall;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const finalCall = { ...toolCall, status: "error" as const, result: { error: errorMsg } };
    updateToolCall(finalCall);
    addLog("error", `Erro em ${request.name}: ${errorMsg}`);
    return finalCall;
  }
}

// ── Componente Principal ──────────────────────────────────────────────────────

export default function ChatPage() {
  // Estados
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeModel, setActiveModel] = useState(MODELS[0]);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [attachedImages, setAttachedImages] = useState<ChatAttachment[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [plannerSteps, setPlannerSteps] = useState<PlanStep[]>([]);
  const [currentToolName, setCurrentToolName] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ plan: string; command: string } | null>(null);
  const [userData, setUserData] = useState<UserData>({ name: "Jadiel" });
  const [authChecked, setAuthChecked] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const { sessions, createNewSession, saveChatMessage, loadMessages, deleteSession } = useChatPersistence();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const addLog = useCallback((type: LogEntry["type"], message: string) => {
    setLogs((prev) => [{ id: Date.now().toString(), type, message, timestamp: Date.now() }, ...prev].slice(0, 50));
  }, []);

  const updateToolCall = useCallback((toolCall: ToolCall) => {
    setToolCalls((prev) => {
      const existing = prev.findIndex(tc => tc.id === toolCall.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = toolCall;
        return updated;
      }
      return [...prev, toolCall];
    });
  }, []);

  // Mapear sessões do banco para o formato da Sidebar
  const sidebarSessions = sessions.map(s => ({
    id: s.id,
    title: s.title,
    date: s.created_at,
    group: (new Date(s.created_at).toDateString() === new Date().toDateString() ? "Hoje" : "Mais antigos") as any
  }));

  // ── Funções de Navegação ──
  const loadConversation = useCallback(async (id: string) => {
    const dbMessages = await loadMessages(id);
    setMessages(dbMessages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      model: m.model
    })));
    setCurrentSessionId(id);
  }, [loadMessages]);

  const handleNewChat = useCallback(() => {
    setCurrentSessionId(null);
    setMessages([]);
    setToolCalls([]);
    setPlannerSteps([]);
    setAttachedImages([]);
  }, []);

  const handleDeleteSession = useCallback(async (id: string) => {
    await deleteSession(id);
    if (currentSessionId === id) {
      handleNewChat();
    }
  }, [deleteSession, currentSessionId, handleNewChat]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!currentSessionId) return;
    try {
      await messagesService.deleteMessage(messageId);
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      addLog("info", `Mensagem ${messageId} deletada com sucesso.`);
    } catch (error) {
      addLog("error", `Erro ao deletar mensagem ${messageId}: ${error}`);
    }
  }, [currentSessionId, addLog]);

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
    const activeAttachments = attachedImages;
    if ((!content.trim() && activeAttachments.length === 0) || isLoading) return;

    const attachmentContext = activeAttachments.map((img, idx) =>
      `Imagem ${idx + 1}: ${img.name} (${img.type}) disponível para análise via vision/analyze-image.`
    ).join("\n");
    const userContent = [content.trim(), attachmentContext].filter(Boolean).join("\n\n");

    // Valida sessão
    if (supabaseClient) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        window.location.href = "/";
        return;
      }
    }

    // Se não houver sessão ativa, cria uma no Supabase
    let sessionId = currentSessionId;
    if (!sessionId) {
      const session = await createNewSession((content || "Imagem anexada").substring(0, 40));
      if (session) {
        sessionId = session.id;
        setCurrentSessionId(sessionId);
      }
    }

    if (sessionId) {
      await saveChatMessage(sessionId, "user", userContent);
    }

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: userContent };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAttachedImages([]);
    setIsLoading(true);
    setCurrentToolName(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const selectedModel = selectAutomaticModel(userContent, activeAttachments.length, webSearchEnabled);
    if (selectedModel.id !== activeModel.id) {
      setActiveModel(selectedModel);
      addLog("info", `Modelo selecionado automaticamente: ${selectedModel.name} — ${selectedModel.desc}`);
    }

    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      model: selectedModel.name,
      tool_calls: []
    };
    setMessages((prev) => [...prev, assistantMsg]);

    type AgentHistoryMessage = {
      role: "system" | "user" | "assistant" | "tool";
      content: string;
      name?: string;
    };

    const toProviderMessage = (message: AgentHistoryMessage) => ({
      role: message.role === "tool" ? "user" : message.role,
      content: message.role === "tool"
        ? `Resultado da ferramenta ${message.name || "tool"}:\n${message.content}`
        : message.content,
    });

    try {
      const groqKey   = getApiKey("zarith_apikey_Groq", import.meta.env.VITE_GROQ_API_KEY);
      const geminiKey = getApiKey("zarith_apikey_Gemini", import.meta.env.VITE_GEMINI_API_KEY);
      const orKey     = getApiKey("zarith_apikey_OpenRouter", import.meta.env.VITE_OPENROUTER_API_KEY);

      const history: AgentHistoryMessage[] = messages.slice(-12).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const agentHistory: AgentHistoryMessage[] = [...history, { role: "user", content: userContent }];

      let lastError = "";

      const tryModel = async (
        modelId: string,
        modelName: string,
        runHistory: AgentHistoryMessage[],
        signal: AbortSignal
      ): Promise<string | null> => {
        try {
          const providerMessages = runHistory.map(toProviderMessage);

          if (modelId === "groq" && groqKey) {
            const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
              signal,
              body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                  { role: "system", content: ZARITH_SYSTEM_PROMPT },
                  ...providerMessages,
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
              signal,
              body: JSON.stringify({
                model: "deepseek/deepseek-r1",
                messages: [
                  { role: "system", content: ZARITH_SYSTEM_PROMPT },
                  ...providerMessages,
                ],
                max_tokens: 2048,
              }),
            });
            if (!res.ok) throw new Error(`${res.status}`);
            const data = await res.json() as { choices: { message: { content: string } }[] };
            return data.choices[0]?.message?.content ?? "Sem resposta.";

          } else if (modelId === "gemini" && geminiKey) {
            const chatMessages = runHistory.filter(m => m.role !== "system");
            
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
                signal,
                body: JSON.stringify({
                  systemInstruction: { parts: [{ text: ZARITH_SYSTEM_PROMPT }] },
                  contents: chatMessages.map(m => ({
                    role: m.role === "assistant" ? "model" : "user",
                    parts: [{ text: m.role === "tool" ? `Resultado da ferramenta ${m.name || "tool"}:\n${m.content}` : m.content }]
                  })),
                  generationConfig: { maxOutputTokens: 2048, temperature: 0.85 }
                })
              }
            );
            if (!res.ok) throw new Error(`${res.status}`);
            const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] };
            return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sem resposta.";

          } else if (modelId === "qwen" && orKey) {
            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${orKey}`,
                "HTTP-Referer": window.location.origin,
                "X-Title": "Zarith AI",
              },
              signal,
              body: JSON.stringify({
                model: "qwen/qwen3-coder",
                messages: [
                  { role: "system", content: ZARITH_SYSTEM_PROMPT },
                  ...providerMessages,
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
              signal,
              body: JSON.stringify({
                model: "z-ai/glm-4-32b",
                messages: [
                  { role: "system", content: ZARITH_SYSTEM_PROMPT },
                  ...providerMessages,
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
          if (err instanceof DOMException && err.name === "AbortError") throw err;
          lastError = err instanceof Error ? err.message : String(err);
          return null;
        }
      };

      const selectedModelForRun = selectedModel;
      let usedModel = selectedModelForRun;
      let finalContent = "";
      let executedToolCalls: ToolCall[] = [];
      let continueLoop = true;
      let loopCount = 0;
      const maxAgentLoops = 8;
      const executedToolSignatures = new Set<string>();
      const buildToolSignature = (name: string, args: unknown) => {
        const normalize = (value: unknown): unknown => {
          if (Array.isArray(value)) return value.map(normalize);
          if (value && typeof value === "object") {
            return Object.keys(value as Record<string, unknown>)
              .sort()
              .reduce<Record<string, unknown>>((acc, key) => {
                acc[key] = normalize((value as Record<string, unknown>)[key]);
                return acc;
              }, {});
          }
          return value;
        };
        return `${normalizeToolName(name)}:${JSON.stringify(normalize(args || {}))}`;
      };

      while (continueLoop && loopCount < maxAgentLoops) {
        if (controller.signal.aborted) throw new DOMException("Execução cancelada", "AbortError");
        loopCount += 1;
        lastError = "";
        setCurrentToolName(loopCount === 1 ? "raciocínio inicial" : "analisando resultados");
        addLog("info", `Loop de agente ${loopCount}/${maxAgentLoops}: chamando modelo com histórico atualizado.`);

        let fullResponse = await tryModel(selectedModelForRun.id, selectedModelForRun.name, agentHistory, controller.signal) ?? "";

        if (!fullResponse && selectedModelForRun.id !== "groq") {
          const fallbackModel = getModelById("groq");
          const failureReason = lastError || "erro desconhecido";
          addLog("error", `${selectedModelForRun.name} falhou (${failureReason}). Tentando fallback automático com Groq.`);
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              last.content = `${finalContent}\n\n⚠️ ${selectedModelForRun.name} falhou (${failureReason}). Tentando fallback automático com ${fallbackModel.name}...`.trim();
              last.model = fallbackModel.name;
            }
            return updated;
          });
          fullResponse = await tryModel(fallbackModel.id, fallbackModel.name, agentHistory, controller.signal) ?? "";
          if (fullResponse) {
            usedModel = fallbackModel;
            fullResponse = `> ⚠️ **Fallback automático:** ${selectedModelForRun.name} falhou (${failureReason}). Usei ${fallbackModel.name} como fallback para concluir a tarefa.\n\n${fullResponse}`;
          }
        }

        if (!fullResponse) {
          fullResponse = `⚠️ Nenhuma chave de API configurada ou modelo disponível para **${selectedModelForRun.name}**, Jadiel. Vai em **Configurações → API Keys** e bota a chave lá. Sem chave, sem resposta — é assim que funciona. Erro: ${lastError}`;
        }

        const rawDetectedToolRequests = parseToolCallsFromText(fullResponse);
        const duplicateToolRequests = rawDetectedToolRequests.filter((request) =>
          executedToolSignatures.has(buildToolSignature(request.name, request.args))
        );
        const detectedToolRequests = rawDetectedToolRequests.filter((request) =>
          !executedToolSignatures.has(buildToolSignature(request.name, request.args))
        );
        const visibleResponse = stripToolCallsFromText(fullResponse);

        if (visibleResponse) {
          const prefix = finalContent ? "\n\n" : "";
          const tokens = visibleResponse.split(" ");
          finalContent += prefix;

          for (let i = 0; i < tokens.length; i++) {
            if (controller.signal.aborted) throw new DOMException("Execução cancelada", "AbortError");
            await new Promise<void>((resolve) => setTimeout(resolve, 20));
            const part = (i === 0 ? "" : " ") + tokens[i];
            finalContent += part;

            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
                last.content = finalContent;
                last.model = usedModel.name;
              }
              return updated;
            });
          }
        }

        agentHistory.push({ role: "assistant", content: fullResponse });

        if (duplicateToolRequests.length > 0) {
          const duplicatedNames = duplicateToolRequests.map((request) => normalizeToolName(request.name)).join(", ");
          addLog("info", `Loop ${loopCount}: ${duplicateToolRequests.length} chamada(s) repetida(s) ignorada(s): ${duplicatedNames}.`);
          agentHistory.push({
            role: "tool",
            name: "agent/duplicate-tool-guard",
            content: `As chamadas de ferramenta repetidas (${duplicatedNames}) já foram executadas com os mesmos argumentos neste ciclo. Não repita essas chamadas; use os resultados já injetados no contexto para responder ou escolha apenas a próxima ferramenta concreta ainda não executada.`
          });
        }

        if (detectedToolRequests.length === 0) {
          continueLoop = false;
          setCurrentToolName(null);
          if (rawDetectedToolRequests.length > 0) {
            const guardNotice = "\n\n> ⚠️ Interrompi chamadas repetidas da mesma ferramenta com os mesmos argumentos para evitar loop infinito. Usei os resultados já obtidos como contexto final.";
            finalContent += guardNotice;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
                last.content = finalContent;
                last.tool_calls = executedToolCalls;
              }
              return updated;
            });
          }
          break;
        }

        const initialCalls: ToolCall[] = detectedToolRequests.map((tc) => ({
          id: Math.random().toString(36).substring(7),
          name: normalizeToolName(tc.name),
          args: tc.args,
          status: "calling"
        }));

        setToolCalls(prev => [...prev, ...initialCalls]);
        setPlannerSteps(prev => [
          ...prev,
          ...initialCalls.map((tc) => ({
            id: tc.id,
            title: `Executar ${tc.name}`,
            status: "pending" as const
          }))
        ]);
        setIsPlannerOpen(true);
        addLog('info', `Loop ${loopCount}: detectadas ${initialCalls.length} ferramenta(s) para executar.`);

        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") last.tool_calls = [...executedToolCalls, ...initialCalls];
          return updated;
        });

        const loopExecutedToolCalls: ToolCall[] = [];

        for (let index = 0; index < detectedToolRequests.length; index += 1) {
          if (controller.signal.aborted) throw new DOMException("Execução cancelada", "AbortError");
          const request = detectedToolRequests[index];
          const normalizedName = normalizeToolName(request.name);
          const plannerStepId = initialCalls[index]?.id;
          const toolSignature = buildToolSignature(normalizedName, request.args);
          executedToolSignatures.add(toolSignature);

          if (request.name.startsWith("vision/") && activeAttachments.length > 0 && !request.args?.imageBase64) {
            const firstImage = activeAttachments[0];
            request.args = {
              ...(request.args || {}),
              imageBase64: firstImage.dataUrl.split(",")[1] || firstImage.dataUrl,
              mimeType: firstImage.type,
              prompt: request.args?.prompt || content || "Analise esta imagem e descreva problemas, layout, texto e recomendações técnicas."
            };
          }

          setCurrentToolName(normalizedName);
          setPlannerSteps(prev => prev.map(step =>
            step.id === plannerStepId ? { ...step, status: "running" as const } : step
          ));

          const result = await executeToolCall({ ...request, name: normalizedName }, addLog, updateToolCall);
          loopExecutedToolCalls.push(result);
          executedToolCalls = [...executedToolCalls, result];
          agentHistory.push({
            role: "tool",
            name: result.name,
            content: `${formatToolResultForModel(result)}

Instrução de continuidade: este resultado já está no contexto. Não chame novamente a mesma ferramenta com os mesmos argumentos; se ainda faltar algo para concluir o pedido, chame somente a próxima ferramenta necessária. Se não faltar, responda ao usuário sem tool_call.`
          });

          setPlannerSteps(prev => prev.map(step =>
            step.id === plannerStepId
              ? { ...step, status: result.status === "success" ? "completed" : "failed" }
              : step
          ));

          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              last.tool_calls = executedToolCalls;
            }
            return updated;
          });
        }

        const toolSummary = formatToolResultsForUser(loopExecutedToolCalls);
        if (toolSummary) {
          finalContent += toolSummary;
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              last.content = finalContent;
              last.tool_calls = executedToolCalls;
            }
            return updated;
          });
        }

        continueLoop = true;
      }

      if (loopCount >= maxAgentLoops) {
        const limitNotice = "\n\n> ⚠️ Limite de segurança do loop de agente atingido. Interrompi para evitar execução infinita.";
        finalContent += limitNotice;
        addLog("error", "Loop de agente interrompido por limite de segurança.");
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") last.content = finalContent;
          return updated;
        });
      }

      // Salvar resposta da Zarith no Supabase após execução completa do loop
      if (sessionId && finalContent) {
        await saveChatMessage(sessionId, "assistant", finalContent, usedModel.name);
      }

      // ── DETECÇÃO DE INTENÇÕES (Protocolo de Elite) ──
      // O Protocolo de Elite agora é executado via Tool Calls automáticas.
      // O banner de autorização manual foi removido para dar fluidez à Zarith.

    } catch (error) {
      const wasAborted = error instanceof DOMException && error.name === "AbortError";
      const zarithError = wasAborted
        ? "Execução cancelada, Jadiel. Parei o loop de agente antes da próxima tool call."
        : getZarithError(error, selectedModel?.name || activeModel.name);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") {
          last.content = last.content ? `${last.content}\n\n${zarithError}` : zarithError;
          last.isError = !wasAborted;
        }
        return updated;
      });
      addLog(wasAborted ? 'info' : 'error', wasAborted ? 'Loop de agente cancelado pelo usuário.' : `Erro ao processar mensagem: ${zarithError}`);
    } finally {
      setIsLoading(false);
      setIsPlannerOpen(false);
      setCurrentToolName(null);
      abortControllerRef.current = null;
    }
  }, [isLoading, activeModel, messages, currentSessionId, createNewSession, saveChatMessage, addLog, updateToolCall, attachedImages, webSearchEnabled]);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const accepted = files.filter(file => file.type.startsWith("image/"));
    const converted = await Promise.all(accepted.slice(0, 3).map(file => new Promise<ChatAttachment>((resolve, reject) => {
      if (file.size > 5 * 1024 * 1024) {
        reject(new Error(`Imagem muito grande: ${file.name}`));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve({
        id: `${Date.now()}-${file.name}`,
        name: file.name,
        type: file.type,
        dataUrl: String(reader.result)
      });
      reader.onerror = () => reject(new Error(`Falha ao ler ${file.name}`));
      reader.readAsDataURL(file);
    })));

    setAttachedImages(prev => [...prev, ...converted].slice(0, 3));
    addLog('info', `${converted.length} imagem(ns) anexada(s) para análise visual`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [addLog]);

  const handleCancelAgentLoop = useCallback(() => {
    abortControllerRef.current?.abort();
    setCurrentToolName(null);
    addLog("info", "Cancelamento solicitado pelo usuário.");
  }, [addLog]);

  const handleSendMessage = useCallback(() => {
    if (isLoading) {
      handleCancelAgentLoop();
      return;
    }
    sendMessage(input);
  }, [sendMessage, input, isLoading, handleCancelAgentLoop]);

  const handleQuickAction = useCallback((message: string) => {
    sendMessage(message);
  }, [sendMessage]);

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

  // ── Executar tool calls com confirmação ──
  const handleExecuteToolCalls = useCallback(async () => {
    if (toolCalls.length === 0) return;

    setIsPlannerOpen(true);
    addLog('info', 'Iniciando execução de ferramentas...');

    for (const toolCall of toolCalls) {
      // Atualizar status para running
      setPlannerSteps(prev => prev.map(step =>
        step.id === toolCall.id ? { ...step, status: "running" as const } : step
      ));

      const result = await executeToolCall(toolCall, addLog, updateToolCall);

      // Atualizar status no planner
      setPlannerSteps(prev => prev.map(step =>
        step.id === toolCall.id 
          ? { ...step, status: result.status === "success" ? "completed" : "failed" }
          : step
      ));
    }

    addLog('success', 'Execução de ferramentas concluída');
    setIsPlannerOpen(false);
  }, [toolCalls, addLog, updateToolCall]);

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
      <Sidebar 
        user={userData} 
        onNewChat={handleNewChat}
        sessions={sidebarSessions}
        activeSessionId={currentSessionId || undefined}
        onSelectSession={loadConversation}
        onDeleteSession={handleDeleteSession}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="h-14 md:h-16 border-b border-[var(--border-glow)] flex items-center px-4 md:px-6 bg-[var(--bg-secondary)] gap-3 shrink-0">
          <div className="w-10 md:hidden shrink-0" />
          <div className="flex-1" />

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[#00f5ff]/70">
            <Zap size={14} />
            <span className="hidden sm:inline">Zarith Super Agente</span>
          </div>
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

        {/* Protocolo de Proteção - Banner de Aprovação */}
        <AnimatePresence>
          {pendingAction && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-[#bf00ff]/10 border-b border-[#bf00ff]/30 overflow-hidden"
            >
              <div className="max-w-4xl mx-auto p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-[#bf00ff] font-black text-xs uppercase mb-1">
                    <ShieldAlert size={14} />
                    <span>Autorização de Execução Necessária</span>
                  </div>
                  <p className="text-xs text-white/80 font-mono mb-2">
                    <span className="text-[#00f5ff] font-bold">Plano:</span> {pendingAction.plan}
                  </p>
                  <div className="bg-black/40 p-2 rounded border border-white/10 font-mono text-[10px] text-[#00f5ff]">
                    $ {pendingAction.command}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setPendingAction(null)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold transition-all"
                  >
                    Abortar
                  </button>
                  <button
                    onClick={async () => {
                      addLog('info', `Executando comando: ${pendingAction.command}`);
                      const result = await (deployService as any).executeCommand(pendingAction.command);
                      if (result.success) {
                        addLog('success', 'Comando executado com sucesso');
                      } else {
                        addLog('error', `Falha no comando: ${result.error}`);
                      }
                      setPendingAction(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#bf00ff] hover:bg-[#a600e6] text-xs font-bold transition-all shadow-[0_0_15px_rgba(191,0,255,0.4)]"
                  >
                    Executar Agora
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat area */}
        <main className="flex-1 overflow-y-auto scrollbar-hide relative">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4 md:p-8 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-br from-[#00f5ff] to-[#bf00ff] flex items-center justify-center text-black mb-6 md:mb-8 shadow-[0_0_50px_rgba(0,245,255,0.3)]"
              >
                <Zap size={40} className="md:size-48" fill="currentColor" />
              </motion.div>
              <h1 className="text-2xl md:text-4xl font-black mb-3 md:mb-4 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50">
                O que vamos codar hoje, Jadiel?
              </h1>
              <p className="text-sm md:text-base text-[var(--text-secondary)] max-w-md mb-8 md:mb-12 font-medium px-4">
                Eu sou a Zarith. Sou rápida, ácida e resolvo seu código sem frescura. Manda a braba.
              </p>
              <ActionCards userName={userData?.name || "Jadiel"} onAction={handleQuickAction} />
            </div>
          ) : (
            <div className="flex flex-col min-h-full">
              {/* Messages list */}
              <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto w-full">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 md:gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`flex gap-3 md:gap-4 w-full max-w-2xl ${message.role === "user" ? "flex-row-reverse" : ""} group`}>
                        {message.role === "assistant" && (
                          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-[#00f5ff] to-[#bf00ff] flex items-center justify-center text-black font-bold text-xs shrink-0">
                            Z
                          </div>
                        )}
                        <div className={`flex flex-col gap-2 flex-1 ${message.role === "user" ? "items-end" : ""}`}>
                          <div
                            className={`px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-full overflow-x-auto ${
                              message.role === "user"
                                ? "bg-[#00f5ff]/20 border border-[#00f5ff]/30 text-white"
                                : message.isError
                                ? "bg-red-500/10 border border-red-500/30 text-red-200"
                                : "bg-[var(--bg-card)] border border-[var(--border-glow)] text-[var(--text-primary)]"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10 flex-1">
                                <ReactMarkdown 
                                  remarkPlugins={[remarkGfm]} 
                                  rehypePlugins={[rehypeRaw]}
                                >
                                  {message.content}
                                </ReactMarkdown>
                              </div>
                              <button
                                onClick={() => handleDeleteMessage(message.id)}
                                className="text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 -mr-2"
                                title="Apagar mensagem"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Tool Call Stream */}
                          {message.tool_calls && message.tool_calls.length > 0 && (
                            <div className="w-full max-w-md">
                              <ToolCallStream calls={message.tool_calls} />
                            </div>
                          )}

                          <div className="flex items-center gap-3 px-1">
                            {message.role === "assistant" && (
                              <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                                {message.model || activeModel.name}
                              </span>
                            )}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleCopy(message.id, message.content)}
                                className="p-1 hover:bg-white/5 rounded text-[var(--text-secondary)] transition-colors"
                                title="Copiar"
                              >
                                {copiedId === message.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                              </button>
                              {message.role === "assistant" && (
                                <button
                                  onClick={() => handleRetry(message.id)}
                                  className="p-1 hover:bg-white/5 rounded text-[var(--text-secondary)] transition-colors"
                                  title="Regerar"
                                >
                                  <RotateCcw size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} className="h-4" />
              </div>
            </div>
          )}
        </main>

        {/* Input area */}
        <footer className="p-3 md:p-5 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/95 to-transparent shrink-0">
          <div className="max-w-4xl mx-auto">
            <AnimatePresence>
              {isPlannerOpen && (
                <AgentPlannerPanel 
                  steps={plannerSteps} 
                  isOpen={isPlannerOpen} 
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {currentToolName && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-[#00f5ff]/30 bg-[#00f5ff]/5 px-4 py-3 shadow-[0_0_24px_rgba(0,245,255,0.12)]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#00f5ff]/30 bg-black/40 text-[#00f5ff]">
                      <WaveformLoader size="20" stroke="3" speed="1" color="#00f5ff" />
                    </div>
                    <p className="truncate text-xs font-bold uppercase tracking-[0.18em] text-[#00f5ff]">
                      Zarith executando: <span className="text-white">{currentToolName}</span>...
                    </p>
                  </div>
                  <button
                    onClick={handleCancelAgentLoop}
                    className="shrink-0 rounded-xl border border-[#ff0080]/40 bg-[#ff0080]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#ff0080] transition-all hover:bg-[#ff0080]/20 hover:shadow-[0_0_18px_rgba(255,0,128,0.25)]"
                  >
                    Cancelar
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {attachedImages.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mb-3 flex gap-2 overflow-x-auto rounded-2xl border border-[var(--border-glow)] bg-[var(--bg-card)]/90 p-2 shadow-2xl scrollbar-hide"
                >
                  {attachedImages.map((img) => (
                    <div key={img.id} className="relative group w-14 h-14 md:w-16 md:h-16 shrink-0">
                      <img src={img.dataUrl} alt="upload" className="w-full h-full object-cover rounded-xl border border-white/10" />
                      <button
                        onClick={() => setAttachedImages(prev => prev.filter(i => i.id !== img.id))}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remover anexo"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#00f5ff] to-[#bf00ff] rounded-[24px] blur opacity-20 group-focus-within:opacity-40 transition duration-500" />
              <div className="relative flex items-end gap-2 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-[22px] shadow-2xl p-2 transition-all group-focus-within:border-[#00f5ff]/50">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="h-11 w-11 shrink-0 rounded-2xl border border-white/10 bg-white/[0.03] text-[var(--text-secondary)] hover:text-[#00f5ff] hover:border-[#00f5ff]/50 hover:bg-[#00f5ff]/10 transition-all flex items-center justify-center"
                  title="Anexar mídia"
                >
                  <ImageIcon size={18} />
                </button>

                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Manda a parada, Jadiel... pode anexar print, erro ou wireframe."
                  className="flex-1 min-w-0 bg-transparent border-none focus:ring-0 text-sm md:text-base px-2 py-3 resize-none min-h-[44px] max-h-32 scrollbar-hide text-white placeholder-white/30 font-medium"
                />

                <div className="relative shrink-0">
                  <button
                    onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                    className="h-11 flex items-center gap-1.5 px-2.5 md:px-3 bg-black/30 border border-[var(--border-glow)] rounded-2xl hover:border-[#00f5ff] transition-all text-xs font-bold"
                    title="Selecionar modelo"
                  >
                    <span className="text-[#00f5ff]">{activeModel.icon}</span>
                    <span className="hidden sm:inline">{activeModel.name}</span>
                    <ChevronDown size={12} className={`transition-transform ${isModelMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isModelMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute right-0 bottom-full mb-2 w-52 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl shadow-2xl overflow-hidden z-50"
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

                <button
                  onClick={() => setIsLogsOpen(!isLogsOpen)}
                  className={`h-11 shrink-0 flex items-center gap-1.5 px-2.5 md:px-3 rounded-2xl border transition-all text-xs font-bold ${
                    isLogsOpen
                      ? "bg-[#bf00ff]/10 border-[#bf00ff] text-[#bf00ff]"
                      : "border-[var(--border-glow)] text-[var(--text-secondary)] hover:border-[#bf00ff]/60 hover:text-[#bf00ff]"
                  }`}
                  title="Logs de execução"
                >
                  <Terminal size={14} />
                  <span className="hidden md:inline">Logs</span>
                </button>

                <button
                  onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                  title="Web search (requer chave Tavily)"
                  className={`h-11 shrink-0 flex items-center gap-1.5 px-2.5 md:px-3 rounded-2xl border transition-all text-xs font-bold ${
                    webSearchEnabled
                      ? "bg-[#00f5ff]/10 border-[#00f5ff] text-[#00f5ff]"
                      : "border-[var(--border-glow)] text-[var(--text-secondary)] hover:border-[#00f5ff]/60 hover:text-[#00f5ff]"
                  }`}
                >
                  <Search size={14} />
                  <span className="hidden md:inline">Web</span>
                </button>

                <button
                  onClick={handleSendMessage}
                  disabled={!isLoading && !input.trim() && attachedImages.length === 0}
                  className={`h-11 w-11 shrink-0 rounded-2xl transition-all shadow-lg flex items-center justify-center ${
                    isLoading
                      ? "bg-[#ff0080]/15 text-[#ff0080] border border-[#ff0080]/40 hover:bg-[#ff0080]/25 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,0,128,0.25)]"
                      : (!input.trim() && attachedImages.length === 0)
                        ? "bg-white/5 text-white/20 cursor-not-allowed"
                        : "bg-gradient-to-r from-[#00f5ff] to-[#bf00ff] text-black hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,245,255,0.3)]"
                  }`}
                  title={isLoading ? "Cancelar execução" : "Enviar mensagem"}
                >
                  {isLoading ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <WaveformLoader size="18" stroke="3" speed="1" color="#ff0080" />
                      <X size={10} strokeWidth={4} />
                    </div>
                  ) : (
                    <Send size={18} fill="currentColor" />
                  )}
                </button>
              </div>
            </div>
            
            <p className="mt-3 text-[10px] md:text-xs text-center text-[var(--text-secondary)] font-medium opacity-50 px-4">
              Zarith v2.5 • Criada por <span className="text-[#00f5ff]">jadiel054</span> • Powered by Groq & Gemini
            </p>
          </div>
        </footer>

        {/* Logs Panel */}
        <AnimatePresence>
          {isLogsOpen && (
            <ExecutionLogs 
              isOpen={isLogsOpen}
              logs={logs} 
              onClose={() => setIsLogsOpen(false)} 
            />
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
