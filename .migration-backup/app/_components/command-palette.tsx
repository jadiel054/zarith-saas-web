"use client";

import { useState, useEffect } from "react";
import { Command } from "cmdk";
import { 
  MessageSquare, 
  Settings, 
  Brain, 
  BarChart3, 
  ShieldAlert, 
  Search,
  Plus,
  Zap
} from "lucide-react";
import { useRouter } from "next/navigation";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl shadow-2xl overflow-hidden glow-cyan">
        <div className="flex items-center px-4 border-b border-[var(--border-glow)]">
          <Search className="text-[var(--text-secondary)] mr-3" size={18} />
          <Command.Input
            placeholder="Digite um comando ou busque..."
            className="w-full h-14 bg-transparent border-none focus:ring-0 text-sm font-mono outline-none"
          />
        </div>

        <Command.List className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
          <Command.Empty className="p-4 text-center text-sm text-[var(--text-secondary)]">
            Nenhum resultado encontrado.
          </Command.Empty>

          <Command.Group heading="Navegação" className="px-2 py-3 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
            <Item icon={<MessageSquare size={16} />} onSelect={() => runCommand(() => router.push("/chat"))}>
              Ir para Chat
            </Item>
            <Item icon={<Brain size={16} />} onSelect={() => runCommand(() => router.push("/memories"))}>
              Ver Memórias
            </Item>
            <Item icon={<BarChart3 size={16} />} onSelect={() => runCommand(() => router.push("/dashboard"))}>
              Dashboard
            </Item>
            <Item icon={<Settings size={16} />} onSelect={() => runCommand(() => router.push("/settings"))}>
              Configurações
            </Item>
            <Item icon={<ShieldAlert size={16} />} onSelect={() => runCommand(() => router.push("/admin"))}>
              Painel Admin
            </Item>
          </Command.Group>

          <Command.Group heading="Ações Rápidas" className="px-2 py-3 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
            <Item icon={<Plus size={16} />} onSelect={() => runCommand(() => console.log("Nova conversa"))}>
              Nova Conversa
            </Item>
            <Item icon={<Zap size={16} />} onSelect={() => runCommand(() => console.log("Limpar cache"))}>
              Limpar Cache do Sistema
            </Item>
          </Command.Group>
        </Command.List>

        <div className="p-3 border-t border-[var(--border-glow)] bg-[var(--bg-secondary)] flex justify-between items-center text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-tighter">
          <div className="flex gap-4">
            <span>↑↓ Navegar</span>
            <span>↵ Selecionar</span>
          </div>
          <span>ESC Fechar</span>
        </div>
      </div>
    </Command.Dialog>
  );
}

function Item({ children, icon, onSelect }: { children: React.ReactNode; icon: React.ReactNode; onSelect: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer aria-selected:bg-[var(--bg-card-hover)] aria-selected:text-[var(--accent-cyan)] transition-all text-sm"
    >
      <span className="shrink-0">{icon}</span>
      {children}
    </Command.Item>
  );
}
