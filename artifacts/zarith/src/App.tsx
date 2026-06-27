import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Component, type ReactNode } from "react";
import { CommandPalette } from "@/components/command-palette";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import ChatPage from "@/pages/chat";
import DashboardPage from "@/pages/dashboard";
import SettingsPage from "@/pages/settings";
import MemoriesPage from "@/pages/memories";
import AdminPage from "@/pages/admin";
import AuthCallbackPage from "@/pages/auth-callback";
import { getSessionWithTimeout, supabaseClient } from "@/lib/supabase";
import { useState, useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

// ErrorBoundary para capturar crashes de componentes filhos (ex: cmdk, framer-motion)
// e exibir tela de erro amigável em vez de tela preta
class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[Zarith ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="min-h-screen bg-[#020208] text-[#e0e0ff] flex flex-col items-center justify-center gap-6 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#ff0080]/10 border border-[#ff0080]/30 flex items-center justify-center text-3xl">
              ⚠️
            </div>
            <div>
              <h1 className="font-orbitron font-black text-xl text-[#ff0080] tracking-widest mb-2">
                ERRO INESPERADO
              </h1>
              <p className="text-[#6666aa] text-sm max-w-sm">
                {this.state.error?.message || "Algo deu errado. Recarregue a página."}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-[#00f5ff]/10 border border-[#00f5ff]/30 text-[#00f5ff] rounded-xl font-bold text-sm hover:bg-[#00f5ff]/20 transition-all"
            >
              Recarregar
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

// Componente de carregamento enquanto verifica autenticação
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#020208] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#00f5ff] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Guard que protege rotas autenticadas.
// Se supabaseClient não estiver configurado (vars ausentes), permite acesso
// livre para não bloquear o desenvolvimento local.
function AuthGuard({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"checking" | "authenticated" | "unauthenticated">("checking");

  useEffect(() => {
    let isMounted = true;
    let authEventResolved = false;

    const updateStatus = (
      nextStatus: "authenticated" | "unauthenticated",
      reason: string,
    ) => {
      if (!isMounted) return;

      console.info("[AuthGuard] Atualizando status.", { nextStatus, reason });
      setStatus((currentStatus) => (currentStatus === nextStatus ? currentStatus : nextStatus));
    };

    if (!supabaseClient) {
      console.info("[AuthGuard] Supabase ausente; liberando acesso local.");
      updateStatus("authenticated", "supabase ausente");
      return;
    }

    console.info("[AuthGuard] Iniciando bootstrap de autenticação.");

    // Ouve mudanças de estado de autenticação (logout em outras abas, expiração de token)
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
      authEventResolved = true;
      console.info("[AuthGuard] Evento de autenticação recebido.", {
        event,
        hasSession: Boolean(session),
      });
      updateStatus(session ? "authenticated" : "unauthenticated", `evento ${event}`);
    });

    void (async () => {
      try {
        const { session, error, timedOut } = await getSessionWithTimeout();

        if (!isMounted) return;

        if (authEventResolved) {
          console.info("[AuthGuard] Resultado de getSession() ignorado porque um evento de autenticação já resolveu o estado.");
          return;
        }

        if (error) {
          console.warn("[AuthGuard] Bootstrap concluiu com fallback.", {
            timedOut,
            message: error.message,
          });
        }

        updateStatus(
          session ? "authenticated" : "unauthenticated",
          timedOut ? "fallback por timeout" : "resultado de getSession()",
        );
      } catch (error) {
        console.error("[AuthGuard] Falha inesperada no bootstrap.", error);
        updateStatus("unauthenticated", "fallback por exceção");
      }
    })();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (status === "checking") return <LoadingScreen />;
  if (status === "unauthenticated") return <Redirect to="/" />;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      {/* Rota pública — login */}
      <Route path="/" component={LoginPage} />

      {/* Callback de OAuth — público (precisa trocar o code) */}
      <Route path="/api/auth/callback" component={AuthCallbackPage} />

      {/* Rotas protegidas — requerem autenticação */}
      <Route path="/chat">
        <AuthGuard><ChatPage /></AuthGuard>
      </Route>
      <Route path="/dashboard">
        <AuthGuard><DashboardPage /></AuthGuard>
      </Route>
      <Route path="/settings">
        <AuthGuard><SettingsPage /></AuthGuard>
      </Route>
      <Route path="/memories">
        <AuthGuard><MemoriesPage /></AuthGuard>
      </Route>
      <Route path="/admin">
        <AuthGuard><AdminPage /></AuthGuard>
      </Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
          {/* CommandPalette em ErrorBoundary isolado para não crashar o app inteiro */}
          <ErrorBoundary fallback={null}>
            <CommandPalette />
          </ErrorBoundary>
        </WouterRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
