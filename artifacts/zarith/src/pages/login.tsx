import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  ArrowRight,
  Zap,
  Shield,
  Cpu,
  Globe,
  Lock,
  Loader2,
  LogIn,
  Eye,
  EyeOff,
  CheckCircle2,
  UserPlus,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { setAuthSession, isAuthenticated, type AuthUser } from "@/lib/auth-session";

type Step = "email" | "password" | "signup" | "done";

function translateError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("incorretos") || m.includes("invalid"))
    return "Email ou senha incorretos. Verifique os dados e tente novamente.";
  if (m.includes("já possui") || m.includes("already") || m.includes("409"))
    return "Este email já possui uma conta. Tente fazer login.";
  if (m.includes("pelo menos 6") || m.includes("at least"))
    return "A senha deve ter pelo menos 6 caracteres.";
  if (m.includes("jwt_secret") || m.includes("session_secret"))
    return "Servidor sem JWT_SECRET configurado. Peça ao admin para definir a variável no Vercel.";
  if (m.includes("network") || m.includes("fetch") || m.includes("conexão") || m.includes("failed to fetch"))
    return "Erro de conexão. Verifique sua internet e se a API está no ar.";
  return message;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);
  const [glitch, setGlitch] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");

  useEffect(() => {
    const triggerGlitch = () => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 200);
      const nextInterval = Math.random() * 2000 + 8000;
      setTimeout(triggerGlitch, nextInterval);
    };
    const timer = setTimeout(triggerGlitch, 8000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isAuthenticated()) {
      window.location.href = "/chat";
    }
  }, []);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim()) {
      setErrorMsg("Digite seu email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg("Email inválido.");
      return;
    }
    setStep(mode === "signup" ? "signup" : "password");
  };

  const persistAndGo = (token: string, user: AuthUser) => {
    setAuthSession(token, user);
    setStep("done");
    setTimeout(() => {
      window.location.href = "/chat";
    }, 600);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!password) {
      setErrorMsg("Digite sua senha.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<{ user: AuthUser; token: string }>("auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (!res.success || !res.data?.token) {
        setErrorMsg(translateError(res.error || "Falha no login"));
        return;
      }
      persistAndGo(res.data.token, res.data.user);
    } catch (err) {
      setErrorMsg(translateError((err as Error).message || "Erro de conexão"));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!password) {
      setErrorMsg("Digite uma senha.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<{ user: AuthUser; token: string }>("auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          name: name.trim() || undefined,
        }),
      });
      if (!res.success || !res.data?.token) {
        setErrorMsg(translateError(res.error || "Falha ao criar conta"));
        return;
      }
      persistAndGo(res.data.token, res.data.user);
    } catch (err) {
      setErrorMsg(translateError((err as Error).message || "Erro de conexão"));
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: <Cpu size={16} />, text: "Múltiplos modelos de IA" },
    { icon: <Shield size={16} />, text: "Dados criptografados" },
    { icon: <Zap size={16} />, text: "Respostas em tempo real" },
    { icon: <Globe size={16} />, text: "Web search integrado" },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] relative overflow-hidden flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="z-10 w-full max-w-md space-y-8 text-center"
      >
        <div className="relative inline-block">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <div
              className={`text-6xl font-orbitron font-black tracking-widest bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] bg-clip-text text-transparent ${glitch ? "translate-x-0.5" : ""} transition-transform`}
            >
              ZARITH
            </div>
            {glitch && (
              <div className="absolute inset-0 text-6xl font-orbitron font-black tracking-widest text-[var(--accent-pink)] opacity-60 translate-x-1">
                ZARITH
              </div>
            )}
          </motion.div>
          <div className="text-xs text-[var(--text-secondary)] font-mono tracking-widest uppercase mt-1">
            v2.0 — AI Assistant
          </div>
        </div>

        <motion.div
          className="bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-3xl p-8 shadow-2xl space-y-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <AnimatePresence mode="wait">
            {step === "email" && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="font-orbitron font-bold text-xl">
                    {mode === "login" ? "Acessar conta" : "Criar conta"}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Login com email e senha (Neon)
                  </p>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-3">
                  <div className="relative">
                    <Mail
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                      size={18}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrorMsg(null);
                      }}
                      placeholder="seu@email.com"
                      autoComplete="email"
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-xl pl-11 pr-4 py-3 text-sm focus:border-[var(--accent-cyan)] outline-none transition-all font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] text-[var(--bg-primary)] font-bold rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    Continuar
                    <ArrowRight size={16} />
                  </button>
                </form>

                <div className="text-center text-xs text-[var(--text-secondary)]">
                  {mode === "login" ? (
                    <>
                      Não tem conta?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("signup");
                          setErrorMsg(null);
                        }}
                        className="text-[var(--accent-cyan)] font-bold hover:underline"
                      >
                        Criar conta
                      </button>
                    </>
                  ) : (
                    <>
                      Já tem conta?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("login");
                          setErrorMsg(null);
                        }}
                        className="text-[var(--accent-cyan)] font-bold hover:underline"
                      >
                        Entrar
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {step === "password" && (
              <motion.div
                key="password"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setErrorMsg(null);
                      setPassword("");
                    }}
                    className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors mb-3 flex items-center gap-1"
                  >
                    ← Voltar
                  </button>
                  <div className="flex items-center gap-3">
                    <LogIn size={20} className="text-[var(--accent-cyan)]" />
                    <h2 className="font-orbitron font-bold text-xl">Entrar</h2>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">{email}</p>
                </div>

                <form onSubmit={handleSignIn} className="space-y-3">
                  <div className="relative">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                      size={18}
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrorMsg(null);
                      }}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      minLength={6}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-xl pl-11 pr-12 py-3 text-sm focus:border-[var(--accent-cyan)] outline-none transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--accent-cyan)]"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] text-[var(--bg-primary)] font-bold rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Autenticando…
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {step === "signup" && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setErrorMsg(null);
                      setPassword("");
                      setConfirmPassword("");
                    }}
                    className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors mb-3 flex items-center gap-1"
                  >
                    ← Voltar
                  </button>
                  <div className="flex items-center gap-3">
                    <UserPlus size={20} className="text-[var(--accent-cyan)]" />
                    <h2 className="font-orbitron font-bold text-xl">Criar conta</h2>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">{email}</p>
                </div>

                <form onSubmit={handleSignUp} className="space-y-3">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome (opcional)"
                    autoComplete="name"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-xl px-4 py-3 text-sm focus:border-[var(--accent-cyan)] outline-none transition-all"
                  />
                  <div className="relative">
                    <Lock
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                      size={18}
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrorMsg(null);
                      }}
                      placeholder="Senha (mín. 6)"
                      autoComplete="new-password"
                      minLength={6}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-xl pl-11 pr-12 py-3 text-sm focus:border-[var(--accent-cyan)] outline-none transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--accent-cyan)]"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Confirmar senha"
                    autoComplete="new-password"
                    minLength={6}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-xl px-4 py-3 text-sm focus:border-[var(--accent-cyan)] outline-none transition-all font-mono"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] text-[var(--bg-primary)] font-bold rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Criando…
                      </>
                    ) : (
                      "Criar conta"
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {step === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4 py-4"
              >
                <CheckCircle2 className="mx-auto text-[var(--accent-cyan)]" size={40} />
                <p className="font-orbitron font-bold">Tudo certo!</p>
                <p className="text-xs text-[var(--text-secondary)]">Redirecionando…</p>
              </motion.div>
            )}
          </AnimatePresence>

          {errorMsg && (
            <div
              className="p-3 rounded-xl border border-red-500/40 bg-red-950/20 text-red-400 text-xs text-center"
              role="alert"
            >
              {errorMsg}
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-2 gap-3 text-left">
          {features.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"
            >
              <span className="text-[var(--accent-cyan)]">{f.icon}</span>
              {f.text}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
