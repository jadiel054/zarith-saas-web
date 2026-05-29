import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Shield, Check, X } from "lucide-react";
import { useState } from "react";

export enum OperationDangerLevel {
  SAFE = "safe",
  CAUTION = "caution",
  DANGEROUS = "dangerous",
  CRITICAL = "critical",
}

interface SecurityConfirmationDialogProps {
  isOpen: boolean;
  operationType: string;
  description: string;
  dangerLevel: OperationDangerLevel;
  requiresExplanation: boolean;
  onConfirm: (explanation?: string) => void;
  onCancel: () => void;
}

export function SecurityConfirmationDialog({
  isOpen,
  operationType,
  description,
  dangerLevel,
  requiresExplanation,
  onConfirm,
  onCancel,
}: SecurityConfirmationDialogProps) {
  const [explanation, setExplanation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (requiresExplanation && !explanation.trim()) {
      alert("Explicação é obrigatória para esta operação");
      return;
    }

    setIsSubmitting(true);
    try {
      onConfirm(explanation);
    } finally {
      setIsSubmitting(false);
      setExplanation("");
    }
  };

  const getDangerColor = () => {
    switch (dangerLevel) {
      case OperationDangerLevel.CRITICAL:
        return "from-red-600 to-red-500";
      case OperationDangerLevel.DANGEROUS:
        return "from-orange-600 to-orange-500";
      case OperationDangerLevel.CAUTION:
        return "from-yellow-600 to-yellow-500";
      default:
        return "from-green-600 to-green-500";
    }
  };

  const getDangerBgColor = () => {
    switch (dangerLevel) {
      case OperationDangerLevel.CRITICAL:
        return "bg-red-500/10 border-red-500/30";
      case OperationDangerLevel.DANGEROUS:
        return "bg-orange-500/10 border-orange-500/30";
      case OperationDangerLevel.CAUTION:
        return "bg-yellow-500/10 border-yellow-500/30";
      default:
        return "bg-green-500/10 border-green-500/30";
    }
  };

  const getDangerTextColor = () => {
    switch (dangerLevel) {
      case OperationDangerLevel.CRITICAL:
        return "text-red-300";
      case OperationDangerLevel.DANGEROUS:
        return "text-orange-300";
      case OperationDangerLevel.CAUTION:
        return "text-yellow-300";
      default:
        return "text-green-300";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className={`bg-gradient-to-r ${getDangerColor()} p-4 flex items-center gap-3`}>
              <Shield size={24} className="text-white" />
              <div>
                <p className="text-xs font-bold text-white/80 uppercase">Confirmação de Segurança</p>
                <p className="text-sm font-bold text-white">{dangerLevel.toUpperCase()}</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Danger Alert */}
              <div className={`${getDangerBgColor()} border rounded-lg p-4 flex items-start gap-3`}>
                <AlertTriangle size={20} className={`${getDangerTextColor()} shrink-0 mt-0.5`} />
                <div className="flex-1">
                  <p className={`text-sm font-bold ${getDangerTextColor()} mb-1`}>
                    Operação: {operationType}
                  </p>
                  <p className="text-xs text-gray-300">
                    {description}
                  </p>
                </div>
              </div>

              {/* Danger Level Description */}
              <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                <p className="text-xs font-mono text-gray-400">
                  {dangerLevel === OperationDangerLevel.CRITICAL &&
                    "⚠️ CRÍTICO: Esta operação pode causar perda irreversível de dados. Requer confirmação e explicação."}
                  {dangerLevel === OperationDangerLevel.DANGEROUS &&
                    "⚠️ PERIGOSO: Esta operação afeta recursos em produção. Requer confirmação."}
                  {dangerLevel === OperationDangerLevel.CAUTION &&
                    "⚠️ CUIDADO: Esta operação pode ter impacto. Será executada com monitoramento."}
                  {dangerLevel === OperationDangerLevel.SAFE &&
                    "✓ SEGURO: Esta operação é segura e será executada automaticamente."}
                </p>
              </div>

              {/* Explanation Input (if required) */}
              {requiresExplanation && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300">
                    Por que você quer executar esta operação?
                  </label>
                  <textarea
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Explique o motivo desta operação crítica..."
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-[#00f5ff] focus:ring-1 focus:ring-[#00f5ff]/30 resize-none"
                    rows={3}
                  />
                  <p className="text-[10px] text-gray-500">
                    Mínimo 10 caracteres | Máximo 500 caracteres
                  </p>
                </div>
              )}

              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  defaultChecked={false}
                  className="mt-1 w-4 h-4 rounded border-2 border-gray-500 group-hover:border-[#00f5ff] transition-all"
                  required
                />
                <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-all">
                  Entendo os riscos e desejo prosseguir com esta operação
                </span>
              </label>
            </div>

            {/* Footer */}
            <div className="bg-black/20 border-t border-white/5 p-4 flex gap-3">
              <button
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-all disabled:opacity-50"
              >
                <X size={14} className="inline mr-1" />
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className={`flex-1 px-4 py-2 rounded-lg bg-gradient-to-r ${getDangerColor()} text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
              >
                <Check size={14} />
                {isSubmitting ? "Processando..." : "Confirmar"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
