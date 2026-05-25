import { useState, useEffect } from "react";
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
    full_name?: string;
  };
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("conta");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [apiKeys] = useState<UserSettings>({});

  useEffect(() => {
    const loadData = async () => {
      if (!supabaseClient) { setLoading(false); return; }
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) setUser(user as unknown as SupabaseUser);
      setLoading(false);
    };
    loadData();
  }, []);

  const toggleKey = (key: string) => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = async () => {
    if (supabaseClient) await supabaseClient.auth.signOut();
    window.location.href = "/";
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
        <div className="w-12 h-12 border-4 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
      <header className="h-16 border-b border-[var(--border-glow)] flex items-center px-6 bg-[var(--bg-secondary)] gap-4">
        <Link href="/chat" className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--accent-cyan)] transition-all">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="font-orbitron font-black text-xl tracking-widest">CONFIGURAÇÕES</h1>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r border-[var(--border-glow)] bg-[var(--bg-secondary)] p-4 space-y-2">
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
                {activeTab === "conta" && (
                  <div className="space-y-8">
                    <section className="space-y-4">
                      <h2 className="text-xl font-orbitron font-bold text-[var(--accent-cyan)]">PERFIL</h2>
                      <div className="flex items-center gap-6">
                        <div className="relative group">
                          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center glow-cyan overflow-hidden">
                            {user?.user_metadata?.avatar_url ? (
                              <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <User size={40} className="text-white" />
                            )}
                          </div>
                          <button className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                            <Camera size={24} className="text-white" />
                          </button>
                        </div>
                        <div className="space-y-2 flex-1">
                          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Nome de Exibição</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              defaultValue={user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário"}
                              className="flex-1 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-lg px-4 py-2 text-sm focus:border-[var(--accent-cyan)] outline-none"
                            />
                            <button className="px-4 py-2 bg-[var(--accent-cyan)] text-[var(--bg-primary)] font-bold rounded-lg text-sm hover:brightness-110 transition-all">
                              Salvar
                            </button>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="space-y-4 p-6 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-glow)]">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-[var(--text-secondary)] uppercase">Email</p>
                          <p className="text-sm">{user?.email || "—"}</p>
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

                {activeTab === "api" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-orbitron font-bold text-[var(--accent-cyan)]">API KEYS</h2>
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
                      <div key={service.name} className="p-6 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-bold">{service.name}</label>
                          {apiKeys[service.key] && (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--accent-green)]">
                              <CheckCircle2 size={12} /> CONFIGURADO
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type={showKeys[service.name] ? "text" : "password"}
                              placeholder={apiKeys[service.key] ? "••••••••••••••••" : `Sua chave ${service.name}`}
                              className="w-full bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-lg px-4 py-2 text-sm focus:border-[var(--accent-cyan)] outline-none font-mono"
                            />
                            <button
                              onClick={() => toggleKey(service.name)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--accent-cyan)]"
                            >
                              {showKeys[service.name] ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          <button className="px-4 py-2 bg-[var(--accent-cyan)] text-[var(--bg-primary)] font-bold rounded-lg text-sm hover:brightness-110 transition-all">
                            Salvar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "sessao" && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-orbitron font-bold text-[var(--accent-cyan)]">SESSÃO</h2>
                    <div className="p-6 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl space-y-4">
                      <p className="text-sm text-[var(--text-secondary)]">Encerrar sua sessão atual.</p>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-6 py-3 bg-[var(--accent-pink)]/10 border border-[var(--accent-pink)]/30 text-[var(--accent-pink)] rounded-xl font-bold hover:bg-[var(--accent-pink)]/20 transition-all"
                      >
                        <LogOut size={18} />
                        Encerrar Sessão
                      </button>
                    </div>
                  </div>
                )}

                {(activeTab === "aparencia" || activeTab === "modelos" || activeTab === "privacidade") && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-[var(--border-glow)]">
                      <Cpu size={32} className="text-[var(--text-secondary)]" />
                    </div>
                    <p className="text-[var(--text-secondary)]">Em desenvolvimento.</p>
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
