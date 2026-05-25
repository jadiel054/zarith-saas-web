import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CommandPalette } from "@/components/command-palette";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import ChatPage from "@/pages/chat";
import DashboardPage from "@/pages/dashboard";
import SettingsPage from "@/pages/settings";
import MemoriesPage from "@/pages/memories";
import AdminPage from "@/pages/admin";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={LoginPage} />
      <Route path="/chat" component={ChatPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/memories" component={MemoriesPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
        <CommandPalette />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
