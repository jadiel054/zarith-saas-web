import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, ListTodo, ChevronRight } from "lucide-react";

export interface PlanStep {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "failed";
}

interface AgentPlannerPanelProps {
  steps: PlanStep[];
  isOpen: boolean;
}

export function AgentPlannerPanel({ steps, isOpen }: AgentPlannerPanelProps) {
  if (!isOpen || steps.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-24 right-6 w-80 bg-black/80 border border-cyan-500/30 rounded-lg overflow-hidden backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.15)] z-50"
    >
      <div className="bg-cyan-500/10 p-3 border-b border-cyan-500/20 flex items-center gap-2">
        <ListTodo size={16} className="text-cyan-400" />
        <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Planejamento da Zarith</span>
      </div>
      
      <div className="p-4 space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-3 group">
            <div className="mt-0.5">
              {step.status === "completed" ? (
                <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shadow-[0_0_8px_rgba(34,197,94,0.5)]">
                  <Check size={10} className="text-black font-bold" />
                </div>
              ) : step.status === "running" ? (
                <Loader2 size={16} className="text-cyan-400 animate-spin" />
              ) : step.status === "failed" ? (
                <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-[10px] font-bold">!</span>
                </div>
              ) : (
                <div className="w-4 h-4 rounded-full border border-gray-600 flex items-center justify-center" />
              )}
            </div>
            <div className="flex-1">
              <p className={`text-xs font-medium ${
                step.status === "completed" ? "text-gray-400 line-through" : 
                step.status === "running" ? "text-cyan-400" : "text-gray-300"
              }`}>
                {step.title}
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
