import { motion } from "framer-motion";
import {
  ShieldAlert,
  ChevronLeft,
  Users,
  Eye,
  Ban,
  MoreVertical,
  Activity,
  Server,
  Database,
} from "lucide-react";
import { Link } from "wouter";

const mockUsers = [
  { id: "1", name: "Jadiel Santos", email: "jadiel@zarith.ai", status: "admin", joinDate: "2024-01-15" },
  { id: "2", name: "Ana Costa", email: "ana@zarith.ai", status: "active", joinDate: "2024-02-20" },
  { id: "3", name: "Carlos Lima", email: "carlos@zarith.ai", status: "inactive", joinDate: "2024-03-05" },
];

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
      <header className="h-16 border-b border-[var(--border-glow)] flex items-center px-6 bg-[var(--bg-secondary)] gap-4">
        <Link href="/chat" className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--accent-cyan)] transition-all">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex items-center gap-2">
          <ShieldAlert size={20} className="text-[var(--accent-pink)]" />
          <h1 className="font-orbitron font-black text-xl tracking-widest">PAINEL ADMIN</h1>
        </div>
      </header>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* System Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: "Usuários Ativos", value: "3", icon: <Users size={20} className="text-[var(--accent-cyan)]" /> },
              { label: "API Calls/dia", value: "12.4k", icon: <Activity size={20} className="text-[var(--accent-purple)]" /> },
              { label: "Uptime", value: "99.9%", icon: <Server size={20} className="text-[var(--accent-green)]" /> },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-6 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl flex items-center gap-4"
              >
                <div className="p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-glow)]">
                  {stat.icon}
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">{stat.label}</p>
                  <p className="text-2xl font-orbitron font-black">{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Users Table */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-[var(--border-glow)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[var(--accent-cyan)]" />
                <h3 className="font-orbitron font-bold text-lg uppercase">Usuários</h3>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-glow)] rounded-xl text-xs font-bold hover:border-[var(--accent-cyan)] transition-all">
                <Database size={14} />
                Exportar
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] uppercase text-[10px] font-bold tracking-widest">
                  <tr>
                    <th className="px-6 py-4 text-left">Usuário</th>
                    <th className="px-6 py-4 text-left">Status</th>
                    <th className="px-6 py-4 text-left">Data Ingresso</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-glow)]/30">
                  {mockUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[var(--bg-card-hover)] transition-all group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center font-bold text-xs text-white">
                            {u.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold">{u.name}</p>
                            <p className="text-[10px] text-[var(--text-secondary)]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                            u.status === "admin"
                              ? "bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]"
                              : u.status === "active"
                              ? "bg-[var(--accent-green)]/20 text-[var(--accent-green)]"
                              : "bg-[var(--accent-pink)]/20 text-[var(--accent-pink)]"
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[var(--text-secondary)]">{u.joinDate}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button className="p-2 hover:bg-[var(--bg-primary)] rounded-lg text-[var(--accent-cyan)]">
                            <Eye size={16} />
                          </button>
                          <button className="p-2 hover:bg-[var(--bg-primary)] rounded-lg text-[var(--accent-pink)]">
                            <Ban size={16} />
                          </button>
                          <button className="p-2 hover:bg-[var(--bg-primary)] rounded-lg text-[var(--text-secondary)]">
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
