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
} from "lucide-react";
import { Link } from "wouter";
import { supabaseClient } from "@/lib/supabase";

type Tab = "conta" | "aparencia" | "modelos" | "api" | "privacidade" | "sessao";

interface UserSettings {
  groq_key_encrypted?: string;
  openrouter_key_encrypted?: string;
  gemini_key_encrypted?: string;
  github_token_encrypted?: string;
  greptile_key_encrypted?: string;
  tavily_key_encrypted?: string;
}

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
  type: "success" | "error";
  message: string;
}

let toastCounter = 0;

// Tamanho máximo para avatar em base64 (100KB — só para preview rápido)
const MAX_AVATAR_B64_BYTES = 100 * 1024;

export default function SettingsPage() {
  const LS_PREFIX = "zarith_apikey_";
  const LS_AVATAR = "zarith_avatar";
  const SERVICE_KEYS: Record<string, keyof UserSettings> = {
    "Groq": "groq_key_encrypted",
    "OpenRouter": "openrouter_key_encrypted",
    "Gemini": "gemini_key_encrypted",
    "GitHub Token": "github_token_encrypted",
    "Greptile": "greptile_key_encrypted",
    "Tavily": "tavily_key_encrypted",
  };

  const [activeTab, setActiveTab] = useState<Tab>("conta");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [keyValues, setKeyValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<Record<string, boolean>>({});
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({});
  const [storedKeys, setStoredKeys] = useState<Record<string, boolean>>({});
  const [apiKeys] = useState<UserSettings>({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  // CORREÇÃO: avatarPreview agora é apenas para preview visual temporário,
  // não armazena base64 inteiro no localStorage (evita QuotaExceededError)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      // Verifica chaves de API salvas no localStorage
      const stored: Record<string, boolean> = {};
      for (const name of Object.keys(SERVICE_KEYS)) {
        const val = localStorage.getItem(LS_PREFIX + name);
        if (val) stored[name] = true;
      }
      setStoredKeys(stored);

      // Carrega avatar salvo (somente se for pequeno — evita travar o browser)
      try {
        const savedAvatar = localStorage.getItem(LS_AVATAR);
        if (savedAvatar && savedAvatar.length < MAX_AVATAR_B64_BYTES * 1.4) {
          setAvatarPreview(savedAvatar);
        }
      } catch {
        // Ignora erro de leitura do localStorage
      }

      if (!supabaseClient) {
        setLoading(false);
        return;
      }

      // Proteção de rota: redireciona para login se não autenticado
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        window.location.href = "/";
        return;
      }
      setUser(user as unknown as SupabaseUser);
      setDisplayName(
        (user as unknown as SupabaseUser).user_metadata?.full_name ||
        (user as unknown as SupabaseUser).user_metadata?.name ||
        user.email?.split("@")[0] || "Usuário"
      );
      setLoading(false);
    };
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addToast = (type: "success" | "error", message: string) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const toggleKey = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = async () => {
    if (supabaseClient) await supabaseClient.auth.signOut();
    window.location.href = "/";
  };

  const handleSaveApiKey = async (serviceName: string, keyField: string) => {
    const value = keyValues[serviceName] || "";
    if (!value.trim()) {
      addToast("error", `Informe a chave para ${serviceName}.`);
      return;
    }
    setSavingKey((prev) => ({ ...prev, [serviceName]: true }));
    try {
      localStorage.setItem(LS_PREFIX + serviceName, value.trim());
      setStoredKeys((prev) => ({ ...prev, [serviceName]: true }));
      setSavedKeys((prev) => ({ ...prev, [serviceName]: true }));
      addToast("success", `Chave ${serviceName} salva com sucesso!`);
      setKeyValues((prev) => ({ ...prev, [serviceName]: "" }));
      setTimeout(() => setSavedKeys((prev) => ({ ...prev, [serviceName]: false })), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar chave.";
      addToast("error", `Erro ao salvar ${serviceName}: ${msg}`);
    } finally {
      setSavingKey((prev) => ({ ...prev, [serviceName]: false }));
    }
    void keyField;
  };

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setSavingName(true);
    try {
      if (supabaseClient) {
        const { error } = await supabaseClient.auth.updateUser({
          data: { full_name: displayName },
        });
        if (error) throw error;
      }
      addToast("success", "Nome atualizado com sucesso!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar nome.";
      addToast("error", msg);
    } finally {
      setSavingName(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Valida tamanho do arquivo (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      addToast("error", "Imagem muito grande. Máximo 2MB.");
      return;
    }

    setUploadingAvatar(true);
    try {
      // CORREÇÃO: Redimensiona a imagem antes de salvar, para evitar base64 gigante no localStorage
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const MAX_DIM = 128; // avatar pequeno — só precisamos de 128x128
      const scale = Math.min(MAX_DIM / bitmap.width, MAX_DIM / bitmap.height, 1);
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas não disponível.");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      // Comprime para JPEG a 80% — resulta em ~5-20KB
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

      try {
        localStorage.setItem(LS_AVATAR, dataUrl);
      } catch {
        // Se o localStorage estiver cheio, limpa apenas o avatar anterior
        localStorage.removeItem(LS_AVATAR);
        localStorage.setItem(LS_AVATAR, dataUrl);
      }

      setAvatarPreview(dataUrl);
      addToast("success", "Foto de perfil atualizada!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao processar imagem.";
      addToast("error", msg);
    } finally {
      setUploadingAvatar(false);
      // Reseta o input para permitir selecionar a mesma imagem novamente
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  // CORREÇÃO: handleDeleteAccount agora realmente desautentica e limpa dados locais.
  // Nota: a deleção do usuário no lado servidor requer uma Edge Function no Supabase
  // (service_role key), pois o cliente browser não tem permissão de admin.
  // Esta função faz o que é possível no browser: sign out + limpeza local.
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "EXCLUIR") return;
    setDeletingAccount(true);
    try {
      // Limpa todos os dados locais do usuário
      const keysToRemove: string[] = [LS_AVATAR];
      for (const name of Object.keys(SERVICE_KEYS)) {
        keysToRemove.push(LS_PREFIX + name);
      }
      keysToRemove.forEach((k) => {
        try { localStorage.removeItem(k); } catch { /* ignora */ }
      });

      // Tenta chamar edge function de deleção (se existir)
      if (supabaseClient) {
        const { data: { user: currentUser } } = await supabaseClient.auth.getUser();
        if (currentUser) {
          // Tenta invocar função de deleção (requer setup no Supabase)
          await supabaseClient.functions.invoke("delete-user", {
            body: { user_id: currentUser.id },
          }).catch(() => {
            // Se a função não existir, apenas faz sign out
            // O admin pode deletar manualmente pelo painel do Supabase
          });
        }
        await supabaseClient.auth.signOut();
      }

      addToast("success", "Dados locais apagados. Redirecionando...");
      setTimeout(() => { window.location.href = "/"; }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir conta.";
      addToast("error", msg);
      setDeletingAccount(false);
    }
  };

  const tabs = [
    { id: "conta", label: "Conta", icon: <User size={18} /> },
    { id: "aparencia", label: "Aparência", icon: <Palette size={18} /> },
    { id: "modelos", label: "Modelos de IA", icon: <Cpu size={18} /> },
    { id: "api", label: "API Keys", icon: <Key size={18} /> },
    { id: "privacidade", label: "Privacidade", icon: <Shield size={18} /> },
    { id: "sessao", label: "Sessão", icon: <LogOut size={18} /> },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ duration: 0.25 }}
              className={`pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-xl border font-bold text-sm shadow-2xl backdrop-blur-sm ${
                toast.type === "success"
                  ? "bg-[var(--bg-card)] border-[var(--accent-green)]/40 text-[var(--accent-green)]"
                  : "bg-[var(--bg-card)] border-[var(--accent-pink)]/40 text-[var(--accent-pink)]"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertTriangle size={16} />
              )}
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Delete account modal */}
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
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-[var(--bg-secondary)] border border-red-500/40 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                    <AlertTriangle size={20} className="text-red-400" />
                  </div>
                  <h3 className="font-orbitron font-black text-lg text-red-400">EXCLUIR CONTA</h3>
                </div>
                <button
                  onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-[var(--text-secondary)] text-sm mb-2">
                Esta ação limpará todos os seus dados locais e encerrará sua sessão.
                Para remoção completa do servidor, entre em contato com o administrador.
              </p>

              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase mt-4 mb-2">
                Digite <span className="text-red-400">EXCLUIR</span> para confirmar
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="EXCLUIR"
                className="w-full bg-[var(--bg-primary)] border border-red-500/30 rounded-lg px-4 py-2 text-sm focus:border-red-500 outline-none font-mono mb-4 text-red-300 placeholder:text-red-900"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }}
                  className="flex-1 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-glow)] text-[var(--text-secondary)] rounded-xl font-bold text-sm hover:text-[var(--text-primary)] transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "EXCLUIR" || deletingAccount}
                  className="flex-1 px-4 py-2 bg-red-500/10 border border-red-500/50 text-red-400 rounded-xl font-bold text-sm hover:bg-red-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deletingAccount ? (
                    <><Loader2 size={14} className="animate-spin" /> Processando...</>
                  ) : (
                    <><Trash2 size={14} /> Confirmar exclusão</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="h-16 border-b border-[var(--border-glow)] flex items-center px-6 bg-[var(--bg-secondary)] gap-4">
        <Link href="/chat" className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--accent-cyan)] transition-all">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="font-orbitron font-black text-xl tracking-widest">CONFIGURAÇÕES</h1>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r border-[var(--border-glow)] bg-[var(--bg-secondary)] p-4 space-y-2 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-[var(--accent-cyan)]/20 to-[var(--accent-purple)]/20 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </aside>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* CONTA TAB */}
                {activeTab === "conta" && (
                  <div className="space-y-8">
                    <section className="space-y-4">
                      <h2 className="text-xl font-orbitron font-bold text-[var(--accent-cyan)]">PERFIL</h2>
                      <div className="flex items-center gap-6">
                        <div className="relative group shrink-0">
                          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center glow-cyan overflow-hidden">
                            {uploadingAvatar ? (
                              <Loader2 size={28} className="text-white animate-spin" />
                            ) : avatarPreview ? (
                              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                            ) : user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
                              <img
                                src={user.user_metadata.avatar_url || user.user_metadata.picture}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            ) : (
                              <User size={40} className="text-white" />
                            )}
                          </div>
                          <button
                            onClick={() => avatarInputRef.current?.click()}
                            className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all gap-1"
                            title="Alterar foto de perfil"
                          >
                            <Camera size={20} className="text-white" />
                            <span className="text-white text-[10px] font-bold">ALTERAR</span>
                          </button>
                          <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleAvatarChange}
                          />
                        </div>

                        <div className="space-y-2 flex-1">
                          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Nome de Exibição</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                              className="flex-1 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-lg px-4 py-2 text-sm focus:border-[var(--accent-cyan)] outline-none transition-colors"
                            />
                            <button
                              onClick={handleSaveName}
                              disabled={savingName || !displayName.trim()}
                              className="px-4 py-2 bg-[var(--accent-cyan)] text-[var(--bg-primary)] font-bold rounded-lg text-sm hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 min-w-[90px] justify-center"
                            >
                              {savingName ? (
                                <><Loader2 size={14} className="animate-spin" /> Salvando</>
                              ) : "Salvar"}
                            </button>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)]">
                            Passe o mouse sobre a foto para alterá-la (máx. 2MB).
                          </p>
                        </div>
                      </div>
                    </section>

                    <section className="p-6 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-glow)] space-y-2">
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
                    </section>
                  </div>
                )}

                {/* API KEYS TAB */}
                {activeTab === "api" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-orbitron font-bold text-[var(--accent-cyan)]">API KEYS</h2>
                    <p className="text-xs text-[var(--text-secondary)]">
                      As chaves são armazenadas localmente no seu navegador (não no servidor).
                    </p>
                    {(
                      [
                        { name: "Groq", key: "groq_key_encrypted" as keyof UserSettings },
                        { name: "OpenRouter", key: "openrouter_key_encrypted" as keyof UserSettings },
                        { name: "Gemini", key: "gemini_key_encrypted" as keyof UserSettings },
                        { name: "GitHub Token", key: "github_token_encrypted" as keyof UserSettings },
                        { name: "Greptile", key: "greptile_key_encrypted" as keyof UserSettings },
                        { name: "Tavily", key: "tavily_key_encrypted" as keyof UserSettings },
                      ] as const
                    ).map((service) => (
                      <div key={service.name} className="p-6 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl space-y-4 hover:border-[var(--accent-cyan)]/20 transition-all">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-bold">{service.name}</label>
                          {(storedKeys[service.name] || savedKeys[service.name]) && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--accent-green)]">
                              <CheckCircle2 size={12} /> CONFIGURADO
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type={showKeys[service.name] ? "text" : "password"}
                              value={keyValues[service.name] || ""}
                              onChange={(e) => setKeyValues((prev) => ({ ...prev, [service.name]: e.target.value }))}
                              placeholder={apiKeys[service.key] ? "••••••••••••••••" : `Sua chave ${service.name}`}
                              className="w-full bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-lg px-4 py-2 text-sm focus:border-[var(--accent-cyan)] outline-none font-mono pr-10 transition-colors"
                            />
                            <button
                              onClick={() => toggleKey(service.name)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors"
                            >
                              {showKeys[service.name] ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          <button
                            onClick={() => handleSaveApiKey(service.name, service.key)}
                            disabled={savingKey[service.name]}
                            className="px-4 py-2 bg-[var(--accent-cyan)] text-[var(--bg-primary)] font-bold rounded-lg text-sm hover:brightness-110 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 min-w-[100px] justify-center"
                          >
                            {savingKey[service.name] ? (
                              <><Loader2 size={14} className="animate-spin" /> Salvando</>
                            ) : "Salvar"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* SESSAO TAB */}
                {activeTab === "sessao" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-orbitron font-bold text-[var(--accent-cyan)]">SESSÃO</h2>

                    <div className="p-6 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl space-y-4">
                      <p className="text-sm text-[var(--text-secondary)]">Encerrar sua sessão atual neste dispositivo.</p>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-6 py-3 bg-[var(--accent-pink)]/10 border border-[var(--accent-pink)]/30 text-[var(--accent-pink)] rounded-xl font-bold hover:bg-[var(--accent-pink)]/20 transition-all"
                      >
                        <LogOut size={18} />
                        Encerrar Sessão
                      </button>
                    </div>

                    <div className="p-6 bg-[var(--bg-card)] border border-red-500/20 rounded-2xl space-y-4">
                      <div>
                        <h3 className="font-orbitron font-bold text-red-400 text-sm mb-1">ZONA DE PERIGO</h3>
                        <p className="text-sm text-[var(--text-secondary)]">
                          Limpa todos os dados locais e encerra sua sessão. Para deleção completa no servidor, entre em contato com o administrador.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl font-bold hover:bg-red-500/20 transition-all text-sm"
                      >
                        <Trash2 size={18} />
                        Excluir conta e dados locais
                      </button>
                    </div>
                  </div>
                )}

                {(activeTab === "aparencia" || activeTab === "modelos" || activeTab === "privacidade") && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-[var(--border-glow)]">
                      <Cpu size={32} className="text-[var(--text-secondary)]" />
                    </div>
                    <p className="text-[var(--text-secondary)] font-bold">Em desenvolvimento.</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Esta seção estará disponível em breve.</p>
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
