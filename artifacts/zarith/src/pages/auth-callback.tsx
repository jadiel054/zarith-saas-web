import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabaseClient } from "@/lib/supabase";

/**
 * Página de callback do OAuth (GitHub, Google).
 *
 * Com `detectSessionInUrl: true` no cliente Supabase, a troca do `code` PKCE
 * por uma sessão acontece AUTOMATICAMENTE quando esta página é carregada.
 * Não precisamos (nem devemos) chamar `exchangeCodeForSession()` manualmente —
 * isso causava o erro "PKCE code verifier not found" porque o método recebia
 * parâmetros errados e o cliente SSR armazenava o verifier de forma diferente.
 *
 * O que fazemos aqui:
 * 1. Verificamos se há erro na URL (OAuth negado pelo usuário, etc.)
 * 2. Escutamos o evento SIGNED_IN via onAuthStateChange
 * 3. Também fazemos getSession() para o caso de a troca já ter completado
 * 4. Timeout de segurança para não ficar preso infinitamente
 */
export default function AuthCallbackPage() {
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Sem Supabase configurado — redireciona para o login
    if (!supabaseClient) {
      window.location.href = "/";
      return;
    }

    // Verifica se o OAuth retornou um erro diretamente na URL
    // Ex: usuário clicou em "Cancelar" na tela do GitHub/Google
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error");
    const oauthErrorDesc = params.get("error_description");

    if (oauthError) {
      const msg = oauthErrorDesc
        ? decodeURIComponent(oauthErrorDesc.replace(/\+/g, " "))
        : oauthError;
      setErrorMsg(msg);
      setStatus("error");
      setTimeout(() => { window.location.href = "/"; }, 3000);
      return;
    }

    // Escuta mudanças de estado de autenticação.
    // Com detectSessionInUrl: true, o Supabase dispara SIGNED_IN automaticamente
    // após trocar o code pelo token.
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) {
          window.location.href = "/chat";
        } else if (event === "SIGNED_OUT") {
          window.location.href = "/";
        }
      }
    );

    // Verifica se a sessão já foi estabelecida (pode já ter sido trocada)
    supabaseClient.auth.getSession().then(({ data: { session }, error }) => {
      if (session) {
        window.location.href = "/chat";
      } else if (error) {
        setErrorMsg(error.message);
        setStatus("error");
        setTimeout(() => { window.location.href = "/"; }, 3000);
      }
      // Se session é null sem erro: o onAuthStateChange vai tratar o SIGNED_IN
    });

    // Timeout de segurança: se em 20 segundos nada aconteceu, mostra erro
    const timeout = setTimeout(() => {
      setErrorMsg(
        "Tempo de espera esgotado. O fluxo de autenticação pode ter sido interrompido. Tente novamente."
      );
      setStatus("error");
      setTimeout(() => { window.location.href = "/"; }, 3000);
    }, 20_000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col items-center justify-center gap-6 p-8 text-center">
      {status === "loading" ? (
        <>
          <Loader2 size={48} className="text-[var(--accent-cyan)] animate-spin" />
          <div className="space-y-2">
            <p className="font-orbitron font-black text-lg tracking-widest text-[var(--accent-cyan)]">
              AUTENTICANDO
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              Conectando com segurança...
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="w-16 h-16 bg-[var(--accent-pink)]/10 border border-[var(--accent-pink)]/30 rounded-full flex items-center justify-center text-2xl">
            ✕
          </div>
          <div className="space-y-2">
            <p className="font-orbitron font-bold text-lg text-[var(--accent-pink)]">
              ERRO NA AUTENTICAÇÃO
            </p>
            <p className="text-sm text-[var(--text-secondary)] max-w-xs">
              {errorMsg}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-4">
              Redirecionando para o login em 3s...
            </p>
          </div>
        </>
      )}
    </div>
  );
}
