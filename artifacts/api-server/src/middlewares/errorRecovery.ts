/**
 * Error Recovery Middleware
 * Implementa lógica de Self-Healing para recuperação automática de falhas
 */

import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";
import { auditLog } from "../lib/auditLog";

export interface ErrorRecoveryContext {
  attempt: number;
  maxAttempts: number;
  lastError?: Error;
  retryableErrors: string[];
}

// Erros que podem ser recuperados com retry
const RETRYABLE_ERROR_CODES = [
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "429", // Rate limit
  "503", // Service unavailable
  "504", // Gateway timeout
];

/**
 * Determinar se um erro é recuperável
 */
export function isRetryableError(error: any): boolean {
  const errorStr = String(error);
  const errorCode = error?.code || error?.status || error?.statusCode;

  return RETRYABLE_ERROR_CODES.some(code => 
    errorStr.includes(code) || errorCode === code
  );
}

/**
 * Calcular tempo de espera com backoff exponencial
 */
export function calculateBackoffDelay(attempt: number, baseDelay: number = 1000): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, etc.
  const delay = baseDelay * Math.pow(2, attempt - 1);
  // Adicionar jitter (randomização) para evitar thundering herd
  const jitter = Math.random() * 0.1 * delay;
  return Math.min(delay + jitter, 30000); // Máximo 30 segundos
}

/**
 * Middleware de tratamento de erros com Self-Healing
 */
export function errorRecoveryMiddleware(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const isRetryable = isRetryableError(err);
  const errorMsg = err instanceof Error ? err.message : String(err);
  const errorCode = err?.code || err?.status || "UNKNOWN";

  logger.error({
    error: errorMsg,
    code: errorCode,
    isRetryable,
    path: req.path,
    method: req.method,
  }, "[ErrorRecovery] Erro capturado");

  auditLog("error:recovery:detected", {
    error: errorMsg,
    code: errorCode,
    isRetryable,
    path: req.path,
    method: req.method,
  });

  // Se for um erro não recuperável, retornar erro direto
  if (!isRetryable) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: errorMsg,
      code: errorCode,
      recoverable: false,
    });
  }

  // Se for recuperável, sugerir retry ao cliente
  const retryAfter = calculateBackoffDelay(1);
  
  logger.info({
    error: errorMsg,
    retryAfter,
  }, "[ErrorRecovery] Erro recuperável detectado, sugerindo retry");

  auditLog("error:recovery:retryable", {
    error: errorMsg,
    retryAfter,
    code: errorCode,
  });

  return res.status(503).json({
    success: false,
    error: errorMsg,
    code: errorCode,
    recoverable: true,
    retryAfter,
    message: "Erro temporário. Tente novamente em alguns segundos.",
  });
}

/**
 * Wrapper para executar função com retry automático
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.info({ attempt, maxAttempts }, "[SelfHealing] Tentativa de execução");
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const isRetryable = isRetryableError(error);

      logger.warn({
        attempt,
        maxAttempts,
        error: lastError.message,
        isRetryable,
      }, "[SelfHealing] Falha na tentativa");

      auditLog("error:self_healing:attempt_failed", {
        attempt,
        maxAttempts,
        error: lastError.message,
        isRetryable,
      });

      // Se não for recuperável ou for a última tentativa, lançar erro
      if (!isRetryable || attempt === maxAttempts) {
        break;
      }

      // Aguardar antes de tentar novamente
      const delay = calculateBackoffDelay(attempt, baseDelay);
      logger.info({ delay }, "[SelfHealing] Aguardando antes do retry");
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Todas as tentativas falharam
  logger.error({
    maxAttempts,
    error: lastError?.message,
  }, "[SelfHealing] Todas as tentativas falharam");

  auditLog("error:self_healing:all_attempts_failed", {
    maxAttempts,
    error: lastError?.message,
  });

  throw lastError;
}

/**
 * Wrapper para operações críticas com fallback
 */
export async function executeWithFallback<T>(
  primaryFn: () => Promise<T>,
  fallbackFn: () => Promise<T>,
  operationName: string = "operation"
): Promise<T> {
  try {
    logger.info({}, `[SelfHealing] Executando operação primária: ${operationName}`);
    return await primaryFn();
  } catch (primaryError) {
    logger.warn({
      error: primaryError instanceof Error ? primaryError.message : String(primaryError),
      operationName,
    }, "[SelfHealing] Operação primária falhou, tentando fallback");

    auditLog("error:self_healing:primary_failed_trying_fallback", {
      operationName,
      primaryError: primaryError instanceof Error ? primaryError.message : String(primaryError),
    });

    try {
      logger.info({}, `[SelfHealing] Executando operação fallback: ${operationName}`);
      return await fallbackFn();
    } catch (fallbackError) {
      logger.error({
        operationName,
        primaryError: primaryError instanceof Error ? primaryError.message : String(primaryError),
        fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      }, "[SelfHealing] Ambas as operações falharam");

      auditLog("error:self_healing:both_failed", {
        operationName,
        primaryError: primaryError instanceof Error ? primaryError.message : String(primaryError),
        fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      });

      throw fallbackError;
    }
  }
}
