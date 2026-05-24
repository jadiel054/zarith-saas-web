"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Settings, 
  User 
} from "lucide-react";
import Link from "next/link";

interface ChatSession {
  id: string;
  title: string;
  date: string;
  group: "Hoje" | "Ontem" | "Semana passada" | "Mais antigos";
}

interface UserData {
  name: string;
}

export function Sidebar({ user }: { user: UserData }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sessions] = useState<ChatSession[]>([
    { id: "1", title: "Análise de código Zarith", date: "2024-05-24", group: "Hoje" },
    { id: "2", title: "Ideias para novo App", date: "2024-05-23", group: "Ontem" },
  ]);

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      animate={{ width: isCollapsed ? 80 : 280 }}
      className="h-screen bg-[var(--bg-secondary)] border-r border-[var(--border-glow)] flex flex-col relative transition-all duration-300"
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        {!isCollapsed && (
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-orbitron font-black text-xl bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] bg-clip-text text-transparent"
          >
            ZARITH
          </motion.span>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--accent-cyan)] transition-colors"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Nova Conversa */}
      <div className="px-4 mb-4">
        <button className="w-full py-3 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] rounded-xl flex items-center justify-center gap-2 font-bold text-[var(--bg-primary)] hover:brightness-110 transition-all glow-cyan">
          <Plus size={20} />
          {!isCollapsed && <span>Nova Conversa</span>}
        </button>
      </div>

      {/* Busca */}
      {!isCollapsed && (
        <div className="px-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
            <input
              type="text"
              placeholder="Buscar histórico..."
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[var(--accent-cyan)] transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Lista de Sessões */}
      <div className="flex-1 overflow-y-auto px-2 space-y-6">
        {["Hoje", "Ontem", "Semana passada", "Mais antigos"].map((group) => {
          const groupSessions = filteredSessions.filter(s => s.group === group);
          if (groupSessions.length === 0 && isCollapsed) return null;
          
          return (
            <div key={group} className="space-y-2">
              {!isCollapsed && (
                <h3 className="px-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                  {group}
                </h3>
              )}
              {groupSessions.map((session) => (
                <div
                  key={session.id}
                  className="group flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--bg-card-hover)] cursor-pointer transition-all relative"
                >
                  <MessageSquare size={18} className="text-[var(--accent-cyan)] shrink-0" />
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-[var(--text-primary)]">
                        {session.title}
                      </p>
                    </div>
                  )}
                  {!isCollapsed && (
                    <button className="opacity-0 group-hover:opacity-100 p-1 hover:text-[var(--accent-pink)] transition-all">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border-glow)]">
        <Link href="/settings" className="flex items-center gap-3 p-2 hover:bg-[var(--bg-card-hover)] rounded-xl transition-all">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center shrink-0">
            <User size={20} className="text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{user?.name || "Usuário"}</p>
              <p className="text-xs text-[var(--text-secondary)] truncate">Configurações</p>
            </div>
          )}
          {!isCollapsed && <Settings size={18} className="text-[var(--text-secondary)]" />}
        </Link>
      </div>
    </motion.div>
  );
}
