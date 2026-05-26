import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Settings,
  User,
  Menu,
  X,
  Info,
} from "lucide-react";
import { Link } from "wouter";
import { AboutModal } from "@/components/about-modal";

interface ChatSession {
  id: string;
  title: string;
  date: string;
  group: "Hoje" | "Ontem" | "Semana passada" | "Mais antigos";
}

interface UserData {
  name: string;
  email?: string;
  avatarUrl?: string;
}

interface SidebarProps {
  user: UserData;
  onNewChat?: () => void;
}

/** Conteúdo interno da sidebar — compartilhado entre desktop e mobile drawer */
function SidebarContent({
  user,
  isCollapsed,
  setIsCollapsed,
  sessions,
  searchQuery,
  setSearchQuery,
  onNewChat,
  onClose,
  onAbout,
}: {
  user: UserData;
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  sessions: ChatSession[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onNewChat?: () => void;
  onClose?: () => void;
  onAbout: () => void;
}) {
  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayName = user?.name || "Usuário";
  const displayEmail = user?.email || "";

  return (
    <div className="h-full flex flex-col bg-[var(--bg-secondary)] overflow-hidden">
      {/* Top bar */}
      <div className="p-4 flex items-center justify-between shrink-0 border-b border-[var(--border-glow)]">
        {!isCollapsed && (
          <span className="font-orbitron font-black text-xl bg-gradient-to-r from-[#00f5ff] to-[#bf00ff] bg-clip-text text-transparent whitespace-nowrap">
            ZARITH
          </span>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {/* Fechar drawer mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--text-secondary)] transition-colors md:hidden"
            >
              <X size={18} />
            </button>
          )}
          {/* Colapsar desktop */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg text-[#00f5ff] transition-colors hidden md:flex"
            title={isCollapsed ? "Expandir" : "Recolher"}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </div>

      {/* New chat button */}
      <div className="px-3 py-3 shrink-0">
        <button
          onClick={onNewChat}
          className="w-full py-3 bg-gradient-to-r from-[#00f5ff] to-[#bf00ff] rounded-xl flex items-center justify-center gap-2 font-bold text-[var(--bg-primary)] hover:brightness-110 transition-all shadow-[0_0_12px_rgba(0,245,255,0.25)]"
          title="Nova conversa"
        >
          <Plus size={20} />
          {!isCollapsed && <span>Nova Conversa</span>}
        </button>
      </div>

      {/* Search */}
      {!isCollapsed && (
        <div className="px-3 mb-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={15} />
            <input
              type="text"
              placeholder="Buscar histórico..."
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-[#00f5ff] transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-2 space-y-4 min-h-0">
        {(["Hoje", "Ontem", "Semana passada", "Mais antigos"] as const).map((group) => {
          const groupSessions = filteredSessions.filter((s) => s.group === group);
          if (groupSessions.length === 0) return null;
          return (
            <div key={group} className="space-y-1">
              {!isCollapsed && (
                <h3 className="px-3 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest py-1">
                  {group}
                </h3>
              )}
              {groupSessions.map((session) => (
                <div
                  key={session.id}
                  className="group flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-[var(--bg-card-hover)] cursor-pointer transition-all"
                  title={isCollapsed ? session.title : undefined}
                >
                  <MessageSquare size={16} className="text-[#00f5ff] shrink-0" />
                  {!isCollapsed && (
                    <>
                      <p className="text-sm font-medium truncate text-[var(--text-primary)] flex-1 text-left">
                        {session.title}
                      </p>
                      <button
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-[#ff0080] text-[var(--text-secondary)] transition-all shrink-0"
                        title="Remover"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          );
        })}

        {filteredSessions.length === 0 && !isCollapsed && (
          <p className="text-xs text-[var(--text-secondary)] text-center py-8 px-4">
            Nenhuma conversa ainda.
            <br />
            Comece uma nova acima.
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[var(--border-glow)] space-y-1 shrink-0">
        {/* About */}
        <button
          onClick={onAbout}
          className="w-full flex items-center gap-3 p-2.5 hover:bg-[var(--bg-card-hover)] rounded-xl transition-all text-[var(--text-secondary)] hover:text-[#00f5ff]"
          title="Sobre a Zarith"
        >
          <Info size={18} className="shrink-0" />
          {!isCollapsed && (
            <span className="text-xs font-bold">Sobre</span>
          )}
        </button>

        {/* User / Settings */}
        <Link
          href="/settings"
          className="flex items-center gap-3 p-2 hover:bg-[var(--bg-card-hover)] rounded-xl transition-all"
          title={isCollapsed ? "Configurações" : undefined}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00f5ff] to-[#bf00ff] flex items-center justify-center shrink-0 overflow-hidden">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <User size={16} className="text-white" />
            )}
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{displayName}</p>
                <p className="text-[10px] text-[var(--text-secondary)] truncate">
                  {displayEmail || "Configurações"}
                </p>
              </div>
              <Settings size={15} className="text-[var(--text-secondary)] shrink-0" />
            </>
          )}
        </Link>
      </div>
    </div>
  );
}

export function Sidebar({ user, onNewChat }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [sessions] = useState<ChatSession[]>([
    { id: "1", title: "Análise de código Zarith", date: "2024-05-24", group: "Hoje" },
    { id: "2", title: "Ideias para novo App", date: "2024-05-23", group: "Ontem" },
  ]);

  return (
    <>
      {/* ── Mobile: Hamburguer button ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-glow)] rounded-xl text-[#00f5ff] shadow-lg"
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {/* ── Mobile: Drawer overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className="md:hidden fixed left-0 top-0 bottom-0 z-50 w-72 border-r border-[var(--border-glow)]"
            >
              <SidebarContent
                user={user}
                isCollapsed={false}
                setIsCollapsed={() => {}}
                sessions={sessions}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onNewChat={() => { onNewChat?.(); setMobileOpen(false); }}
                onClose={() => setMobileOpen(false)}
                onAbout={() => { setAboutOpen(true); setMobileOpen(false); }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Desktop: Sidebar fixa ── */}
      <motion.div
        animate={{ width: isCollapsed ? 72 : 272 }}
        transition={{ duration: 0.22, ease: "easeInOut" }}
        className="hidden md:flex h-screen shrink-0 border-r border-[var(--border-glow)] overflow-hidden"
      >
        <SidebarContent
          user={user}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          sessions={sessions}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onNewChat={onNewChat}
          onAbout={() => setAboutOpen(true)}
        />
      </motion.div>

      {/* About Modal */}
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  );
}
