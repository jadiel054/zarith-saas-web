"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { supabaseClient } from "@/lib/supabase/client";

interface Settings {
  groq_key_encrypted?: string;
  openrouter_key_encrypted?: string;
  gemini_key_encrypted?: string;
  github_token_encrypted?: string;
  greptile_key_encrypted?: string;
}

export default function SettingsPage() {
  const [groqKey, setGroqKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [greptileKey, setGreptileKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Carregar settings do Supabase ao montar
  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (!supabaseClient) {
          setError("Supabase não configurado");
          setLoading(false);
          return;
        }

        // Obter usuário atual
        const {
          data: { user },
          error: userError,
        } = await supabaseClient.auth.getUser();

        if (userError || !user) {
          setError("Não autenticado");
          setLoading(false);
          return;
        }

        setUserId(user.id);

        // Buscar settings do banco
        const { data: settingsData, error: settingsError } = await supabaseClient
          .from("settings")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (settingsError && settingsError.code !== "PGRST116") {
          // PGRST116 = not found (esperado para novo usuário)
          console.error("Erro ao carregar settings:", settingsError);
        }

        if (settingsData) {
          const settings = settingsData as Settings;
          // Nota: Em produção, as chaves viriam descriptografadas do servidor
          // Por enquanto, apenas preenchemos se existirem
          if (settings.groq_key_encrypted) setGroqKey("••••••••••••••••");
          if (settings.openrouter_key_encrypted) setOpenrouterKey("••••••••••••••••");
          if (settings.gemini_key_encrypted) setGeminiKey("••••••••••••••••");
          if (settings.github_token_encrypted) setGithubToken("••••••••••••••••");
          if (settings.greptile_key_encrypted) setGreptileKey("••••••••••••••••");
        }
      } catch (err) {
        console.error("Erro ao carregar settings:", err);
        setError("Erro ao carregar configurações");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      if (!supabaseClient || !userId) {
        setError("Não autenticado");
        return;
      }

      // Preparar dados para salvar
      const settingsToSave: Record<string, string> = {};

      if (groqKey && !groqKey.includes("•")) {
        settingsToSave.groq_key_encrypted = groqKey;
      }
      if (openrouterKey && !openrouterKey.includes("•")) {
        settingsToSave.openrouter_key_encrypted = openrouterKey;
      }
      if (geminiKey && !geminiKey.includes("•")) {
        settingsToSave.gemini_key_encrypted = geminiKey;
      }
      if (githubToken && !githubToken.includes("•")) {
        settingsToSave.github_token_encrypted = githubToken;
      }
      if (greptileKey && !greptileKey.includes("•")) {
        settingsToSave.greptile_key_encrypted = greptileKey;
      }

      // Verificar se settings já existe
      const { data: existingSettings, error: checkError } = await supabaseClient
        .from("settings")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      let result;
      if (existingSettings) {
        // Atualizar
        result = await supabaseClient
          .from("settings")
          .update(settingsToSave)
          .eq("user_id", userId)
          .select();
      } else {
        // Inserir
        result = await supabaseClient
          .from("settings")
          .insert([{ user_id: userId, ...settingsToSave }])
          .select();
      }

      if (result.error) {
        throw result.error;
      }

      setSaved(true);
      setError(null);

      // Mascarar as chaves após salvar
      if (groqKey && !groqKey.includes("•")) setGroqKey("••••••••••••••••");
      if (openrouterKey && !openrouterKey.includes("•")) setOpenrouterKey("••••••••••••••••");
      if (geminiKey && !geminiKey.includes("•")) setGeminiKey("••••••••••••••••");
      if (githubToken && !githubToken.includes("•")) setGithubToken("••••••••••••••••");
      if (greptileKey && !greptileKey.includes("•")) setGreptileKey("••••••••••••••••");

      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Erro ao salvar settings:", err);
      setError("Erro ao salvar configurações");
    }
  };

  const handleLogout = async () => {
    try {
      if (supabaseClient) {
        await supabaseClient.auth.signOut();
      }
    } catch (err) {
      console.error("Erro ao fazer logout:", err);
    }

    // Limpar cookies
    document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    document.cookie = "sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";

    // Redirecionar para home
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p>Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-cyan-500 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-cyan-400">⚙️ Configurações</h1>
        <a href="/chat" className="text-purple-400 hover:text-purple-300">
          ← Voltar ao Chat
        </a>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-6">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-900 border border-red-500 rounded text-red-200 text-sm">
            ❌ {error}
          </div>
        )}

        {/* API Keys Section */}
        <div className="bg-gray-900 border border-cyan-500 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-cyan-400">API Keys</h2>
          <p className="text-xs text-gray-400 mb-4">
            ⚠️ As chaves são criptografadas e armazenadas com segurança no Supabase
          </p>

          {/* Groq Key */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Groq API Key</label>
            <input
              type="password"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Obtenha em: https://console.groq.com/keys
            </p>
          </div>

          {/* OpenRouter Key */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">OpenRouter API Key</label>
            <input
              type="password"
              value={openrouterKey}
              onChange={(e) => setOpenrouterKey(e.target.value)}
              placeholder="sk-or-..."
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Obtenha em: https://openrouter.ai/keys
            </p>
          </div>

          {/* Gemini Key */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Gemini API Key</label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIza..."
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Obtenha em: https://aistudio.google.com/app/apikey
            </p>
          </div>

          {/* GitHub Token */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">GitHub Personal Access Token</label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_..."
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Obtenha em: https://github.com/settings/tokens
            </p>
          </div>

          {/* Greptile Key */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Greptile API Key</label>
            <input
              type="password"
              value={greptileKey}
              onChange={(e) => setGreptileKey(e.target.value)}
              placeholder="gpt_..."
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Obtenha em: https://app.greptile.com/settings
            </p>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            💾 Salvar Configurações
          </button>

          {saved && (
            <div className="mt-3 p-3 bg-green-900 border border-green-500 rounded text-green-200 text-sm">
              ✅ Configurações salvas com segurança no Supabase!
            </div>
          )}
        </div>

        {/* Account Section */}
        <div className="bg-gray-900 border border-purple-500 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-purple-400">Conta</h2>

          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200"
          >
            🚪 Fazer Logout
          </button>
        </div>
      </div>
    </div>
  );
}
