/**
 * Self-Healing Service
 * Implementa lógica de recuperação automática para falhas de ferramentas
 */

export interface RecoveryStrategy {
  name: string;
  condition: (error: any) => boolean;
  recover: (error: any) => Promise<any>;
}

export interface DiagnosisResult {
  errorType: string;
  cause: string;
  severity: "low" | "medium" | "high";
  suggestedActions: string[];
  retryable: boolean;
}

/**
 * Diagnosticar tipo de erro e causa provável
 */
export function diagnoseError(error: any): DiagnosisResult {
  const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const statusCode = error?.status || error?.statusCode;

  // Erros de autenticação
  if (errorMsg.includes("401") || errorMsg.includes("unauthorized") || errorMsg.includes("invalid") || errorMsg.includes("api key")) {
    return {
      errorType: "AUTHENTICATION_ERROR",
      cause: "Chave de API inválida, expirada ou não configurada",
      severity: "high",
      suggestedActions: [
        "Verifique se a chave de API está corretamente configurada",
        "Verifique se a chave não expirou",
        "Tente gerar uma nova chave de API",
      ],
      retryable: false,
    };
  }

  // Erros de permissão
  if (errorMsg.includes("403") || errorMsg.includes("forbidden") || errorMsg.includes("permission")) {
    return {
      errorType: "PERMISSION_ERROR",
      cause: "Permissões insuficientes para executar a operação",
      severity: "high",
      suggestedActions: [
        "Verifique se a chave tem permissões suficientes",
        "Verifique se o recurso existe e é acessível",
        "Tente com uma chave com mais permissões",
      ],
      retryable: false,
    };
  }

  // Erros de rate limit
  if (errorMsg.includes("429") || errorMsg.includes("rate limit") || errorMsg.includes("too many")) {
    return {
      errorType: "RATE_LIMIT_ERROR",
      cause: "Limite de requisições excedido",
      severity: "medium",
      suggestedActions: [
        "Aguarde alguns segundos antes de tentar novamente",
        "Reduza a frequência de requisições",
        "Considere usar um plano com limite maior",
      ],
      retryable: true,
    };
  }

  // Erros de conexão
  if (errorMsg.includes("network") || errorMsg.includes("fetch") || errorMsg.includes("connection") || errorMsg.includes("econnrefused")) {
    return {
      errorType: "NETWORK_ERROR",
      cause: "Falha na conexão com o servidor",
      severity: "medium",
      suggestedActions: [
        "Verifique sua conexão de internet",
        "Verifique se o servidor está disponível",
        "Tente novamente em alguns segundos",
      ],
      retryable: true,
    };
  }

  // Erros de timeout
  if (errorMsg.includes("timeout") || errorMsg.includes("etimedout")) {
    return {
      errorType: "TIMEOUT_ERROR",
      cause: "Requisição demorou muito tempo para responder",
      severity: "medium",
      suggestedActions: [
        "Tente novamente com uma operação menor",
        "Verifique a velocidade da sua conexão",
        "Tente novamente em alguns segundos",
      ],
      retryable: true,
    };
  }

  // Erros de servidor
  if (statusCode >= 500 || errorMsg.includes("500") || errorMsg.includes("503") || errorMsg.includes("service unavailable")) {
    return {
      errorType: "SERVER_ERROR",
      cause: "Servidor indisponível ou erro interno",
      severity: "medium",
      suggestedActions: [
        "O servidor pode estar em manutenção",
        "Tente novamente em alguns segundos",
        "Verifique o status do serviço",
      ],
      retryable: true,
    };
  }

  // Erros de validação
  if (statusCode === 400 || errorMsg.includes("400") || errorMsg.includes("invalid") || errorMsg.includes("bad request")) {
    return {
      errorType: "VALIDATION_ERROR",
      cause: "Dados inválidos ou malformados",
      severity: "high",
      suggestedActions: [
        "Verifique os dados enviados",
        "Verifique o formato da requisição",
        "Consulte a documentação da API",
      ],
      retryable: false,
    };
  }

  // Erro desconhecido
  return {
    errorType: "UNKNOWN_ERROR",
    cause: "Erro desconhecido",
    severity: "high",
    suggestedActions: [
      "Tente novamente",
      "Verifique os logs para mais detalhes",
      "Contate o suporte se o problema persistir",
    ],
    retryable: true,
  };
}

/**
 * Calcular tempo de espera com backoff exponencial
 */
export function calculateBackoffDelay(attempt: number, baseDelay: number = 1000): number {
  const delay = baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.1 * delay;
  return Math.min(delay + jitter, 30000);
}

/**
 * Executar função com retry automático
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const diagnosis = diagnoseError(error);

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Se não for recuperável ou for a última tentativa, lançar erro
      if (!diagnosis.retryable || attempt === maxAttempts) {
        break;
      }

      // Aguardar antes de tentar novamente
      const delay = calculateBackoffDelay(attempt, baseDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Executar com fallback automático
 */
export async function executeWithFallback<T>(
  primaryFn: () => Promise<T>,
  fallbackFn: () => Promise<T>
): Promise<T> {
  try {
    return await primaryFn();
  } catch (primaryError) {
    console.warn("[SelfHealing] Operação primária falhou, tentando fallback:", primaryError);
    try {
      return await fallbackFn();
    } catch (fallbackError) {
      console.error("[SelfHealing] Ambas as operações falharam:", { primaryError, fallbackError });
      throw fallbackError;
    }
  }
}

/**
 * Estratégias de recuperação predefinidas
 */
export const recoveryStrategies: RecoveryStrategy[] = [
  {
    name: "retry_with_backoff",
    condition: (error) => {
      const diagnosis = diagnoseError(error);
      return diagnosis.retryable;
    },
    recover: async (error) => {
      const diagnosis = diagnoseError(error);
      return {
        action: "retry",
        delay: calculateBackoffDelay(1),
        reason: diagnosis.cause,
      };
    },
  },
  {
    name: "clear_cache_and_retry",
    condition: (error) => {
      const msg = String(error).toLowerCase();
      return msg.includes("cache") || msg.includes("stale");
    },
    recover: async () => {
      localStorage.clear();
      return {
        action: "cleared_cache_and_retry",
        reason: "Cache foi limpo",
      };
    },
  },
  {
    name: "switch_endpoint",
    condition: (error) => {
      const msg = String(error).toLowerCase();
      return msg.includes("endpoint") || msg.includes("url");
    },
    recover: async () => {
      return {
        action: "switch_endpoint",
        reason: "Tentando endpoint alternativo",
      };
    },
  },
];

/**
 * Aplicar estratégia de recuperação apropriada
 */
export async function applyRecoveryStrategy(error: any): Promise<any> {
  const strategy = recoveryStrategies.find(s => s.condition(error));

  if (!strategy) {
    console.warn("[SelfHealing] Nenhuma estratégia de recuperação aplicável");
    return null;
  }

  console.log(`[SelfHealing] Aplicando estratégia: ${strategy.name}`);
  return await strategy.recover(error);
}
