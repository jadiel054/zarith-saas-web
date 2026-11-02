import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Key,
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
  Bot,
  Sparkles,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  getAuthUser,
  setAuthSession,
  clearAuthSession,
  getAuthToken,
  type AuthUser,
} from "@/lib/auth-session";

type Tab = "perfil" | "provedores" | "bot" | "sessao";
type KeyStatus = "idle" | "saving" | "testing" | "valid" | "invalid" | "saved";

interface Toast {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}

const LS_PREFIX = "zarith_apikey_";
const LS_AVATAR = "zarith_avatar";
const LS_BOT = "zarith_bot_prefs";
const MAX_AVATAR_B64_BYTES = 100 * 1024;

let toastCounter = 0;

type BotPrefs = {
  preferredProvider: "auto" | "Groq" | "Gemini" | "OpenRouter";
  tone: "direto" | "mentor" | "casual" | "senior";
  systemPrompt: string;
  maxContext: "curto" | "medio" | "longo";
};

const DEFAULT_BOT: BotPrefs = {
  preferredProvider: "auto",
  tone: "direto",
  systemPrompt: "",
  maxContext: "medio",
};

function loadBotPrefs(): BotPrefs {
  try {
    const raw = localStorage.getItem(LS_BOT);
    if (!raw) return { ...DEFAULT_BOT };
    return { ...DEFAULT_BOT, ...(JSON.parse(raw) as Partial<BotPrefs>) };
  } catch {
    return { ...DEFAULT_BOT };
  }
}

async function testGroqKey(key: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) return null;
    const body = (await res.json()) as { error?: { message?: string } };
    if (res.status === 401) return `Chave invalida: ${body.error?.message || "nao autorizado"}`;
    return `Erro ${res.status}: ${body.error?.message || res.statusText}`;
  } catch {
    return "Erro de conexao ao validar a chave Groq.";
  }
}

async function testGeminiKey(key: string): Promise<string | null> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    if (res.ok) return null;
    const body = (await res.json()) as { error?: { message?: string } };
    if (res.status === 400 || res.status === 403)
      return `Chave invalida: ${body.error?.message || "API key not valid"}`;
    return `Erro ${res.status}: ${body.error?.message || res.statusText}`;
  } catch {
    return "Erro de conexao ao validar a chave Gemini.";
  }
}

async function testOpenRouterKey(key: string): Promise<string | null> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) return null;
    const body = (await res.json()) as { error?: { message?: string } };
    if (res.status === 401) return `Chave invalida: ${body.error?.message || "nao autorizado"}`;
    return `Erro ${res.status}: ${body.error?.message || res.statusText}`;
  } catch {
    return "Erro de conexao ao validar a chave OpenRouter.";
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
    const body = (await res.json()) as { detail?: string; error?: string };
    if (res.status === 401 || res.status === 403)
      return `Chave invalida: ${body.detail || body.error || "nao autorizado"}`;
    return `Erro ${res.status}: ${body.detail || body.error || res.statusText}`;
  } catch {
    return "Erro de conexao ao validar a chave Tavily.";
  }
}

async function testGithubToken(key: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${key}`, "User-Agent": "Zarith-App" },
    });
    if (res.ok) return null;
    if (res.status === 401) return "Token invalido ou expirado.";
    return `Erro ${res.status}: ${res.statusText}`;
  } catch {
    return "Erro de conexao ao validar o token GitHub.";
  }
}

async function testVercelToken(key: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.vercel.com/v9/projects", {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) return null;
    if (res.status === 401 || res.status === 403) return "Token Vercel invalido ou sem permissao.";
    return `Erro ${res.status}: ${res.statusText}`;
  } catch {
    return "Erro de conexao ao validar o token Vercel.";
  }
}

async function testGreptileKey(key: string): Promise<string | null> {
  if (!key?.trim()) return "A chave do Greptile nao pode estar vazia.";
  return null;
}

const SERVICE_TESTERS: Record<string, (key: string) => Promise<string | null>> = {
  Groq: testGroqKey,
  Gemini: testGeminiKey,
  OpenRouter: testOpenRouterKey,
  Tavily: testTavilyKey,
  "GitHub Token": testGithubToken,
  "Vercel Token": testVercelToken,
  Greptile: testGreptileKey,
};

const SERVICES = [
  { name: "Groq", placeholder: "gsk_...", description: "Llama - respostas rapidas" },
  { name: "OpenRouter", placeholder: "sk-or-...", description: "100+ modelos" },
  { name: "Gemini", placeholder: "AIza...", description: "Google Gemini" },
  { name: "GitHub Token", placeholder: "ghp_...", description: "Repos e PRs" },
  { name: "Vercel Token", placeholder: "vercel_...", description: "Deploy e logs" },
  { name: "Greptile", placeholder: "gk-...", description: "Busca em codigo" },
  { name: "Tavily", placeholder: "tvly-...", description: "Web search" },
];

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("perfil");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [keyValues, setKeyValues] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [keyStatus, setKeyStatus] = useState<Record<string, KeyStatus>>({});
  const [keyError, setKeyError] = useState<Record<string, string | null>>({});
  const [storedKeys, setStoredKeys] = useState<Record<string, boolean>>({});

  const [botPrefs, setBotPrefs] = useState<BotPrefs>(DEFAULT_BOT);
  const [savingBot, setSavingBot] = useState(false);

  useEffect(() => {
    const stored: Record<string, boolean> = {};
    SERVICES.forEach(({ name }) => {
      if (localStorage.getItem(LS_PREFIX + name)) stored[name] = true;
    });
    setStoredKeys(stored);

    try {
      const av = localStorage.getItem(LS_AVATAR);
      if (av && av.length < MAX_AVATAR_B64_BYTES * 1.4) setAvatarPreview(av);
    } catch {
      /* ignore */
    }

    setBotPrefs(loadBotPrefs());

    const sessionUser = getAuthUser();
    if (!sessionUser || !getAuthToken()) {
      setLocation("/");
      return;
    }
    setUser(sessionUser);
    setDisplayName(sessionUser.name || sessionUser.email?.split("@")[0] || "Usuario");
    setLoading(false);
  }, [setLocation]);

  const addToast = (type: Toast["type"], message: string) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4500);
  };

  const handleLogout = () => {
    clearAuthSession();
    window.location.href = "/";
  };

  const handleSaveName = () => {
    if (!displayName.trim() || !user) return;
    setSavingName(true);
    try {
      const next: AuthUser = { ...user, name: displayName.trim() };
      const token = getAuthToken();
      if (token) setAuthSession(token, next);
      setUser(next);
      localStorage.setItem("zarith_display_name", displayName.trim());
      addToast("success", "Nome atualizado!");
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Erro ao salvar nome.");
    } finally {
      setSavingName(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      addToast("error", "Imagem muito grande. Maximo 2MB.");
      return;
    }
    setUploadingAvatar(true);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const MAX_DIM = 128;
      const scale = Math.min(MAX_DIM / bitmap.width, MAX_DIM / bitmap.height, 1);
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas nao disponivel.");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      try {
        localStorage.setItem(LS_AVATAR, dataUrl);
      } catch {
        localStorage.removeItem(LS_AVATAR);
        localStorage.setItem(LS_AVATAR, dataUrl);
      }
      setAvatarPreview(dataUrl);
      if (user) {
        const next = { ...user, avatar_url: dataUrl };
        const token = getAuthToken();
        if (token) setAuthSession(token, next);
        setUser(next);
      }
      addToast("success", "Foto de perfil atualizada!");
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Erro ao processar imagem.");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleSaveKey = (serviceName: string) => {
    const value = keyValues[serviceName]?.trim();
    if (!value) {
      addToast("error", `Informe a chave para ${serviceName}.`);
      return;
    }
    setKeyStatus((p) => ({ ...p, [serviceName]: "saving" }));
    try {
      localStorage.setItem(LS_PREFIX + serviceName, value);
      setStoredKeys((p) => ({ ...p, [serviceName]: true }));
      setKeyValues((p) => ({ ...p, [serviceName]: "" }));
      setKeyStatus((p) => ({ ...p, [serviceName]: "saved" }));
      setKeyError((p) => ({ ...p, [serviceName]: null }));
      addToast("success", `Chave ${serviceName} salva!`);
      setTimeout(() => setKeyStatus((p) => ({ ...p, [serviceName]: "idle" })), 2500);
    } catch {
      setKeyStatus((p) => ({ ...p, [serviceName]: "idle" }));
      addToast("error", `Erro ao salvar chave ${serviceName}.`);
    }
  };

  const handleTestKey = async (serviceName: string) => {
    const value =
      keyValues[serviceName]?.trim() || localStorage.getItem(LS_PREFIX + serviceName) || "";
    if (!value) {
      addToast("error", `Informe a chave de ${serviceName} para testar.`);
      return;
    }
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
        localStorage.setItem(LS_PREFIX + serviceName, value);
        setStoredKeys((p) => ({ ...p, [serviceName]: true }));
        setKeyValues((p) => ({ ...p, [serviceName]: "" }));
        setKeyStatus((p) => ({ ...p, [serviceName]: "valid" }));
        addToast("success", `${serviceName} validado e salvo!`);
        setTimeout(() => setKeyStatus((p) => ({ ...p, [serviceName]: "idle" })), 3000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro inesperado.";
      setKeyStatus((p) => ({ ...p, [serviceName]: "invalid" }));
      setKeyError((p) => ({ ...p, [serviceName]: msg }));
    }
  };

  const handleRemoveKey = (serviceName: string) => {
    localStorage.removeItem(LS_PREFIX + serviceName);
    setStoredKeys((p) => ({ ...p, [serviceName]: false }));
    setKeyStatus((p) => ({ ...p, [serviceName]: "idle" }));
    setKeyError((p) => ({ ...p, [serviceName]: null }));
    addToast("info", `Chave ${serviceName} removida.`);
  };

  const handleSaveBot = () => {
    setSavingBot(true);
    try {
      localStorage.setItem(LS_BOT, JSON.stringify(botPrefs));
      addToast("success", "Preferencias do bot salvas!");
    } catch {
      addToast("error", "Nao foi possivel salvar preferencias.");
    } finally {
      setSavingBot(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "EXCLUIR") return;
    setDeletingAccount(true);
    try {
      SERVICES.forEach(({ name }) => {
        try {
          localStorage.removeItem(LS_PREFIX + name);
        } catch {
          /* ignore */
        }
      });
      try {
        localStorage.removeItem(LS_AVATAR);
        localStorage.removeItem(LS_BOT);
        localStorage.removeItem("zarith_display_name");
      } catch {
        /* ignore */
      }
      clearAuthSession();
      addToast("success", "Dados apagados. Saindo...");
      setTimeout(() => {
        window.location.href = "/";
      }, 1200);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Erro ao limpar dados.");
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#00f5ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "perfil", label: "Perfil", icon: <User size={16} /> },
    { id: "provedores", label: "Provedores", icon: <Key size={16} /> },
    { id: "bot", label: "Bot", icon: <Bot size={16} /> },
    { id: "sessao", label: "Sessao", icon: <LogOut size={16} /> },
  ];

  return (
    <div className="min-h-[100dvh] bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
      <div className="fixed top-[calc(0.75rem+env(safe-area-inset-top))] right-3 z-50 flex flex-col gap-2 pointer-events-none max-w-[min(92vw,20rem)]">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`pointer-events-auto flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold shadow-xl ${
                t.type === "success"
                  ? "bg-[var(--bg-card)] border-emerald-500/40 text-emerald-400"
                  : t.type === "error"
                    ? "bg-[var(--bg-card)] border-pink-500/40 text-pink-400"
                    : "bg-[var(--bg-card)] border-cyan-500/40 text-cyan-300"
              }`}
            >
              {t.type === "success" ? (
                <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
              ) : t.type === "error" ? (
                <XCircle size={14} className="shrink-0 mt-0.5" />
              ) : (
                <FlaskConical size={14} className="shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => !deletingAccount && setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-md bg-[var(--bg-secondary)] border border-red-500/30 rounded-2xl p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-bold text-red-300">Apagar dados locais</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    Remove chaves de API, avatar, preferencias do bot e encerra a sessao neste
                    dispositivo. Digite <span className="font-mono text-red-300">EXCLUIR</span> para confirmar.
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="ml-auto p-1 text-[var(--text-secondary)]"
                  disabled={deletingAccount}
                >
                  <X size={18} />
                </button>
              </div>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="EXCLUIR"
                className="w-full bg-[var(--bg-primary)] border border-red-500/30 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-red-400"
              />
              <button
                disabled={deleteConfirmText !== "EXCLUIR" || deletingAccount}
                onClick={handleDeleteAccount}
                className="w-full py-3 rounded-xl font-bold text-sm bg-red-500/20 border border-red-500/40 text-red-300 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {deletingAccount ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                Confirmar exclusao local
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-40 border-b border-[var(--border-glow)] bg-[var(--bg-primary)]/95 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-2 px-3 py-3 max-w-3xl mx-auto">
          <Link
            href="/chat"
            className="p-2 rounded-xl hover:bg-[var(--bg-card-hover)] text-[#00f5ff] shrink-0"
            aria-label="Voltar ao chat"
          >
            <ChevronLeft size={22} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-orbitron font-black text-base tracking-wide truncate">Configuracoes</h1>
            <p className="text-[10px] text-[var(--text-secondary)] truncate">{user?.email || "Conta Zarith"}</p>
          </div>
        </div>

        <div className="px-2 pb-2 overflow-x-auto">
          <div className="flex gap-1.5 min-w-max max-w-3xl mx-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-[#00f5ff]/20 to-[#bf00ff]/20 border border-[#00f5ff]/40 text-[#00f5ff]"
                    : "bg-[var(--bg-secondary)] border border-transparent text-[var(--text-secondary)]"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-3 py-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="max-w-3xl mx-auto space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              {activeTab === "perfil" && (
                <section className="p-4 sm:p-5 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl space-y-4">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#00f5ff] to-[#bf00ff] flex items-center justify-center overflow-hidden shrink-0"
                      disabled={uploadingAvatar}
                    >
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={28} className="text-white" />
                      )}
                      <span className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                        {uploadingAvatar ? (
                          <Loader2 className="animate-spin text-white" size={18} />
                        ) : (
                          <Camera size={18} className="text-white" />
                        )}
                      </span>
                    </button>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    <div className="min-w-0">
                      <p className="font-bold truncate">{user?.name || displayName || "Usuario"}</p>
                      <p className="text-xs text-[var(--text-secondary)] truncate break-all">{user?.email}</p>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-1 font-mono truncate">id · {user?.id?.slice(0, 8)}…</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-secondary)]">Nome de exibicao</label>
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#00f5ff]"
                      placeholder="Seu nome"
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={savingName || !displayName.trim()}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-[#00f5ff]/15 border border-[#00f5ff]/30 text-[#00f5ff] disabled:opacity-40"
                    >
                      {savingName ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                      Salvar perfil
                    </button>
                  </div>
                </section>
              )}

              {activeTab === "provedores" && (
                <div className="space-y-3">
                  <p className="text-xs text-[var(--text-secondary)] px-1 leading-relaxed">
                    Chaves ficam so neste dispositivo (localStorage).
                  </p>
                  {SERVICES.map((svc) => {
                    const status = keyStatus[svc.name] || "idle";
                    const hasStored = !!storedKeys[svc.name];
                    return (
                      <div key={svc.name} className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold">{svc.name}</p>
                            <p className="text-[11px] text-[var(--text-secondary)]">{svc.description}</p>
                          </div>
                          {hasStored && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">salva</span>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type={showKeys[svc.name] ? "text" : "password"}
                            value={keyValues[svc.name] || ""}
                            onChange={(e) => setKeyValues((p) => ({ ...p, [svc.name]: e.target.value }))}
                            placeholder={hasStored ? "•••••••• (nova chave opcional)" : svc.placeholder}
                            className="w-full bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-xl px-3 py-2.5 pr-10 text-sm font-mono focus:outline-none focus:border-[#00f5ff]"
                            autoComplete="off"
                          />
                          <button
                            type="button"
                            onClick={() => setShowKeys((p) => ({ ...p, [svc.name]: !p[svc.name] }))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[var(--text-secondary)]"
                          >
                            {showKeys[svc.name] ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        {keyError[svc.name] && <p className="text-[11px] text-pink-400">{keyError[svc.name]}</p>}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleSaveKey(svc.name)}
                            disabled={status === "saving" || status === "testing"}
                            className="flex-1 min-w-[7rem] flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-[#00f5ff]/12 border border-[#00f5ff]/30 text-[#00f5ff]"
                          >
                            {status === "saving" ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                            Salvar
                          </button>
                          <button
                            onClick={() => handleTestKey(svc.name)}
                            disabled={status === "testing"}
                            className="flex-1 min-w-[7rem] flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-[var(--bg-primary)] border border-[var(--border-glow)] text-[var(--text-primary)]"
                          >
                            {status === "testing" ? <Loader2 className="animate-spin" size={14} /> : <FlaskConical size={14} />}
                            Testar
                          </button>
                          {hasStored && (
                            <button onClick={() => handleRemoveKey(svc.name)} className="px-3 py-2 rounded-xl text-xs font-bold text-pink-400 border border-pink-500/30">
                              Remover
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === "bot" && (
                <section className="p-4 sm:p-5 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-[#bf00ff]">
                    <Sparkles size={16} />
                    <h2 className="font-bold text-sm text-[var(--text-primary)]">Personalizacao do bot</h2>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-secondary)]">Provedor preferido</label>
                    <select
                      value={botPrefs.preferredProvider}
                      onChange={(e) =>
                        setBotPrefs((p) => ({
                          ...p,
                          preferredProvider: e.target.value as BotPrefs["preferredProvider"],
                        }))
                      }
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#bf00ff]"
                    >
                      <option value="auto">Automatico</option>
                      <option value="Groq">Groq</option>
                      <option value="Gemini">Gemini</option>
                      <option value="OpenRouter">OpenRouter</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-secondary)]">Tom</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        ["direto", "Direto"],
                        ["mentor", "Mentor"],
                        ["casual", "Casual"],
                        ["senior", "Senior"],
                      ] as const).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setBotPrefs((p) => ({ ...p, tone: id }))}
                          className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                            botPrefs.tone === id
                              ? "border-[#bf00ff]/50 bg-[#bf00ff]/15 text-[#e0b0ff]"
                              : "border-[var(--border-glow)] text-[var(--text-secondary)]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-secondary)]">Contexto de memoria</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        ["curto", "Curto"],
                        ["medio", "Medio"],
                        ["longo", "Longo"],
                      ] as const).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setBotPrefs((p) => ({ ...p, maxContext: id }))}
                          className={`py-2.5 rounded-xl text-xs font-bold border ${
                            botPrefs.maxContext === id
                              ? "border-[#00f5ff]/50 bg-[#00f5ff]/15 text-[#00f5ff]"
                              : "border-[var(--border-glow)] text-[var(--text-secondary)]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-secondary)]">Instrucoes extras (system prompt)</label>
                    <textarea
                      value={botPrefs.systemPrompt}
                      onChange={(e) => setBotPrefs((p) => ({ ...p, systemPrompt: e.target.value }))}
                      rows={4}
                      placeholder="Ex.: Responda sempre em PT-BR, prefira TypeScript, seja objetivo..."
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#bf00ff] resize-y min-h-[6rem]"
                    />
                  </div>

                  <button
                    onClick={handleSaveBot}
                    disabled={savingBot}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#00f5ff]/20 to-[#bf00ff]/20 border border-[#bf00ff]/40 text-[#e0b0ff]"
                  >
                    {savingBot ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    Salvar preferencias do bot
                  </button>
                </section>
              )}

              {activeTab === "sessao" && (
                <div className="space-y-3">
                  <section className="p-4 sm:p-5 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl space-y-3">
                    <div>
                      <p className="text-sm font-bold">Sessao ativa</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                        Auth nativo Neon + JWT. Logado como{" "}
                        <span className="font-mono text-[var(--text-primary)] break-all">{user?.email || "—"}</span>
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-pink-500/10 border border-pink-500/30 text-pink-400 rounded-xl font-bold text-sm"
                    >
                      <LogOut size={16} /> Encerrar sessao
                    </button>
                  </section>

                  <section className="p-4 sm:p-5 bg-[var(--bg-card)] border border-red-500/25 rounded-2xl space-y-3">
                    <div>
                      <h3 className="font-orbitron font-bold text-red-400 text-xs tracking-wider">ZONA DE PERIGO</h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                        Apaga dados locais deste aparelho e faz logout.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl font-bold text-sm"
                    >
                      <Trash2 size={16} /> Limpar dados e sair
                    </button>
                  </section>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
