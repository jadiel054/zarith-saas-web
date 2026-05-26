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
  KeyRound,
  UserPlus,
  LogIn,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { supabaseClient } from "@/lib/supabase";

// Ícones OAuth
const GithubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

// Traduz erros do Supabase para português claro
function translateError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials") || m.includes("invalid_credentials"))
    return "Email ou senha incorretos. Verifique os dados e tente novamente.";
  if (m.includes("email not confirmed"))
    return "Seu email ainda não foi confirmado. Verifique sua caixa de entrada e clique no link de confirmação.";
  if (m.includes("user already registered") || m.includes("already registered"))
    return "Este email já possui uma conta. Tente fazer login.";
  if (m.includes("password should be at least"))
    return "A senha deve ter pelo menos 6 caracteres.";
  if (m.includes("unable to validate email address"))
    return "Endereço de email inválido.";
  if (m.includes("email rate limit exceeded") || m.includes("rate limit"))
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (m.includes("signup is disabled"))
    return "Cadastros estão desativados no momento. Entre em contato com o suporte.";
  if (m.includes("network") || m.includes("fetch"))
    return "Erro de conexão. Verifique sua internet e tente novamente.";
  return message;
}

type Step = "email" | "password" | "signup" | "check-email";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);
  const [glitch, setGlitch] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");

  const noSupabase = !supabaseClient;

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

  // Verifica se já está logado ao montar a página
  useEffect(() => {
    if (!supabaseClient) return;
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session) window.location.href = "/chat";
    });
  }, []);

  const redirectUrl = `${window.location.origin}/api/auth/callback`;

  // ── OAuth ──────────────────────────────────────────────────────────────────

  const handleGitHubLogin = async () => {
    setErrorMsg(null);
    if (!supabaseClient) {
      setErrorMsg("Supabase não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente do Vercel.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });
      if (error) throw error;
      // Se chegou aqui sem redirect, algo deu errado
    } catch (err) {
      setErrorMsg(translateError((err as Error).message));
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    if (!supabaseClient) {
      setErrorMsg("Supabase não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente do Vercel.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });
      if (error) throw error;
    } catch (err) {
      setErrorMsg(translateError((err as Error).message));
      setLoading(false);
    }
  };

  // ── Email: avançar para senha ──────────────────────────────────────────────

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim()) { setErrorMsg("Digite seu email."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErrorMsg("Email inválido."); return; }

    if (noSupabase) {
      // Modo sem Supabase: permite acesso livre para desenvolvimento
      window.location.href = "/chat";
      return;
    }

    setStep(mode === "signup" ? "signup" : "password");
  };

  // ── Login com email + senha ────────────────────────────────────────────────

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!password) { setErrorMsg("Digite sua senha."); return; }

    if (noSupabase) {
      window.location.href = "/chat";
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabaseClient!.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = "/chat";
    } catch (err) {
      setErrorMsg(translateError((err as Error).message));
    } finally {
      setLoading(false);
    }
  };

  // ── Cadastro com email + senha ─────────────────────────────────────────────

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!password) { setErrorMsg("Digite uma senha."); return; }
    if (password.length < 6) { setErrorMsg("A senha deve ter pelo menos 6 caracteres."); return; }
    if (password !== confirmPassword) { setErrorMsg("As senhas não coincidem."); return; }

    if (noSupabase) {
      window.location.href = "/chat";
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabaseClient!.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl },
      });

      if (error) throw error;

      // Se o usuário já existia, o Supabase retorna session null e identities vazio
      if (data.user && data.user.identities?.length === 0) {
        setErrorMsg("Este email já possui uma conta. Clique em 'Já tenho conta' e faça login.");
        return;
      }

      // Conta criada — aguardando confirmação de email
      setStep("check-email");
    } catch (err) {
      setErrorMsg(translateError((err as Error).message));
    } finally {
      setLoading(false);
    }
  };

  // ── Esqueci a senha ────────────────────────────────────────────────────────

  const handleForgotPassword = async () => {
    setErrorMsg(null);
    if (!email) { setErrorMsg("Volte e informe seu email antes."); return; }
    if (!supabaseClient) return;
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      if (error) throw error;
      setErrorMsg(`Link de redefinição enviado para ${email}. Verifique sua caixa de entrada.`);
    } catch (err) {
      setErrorMsg(translateError((err as Error).message));
    } finally {
      setLoading(false);
    }
  };

  // ── Features ───────────────────────────────────────────────────────────────
  const features = [
    { icon: <Cpu size={16} />, text: "Múltiplos modelos de IA" },
    { icon: <Shield size={16} />, text: "Dados criptografados" },
    { icon: <Zap size={16} />, text: "Respostas em tempo real" },
    { icon: <Globe size={16} />, text: "Web search integrado" },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] relative overflow-hidden flex flex-col items-center justify-center p-6">
      {/* Background grid */}
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
        {/* Logo */}
        <div className="relative inline-block">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <div className={`text-6xl font-orbitron font-black tracking-widest bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] bg-clip-text text-transparent ${glitch ? "translate-x-0.5" : ""} transition-transform`}>
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

        {/* Card principal */}
        <motion.div
          className="bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-3xl p-8 shadow-2xl space-y-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* Aviso de sem Supabase */}
          {noSupabase && (
            <div className="px-4 py-3 bg-[var(--accent-pink)]/10 border border-[var(--accent-pink)]/30 rounded-xl text-xs text-[var(--accent-pink)] text-left">
              ⚠️ Variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configuradas.
              Login externo desabilitado — modo de desenvolvimento ativo.
            </div>
          )}

          <AnimatePresence mode="wait">

            {/* ── STEP: EMAIL ─────────────────────────────────────── */}
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
                    {mode === "login" ? "Entre com email ou provedor OAuth" : "Crie sua conta para começar"}
                  </p>
                </div>

                {/* OAuth */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleGitHubLogin}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-glow)] rounded-xl font-bold text-sm hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)] transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <GithubIcon />}
                    GitHub
                  </button>
                  <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-glow)] rounded-xl font-bold text-sm hover:border-[var(--accent-cyan)] transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
                    Google
                  </button>
                </div>

                <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                  <div className="flex-1 h-px bg-[var(--border-glow)]" />
                  <span className="text-xs font-bold uppercase tracking-widest">ou</span>
                  <div className="flex-1 h-px bg-[var(--border-glow)]" />
                </div>

                {/* Email form */}
                <form onSubmit={handleEmailSubmit} className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setErrorMsg(null); }}
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

                {/* Toggle login/signup */}
                <div className="text-center text-xs text-[var(--text-secondary)]">
                  {mode === "login" ? (
                    <>
                      Não tem conta?{" "}
                      <button
                        onClick={() => { setMode("signup"); setErrorMsg(null); }}
                        className="text-[var(--accent-cyan)] font-bold hover:underline"
                      >
                        Criar conta
                      </button>
                    </>
                  ) : (
                    <>
                      Já tem conta?{" "}
                      <button
                        onClick={() => { setMode("login"); setErrorMsg(null); }}
                        className="text-[var(--accent-cyan)] font-bold hover:underline"
                      >
                        Entrar
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── STEP: PASSWORD (LOGIN) ───────────────────────────── */}
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
                    onClick={() => { setStep("email"); setErrorMsg(null); setPassword(""); }}
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
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrorMsg(null); }}
                      placeholder="Sua senha"
                      autoComplete="current-password"
                      autoFocus
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-xl pl-11 pr-12 py-3 text-sm focus:border-[var(--accent-cyan)] outline-none transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !password}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] text-[var(--bg-primary)] font-bold rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                    {loading ? "Entrando..." : "Entrar"}
                  </button>
                </form>

                <div className="text-center">
                  <button
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP: SIGNUP ─────────────────────────────────────── */}
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
                    onClick={() => { setStep("email"); setErrorMsg(null); setPassword(""); setConfirmPassword(""); }}
                    className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors mb-3 flex items-center gap-1"
                  >
                    ← Voltar
                  </button>
                  <div className="flex items-center gap-3">
                    <UserPlus size={20} className="text-[var(--accent-purple)]" />
                    <h2 className="font-orbitron font-bold text-xl">Criar conta</h2>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">{email}</p>
                </div>

                <form onSubmit={handleSignUp} className="space-y-3">
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrorMsg(null); }}
                      placeholder="Crie uma senha (mín. 6 caracteres)"
                      autoComplete="new-password"
                      autoFocus
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-xl pl-11 pr-12 py-3 text-sm focus:border-[var(--accent-cyan)] outline-none transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setErrorMsg(null); }}
                      placeholder="Confirme a senha"
                      autoComplete="new-password"
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-xl pl-11 pr-4 py-3 text-sm focus:border-[var(--accent-cyan)] outline-none transition-all font-mono"
                    />
                  </div>

                  {/* Indicador de força da senha */}
                  {password.length > 0 && (
                    <div className="flex gap-1 h-1">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-colors ${
                            i < (password.length < 6 ? 1 : password.length < 8 ? 2 : password.length < 12 ? 3 : 4)
                              ? password.length < 6
                                ? "bg-[var(--accent-pink)]"
                                : password.length < 8
                                ? "bg-yellow-500"
                                : "bg-[var(--accent-green)]"
                              : "bg-[var(--border-glow)]"
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !password || !confirmPassword}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-cyan)] text-[var(--bg-primary)] font-bold rounded-xl hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                    {loading ? "Criando conta..." : "Criar conta"}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── STEP: CHECK EMAIL ────────────────────────────────── */}
            {step === "check-email" && (
              <motion.div
                key="check-email"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-5 text-center py-4"
              >
                <div className="w-16 h-16 bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} className="text-[var(--accent-cyan)]" />
                </div>
                <div>
                  <h2 className="font-orbitron font-bold text-xl text-[var(--accent-cyan)]">
                    CONFIRME SEU EMAIL
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] mt-2">
                    Enviamos um link de confirmação para
                  </p>
                  <p className="font-mono text-sm text-[var(--text-primary)] font-bold mt-1">
                    {email}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-3">
                    Clique no link do email para ativar sua conta. Verifique a caixa de spam se não encontrar.
                  </p>
                </div>
                <button
                  onClick={() => { setStep("email"); setPassword(""); setConfirmPassword(""); setErrorMsg(null); }}
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors"
                >
                  Usar outro email
                </button>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Mensagem de erro */}
          <AnimatePresence>
            {errorMsg && step !== "check-email" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`px-4 py-3 rounded-xl text-sm border text-left ${
                  errorMsg.includes("enviado") || errorMsg.includes("sucesso")
                    ? "bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30 text-[var(--accent-green)]"
                    : "bg-[var(--accent-pink)]/10 border-[var(--accent-pink)]/30 text-[var(--accent-pink)]"
                }`}
              >
                {errorMsg}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 text-left">
          {features.map((f) => (
            <div
              key={f.text}
              className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)]/50 border border-[var(--border-glow)] rounded-lg text-xs text-[var(--text-secondary)]"
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
