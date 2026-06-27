import { RefreshCw, X } from "lucide-react";

interface UpdateBannerProps {
  commitMessage: string;
  buildDate: string;
  onUpdate: () => void;
  onDismiss: () => void;
}

function formatBuildDate(buildDate: string) {
  const parsedDate = new Date(buildDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return buildDate;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsedDate);
}

export function UpdateBanner({
  commitMessage,
  buildDate,
  onUpdate,
  onDismiss,
}: UpdateBannerProps) {
  return (
    <div className="fixed top-[calc(0.75rem+env(safe-area-inset-top))] left-1/2 z-[70] w-[min(calc(100vw-1.5rem),42rem)] -translate-x-1/2 px-1">
      <div className="rounded-2xl border border-[var(--border-glow)] bg-[rgba(10,10,20,0.96)] shadow-[0_12px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="flex items-start gap-3 p-4 sm:p-5">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#00f5ff]/20 bg-[#00f5ff]/10 text-[#00f5ff]">
            <RefreshCw size={18} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-orbitron text-sm font-black uppercase tracking-wider text-[#00f5ff]">
                  Atualização disponível
                </p>
                <p className="mt-1 text-sm text-[var(--text-primary)] break-words">
                  {commitMessage}
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Deploy publicado em {formatBuildDate(buildDate)}
                </p>
              </div>

              <button
                type="button"
                onClick={onDismiss}
                className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-white/5 hover:text-[var(--text-primary)]"
                aria-label="Dispensar atualização"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onUpdate}
                className="rounded-xl border border-[#00f5ff]/30 bg-[#00f5ff]/10 px-4 py-2 text-sm font-bold text-[#00f5ff] transition-all hover:bg-[#00f5ff]/20"
              >
                Atualizar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { UpdateBannerProps };
