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
  Zap,
} from "lucide-react";
import { useLocation } from "wouter";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] p-4 bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-2xl bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl shadow-2xl overflow-hidden glow-cyan"
        onClick={(e) => e.stopPropagation()}
      >
        <Command>
          <div className="flex items-center px-4 border-b border-[var(--border-glow)]">
            <Search className="text-[var(--text-secondary)] mr-3" size={18} />
            <Command.Input
              placeholder="Digite um comando ou busque..."
              className="w-full h-14 bg-transparent border-none focus:ring-0 text-sm font-mono outline-none"
            />
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="p-4 text-center text-sm text-[var(--text-secondary)]">
              Nenhum resultado encontrado.
            </Command.Empty>

            <Command.Group heading="Navegação" className="px-2 py-3 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
              <PaletteItem icon={<MessageSquare size={16} />} onSelect={() => runCommand(() => navigate("/chat"))}>
                Ir para Chat
              </PaletteItem>
              <PaletteItem icon={<Brain size={16} />} onSelect={() => runCommand(() => navigate("/memories"))}>
                Ver Memórias
              </PaletteItem>
              <PaletteItem icon={<BarChart3 size={16} />} onSelect={() => runCommand(() => navigate("/dashboard"))}>
                Dashboard
              </PaletteItem>
              <PaletteItem icon={<Settings size={16} />} onSelect={() => runCommand(() => navigate("/settings"))}>
                Configurações
              </PaletteItem>
              <PaletteItem icon={<ShieldAlert size={16} />} onSelect={() => runCommand(() => navigate("/admin"))}>
                Painel Admin
              </PaletteItem>
            </Command.Group>

            <Command.Group heading="Ações Rápidas" className="px-2 py-3 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
              <PaletteItem icon={<Plus size={16} />} onSelect={() => runCommand(() => {})}>
                Nova Conversa
              </PaletteItem>
              <PaletteItem icon={<Zap size={16} />} onSelect={() => runCommand(() => {})}>
                Limpar Cache do Sistema
              </PaletteItem>
            </Command.Group>
          </Command.List>

          <div className="p-3 border-t border-[var(--border-glow)] bg-[var(--bg-secondary)] flex justify-between items-center text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-tighter">
            <div className="flex gap-4">
              <span>↑↓ Navegar</span>
              <span>↵ Selecionar</span>
            </div>
            <span>ESC Fechar</span>
          </div>
        </Command>
      </div>
    </div>
  );
}

function PaletteItem({ children, icon, onSelect }: { children: React.ReactNode; icon: React.ReactNode; onSelect: () => void }) {
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
