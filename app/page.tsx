"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { motion } from "framer-motion";
import { supabaseClient } from "@/lib/supabase/client";
import { Mail, Globe, Cpu } from "lucide-react";

// Fallback icons if specific ones fail
const GithubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
);

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
);

export default function LoginPage() {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleGitHubLogin = async () => {
    if (!supabaseClient) {
      alert("Supabase não configurado");
      return;
    }

    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/api/auth/callback`,
      },
    });

    if (error) {
      alert(`Erro ao fazer login: ${error.message}`);
    }
  };

  const handleGoogleLogin = async () => {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/api/auth/callback`,
      },
    });
    if (error) alert(error.message);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseClient) return;
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error) alert(error.message);
  };

  const handleQuickMessage = (message: string) => {
    console.log("Quick message:", message);
    handleGitHubLogin(); 
  };

  const letters = "ZARITH".split("");

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] relative overflow-hidden flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 cyber-grid pointer-events-none opacity-40"></div>
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-[var(--bg-primary)] to-[var(--bg-primary)] pointer-events-none"></div>

      <div className="relative z-10 max-w-2xl w-full flex flex-col items-center">
        <div className="flex mb-2">
          {letters.map((char, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15, duration: 0.5 }}
              className="font-orbitron text-6xl md:text-8xl font-black tracking-[0.3em] bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] bg-clip-text text-transparent"
              style={{
                textShadow: "0 0 20px rgba(0, 245, 255, 0.3)",
              }}
            >
              {char}
            </motion.span>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="text-center"
        >
          <p className="font-orbitron text-[var(--accent-purple)] text-xl md:text-2xl mb-2 uppercase tracking-widest">
            VTuber AI Cyberpunk
          </p>
          <p className="text-[var(--text-secondary)] mb-12">
            Chat com IA, análise de código, e muito mais
          </p>
        </motion.div>

        <div className="w-full space-y-4 mb-12 max-w-md">
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "var(--glow-cyan)" }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGitHubLogin}
            className="w-full py-4 px-6 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] text-white font-bold rounded-xl flex items-center justify-center gap-3 border border-[var(--border-glow)] transition-all"
          >
            <GithubIcon />
            <span>Conectar com GitHub</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "var(--glow-purple)" }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleLogin}
            className="w-full py-4 px-6 bg-[var(--bg-card)] text-white font-bold rounded-xl flex items-center justify-center gap-3 border border-[var(--border-glow)] hover:border-[var(--accent-purple)] transition-all"
          >
            <GoogleIcon />
            <span>Conectar com Google</span>
          </motion.button>

          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => setShowEmailForm(!showEmailForm)}
              className="w-full py-4 px-6 bg-transparent text-[var(--text-secondary)] font-medium rounded-xl flex items-center justify-center gap-3 border border-dashed border-[var(--text-secondary)] hover:border-[var(--accent-cyan)] hover:text-[var(--text-primary)] transition-all"
            >
              <Mail size={20} />
              <span>Entrar com Email</span>
            </motion.button>

            {showEmailForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4 p-6 bg-[var(--bg-card)] rounded-xl border border-[var(--border-glow)] space-y-4"
                onSubmit={handleEmailLogin}
              >
                <input
                  type="email"
                  placeholder="Seu email"
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-lg p-3 text-white focus:outline-none focus:border-[var(--accent-cyan)]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Sua senha"
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-lg p-3 text-white focus:outline-none focus:border-[var(--accent-cyan)]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button className="w-full py-3 bg-[var(--accent-cyan)] text-[var(--bg-primary)] font-bold rounded-lg hover:brightness-110 transition-all">
                  Entrar / Criar Conta
                </button>
              </motion.form>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {[
            { icon: <Cpu />, title: "Criar App", desc: "Iniciar escopo de um novo app" },
            { icon: <Globe />, title: "Criar Site", desc: "Iniciar estrutura de um website" },
            { icon: <GithubIcon />, title: "Averiguar Repos", desc: "Varrer repositórios de jadiel054" },
            { icon: <GithubIcon />, title: "GitHub Sync", desc: "Autenticação OAuth do GitHub" },
          ].map((card, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.02, borderColor: "rgba(0, 245, 255, 0.6)", boxShadow: "var(--glow-cyan)" }}
              onClick={() => handleQuickMessage(card.title)}
              className="p-6 bg-[rgba(13,13,26,0.8)] backdrop-blur-md border border-[rgba(0,245,255,0.2)] rounded-xl text-left group transition-all"
            >
              <div className="text-3xl mb-2 text-[var(--accent-cyan)]">{card.icon}</div>
              <h3 className="font-orbitron font-bold text-white mb-1 group-hover:text-[var(--accent-cyan)]">
                {card.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">{card.desc}</p>
            </motion.button>
          ))}
        </div>

        <div className="mt-16 text-center text-[var(--text-secondary)] text-sm">
          <p>Desenvolvido por jadiel054 • Powered by Groq, OpenRouter, Gemini</p>
        </div>
      </div>
    </div>
  );
}
