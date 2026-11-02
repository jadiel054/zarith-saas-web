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
import { isAuthenticated } from "@/lib/auth-session";
import { UpdateBanner } from "@/components/update-banner";
import { useState, useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

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

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#020208] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#00f5ff] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Guard: exige JWT nativo (zarith-auth-token) salvo no login com Neon.
function AuthGuard({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"checking" | "authenticated" | "unauthenticated">("checking");

  useEffect(() => {
    const ok = isAuthenticated();
    console.info("[AuthGuard] Bootstrap sessão Zarith.", { authenticated: ok });
    setStatus(ok ? "authenticated" : "unauthenticated");
  }, []);

  if (status === "checking") return <LoadingScreen />;
  if (status === "unauthenticated") return <Redirect to="/" />;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      <Route path="/api/auth/callback" component={AuthCallbackPage} />
      <Route path="/chat">
        <AuthGuard>
          <ChatPage />
        </AuthGuard>
      </Route>
      <Route path="/dashboard">
        <AuthGuard>
          <DashboardPage />
        </AuthGuard>
      </Route>
      <Route path="/settings">
        <AuthGuard>
          <SettingsPage />
        </AuthGuard>
      </Route>
      <Route path="/memories">
        <AuthGuard>
          <MemoriesPage />
        </AuthGuard>
      </Route>
      <Route path="/admin">
        <AuthGuard>
          <AdminPage />
        </AuthGuard>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

type UpdateInfo = {
  sha: string;
  message: string;
  createdAt: string;
};

function App() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    const currentSha = import.meta.env.VITE_COMMIT_SHA;
    const dismissed = sessionStorage.getItem("dismissed_sha");

    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      if (import.meta.env.DEV) {
        console.info("[update-check] Service Worker indisponível; verificação ignorada.");
      }
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        await navigator.serviceWorker.ready;

        const response = await fetch("/api/version/latest");
        if (!response.ok) {
          throw new Error(`Version check retornou HTTP ${response.status}`);
        }

        const data = (await response.json()) as Partial<UpdateInfo>;
        if (cancelled || !data?.sha || !data?.message || !data?.createdAt) return;

        if (dismissed === data.sha) {
          return;
        }

        if (currentSha && data.sha === currentSha) {
          return;
        }

        setUpdateInfo({
          sha: data.sha,
          message: data.message,
          createdAt: data.createdAt,
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.info("[update-check] Falha silenciosa ao verificar atualização.", error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDismiss = () => {
    if (updateInfo?.sha) {
      sessionStorage.setItem("dismissed_sha", updateInfo.sha);
    }
    setUpdateInfo(null);
  };

  const handleUpdate = async () => {
    if (updateInfo?.sha) {
      sessionStorage.setItem("dismissed_sha", updateInfo.sha);
    }

    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => {
          window.location.reload();
        },
        { once: true }
      );
    } else if (reg) {
      await reg.update();
      window.location.reload();
    } else {
      window.location.reload();
    }
  };

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          {updateInfo ? (
            <UpdateBanner
              commitMessage={updateInfo.message}
              buildDate={updateInfo.createdAt}
              onUpdate={handleUpdate}
              onDismiss={handleDismiss}
            />
          ) : null}
          <Router />
          <ErrorBoundary fallback={null}>
            <CommandPalette />
          </ErrorBoundary>
        </WouterRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
