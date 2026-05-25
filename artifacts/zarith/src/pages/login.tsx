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
} from "lucide-react";
import { supabaseClient } from "@/lib/supabase";

const GithubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v8" />
    <path d="M8 12h8" />
  </svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"email" | "password">("email");
  const [loading, setLoading] = useState(false);
  const [glitch, setGlitch] = useState(false);

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

  const redirectUrl = `${window.location.origin}/api/auth/callback`;

  const handleGitHubLogin = async () => {
    if (!supabaseClient) return;
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo: redirectUrl, skipBrowserRedirect: false },
      });
      if (error) throw error;
    } catch (err) {
      console.error("GitHub Login Error:", err);
      alert("Erro ao iniciar login com GitHub.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!supabaseClient) return;
    setLoading(true);
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl, skipBrowserRedirect: false },
      });
      if (error) throw error;
    } catch (err) {
      console.error("Google Login Error:", err);
      alert("Erro ao iniciar login com Google.");
      setLoading(false);
    }
  };

  const checkEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => {
      setStep("password");
      setLoading(false);
    }, 300);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !supabaseClient) return;
    setLoading(true);
    try {
      const { error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (signInError) {
        if (signInError.message.includes("Invalid login credentials") || signInError.message.includes("Email not confirmed")) {
          const { error: signUpError } = await supabaseClient.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: redirectUrl },
          });
          if (signUpError) throw signUpError;
          alert("Conta criada! Verifique seu email para confirmar ou tente logar se já confirmou.");
        } else {
          throw signInError;
        }
      } else {
        window.location.href = "/chat";
      }
    } catch (err) {
      const error = err as Error;
      alert(error.message || "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] relative overflow-hidden flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 w-full max-w-md space-y-8 text-center"
      >
        <div className="relative inline-block">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <motion.div
              animate={{
                boxShadow: [
                  "0 0 20px #bf00ff33, 0 0 40px #00f5ff33",
                  "0 0 40px #bf00ff66, 0 0 60px #00f5ff66",
                  "0 0 20px #bf00ff33, 0 0 40px #00f5ff33",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="rounded-full overflow-hidden border-2 border-[var(--border-glow)] w-[180px] h-[180px] mx-auto relative bg-black/40 backdrop-blur-sm"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={glitch ? "glitch" : "normal"}
                  initial={{ x: 0, opacity: 1 }}
                  animate={
                    glitch
                      ? {
                          x: [0, -5, 5, -2, 2, 0],
                          filter: ["hue-rotate(0deg)", "hue-rotate(90deg)", "hue-rotate(-90deg)", "hue-rotate(0deg)"],
                        }
                      : {}
                  }
                  className="w-full h-full relative"
                >
                  <img src="/zarith.png" alt="Zarith AI" className="w-full h-full object-cover" />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </div>

        <div className="space-y-2">
          <motion.h1
            className="font-orbitron font-black text-5xl tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-cyan)] via-[var(--accent-purple)] to-[var(--accent-cyan)]"
            animate={glitch ? { skewX: [0, -10, 10, 0], x: [0, -2, 2, 0] } : {}}
          >
            ZARITH
          </motion.h1>
          <p className="text-[var(--text-secondary)] font-mono text-[10px] tracking-widest uppercase opacity-60">
            Neural Intelligence & SaaS Infrastructure
          </p>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-glow)] p-8 rounded-3xl shadow-2xl backdrop-blur-md relative group overflow-hidden">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] rounded-3xl opacity-10 group-hover:opacity-20 transition duration-1000"></div>
          <div className="space-y-6 relative">
            <form onSubmit={step === "email" ? checkEmail : handleAuth} className="space-y-4">
              <div className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                  <input
                    type="email"
                    placeholder="Seu e-mail de acesso"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-xl py-4 pl-12 pr-4 focus:border-[var(--accent-cyan)] outline-none transition-all font-mono text-sm disabled:opacity-50"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading || step !== "email"}
                    required
                  />
                </div>

                <AnimatePresence>
                  {step === "password" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -20 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -20 }}
                      className="relative"
                    >
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                      <input
                        type="password"
                        placeholder="Sua senha"
                        className="w-full bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-xl py-4 pl-12 pr-4 focus:border-[var(--accent-cyan)] outline-none transition-all font-mono text-sm"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                        required
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] text-[var(--bg-primary)] py-4 rounded-xl font-black tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2 glow-cyan disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      {step === "email" ? "ACESSAR SISTEMA" : "CONFIRMAR ACESSO"}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                {step === "password" && (
                  <button
                    type="button"
                    onClick={() => setStep("email")}
                    className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest hover:text-[var(--accent-cyan)] transition-colors"
                  >
                    Alterar e-mail
                  </button>
                )}
              </div>
            </form>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--border-glow)] opacity-30"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                <span className="bg-[var(--bg-card)] px-4 text-[var(--text-secondary)]">Conexão Externa</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleGitHubLogin}
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-glow)] py-3 rounded-xl hover:border-[var(--accent-cyan)] transition-all text-[10px] font-bold disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : <><GithubIcon /> GITHUB</>}
              </button>
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-glow)] py-3 rounded-xl hover:border-[var(--accent-purple)] transition-all text-[10px] font-bold disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : <><GoogleIcon /> GOOGLE</>}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4">
          {[
            { icon: <Zap size={14} />, label: "Edge Core" },
            { icon: <Shield size={14} />, label: "Secured" },
            { icon: <Cpu size={14} />, label: "AI Engine" },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-all cursor-default">
              <div className="text-[var(--accent-cyan)]">{item.icon}</div>
              <span className="text-[8px] font-black uppercase tracking-tighter">{item.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="absolute top-20 left-20 animate-pulse text-[var(--accent-cyan)] opacity-10 hidden md:block">
        <Globe size={120} />
      </div>
      <div className="absolute bottom-20 right-20 animate-bounce text-[var(--accent-purple)] opacity-10 hidden md:block">
        <Lock size={80} />
      </div>
    </div>
  );
}
