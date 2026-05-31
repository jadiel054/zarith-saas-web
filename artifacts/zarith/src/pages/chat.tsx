import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
MODO DE OPERAÇÃO AUTÔNOMA
═══════════════════════════════════════
Você opera como agente autônoma de engenharia. Isso significa:

1. Quando receber uma tarefa, trace imediatamente um PLANO DE EXECUÇÃO:
   - Liste as etapas numeradas
   - Informe quais tools vai usar em cada etapa
   - Informe qual modelo de IA vai usar (você decide baseado na tarefa)
   - Estime a complexidade: simples / médio / complexo

2. Execute o plano SEM pedir confirmação a cada passo. Você é autônoma.
   - Deletar repositório ou branch → apenas informe o motivo.
   - Apagar tabelas do Supabase → informe quais dados serão perdidos.
   - Suas credenciais já estão configuradas no ambiente isolado do api-server.
   - O usuário padrão do GitHub é 'jadiel054'. Nunca use 'Jadiel Alves' ou pergunte o nome de usuário.

3. Ao encontrar um erro durante a execução:
   - Analise o erro
   - Corrija automaticamente
   - Continue o plano
   - Informe Jadiel ao final o que aconteceu e como resolveu

4. Ao finalizar uma tarefa, entregue:
   - Resumo do que foi feito
   - Links relevantes (repositório, deploy, etc)
   - O que o usuário precisa fazer (se precisar de algo)

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
Você decide qual modelo usar baseado na tarefa:
- Chat rápido/respostas → Groq (Llama 3.3 70B)
- Geração de código → Qwen Coder 480B
- Raciocínio/debug complexo → DeepSeek R1
- Contexto massivo/análise de repositório inteiro → Gemini Flash
- Tarefas longas e autônomas → GLM (z-ai/glm-4-32b)

═══════════════════════════════════════
FLUXO PARA CRIAÇÃO DE PROJETOS
═══════════════════════════════════════
Quando o usuário pedir para criar um site, app ou SaaS:

1. ENTENDIMENTO: Faça as perguntas necessárias para entender:
   - Objetivo do projeto
   - Público-alvo
   - Funcionalidades principais
   - Stack preferida (ou você sugere a melhor)
   - Preferências visuais (pode analisar imagem de referência)

2. PLANEJAMENTO: Apresente:
   - Stack escolhida e justificativa
   - Estrutura de pastas
   - Funcionalidades que serão implementadas
   - Estimativa de complexidade

3. EXECUÇÃO AUTÔNOMA:
   - Cria o repositório no GitHub com nome adequado
   - Inicializa o projeto com a stack escolhida
   - Cria todos os arquivos necessários
   - Implementa as funcionalidades
   - Faz commits organizados por feature
   - Configura deploy na Vercel
   - Configura banco no Supabase se necessário

4. ENTREGA:
   - Link do repositório
   - Link do deploy
   - Instruções de uso se necessário

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
  const [pendingAction, setPendingAction] = useState<{ plan: string; command: string } | null>(null);
  const [userData, setUserData] = useState<UserData>({ name: "Jadiel" });
  const [authChecked, setAuthChecked] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const { sessions, createNewSession, saveChatMessage, loadMessages, deleteSession } = useChatPersistence();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      model: activeModel.name,
      tool_calls: []
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const groqKey   = getApiKey("zarith_apikey_Groq", import.meta.env.VITE_GROQ_API_KEY);
      const geminiKey = getApiKey("zarith_apikey_Gemini", import.meta.env.VITE_GEMINI_API_KEY);
      const orKey     = getApiKey("zarith_apikey_OpenRouter", import.meta.env.VITE_OPENROUTER_API_KEY);

      const history = messages.slice(-12).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let fullResponse = "";
      let lastError = "";

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
                  { role: "user", content: userContent },
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
                  { role: "user", content: userContent },
                ],
                max_tokens: 2048,
              }),
            });
            if (!res.ok) throw new Error(`${res.status}`);
            const data = await res.json() as { choices: { message: { content: string } }[] };
            return data.choices[0]?.message?.content ?? "Sem resposta.";

          } else if (modelId === "gemini" && geminiKey) {
            const chatMessages = [...history.filter(m => m.role !== "system"), { role: "user", content: userContent }];
            
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
                body: JSON.stringify({
                  systemInstruction: { parts: [{ text: ZARITH_SYSTEM_PROMPT }] },
                  contents: chatMessages.map(m => ({
                    role: m.role === "user" ? "user" : "model",
                    parts: [{ text: m.content }]
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
              body: JSON.stringify({
                model: "qwen/qwen-2-72b-instruct",
                messages: [
                  { role: "system", content: ZARITH_SYSTEM_PROMPT },
                  ...history,
                  { role: "user", content: userContent },
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
                model: "z-ai/glm-4-32b",
                messages: [
                  { role: "system", content: ZARITH_SYSTEM_PROMPT },
                  ...history,
                  { role: "user", content: userContent },
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

      fullResponse = await tryModel(activeModel.id, activeModel.name) ?? "";

      if (!fullResponse) {
        for (const modelId of fallbackChain) {
          if (modelId === activeModel.id) continue;
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

      if (!fullResponse) {
        fullResponse = `⚠️ Nenhuma chave de API configurada para **${activeModel.name}**, Jadiel. Vai em **Configurações → API Keys** e bota a chave lá. Sem chave, sem resposta — é assim que funciona. Erro: ${lastError}`;
      }

      // Streaming token a token com interrupção em tool calls
      const tokens = fullResponse.split(" ");
      let finalContent = "";
      let toolCallDetected = false;

      for (let i = 0; i < tokens.length; i++) {
        if (toolCallDetected) break;

        await new Promise<void>((resolve) => setTimeout(resolve, 20));
        const part = (i === 0 ? "" : " ") + tokens[i];
        finalContent += part;

        // Se detectarmos o início de uma tool call, paramos o streaming de texto fictício
        if (finalContent.includes("<tool_call>") || finalContent.includes("[TOOL_CALL]")) {
          // Capturar o bloco completo se ele já veio na resposta (para modelos sem streaming real)
          const toolMatch = finalContent.match(/<tool_call>[\s\S]*?<\/tool_call>/) || 
                            finalContent.match(/\[TOOL_CALL:[\s\S]*?\]/);
          
          if (toolMatch) {
            finalContent = finalContent.substring(0, toolMatch.index! + toolMatch[0].length);
            toolCallDetected = true;
          }
        }

        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            last.content = finalContent;
          }
          return updated;
        });
      }
      // ── PROCESSAMENTO REAL DE TOOL CALLS ──
      const detectedToolRequests = parseToolCallsFromText(finalContent);
      let executedToolCalls: ToolCall[] = [];

      if (detectedToolRequests.length > 0) {
        const initialCalls: ToolCall[] = detectedToolRequests.map((tc) => ({
          id: Math.random().toString(36).substring(7),
          name: normalizeToolName(tc.name),
          args: tc.args,
          status: "calling"
        }));

        setToolCalls(initialCalls);
        setPlannerSteps(initialCalls.map((tc) => ({
          id: tc.id,
          title: `Executar ${tc.name}`,
          status: "pending" as const
        })));
        setIsPlannerOpen(true);
        addLog('info', `Detectadas ${initialCalls.length} ferramentas para executar`);

        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") last.tool_calls = initialCalls;
          return updated;
        });

        for (const request of detectedToolRequests) {
          if (request.name.startsWith("vision/") && activeAttachments.length > 0 && !request.args?.imageBase64) {
            const firstImage = activeAttachments[0];
            request.args = {
              ...(request.args || {}),
              imageBase64: firstImage.dataUrl.split(",")[1] || firstImage.dataUrl,
              mimeType: firstImage.type,
              prompt: request.args?.prompt || content || "Analise esta imagem e descreva problemas, layout, texto e recomendações técnicas."
            };
          }
          setPlannerSteps(prev => prev.map(step =>
            step.title === `Executar ${normalizeToolName(request.name)}` ? { ...step, status: "running" as const } : step
          ));

          const result = await executeToolCall(request, addLog, updateToolCall);
          executedToolCalls.push(result);

          setPlannerSteps(prev => prev.map(step =>
            step.title === `Executar ${result.name}`
              ? { ...step, status: result.status === "success" ? "completed" : "failed" }
              : step
          ));
        }

        const toolSummary = `

---
**Resultados das ferramentas executadas:**

${executedToolCalls.map(call => {
  if (call.status === "error") {
    const errorResult = call.result as { error?: string; message?: string } | undefined;
    return `Falha em **${call.name}**: ${errorResult?.error || errorResult?.message || 'erro desconhecido'}.`;
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
}).join("\n\n")}
`;
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

      // Salvar resposta da Zarith no Supabase após execução das ferramentas
      if (sessionId && finalContent) {
        await saveChatMessage(sessionId, "assistant", finalContent, activeModel.name);
      }

      // ── DETECÇÃO DE INTENÇÕES (Protocolo de Elite) ──
      // O Protocolo de Elite agora é executado via Tool Calls automáticas.
      // O banner de autorização manual foi removido para dar fluidez à Zarith.

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
      addLog('error', `Erro ao processar mensagem: ${zarithError}`);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, activeModel, messages, currentSessionId, createNewSession, saveChatMessage, addLog, updateToolCall, attachedImages]);

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

  const handleSendMessage = useCallback(() => {
    sendMessage(input);
  }, [sendMessage, input]);

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

          {/* Logs toggle */}
          <button
            onClick={() => setIsLogsOpen(!isLogsOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all text-xs font-bold ${
              isLogsOpen
                ? "bg-[#bf00ff]/10 border-[#bf00ff] text-[#bf00ff]"
                : "border-[var(--border-glow)] text-[var(--text-secondary)]"
            }`}
          >
            <Terminal size={13} />
            <span className="hidden sm:inline">Logs</span>
          </button>

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
        <footer className="p-4 md:p-6 bg-gradient-to-t from-[var(--bg-primary)] to-transparent shrink-0">
          <div className="max-w-4xl mx-auto relative">
            
            {/* Planner Panel Toggle */}
            <AnimatePresence>
              {isPlannerOpen && (
                <AgentPlannerPanel 
                  steps={plannerSteps} 
                  isOpen={isPlannerOpen} 
                />
              )}
            </AnimatePresence>

            {/* Floating Attachments */}
            <AnimatePresence>
              {attachedImages.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-0 mb-4 flex gap-2 p-2 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl shadow-2xl z-20"
                >
                  {attachedImages.map((img) => (
                    <div key={img.id} className="relative group w-16 h-16 md:w-20 md:h-20">
                      <img src={img.dataUrl} alt="upload" className="w-full h-full object-cover rounded-xl border border-white/10" />
                      <button
                        onClick={() => setAttachedImages(prev => prev.filter(i => i.id !== img.id))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#00f5ff] to-[#bf00ff] rounded-[24px] blur opacity-20 group-focus-within:opacity-40 transition duration-500" />
              <div className="relative bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-[22px] shadow-2xl overflow-hidden transition-all group-focus-within:border-[#00f5ff]/50">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Manda a parada, Jadiel... pode anexar print, erro ou wireframe."
                  className="w-full bg-transparent border-none focus:ring-0 text-sm md:text-base p-4 md:p-5 pr-24 md:pr-32 resize-none min-h-[56px] md:min-h-[64px] max-h-32 scrollbar-hide text-white placeholder-white/30 font-medium"
                />
                
                <div className="absolute right-2 md:right-3 bottom-2 md:bottom-3 flex items-center gap-1 md:gap-2">
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
                    className="p-2 md:p-2.5 text-[var(--text-secondary)] hover:text-[#00f5ff] hover:bg-white/5 rounded-xl transition-all"
                    title="Anexar imagem"
                  >
                    <ImageIcon size={18} className="md:size-20" />
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || (!input.trim() && attachedImages.length === 0)}
                    className={`p-2 md:p-2.5 rounded-xl transition-all shadow-lg flex items-center justify-center ${
                      isLoading || (!input.trim() && attachedImages.length === 0)
                        ? "bg-white/5 text-white/20 cursor-not-allowed"
                        : "bg-gradient-to-r from-[#00f5ff] to-[#bf00ff] text-black hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,245,255,0.3)]"
                    }`}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send size={18} className="md:size-20" fill="currentColor" />
                    )}
                  </button>
                </div>
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
