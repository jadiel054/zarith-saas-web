"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Users, 
  AlertTriangle, 
  Ban, 
  Terminal, 
  ChevronLeft,
  Search,
  MoreVertical,
  Eye
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabase/client";

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      if (!supabaseClient) return;
      const { data: { user } } = await supabaseClient.auth.getUser();
      
      if (user && (user.email === "jadiel054@gmail.com" || user.user_metadata?.user_name === "jadiel054")) {
        setIsAdmin(true);
      }
      setLoading(false);
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/chat");
    }
  }, [loading, isAdmin, router]);

  const mockUsers = [
    { id: "1", name: "jadiel054", email: "jadiel@example.com", status: "admin", joinDate: "2024-01-10" },
    { id: "2", name: "cyber_user", email: "user2@example.com", status: "active", joinDate: "2024-05-15" },
    { id: "3", name: "glitch_bot", email: "bot@example.com", status: "suspended", joinDate: "2024-05-20" },
  ];

  if (loading || !isAdmin) return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[var(--accent-pink)] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
      <header className="h-16 border-b border-[var(--accent-pink)]/30 flex items-center px-6 bg-[var(--bg-secondary)] gap-4">
        <Link href="/chat" className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--accent-pink)] transition-all">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex items-center gap-2">
          <ShieldAlert size={20} className="text-[var(--accent-pink)]" />
          <h1 className="font-orbitron font-black text-xl tracking-widest text-[var(--accent-pink)]">ADMIN PANEL</h1>
        </div>
      </header>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-[var(--bg-card)] border border-[var(--accent-pink)]/20 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <Users size={20} className="text-[var(--accent-cyan)]" />
                <span className="text-[10px] font-bold text-[var(--accent-green)]">+5 hoje</span>
              </div>
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase">Total Usuários</p>
              <p className="text-3xl font-orbitron font-black mt-1">1,402</p>
            </div>
            <div className="p-6 bg-[var(--bg-card)] border border-[var(--accent-pink)]/20 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <AlertTriangle size={20} className="text-[var(--accent-pink)]" />
                <span className="text-[10px] font-bold text-[var(--accent-pink)]">2 urgentes</span>
              </div>
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase">Alertas Sistema</p>
              <p className="text-3xl font-orbitron font-black mt-1">24</p>
            </div>
            <div className="p-6 bg-[var(--bg-card)] border border-[var(--accent-pink)]/20 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <Terminal size={20} className="text-[var(--accent-purple)]" />
                <span className="text-[10px] font-bold text-[var(--text-secondary)]">99.9% uptime</span>
              </div>
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase">API Calls / h</p>
              <p className="text-3xl font-orbitron font-black mt-1">8.5k</p>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-[var(--border-glow)] flex flex-col md:flex-row justify-between items-center gap-4">
              <h3 className="font-orbitron font-bold text-lg uppercase">Gestão de Usuários</h3>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar ID ou Email..." 
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-lg py-2 pl-10 pr-4 text-xs focus:border-[var(--accent-pink)] outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] uppercase text-[10px] font-bold tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Usuário</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Data Ingresso</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-glow)]/30">
                  {mockUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[var(--bg-card-hover)] transition-all group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center font-bold text-xs">
                            {u.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold">{u.name}</p>
                            <p className="text-[10px] text-[var(--text-secondary)]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                          u.status === 'admin' ? 'bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]' :
                          u.status === 'active' ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]' :
                          'bg-[var(--accent-pink)]/20 text-[var(--accent-pink)]'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[var(--text-secondary)]">{u.joinDate}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button className="p-2 hover:bg-[var(--bg-primary)] rounded-lg text-[var(--accent-cyan)]"><Eye size={16} /></button>
                          <button className="p-2 hover:bg-[var(--bg-primary)] rounded-lg text-[var(--accent-pink)]"><Ban size={16} /></button>
                          <button className="p-2 hover:bg-[var(--bg-primary)] rounded-lg text-[var(--text-secondary)]"><MoreVertical size={16} /></button>
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
