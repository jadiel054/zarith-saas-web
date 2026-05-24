"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Brain, 
  Search, 
  Trash2, 
  ChevronLeft, 
  Tag, 
  Calendar,
  Filter,
  Plus
} from "lucide-react";
import Link from "next/link";

interface Memory {
  id: string;
  content: string;
  tags: string[];
  date: string;
  importance: "high" | "medium" | "low";
}

export default function MemoriesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [memories] = useState<Memory[]>([
    { 
      id: "1", 
      content: "Usuário prefere Next.js com Tailwind para todos os projetos de frontend.", 
      tags: ["preferências", "tech"], 
      date: "2024-05-24",
      importance: "high"
    },
    { 
      id: "2", 
      content: "Jadiel mencionou que o deploy deve ser sempre via Vercel.", 
      tags: ["infra", "deploy"], 
      date: "2024-05-23",
      importance: "medium"
    },
    { 
      id: "3", 
      content: "O projeto Zarith utiliza o schema 'zarith' no Supabase.", 
      tags: ["banco de dados", "zarith"], 
      date: "2024-05-22",
      importance: "high"
    }
  ]);

  const filteredMemories = memories.filter(m => 
    m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
      <header className="h-16 border-b border-[var(--border-glow)] flex items-center px-6 bg-[var(--bg-secondary)] gap-4">
        <Link href="/chat" className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--accent-cyan)] transition-all">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex items-center gap-2">
          <Brain size={20} className="text-[var(--accent-purple)]" />
          <h1 className="font-orbitron font-black text-xl tracking-widest">MEMÓRIAS</h1>
        </div>
      </header>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
              <input 
                type="text" 
                placeholder="Buscar em memórias..." 
                className="w-full bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-xl py-3 pl-10 pr-4 focus:border-[var(--accent-cyan)] outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-glow)] rounded-xl text-sm font-bold hover:border-[var(--accent-cyan)] transition-all">
                <Filter size={18} />
                Filtrar
              </button>
              <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] text-[var(--bg-primary)] rounded-xl font-bold hover:brightness-110 transition-all glow-cyan">
                <Plus size={18} />
                Nova Memória
              </button>
            </div>
          </div>

          {/* Grid de Memórias */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredMemories.map((memory) => (
              <motion.div
                key={memory.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl space-y-4 hover:border-[var(--accent-cyan)]/50 transition-all relative group overflow-hidden"
              >
                {/* Indicador de Importância */}
                <div className={`absolute top-0 right-0 w-1 h-full ${
                  memory.importance === 'high' ? 'bg-[var(--accent-pink)]' : 
                  memory.importance === 'medium' ? 'bg-[var(--accent-cyan)]' : 'bg-[var(--text-secondary)]'
                }`} />

                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                    <Calendar size={12} />
                    {memory.date}
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 p-2 text-[var(--text-secondary)] hover:text-[var(--accent-pink)] transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>

                <p className="font-mono text-sm leading-relaxed text-[var(--text-primary)]">
                  {memory.content}
                </p>

                <div className="flex flex-wrap gap-2">
                  {memory.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-glow)] rounded-lg text-[10px] font-bold text-[var(--accent-cyan)]">
                      <Tag size={10} />
                      {tag.toUpperCase()}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {filteredMemories.length === 0 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-[var(--border-glow)]">
                <Brain size={32} className="text-[var(--text-secondary)]" />
              </div>
              <p className="text-[var(--text-secondary)]">Nenhuma memória encontrada.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
