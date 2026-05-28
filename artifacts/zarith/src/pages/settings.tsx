import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Palette,
  Cpu,
  Key,
  Shield,
  LogOut,
  Camera,
  Eye,
  EyeOff,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Trash2,
  AlertTriangle,
  X,
  FlaskConical,
  Save,
  XCircle,
} from "lucide-react";
import { Link } from "wouter";
import { supabaseClient } from "@/lib/supabase";

type Tab = "conta" | "api" | "sessao";

interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata: {
    avatar_url?: string;
    picture?: string;
    full_name?: string;
    name?: string;
  };
}

interface Toast {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}

// Status possíveis de cada chave
type KeyStatus = "idle" | "saving" | "testing" | "valid" | "invalid" | "saved";

const LS_PREFIX = "zarith_apikey_";
const LS_AVATAR = "zarith_avatar";
const MAX_AVATAR_B64_BYTES = 100 * 1024;

let toastCounter = 0;

// ── Funções de validação por serviço ──────────────────────────────────────────
// Cada uma faz uma chamada real à API e retorna null (OK) ou a mensagem de erro.

async function testGroqKey(key: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) return null;
    const body = await res.json() as { error?: { message?: string } };
    if (res.status === 401) return `Chave inválida: ${body.error?.message || "não autorizado"}`;
    return `Erro ${res.status}: ${body.error?.message || res.statusText}`;
  } catch {
    return "Erro de conexão ao validar a chave Groq.";
  }
}

async function testGeminiKey(key: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
    );
    if (res.ok) return null;
    const body = await res.json() as { error?: { message?: string; status?: string } };
    if (res.status === 400 || res.status === 403) return `Chave inválida: ${body.error?.message || "API key not valid"}`;
    return `Erro ${res.status}: ${body.error?.message || res.statusText}`;
  } catch {
    return "Erro de conexão ao validar a chave Gemini.";
  }
}

async function testOpenRouterKey(key: string): Promise<string | null> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) return null;
    const body = await res.json() as { error?: { message?: string } };
    if (res.status === 401) return `Chave inválida: ${body.error?.message || "não autorizado"}`;
    return `Erro ${res.status}: ${body.error?.message || res.statusText}`;
  } catch {
    return "Erro de conexão ao validar a chave OpenRouter.";
  }
}

async function testTavilyKey(key: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, query: "test", max_results: 1 }),
    });
    if (res.ok) return null;
    const body = await res.json() as { detail?: string; error?: string };
    if (res.status === 401 || res.status === 403) return `Chave inválida: ${body.detail || body.error || "não autorizado"}`;
    return `Erro ${res.status}: ${body.detail || body.error || res.statusText}`;
  } catch {
    return "Erro de conexão ao validar a chave Tavily.";
  }
}

async function testGithubToken(key: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${key}`, "User-Agent": "Zarith-App" },
    });
    if (res.ok) {
      const body = await res.json() as { login?: string };
      return null; // válido — body.login seria o username
    }
    if (res.status === 401) return "Token inválido ou expirado.";
    return `Erro ${res.status}: ${res.statusText}`;
  } catch {
    return "Erro de conexão ao validar o token GitHub.";
  }
}

async function testSupabaseServiceRoleKey(key: string): Promise<string | null> {
  try {
    // Busca a URL tanto do localStorage quanto do que pode estar sendo digitado (se implementado)
    // Para simplificar, usamos o valor salvo no localStorage ou o valor fixo do projeto
    const url = localStorage.getItem("zarith_apikey_Supabase URL") || localStorage.getItem("zarith_supabase_url");
    if (!url) return "Configure primeiro a URL do Supabase no campo acima.";
    
    const res = await fetch(`${url}/rest/v1/rpc/execute_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ query: "SELECT 1;" }),
    });
    
    if (res.ok) return null;
    const body = await res.json() as { message?: string };
    return `Erro de Admin: ${body.message || "Permissão negada ou RPC execute_sql não habilitado."}`;
  } catch {
    return "Erro de conexão ao validar a Service Role Key.";
  }
}

async function testSupabaseUrl(url: string): Promise<string | null> {
  try {
    if (!url.startsWith("https://")) return "A URL deve começar com https://";
    const res = await fetch(`${url}/rest/v1/`, { method: "GET" });
    if (res.status === 200 || res.status === 401) return null; // 401 é OK (API está lá, só falta a key)
    return `URL parece inválida (Status ${res.status})`;
  } catch {
    return "Não foi possível conectar a esta URL.";
  }
}

async function testGreptileKey(key: string): Promise<string | null> {
  // Greptile não tem endpoint de health gratuito — aceita qualquer string não vazia
  if (!key || key.trim().length === 0) {
    return "A chave do Greptile não pode estar vazia.";
  }
  return null; // Não conseguimos testar sem uma chamada paga
}

const SERVICE_TESTERS: Record<string, (key: string) => Promise<string | null>> = {
  Groq: testGroqKey,
  Gemini: testGeminiKey,
  OpenRouter: testOpenRouterKey,
  Tavily: testTavilyKey,
  "GitHub Token": testGithubToken,
  Greptile: testGreptileKey,
  "Supabase Service Role": testSupabaseServiceRoleKey,
  "Supabase URL": testSupabaseUrl,
};

const SERVICES = [
  { name: "Groq",        placeholder: "gsk_...",  description: "Llama 3.3 70B — respostas rápidas" },
  { name: "OpenRouter",  placeholder: "sk-or-...", description: "Acesso a 100+ modelos de IA" },
  { name: "Gemini",      placeholder: "AIza...",   description: "Google Gemini Flash/Pro" },
  { name: "GitHub Token",placeholder: "ghp_...",   description: "Análise de repositórios" },
  { name: "Greptile",    placeholder: "gk-...",    description: "Busca semântica em código" },
  { name: "Tavily",      placeholder: "tvly-...",  description: "Web search em tempo real" },
  { name: "Supabase URL", placeholder: "https://xxx.supabase.co", description: "URL do seu projeto Supabase" },
  { name: "Supabase Service Role", placeholder: "eyJhbG...", description: "Permissão total de Admin para DDL" },
];

// ── Componente principal ──────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("conta");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Conta
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Sessão / deleção
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  // API Keys
  const [keyValues, setKeyValues] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [keyStatus, setKeyStatus] = useState<Record<string, KeyStatus>>({});
  const [keyError, setKeyError] = useState<Record<string, string | null>>({});
  const [storedKeys, setStoredKeys] = useState<Record<string, boolean>>({});

  // ── Init ──
  useEffect(() => {
    const init = async () => {
      // Carrega status das chaves salvas
      const stored: Record<string, boolean> = {};
      SERVICES.forEach(({ name }) => {
        if (localStorage.getItem(LS_PREFIX + name)) stored[name] = true;
      });
      setStoredKeys(stored);

      // Carrega avatar (somente se pequeno)
      try {
        const av = localStorage.getItem(LS_AVATAR);
        if (av && av.length < MAX_AVATAR_B64_BYTES * 1.4) setAvatarPreview(av);
      } catch { /* ignora */ }

      // Sessão Supabase
      if (!supabaseClient) { setLoading(false); return; }
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) { window.location.href = "/"; return; }
      setUser(user as unknown as SupabaseUser);
      setDisplayName(
        (user as unknown as SupabaseUser).user_metadata?.full_name ||
        (user as unknown as SupabaseUser).user_metadata?.name ||
        user.email?.split("@")[0] || "Usuário"
      );
      setLoading(false);
    };
    init();
  }, []);

  // ── Toasts ──
  const addToast = (type: Toast["type"], message: string) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  };

  // ── Logout ──
  const handleLogout = async () => {
    if (supabaseClient) await supabaseClient.auth.signOut();
    window.location.href = "/";
  };

  // ── Salvar nome ──
  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setSavingName(true);
    try {
      if (supabaseClient) {
        const { error } = await supabaseClient.auth.updateUser({ data: { full_name: displayName } });
        if (error) throw error;
      }
      addToast("success", "Nome atualizado com sucesso!");
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Erro ao salvar nome.");
    } finally {
      setSavingName(false);
    }
  };

  // ── Avatar ──
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { addToast("error", "Imagem muito grande. Máximo 2MB."); return; }
    setUploadingAvatar(true);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const MAX_DIM = 128;
      const scale = Math.min(MAX_DIM / bitmap.width, MAX_DIM / bitmap.height, 1);
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas não disponível.");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      try { localStorage.setItem(LS_AVATAR, dataUrl); }
      catch { localStorage.removeItem(LS_AVATAR); localStorage.setItem(LS_AVATAR, dataUrl); }
      setAvatarPreview(dataUrl);
      addToast("success", "Foto de perfil atualizada!");
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Erro ao processar imagem.");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  // ── Salvar chave (sem testar) ──
  const handleSaveKey = (serviceName: string) => {
    const value = keyValues[serviceName]?.trim();
    if (!value) { addToast("error", `Informe a chave para ${serviceName}.`); return; }
    setKeyStatus((p) => ({ ...p, [serviceName]: "saving" }));
    try {
      localStorage.setItem(LS_PREFIX + serviceName, value);
      setStoredKeys((p) => ({ ...p, [serviceName]: true }));
      setKeyValues((p) => ({ ...p, [serviceName]: "" }));
      setKeyStatus((p) => ({ ...p, [serviceName]: "saved" }));
      setKeyError((p) => ({ ...p, [serviceName]: null }));
      addToast("success", `Chave ${serviceName} salva!`);
      setTimeout(() => setKeyStatus((p) => ({ ...p, [serviceName]: "idle" })), 3000);
    } catch {
      setKeyStatus((p) => ({ ...p, [serviceName]: "idle" }));
      addToast("error", `Erro ao salvar chave ${serviceName}.`);
    }
  };

  // ── Testar chave (valida + salva se OK) ──
  const handleTestKey = async (serviceName: string) => {
    const value = keyValues[serviceName]?.trim() || localStorage.getItem(LS_PREFIX + serviceName) || "";
    if (!value) { addToast("error", `Informe ou carregue a chave de ${serviceName} para testar.`); return; }

    setKeyStatus((p) => ({ ...p, [serviceName]: "testing" }));
    setKeyError((p) => ({ ...p, [serviceName]: null }));

    try {
      const tester = SERVICE_TESTERS[serviceName];
      const error = tester ? await tester(value) : null;

      if (error) {
        setKeyStatus((p) => ({ ...p, [serviceName]: "invalid" }));
        setKeyError((p) => ({ ...p, [serviceName]: error }));
        addToast("error", `${serviceName}: ${error}`);
      } else {
        // Chave válida — salva automaticamente
        localStorage.setItem(LS_PREFIX + serviceName, value);
        setStoredKeys((p) => ({ ...p, [serviceName]: true }));
        setKeyValues((p) => ({ ...p, [serviceName]: "" }));
        setKeyStatus((p) => ({ ...p, [serviceName]: "valid" }));
        setKeyError((p) => ({ ...p, [serviceName]: null }));
        addToast("success", `✓ ${serviceName} validado e salvo com sucesso!`);
        setTimeout(() => setKeyStatus((p) => ({ ...p, [serviceName]: "idle" })), 4000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro inesperado.";
      setKeyStatus((p) => ({ ...p, [serviceName]: "invalid" }));
      setKeyError((p) => ({ ...p, [serviceName]: msg }));
    }
  };

  // ── Remover chave salva ──
  const handleRemoveKey = (serviceName: string) => {
    localStorage.removeItem(LS_PREFIX + serviceName);
    setStoredKeys((p) => ({ ...p, [serviceName]: false }));
    setKeyStatus((p) => ({ ...p, [serviceName]: "idle" }));
    setKeyError((p) => ({ ...p, [serviceName]: null }));
    addToast("info", `Chave ${serviceName} removida.`);
  };

  // ── Deletar conta ──
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "EXCLUIR") return;
    setDeletingAccount(true);
    try {
      SERVICES.forEach(({ name }) => {
        try { localStorage.removeItem(LS_PREFIX + name); } catch { /* ignora */ }
      });
      try { localStorage.removeItem(LS_AVATAR); } catch { /* ignora */ }

      if (supabaseClient) {
        const { data: { user: u } } = await supabaseClient.auth.getUser();
        if (u) {
          await supabaseClient.functions.invoke("delete-user", { body: { user_id: u.id } })
            .catch(() => { /* função pode não existir */ });
        }
        await supabaseClient.auth.signOut();
      }
      addToast("success", "Dados apagados. Redirecionando...");
      setTimeout(() => { window.location.href = "/"; }, 2000);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Erro ao excluir conta.");
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "conta",  label: "Conta",    icon: <User size={18} /> },
    { id: "api",    label: "API Keys", icon: <Key size={18} /> },
    { id: "sessao", label: "Sessão",   icon: <LogOut size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">

      {/* ── Toasts ── */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              className={`pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-xl border font-bold text-sm shadow-2xl ${
                t.type === "success" ? "bg-[var(--bg-card)] border-[var(--accent-green)]/40 text-[var(--accent-green)]"
                : t.type === "error"   ? "bg-[var(--bg-card)] border-[var(--accent-pink)]/40 text-[var(--accent-pink)]"
                : "bg-[var(--bg-card)] border-[var(--accent-cyan)]/40 text-[var(--accent-cyan)]"
              }`}
            >
              {t.type === "success" ? <CheckCircle2 size={16} /> : t.type === "error" ? <XCircle size={16} /> : <FlaskConical size={16} />}
              <span className="max-w-xs">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Modal de deleção ── */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowDeleteModal(false); setDeleteConfirmText(""); } }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-[var(--bg-secondary)] border border-red-500/40 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                    <AlertTriangle size={20} className="text-red-400" />
                  </div>
                  <h3 className="font-orbitron font-black text-lg text-red-400">EXCLUIR CONTA</h3>
                </div>
                <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }}>
                  <X size={20} className="text-[var(--text-secondary)]" />
                </button>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Apaga todos os dados locais e encerra sua sessão. Para deleção completa no servidor, contate o administrador.
              </p>
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">
                Digite <span className="text-red-400">EXCLUIR</span> para confirmar
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="EXCLUIR"
                className="w-full bg-[var(--bg-primary)] border border-red-500/30 rounded-lg px-4 py-2 text-sm focus:border-red-500 outline-none font-mono mb-4 text-red-300"
              />
              <div className="flex gap-3">
                <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }}
                  className="flex-1 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-glow)] text-[var(--text-secondary)] rounded-xl font-bold text-sm hover:text-[var(--text-primary)] transition-all">
                  Cancelar
                </button>
                <button onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "EXCLUIR" || deletingAccount}
                  className="flex-1 px-4 py-2 bg-red-500/10 border border-red-500/50 text-red-400 rounded-xl font-bold text-sm hover:bg-red-500/20 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                  {deletingAccount ? <><Loader2 size={14} className="animate-spin" /> Processando...</> : <><Trash2 size={14} /> Confirmar</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <header className="h-16 border-b border-[var(--border-glow)] flex items-center px-6 bg-[var(--bg-secondary)] gap-4 shrink-0">
        <Link href="/chat" className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--accent-cyan)] transition-all">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="font-orbitron font-black text-xl tracking-widest">CONFIGURAÇÕES</h1>
      </header>

      <div className="flex-1 flex overflow-hidden">

        {/* ── Sidebar de abas ── */}
        <aside className="w-56 border-r border-[var(--border-glow)] bg-[var(--bg-secondary)] p-4 space-y-2 shrink-0">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-[var(--accent-cyan)]/20 to-[var(--accent-purple)]/20 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
              }`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </aside>

        {/* ── Conteúdo ── */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }}>

                {/* ── CONTA ── */}
                {activeTab === "conta" && (
                  <div className="space-y-8">
                    <h2 className="text-xl font-orbitron font-bold text-[var(--accent-cyan)]">PERFIL</h2>

                    <div className="flex items-center gap-6">
                      <div className="relative group shrink-0">
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center glow-cyan overflow-hidden">
                          {uploadingAvatar ? <Loader2 size={28} className="text-white animate-spin" />
                            : avatarPreview ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                            : (user?.user_metadata?.avatar_url || user?.user_metadata?.picture) ? (
                              <img src={user.user_metadata.avatar_url || user.user_metadata.picture} alt="Avatar"
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            ) : <User size={40} className="text-white" />}
                        </div>
                        <button onClick={() => avatarInputRef.current?.click()}
                          className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all gap-1">
                          <Camera size={20} className="text-white" />
                          <span className="text-white text-[10px] font-bold">ALTERAR</span>
                        </button>
                        <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                          className="hidden" onChange={handleAvatarChange} />
                      </div>

                      <div className="space-y-2 flex-1">
                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Nome de Exibição</label>
                        <div className="flex gap-2">
                          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                            className="flex-1 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-lg px-4 py-2 text-sm focus:border-[var(--accent-cyan)] outline-none transition-colors" />
                          <button onClick={handleSaveName} disabled={savingName || !displayName.trim()}
                            className="px-4 py-2 bg-[var(--accent-cyan)] text-[var(--bg-primary)] font-bold rounded-lg text-sm hover:brightness-110 transition-all disabled:opacity-60 flex items-center gap-2 min-w-[90px] justify-center">
                            {savingName ? <><Loader2 size={14} className="animate-spin" /> Salvando</> : "Salvar"}
                          </button>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">Passe o mouse sobre a foto para alterá-la (máx. 2MB).</p>
                      </div>
                    </div>

                    <div className="p-6 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-glow)]">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-[var(--text-secondary)] uppercase">Email</p>
                          <p className="text-sm font-mono">{user?.email || "—"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-[var(--text-secondary)] uppercase">Status</p>
                          <p className="text-sm flex items-center gap-2 justify-end">
                            Verificado <CheckCircle2 size={14} className="text-[var(--accent-green)]" />
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── API KEYS ── */}
                {activeTab === "api" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-orbitron font-bold text-[var(--accent-cyan)]">API KEYS</h2>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        Clique em <span className="text-[var(--accent-cyan)] font-bold">Testar & Salvar</span> para validar a chave com uma chamada real à API antes de salvar.
                        Clique em <span className="text-[var(--text-secondary)] font-bold">Salvar</span> para salvar sem testar.
                        As chaves ficam armazenadas localmente no seu navegador.
                      </p>
                    </div>

                    {SERVICES.map(({ name, placeholder, description }) => {
                      const status = keyStatus[name] || "idle";
                      const err = keyError[name];
                      const isStored = storedKeys[name];
                      const isWorking = status === "saving" || status === "testing";

                      return (
                        <div key={name}
                          className={`p-6 bg-[var(--bg-card)] border rounded-2xl space-y-4 transition-all ${
                            status === "valid"   ? "border-[var(--accent-green)]/50"
                            : status === "invalid" ? "border-[var(--accent-pink)]/50"
                            : status === "saved"   ? "border-[var(--accent-cyan)]/40"
                            : "border-[var(--border-glow)] hover:border-[var(--accent-cyan)]/20"
                          }`}>

                          {/* Cabeçalho do card */}
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-sm">{name}</p>
                                {/* Badge de status */}
                                {status === "valid" && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--accent-green)] bg-[var(--accent-green)]/10 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 size={10} /> VÁLIDA
                                  </span>
                                )}
                                {status === "saved" && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-2 py-0.5 rounded-full">
                                    <CheckCircle2 size={10} /> SALVA
                                  </span>
                                )}
                                {status === "invalid" && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--accent-pink)] bg-[var(--accent-pink)]/10 px-2 py-0.5 rounded-full">
                                    <XCircle size={10} /> INVÁLIDA
                                  </span>
                                )}
                                {status === "testing" && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--accent-purple)] bg-[var(--accent-purple)]/10 px-2 py-0.5 rounded-full">
                                    <Loader2 size={10} className="animate-spin" /> TESTANDO...
                                  </span>
                                )}
                                {isStored && status === "idle" && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--bg-primary)] px-2 py-0.5 rounded-full border border-[var(--border-glow)]">
                                    CONFIGURADA
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{description}</p>
                            </div>

                            {/* Botão remover chave */}
                            {isStored && (
                              <button onClick={() => handleRemoveKey(name)}
                                title="Remover chave salva"
                                className="text-[var(--text-secondary)] hover:text-[var(--accent-pink)] transition-colors p-1">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>

                          {/* Input da chave */}
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <input
                                type={showKeys[name] ? "text" : "password"}
                                value={keyValues[name] || ""}
                                onChange={(e) => {
                                  setKeyValues((p) => ({ ...p, [name]: e.target.value }));
                                  setKeyStatus((p) => ({ ...p, [name]: "idle" }));
                                  setKeyError((p) => ({ ...p, [name]: null }));
                                }}
                                placeholder={isStored ? "••••••••••••••••  (chave salva)" : placeholder}
                                disabled={isWorking}
                                className={`w-full bg-[var(--bg-primary)] border rounded-lg px-4 py-2.5 text-sm outline-none font-mono pr-10 transition-colors disabled:opacity-60 ${
                                  status === "invalid" ? "border-[var(--accent-pink)]/50 focus:border-[var(--accent-pink)]"
                                  : "border-[var(--border-glow)] focus:border-[var(--accent-cyan)]"
                                }`}
                              />
                              <button onClick={() => setShowKeys((p) => ({ ...p, [name]: !p[name] }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors">
                                {showKeys[name] ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>

                            {/* Botões de ação */}
                            <div className="flex gap-2">
                              {/* Testar & Salvar */}
                              <button
                                onClick={() => handleTestKey(name)}
                                disabled={isWorking || (!keyValues[name]?.trim() && !isStored)}
                                title="Valida a chave com uma chamada real à API e salva se válida"
                                className="flex items-center gap-1.5 px-3 py-2.5 bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] font-bold rounded-lg text-xs hover:bg-[var(--accent-cyan)]/20 transition-all disabled:opacity-40 whitespace-nowrap"
                              >
                                {status === "testing"
                                  ? <><Loader2 size={13} className="animate-spin" /> Testando</>
                                  : <><FlaskConical size={13} /> Testar</>
                                }
                              </button>

                              {/* Salvar (sem testar) */}
                              <button
                                onClick={() => handleSaveKey(name)}
                                disabled={isWorking || !keyValues[name]?.trim()}
                                title="Salva a chave sem validar"
                                className="flex items-center gap-1.5 px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-glow)] text-[var(--text-secondary)] font-bold rounded-lg text-xs hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)] transition-all disabled:opacity-40 whitespace-nowrap"
                              >
                                {status === "saving"
                                  ? <><Loader2 size={13} className="animate-spin" /> Salvando</>
                                  : <><Save size={13} /> Salvar</>
                                }
                              </button>
                            </div>
                          </div>

                          {/* Mensagem de erro detalhada */}
                          <AnimatePresence>
                            {err && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex items-start gap-2 px-3 py-2 bg-[var(--accent-pink)]/10 border border-[var(--accent-pink)]/30 rounded-lg text-xs text-[var(--accent-pink)]"
                              >
                                <XCircle size={14} className="shrink-0 mt-0.5" />
                                <span>{err}</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── SESSÃO ── */}
                {activeTab === "sessao" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-orbitron font-bold text-[var(--accent-cyan)]">SESSÃO</h2>

                    <div className="p-6 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl space-y-4">
                      <div>
                        <p className="text-sm font-bold">Sessão ativa</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          Logado como <span className="font-mono text-[var(--text-primary)]">{user?.email || "—"}</span>
                        </p>
                      </div>
                      <button onClick={handleLogout}
                        className="flex items-center gap-2 px-6 py-3 bg-[var(--accent-pink)]/10 border border-[var(--accent-pink)]/30 text-[var(--accent-pink)] rounded-xl font-bold hover:bg-[var(--accent-pink)]/20 transition-all">
                        <LogOut size={18} /> Encerrar Sessão
                      </button>
                    </div>

                    <div className="p-6 bg-[var(--bg-card)] border border-red-500/20 rounded-2xl space-y-4">
                      <div>
                        <h3 className="font-orbitron font-bold text-red-400 text-sm mb-1">ZONA DE PERIGO</h3>
                        <p className="text-sm text-[var(--text-secondary)]">
                          Apaga todos os dados locais (chaves de API, avatar) e encerra sua sessão.
                        </p>
                      </div>
                      <button onClick={() => setShowDeleteModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl font-bold hover:bg-red-500/20 transition-all text-sm">
                        <Trash2 size={18} /> Excluir conta e dados locais
                      </button>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
