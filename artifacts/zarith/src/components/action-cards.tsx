import { motion } from "framer-motion";
import { supabaseClient } from "@/lib/supabase";

export interface QuickAction {
  icon: string;
  title: string;
  description: string;
  message: string;
  gradient: string;
  glow: string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: "🌐",
    title: "Criar Site",
    description: "Landing page, sistema ou portfólio",
    message: "Zarith, vamos criar um site. Me pergunta tudo que precisa saber antes de começar.",
    gradient: "from-[rgba(0,245,255,0.15)] to-[rgba(0,245,255,0.03)]",
    glow: "rgba(0,245,255,0.3)",
  },
  {
    icon: "📱",
    title: "Criar App",
    description: "Do zero, passo a passo",
    message: "Zarith, quero criar um app. Me guia pelo processo do zero.",
    gradient: "from-[rgba(191,0,255,0.15)] to-[rgba(191,0,255,0.03)]",
    glow: "rgba(191,0,255,0.3)",
  },
  {
    icon: "🔍",
    title: "Analisar Repositórios",
    description: "Análise completa do código",
    message: "Zarith, analisa os repositórios e me mostra um resumo visual.",
    gradient: "from-[rgba(0,245,255,0.12)] to-[rgba(191,0,255,0.08)]",
    glow: "rgba(0,245,255,0.25)",
  },
  {
    icon: "⚡",
    title: "Gerar Código",
    description: "Implementação e geração",
    message: "Zarith, preciso gerar código. Me pergunta a linguagem, objetivo e contexto.",
    gradient: "from-[rgba(255,204,0,0.12)] to-[rgba(255,204,0,0.03)]",
    glow: "rgba(255,204,0,0.25)",
  },
  {
    icon: "🚀",
    title: "Deploy e Infra",
    description: "CI/CD, Docker, Vercel, cloud",
    message: "Zarith, me ajuda a configurar infraestrutura, CI/CD e deploy.",
    gradient: "from-[rgba(0,255,136,0.12)] to-[rgba(0,255,136,0.03)]",
    glow: "rgba(0,255,136,0.25)",
  },
  {
    icon: "🐛",
    title: "Debugar Erro",
    description: "Cola o erro, a Zarith resolve",
    message: "Zarith, tenho um erro para resolver. Me pergunta qual é e onde está acontecendo.",
    gradient: "from-[rgba(255,0,128,0.12)] to-[rgba(255,0,128,0.03)]",
    glow: "rgba(255,0,128,0.25)",
  },
  {
    icon: "🔧",
    title: "Refatorar Código",
    description: "Limpa, otimiza e documenta",
    message: "Zarith, quero refatorar um código. Me pergunta o que precisa melhorar.",
    gradient: "from-[rgba(191,0,255,0.12)] to-[rgba(0,245,255,0.06)]",
    glow: "rgba(191,0,255,0.25)",
  },
  {
    icon: "🔎",
    title: "Pesquisar na Web",
    description: "Busca em tempo real com Tavily",
    message: "Zarith, preciso de uma pesquisa na web. Me pergunta o que buscar.",
    gradient: "from-[rgba(0,245,255,0.1)] to-[rgba(0,255,136,0.06)]",
    glow: "rgba(0,245,255,0.2)",
  },
];

interface ActionCardsProps {
  onSelectAction: (message: string) => void;
  
  forceMobileLayout?: boolean;
}

export function ActionCards({ onSelectAction, forceMobileLayout = false }: ActionCardsProps) {
  const handleCardClick = async (action: QuickAction) => {
    // Valida sessão antes de disparar
    if (supabaseClient) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        window.location.href = "/";
        return;
      }
    }
    onSelectAction(action.message);
  };

  return (
    <div className="flex w-full flex-col items-center justify-center text-center px-0 py-0 min-h-0">
      {/* Cards grid — 2 colunas mobile, 4 colunas desktop */}
      <div className={`${forceMobileLayout ? "grid-cols-2 max-w-[24rem] gap-3" : "grid-cols-2 md:grid-cols-4 max-w-4xl gap-3 sm:gap-4"} grid w-full`}>
        {QUICK_ACTIONS.map((action, i) => (
          <motion.button
            key={action.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 24 }}
            onClick={() => handleCardClick(action)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`relative group flex ${forceMobileLayout ? "min-h-[108px] px-3 py-3" : "min-h-[112px] px-3 py-4 sm:min-h-[132px] sm:p-4"} flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--border-glow)] bg-gradient-to-b ${action.gradient} text-left cursor-pointer transition-all duration-200 overflow-hidden`}
            style={{
              boxShadow: "0 0 0 rgba(0,0,0,0)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 20px ${action.glow}, 0 0 40px ${action.glow.replace("0.3", "0.1").replace("0.25", "0.08").replace("0.2", "0.06")}`;
              (e.currentTarget as HTMLButtonElement).style.borderColor = action.glow.replace("rgba(", "rgba(").replace(", 0.3)", ", 0.6)").replace(", 0.25)", ", 0.5)").replace(", 0.2)", ", 0.4)");
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 rgba(0,0,0,0)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0, 245, 255, 0.15)";
            }}
          >
            {/* Glow corner */}
            <div
              className="absolute top-0 left-0 w-16 h-16 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"
              style={{ background: action.glow }}
            />

            {/* Ícone */}
            <span className={`${forceMobileLayout ? "text-3xl" : "text-3xl md:text-4xl"} leading-none`}>{action.icon}</span>

            {/* Texto */}
            <div className="w-full text-center">
              <p className={`${forceMobileLayout ? "text-[13px]" : "text-[13px] md:text-sm"} font-bold text-[var(--text-primary)] leading-tight`}>
                {action.title}
              </p>
              <p className={`${forceMobileLayout ? "hidden" : "hidden md:block"} text-[10px] text-[var(--text-secondary)] mt-0.5 leading-snug`}>
                {action.description}
              </p>
            </div>
          </motion.button>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className={`${forceMobileLayout ? "mt-4" : "mt-4 md:mt-6"} text-[10px] text-[var(--text-secondary)] font-mono uppercase tracking-[0.18em]`}
      >
        Clique em um card ou escreva sua mensagem abaixo
      </motion.p>
    </div>
  );
}
