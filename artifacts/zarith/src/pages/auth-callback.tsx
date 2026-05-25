import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabaseClient } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const handle = async () => {
      if (!supabaseClient) {
        window.location.href = "/chat";
        return;
      }

      const { error } = await supabaseClient.auth.exchangeCodeForSession(
        window.location.search
      );

      if (error) {
        setErrorMsg(error.message);
        setStatus("error");
        setTimeout(() => { window.location.href = "/"; }, 3000);
      } else {
        window.location.href = "/chat";
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
          <p className="text-[var(--accent-pink)] font-bold">Erro na autenticação</p>
          <p className="text-sm text-[var(--text-secondary)]">{errorMsg}</p>
          <p className="text-xs text-[var(--text-secondary)]">Redirecionando para o login...</p>
        </>
      )}
    </div>
  );
}
