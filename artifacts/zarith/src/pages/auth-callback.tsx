import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabaseClient } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const handle = async () => {
      // Se Supabase não está configurado, redireciona para login (não para /chat)
      if (!supabaseClient) {
        window.location.href = "/";
        return;
      }

      // Extrai apenas o valor do parâmetro "code" da URL
      // CORREÇÃO: o método espera a URL completa ou os searchParams, não a query string crua
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const errorParam = params.get("error");
      const errorDescription = params.get("error_description");

      // Supabase pode retornar um erro diretamente na URL (ex: acesso negado no OAuth)
      if (errorParam) {
        setErrorMsg(errorDescription || errorParam);
        setStatus("error");
        setTimeout(() => { window.location.href = "/"; }, 3000);
        return;
      }

      if (!code) {
        setErrorMsg("Código de autenticação não encontrado na URL.");
        setStatus("error");
        setTimeout(() => { window.location.href = "/"; }, 3000);
        return;
      }

      try {
        const { error } = await supabaseClient.auth.exchangeCodeForSession(code);

        if (error) {
          setErrorMsg(error.message);
          setStatus("error");
          setTimeout(() => { window.location.href = "/"; }, 3000);
        } else {
          window.location.href = "/chat";
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro inesperado na autenticação.";
        setErrorMsg(message);
        setStatus("error");
        setTimeout(() => { window.location.href = "/"; }, 3000);
      }
    };

    handle();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col items-center justify-center gap-4">
      {status === "loading" ? (
        <>
          <Loader2 size={40} className="text-[var(--accent-cyan)] animate-spin" />
          <p className="font-mono text-sm text-[var(--text-secondary)] tracking-widest uppercase">
            Autenticando...
          </p>
        </>
      ) : (
        <>
          <p className="text-[var(--accent-pink)] font-bold text-lg">Erro na autenticação</p>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm text-center">{errorMsg}</p>
          <p className="text-xs text-[var(--text-secondary)]">Redirecionando para o login em 3s...</p>
        </>
      )}
    </div>
  );
}
