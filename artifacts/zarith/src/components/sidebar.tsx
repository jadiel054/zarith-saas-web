import { useEffect, useMemo, useState } from "react";
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
  MoreHorizontal,
  Pin,
  PinOff,
  Pencil,
  Share2,
} from "lucide-react";
import { Link } from "wouter";
import { AboutModal } from "@/components/about-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PINNED_SESSIONS_STORAGE_KEY = "zarith_pinned_sessions";

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
  sessions: ChatSession[];
  activeSessionId?: string;
  onSelectSession: (id: string) => void;
  onDeleteSession?: (id: string) => void | Promise<void>;
  onRenameSession?: (id: string, title: string) => void | Promise<void>;
  forceMobileLayout?: boolean;
}

function loadPinnedSessionIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PINNED_SESSIONS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
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
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  activeSessionId,
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
  onSelectSession: (id: string) => void;
  onDeleteSession?: (id: string) => void | Promise<void>;
  onRenameSession?: (id: string, title: string) => void | Promise<void>;
  activeSessionId?: string;
}) {
  const [pinnedSessionIds, setPinnedSessionIds] = useState<string[]>(() => loadPinnedSessionIds());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PINNED_SESSIONS_STORAGE_KEY, JSON.stringify(pinnedSessionIds));
  }, [pinnedSessionIds]);

  const filteredSessions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return sessions.filter((s) => s.title.toLowerCase().includes(normalizedQuery));
  }, [sessions, searchQuery]);

  const pinnedSessions = filteredSessions.filter((session) => pinnedSessionIds.includes(session.id));
  const regularSessions = filteredSessions.filter((session) => !pinnedSessionIds.includes(session.id));

  const displayName = user?.name || "Usuário";
  const displayEmail = user?.email || "";

  const togglePinned = (sessionId: string) => {
    setPinnedSessionIds((prev) =>
      prev.includes(sessionId)
        ? prev.filter((id) => id !== sessionId)
        : [sessionId, ...prev]
    );
  };

  const handleRename = async (session: ChatSession) => {
    const nextTitle = window.prompt("Renomear conversa", session.title)?.trim();
    if (!nextTitle || nextTitle === session.title) return;
    await onRenameSession?.(session.id, nextTitle);
  };

  const handleShare = async (session: ChatSession) => {
    const url = `${window.location.origin}/chat?conversation=${encodeURIComponent(session.id)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: session.title, text: `Conversa Zarith: ${session.title}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      window.alert("Link da conversa copiado para a área de transferência.");
    } catch {
      window.prompt("Copie o link da conversa", url);
    }
  };

  const handleDelete = async (sessionId: string) => {
    await onDeleteSession?.(sessionId);
    setPinnedSessionIds((prev) => prev.filter((id) => id !== sessionId));
  };

  const renderSessionRow = (session: ChatSession) => {
    const isPinned = pinnedSessionIds.includes(session.id);

    return (
      <div
        key={session.id}
        onClick={() => onSelectSession(session.id)}
        className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
          activeSessionId === session.id
            ? "bg-[var(--bg-card-hover)] border border-[var(--border-glow)]"
            : "hover:bg-[var(--bg-card-hover)]"
        }`}
        title={isCollapsed ? session.title : undefined}
      >
        <MessageSquare size={16} className="text-[#00f5ff] shrink-0" />
        {!isCollapsed && (
          <>
            <p className="text-sm font-medium truncate text-[var(--text-primary)] flex-1 text-left">
              {session.title}
            </p>
            {isPinned && <Pin size={12} className="text-[#00f5ff] shrink-0" />}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(event) => event.stopPropagation()}
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 text-[var(--text-secondary)] hover:text-[#00f5ff] transition-all shrink-0"
                  title="Mais opções"
                  aria-label={`Mais opções para ${session.title}`}
                >
                  <MoreHorizontal size={15} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 border border-[var(--border-glow)] bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-2xl shadow-black/40"
                onClick={(event) => event.stopPropagation()}
              >
                <DropdownMenuItem onClick={() => togglePinned(session.id)} className="cursor-pointer gap-2">
                  {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                  {isPinned ? "Remover dos fixados" : "Fixar"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleRename(session)} className="cursor-pointer gap-2">
                  <Pencil size={14} />
                  Renomear
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare(session)} className="cursor-pointer gap-2">
                  <Share2 size={14} />
                  Compartilhar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleDelete(session.id)}
                  className="cursor-pointer gap-2 text-[#ff4d8d] focus:text-[#ff4d8d]"
                >
                  <Trash2 size={14} />
                  Apagar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-secondary)] overflow-hidden">
      {/* Top bar */}
      <div className="px-4 py-3 flex items-center justify-between shrink-0 border-b border-[var(--border-glow)]">
        {!isCollapsed && (
          <span className="font-orbitron font-black text-lg bg-gradient-to-r from-[#00f5ff] to-[#bf00ff] bg-clip-text text-transparent whitespace-nowrap">
            ZARITH
          </span>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {/* Fechar drawer mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--text-secondary)] transition-colors md:hidden"
              aria-label="Fechar menu"
            >
              <X size={16} />
            </button>
          )}
          {/* Colapsar desktop */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hover:bg-[var(--bg-card-hover)] rounded-lg text-[#00f5ff] transition-colors hidden md:flex"
            title={isCollapsed ? "Expandir" : "Recolher"}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </div>

      {/* New chat button */}
      <div className="px-3 py-2.5 shrink-0">
        <button
          onClick={onNewChat}
          className="w-full py-2.5 bg-gradient-to-r from-[#00f5ff] to-[#bf00ff] rounded-xl flex items-center justify-center gap-2 font-bold text-[var(--bg-primary)] hover:brightness-110 transition-all shadow-[0_0_12px_rgba(0,245,255,0.25)] text-sm"
          title="Nova conversa"
        >
          <Plus size={18} />
          {!isCollapsed && <span>Nova Conversa</span>}
        </button>
      </div>

      {/* Search */}
      {!isCollapsed && (
        <div className="px-3 mb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={14} />
            <input
              type="text"
              placeholder="Buscar histórico..."
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-lg py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-[#00f5ff] transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-2 space-y-3 min-h-0 pb-3">
        {pinnedSessions.length > 0 && !isCollapsed && (
          <div className="space-y-1">
            <h3 className="px-3 text-[10px] font-bold text-[#00f5ff] uppercase tracking-widest py-1">
              FIXADOS
            </h3>
            {pinnedSessions.map(renderSessionRow)}
          </div>
        )}

        {(["Hoje", "Ontem", "Semana passada", "Mais antigos"] as const).map((group) => {
          const groupSessions = regularSessions.filter((s) => s.group === group);
          if (groupSessions.length === 0) return null;
          return (
            <div key={group} className="space-y-1">
              {!isCollapsed && (
                <h3 className="px-3 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest py-1">
                  {group}
                </h3>
              )}
              {groupSessions.map(renderSessionRow)}
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
      <div className="p-2.5 border-t border-[var(--border-glow)] space-y-1 shrink-0 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:pb-2.5">
        {!isCollapsed && (
          <div className="px-2 pb-1">
            <span className="text-xs text-muted-foreground opacity-50">
              {import.meta.env.VITE_COMMIT_SHA
                ? `build · ${import.meta.env.VITE_COMMIT_SHA.slice(0, 7)}`
                : "build · dev"}
            </span>
          </div>
        )}

        {/* About */}
        <button
          onClick={onAbout}
          className="w-full flex items-center gap-3 p-2 hover:bg-[var(--bg-card-hover)] rounded-lg transition-all text-[var(--text-secondary)] hover:text-[#00f5ff]"
          title="Sobre a Zarith"
        >
          <Info size={16} className="shrink-0" />
          {!isCollapsed && (
            <span className="text-xs font-bold">Sobre</span>
          )}
        </button>

        {/* User / Settings */}
        <Link
          href="/settings"
          className="flex items-center gap-3 p-2 hover:bg-[var(--bg-card-hover)] rounded-lg transition-all"
          title={isCollapsed ? "Configurações" : undefined}
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00f5ff] to-[#bf00ff] flex items-center justify-center shrink-0 overflow-hidden">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <User size={14} className="text-white" />
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
              <Settings size={14} className="text-[var(--text-secondary)] shrink-0" />
            </>
          )}
        </Link>
      </div>
    </div>
  );
}

export function Sidebar({
  user,
  onNewChat,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  forceMobileLayout = false,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <>
      {/* ── Mobile: Hamburguer button ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className={`${forceMobileLayout ? "flex" : "md:hidden"} fixed top-[calc(0.75rem+env(safe-area-inset-top))] left-3 z-40 p-2.5 bg-[var(--bg-secondary)] border border-[var(--border-glow)] rounded-xl text-[#00f5ff] shadow-lg`}
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
              className={`${forceMobileLayout ? "block" : "md:hidden"} fixed inset-0 z-50 bg-black/60 backdrop-blur-sm`}
              onClick={() => setMobileOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 280 }}
              className={`${forceMobileLayout ? "block" : "md:hidden"} fixed left-0 top-0 bottom-0 z-50 w-[min(88vw,20rem)] border-r border-[var(--border-glow)]`}
            >
              <SidebarContent
                user={user}
                isCollapsed={false}
                setIsCollapsed={() => {}}
                sessions={sessions}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onNewChat={() => {
                  onNewChat?.();
                  setMobileOpen(false);
                }}
                onClose={() => setMobileOpen(false)}
                onAbout={() => {
                  setAboutOpen(true);
                  setMobileOpen(false);
                }}
                onSelectSession={(id) => {
                  onSelectSession(id);
                  setMobileOpen(false);
                }}
                onDeleteSession={onDeleteSession}
                onRenameSession={onRenameSession}
                activeSessionId={activeSessionId}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Desktop: Sidebar fixa ── */}
      <motion.div
        animate={{ width: isCollapsed ? 72 : 272 }}
        transition={{ duration: 0.22, ease: "easeInOut" }}
        className={`${forceMobileLayout ? "hidden" : "hidden md:flex"} h-[100dvh] shrink-0 border-r border-[var(--border-glow)] overflow-hidden`}
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
          onSelectSession={onSelectSession}
          onDeleteSession={onDeleteSession}
          onRenameSession={onRenameSession}
          activeSessionId={activeSessionId}
        />
      </motion.div>

      {/* About Modal */}
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  );
}
