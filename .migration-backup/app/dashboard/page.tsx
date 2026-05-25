"use client";

export const dynamic = "force-dynamic";

import { motion } from "framer-motion";
import { 
  BarChart3, 
  MessageSquare, 
  Cpu, 
  Zap, 
  ChevronLeft,
  ArrowUpRight,
  History,
  Activity
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const stats = [
    { label: "Mensagens Enviadas", value: "1,284", icon: <MessageSquare className="text-[var(--accent-cyan)]" />, trend: "+12%" },
    { label: "Tokens Processados", value: "452k", icon: <Cpu className="text-[var(--accent-purple)]" />, trend: "+8%" },
    { label: "Latência Média", value: "1.2s", icon: <Zap className="text-[var(--accent-green)]" />, trend: "-15%" },
    { label: "Projetos Ativos", value: "12", icon: <Activity className="text-[var(--accent-pink)]" />, trend: "+2" },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
      <header className="h-16 border-b border-[var(--border-glow)] flex items-center px-6 bg-[var(--bg-secondary)] gap-4">
        <Link href="/chat" className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--accent-cyan)] transition-all">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-[var(--accent-cyan)]" />
          <h1 className="font-orbitron font-black text-xl tracking-widest">DASHBOARD</h1>
        </div>
      </header>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Grid de Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-6 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl space-y-4 hover:border-[var(--accent-cyan)]/30 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-glow)]">
                    {stat.icon}
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                    stat.trend.startsWith('+') ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]' : 'bg-[var(--accent-pink)]/10 text-[var(--accent-pink)]'
                  }`}>
                    {stat.trend}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">{stat.label}</p>
                  <p className="text-3xl font-orbitron font-black mt-1">{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico Simulado */}
            <div className="lg:col-span-2 p-8 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-3xl space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-orbitron font-bold text-lg uppercase">Uso de Recursos</h3>
                <select className="bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-[var(--accent-cyan)]">
                  <option>Últimos 7 dias</option>
                  <option>Últimos 30 dias</option>
                </select>
              </div>
              <div className="h-64 flex items-end gap-2 px-4">
                {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      className="w-full bg-gradient-to-t from-[var(--accent-purple)] to-[var(--accent-cyan)] rounded-t-lg group-hover:glow-cyan transition-all"
                    />
                    <span className="text-[10px] font-bold text-[var(--text-secondary)]">D0{i+1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Histórico Recente */}
            <div className="p-8 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-3xl space-y-6">
              <div className="flex items-center gap-2">
                <History size={18} className="text-[var(--accent-purple)]" />
                <h3 className="font-orbitron font-bold text-lg uppercase">Atividade</h3>
              </div>
              <div className="space-y-6">
                {[
                  { event: "Análise de Repo", time: "2 min atrás", color: "cyan" },
                  { event: "Geração de UI", time: "15 min atrás", color: "purple" },
                  { event: "Refatoração", time: "1 hora atrás", color: "green" },
                  { event: "Configuração API", time: "3 horas atrás", color: "pink" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full bg-[var(--accent-${item.color})] glow-${item.color}`} />
                    <div className="flex-1">
                      <p className="text-sm font-bold">{item.event}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{item.time}</p>
                    </div>
                    <ArrowUpRight size={14} className="text-[var(--text-secondary)]" />
                  </div>
                ))}
              </div>
              <button className="w-full py-3 border border-[var(--border-glow)] rounded-xl text-xs font-bold hover:bg-[var(--bg-card-hover)] transition-all uppercase tracking-widest">
                Ver Log Completo
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
