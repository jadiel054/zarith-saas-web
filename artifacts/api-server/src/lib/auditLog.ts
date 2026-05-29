/**
 * Audit Log Utility
 * Registra todas as operações críticas para auditoria e rastreamento
 */

import fs from "fs";
import path from "path";
import { logger } from "./logger";

const LOGS_DIR = path.join(process.cwd(), "logs");
const AUDIT_LOG_FILE = path.join(LOGS_DIR, "audit.log");

// Garantir que o diretório de logs existe
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

export interface AuditLogEntry {
  timestamp: string;
  action: string;
  details: Record<string, any>;
  userId?: string;
  ipAddress?: string;
}

/**
 * Registrar ação de auditoria em arquivo e console
 */
export function auditLog(
  action: string,
  details: Record<string, any>,
  userId?: string,
  ipAddress?: string
): void {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    action,
    details,
    userId,
    ipAddress,
  };

  // Log estruturado no console via pino
  logger.info({ audit: entry }, `[AUDIT] ${action}`);

  // Escrever em arquivo de auditoria para análise posterior
  try {
    const logLine = JSON.stringify(entry) + "\n";
    fs.appendFileSync(AUDIT_LOG_FILE, logLine, "utf-8");
  } catch (error) {
    logger.error({ error }, "Erro ao escrever log de auditoria em arquivo");
  }
}

/**
 * Ler logs de auditoria com filtro opcional
 */
export function readAuditLogs(filter?: {
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): AuditLogEntry[] {
  try {
    if (!fs.existsSync(AUDIT_LOG_FILE)) {
      return [];
    }

    const content = fs.readFileSync(AUDIT_LOG_FILE, "utf-8");
    const lines = content.split("\n").filter(line => line.trim());
    const entries: AuditLogEntry[] = lines.map(line => JSON.parse(line));

    // Aplicar filtros
    let filtered = entries;

    if (filter?.action) {
      filtered = filtered.filter(e => e.action.includes(filter.action!));
    }

    if (filter?.startDate) {
      filtered = filtered.filter(e => new Date(e.timestamp) >= filter.startDate!);
    }

    if (filter?.endDate) {
      filtered = filtered.filter(e => new Date(e.timestamp) <= filter.endDate!);
    }

    // Limitar resultados
    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered;
  } catch (error) {
    logger.error({ error }, "Erro ao ler logs de auditoria");
    return [];
  }
}

/**
 * Limpar logs de auditoria antigos (mais de X dias)
 */
export function cleanOldAuditLogs(daysToKeep: number = 30): void {
  try {
    if (!fs.existsSync(AUDIT_LOG_FILE)) {
      return;
    }

    const content = fs.readFileSync(AUDIT_LOG_FILE, "utf-8");
    const lines = content.split("\n").filter(line => line.trim());
    const entries: AuditLogEntry[] = lines.map(line => JSON.parse(line));

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const filtered = entries.filter(e => new Date(e.timestamp) > cutoffDate);

    fs.writeFileSync(AUDIT_LOG_FILE, filtered.map(e => JSON.stringify(e)).join("\n") + "\n", "utf-8");

    logger.info({ removed: entries.length - filtered.length, kept: filtered.length }, "Limpeza de logs antigos concluída");
  } catch (error) {
    logger.error({ error }, "Erro ao limpar logs antigos");
  }
}

/**
 * Exportar logs de auditoria para análise
 */
export function exportAuditLogs(outputPath: string): void {
  try {
    if (!fs.existsSync(AUDIT_LOG_FILE)) {
      logger.warn({}, "Arquivo de auditoria não encontrado");
      return;
    }

    const content = fs.readFileSync(AUDIT_LOG_FILE, "utf-8");
    fs.writeFileSync(outputPath, content, "utf-8");

    logger.info({ outputPath }, "Logs de auditoria exportados");
  } catch (error) {
    logger.error({ error }, "Erro ao exportar logs de auditoria");
  }
}
