"use client";

export const dynamic = "force-dynamic";

import { supabaseClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const handleGitHubLogin = async () => {
    if (!supabaseClient) {
      alert("Supabase não configurado");
      return;
    }

    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/auth/callback`,
      },
    });

    if (error) {
      alert(`Erro ao fazer login: ${error.message}`);
    }
  };

  const handleQuickMessage = (message: string) => {
    // Será implementado após login
    console.log("Quick message:", message);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      {/* Background cyberpunk */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500 opacity-10 blur-3xl rounded-full"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 opacity-10 blur-3xl rounded-full"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            ZARITH
          </h1>
          <p className="text-cyan-400 text-lg">VTuber AI Cyberpunk</p>
          <p className="text-gray-400 mt-2">Chat com IA, análise de código, e muito mais</p>
        </div>

        {/* Login Button */}
        <div className="mb-12">
          <button
            onClick={handleGitHubLogin}
            className="w-full py-3 px-6 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2 border border-cyan-400"
          >
            <span>🐙</span>
            <span>Conectar com GitHub</span>
          </button>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Criar App */}
          <button
            onClick={() => handleQuickMessage("Vamos criar um novo app! Qual é a ideia?")}
            className="p-6 bg-gray-900 border border-cyan-500 rounded-lg hover:bg-gray-800 hover:border-cyan-400 transition-all duration-200 text-left group"
          >
            <div className="text-3xl mb-2">🤖</div>
            <h3 className="font-bold text-white mb-1 group-hover:text-cyan-400">Criar App</h3>
            <p className="text-sm text-gray-400">Iniciar escopo de um novo app</p>
          </button>

          {/* Card 2: Criar Site */}
          <button
            onClick={() => handleQuickMessage("Vamos criar um novo site! Qual é o objetivo?")}
            className="p-6 bg-gray-900 border border-purple-500 rounded-lg hover:bg-gray-800 hover:border-purple-400 transition-all duration-200 text-left group"
          >
            <div className="text-3xl mb-2">🌐</div>
            <h3 className="font-bold text-white mb-1 group-hover:text-purple-400">Criar Site</h3>
            <p className="text-sm text-gray-400">Iniciar estrutura de um website</p>
          </button>

          {/* Card 3: Averiguar Repositórios */}
          <button
            onClick={() =>
              handleQuickMessage("Zarith, lista todos os repositórios da conta jadiel054 no GitHub.")
            }
            className="p-6 bg-gray-900 border border-cyan-500 rounded-lg hover:bg-gray-800 hover:border-cyan-400 transition-all duration-200 text-left group"
          >
            <div className="text-3xl mb-2">🔍</div>
            <h3 className="font-bold text-white mb-1 group-hover:text-cyan-400">Averiguar Repositórios</h3>
            <p className="text-sm text-gray-400">Varrer repositórios de jadiel054</p>
          </button>

          {/* Card 4: Conectar ao GitHub */}
          <button
            onClick={handleGitHubLogin}
            className="p-6 bg-gray-900 border border-purple-500 rounded-lg hover:bg-gray-800 hover:border-purple-400 transition-all duration-200 text-left group"
          >
            <div className="text-3xl mb-2">🐙</div>
            <h3 className="font-bold text-white mb-1 group-hover:text-purple-400">Conectar ao GitHub</h3>
            <p className="text-sm text-gray-400">Autenticação OAuth do GitHub</p>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Desenvolvido por jadiel054 • Powered by Groq, OpenRouter, Gemini</p>
        </div>
      </div>
    </div>
  );
}
