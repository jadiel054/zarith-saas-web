/**
 * Security Validation Middleware
 * Implementa validação de segurança granular com Human-in-the-loop
 */

import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";
import { auditLog } from "../lib/auditLog";

export enum OperationDangerLevel {
  SAFE = "safe",           // Automático
  CAUTION = "caution",     // Automático com warning
  DANGEROUS = "dangerous", // Requer confirmação
  CRITICAL = "critical",  // Requer confirmação + explicação
}

export interface SecurityPolicy {
  operationType: string;
  dangerLevel: OperationDangerLevel;
  description: string;
  requiresConfirmation: boolean;
  requiresExplanation: boolean;
  allowedRoles?: string[];
  rateLimit?: number; // requisições por minuto
}

/**
 * Políticas de segurança para diferentes operações
 */
const SECURITY_POLICIES: SecurityPolicy[] = [
  // Operações de Leitura - SAFE
  {
    operationType: "read:file",
    dangerLevel: OperationDangerLevel.SAFE,
    description: "Ler arquivo do repositório",
    requiresConfirmation: false,
    requiresExplanation: false,
  },
  {
    operationType: "read:repos",
    dangerLevel: OperationDangerLevel.SAFE,
    description: "Listar repositórios",
    requiresConfirmation: false,
    requiresExplanation: false,
  },
  {
    operationType: "read:tables",
    dangerLevel: OperationDangerLevel.SAFE,
    description: "Listar tabelas do banco",
    requiresConfirmation: false,
    requiresExplanation: false,
  },
  {
    operationType: "read:deployment_status",
    dangerLevel: OperationDangerLevel.SAFE,
    description: "Verificar status de deployment",
    requiresConfirmation: false,
    requiresExplanation: false,
  },

  // Operações de Escrita - CAUTION
  {
    operationType: "write:create_file",
    dangerLevel: OperationDangerLevel.CAUTION,
    description: "Criar/atualizar arquivo no repositório",
    requiresConfirmation: false,
    requiresExplanation: false,
  },
  {
    operationType: "write:commit",
    dangerLevel: OperationDangerLevel.CAUTION,
    description: "Fazer commit no repositório",
    requiresConfirmation: false,
    requiresExplanation: false,
  },
  {
    operationType: "write:create_table",
    dangerLevel: OperationDangerLevel.CAUTION,
    description": "Criar tabela no banco de dados",
    requiresConfirmation: false,
    requiresExplanation: false,
  },
  {
    operationType: "write:add_column",
    dangerLevel: OperationDangerLevel.CAUTION,
    description: "Adicionar coluna à tabela",
    requiresConfirmation: false,
    requiresExplanation: false,
  },

  // Operações de Deploy - DANGEROUS
  {
    operationType: "deploy:create",
    dangerLevel: OperationDangerLevel.DANGEROUS,
    description: "Criar novo deployment em produção",
    requiresConfirmation: true,
    requiresExplanation: false,
  },
  {
    operationType: "deploy:cancel",
    dangerLevel: OperationDangerLevel.DANGEROUS,
    description: "Cancelar deployment em produção",
    requiresConfirmation: true,
    requiresExplanation: false,
  },

  // Operações Destrutivas - CRITICAL
  {
    operationType: "delete:drop_table",
    dangerLevel: OperationDangerLevel.CRITICAL,
    description: "Deletar tabela do banco de dados",
    requiresConfirmation: true,
    requiresExplanation: true,
  },
  {
    operationType: "delete:truncate_table",
    dangerLevel: OperationDangerLevel.CRITICAL,
    description: "Limpar todos os dados de uma tabela",
    requiresConfirmation: true,
    requiresExplanation: true,
  },
  {
    operationType: "delete:delete_rows",
    dangerLevel: OperationDangerLevel.CRITICAL,
    description: "Deletar linhas do banco de dados",
    requiresConfirmation: true,
    requiresExplanation: true,
  },
  {
    operationType: "delete:repository",
    dangerLevel: OperationDangerLevel.CRITICAL,
    description: "Deletar repositório do GitHub",
    requiresConfirmation: true,
    requiresExplanation: true,
  },
];

/**
 * Rate limiting store (em memória para simplicidade)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Obter política de segurança para uma operação
 */
export function getSecurityPolicy(operationType: string): SecurityPolicy | undefined {
  return SECURITY_POLICIES.find(p => p.operationType === operationType);
}

/**
 * Validar rate limit
 */
function checkRateLimit(clientId: string, policy: SecurityPolicy): boolean {
  if (!policy.rateLimit) return true;

  const now = Date.now();
  const key = `${clientId}:${policy.operationType}`;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // Novo período
    rateLimitStore.set(key, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (record.count < policy.rateLimit) {
    record.count++;
    return true;
  }

  return false;
}

/**
 * Middleware de validação de segurança
 */
export function securityValidationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const operationType = req.body?.operationType || extractOperationType(req);

  if (!operationType) {
    return next();
  }

  const policy = getSecurityPolicy(operationType);
  if (!policy) {
    logger.warn({ operationType }, "Operação sem política de segurança definida");
    return next();
  }

  const clientId = req.ip || "unknown";

  // Verificar rate limit
  if (!checkRateLimit(clientId, policy)) {
    auditLog("security:rate_limit_exceeded", {
      operationType,
      clientId,
      policy: policy.operationType,
    });

    return res.status(429).json({
      error: "Rate limit excedido para esta operação",
      retryAfter: 60,
    });
  }

  // Validar confirmação se necessária
  if (policy.requiresConfirmation && !req.body?.confirmed) {
    auditLog("security:confirmation_required", {
      operationType,
      dangerLevel: policy.dangerLevel,
      clientId,
    });

    return res.status(403).json({
      error: "Confirmação necessária para esta operação",
      dangerLevel: policy.dangerLevel,
      description: policy.description,
      requiresExplanation: policy.requiresExplanation,
      requiresConfirmation: true,
    });
  }

  // Validar explicação se necessária
  if (policy.requiresExplanation && !req.body?.explanation) {
    auditLog("security:explanation_required", {
      operationType,
      dangerLevel: policy.dangerLevel,
      clientId,
    });

    return res.status(403).json({
      error: "Explicação necessária para esta operação crítica",
      dangerLevel: policy.dangerLevel,
      description: policy.description,
      requiresExplanation: true,
    });
  }

  // Log de auditoria para operações perigosas
  if (policy.dangerLevel !== OperationDangerLevel.SAFE) {
    auditLog("security:dangerous_operation", {
      operationType,
      dangerLevel: policy.dangerLevel,
      clientId,
      confirmed: req.body?.confirmed || false,
      explanation: req.body?.explanation || null,
    });
  }

  // Adicionar informações de segurança ao request
  (req as any).securityPolicy = policy;
  (req as any).clientId = clientId;

  next();
}

/**
 * Extrair tipo de operação do request
 */
function extractOperationType(req: Request): string | null {
  const path = req.path.toLowerCase();
  const method = req.method.toUpperCase();

  // GitHub operations
  if (path.includes("/github/repos")) return "read:repos";
  if (path.includes("/github/read-file")) return "read:file";
  if (path.includes("/github/create-file")) return "write:create_file";
  if (path.includes("/github/commit")) return "write:commit";

  // Deploy operations
  if (path.includes("/deploy/create") && method === "POST") return "deploy:create";
  if (path.includes("/deploy") && method === "DELETE") return "deploy:cancel";
  if (path.includes("/deploy/status")) return "read:deployment_status";

  // Supabase operations
  if (path.includes("/supabase/execute")) {
    const sql = (req.body?.sql || "").toUpperCase();
    if (sql.includes("DROP TABLE")) return "delete:drop_table";
    if (sql.includes("TRUNCATE")) return "delete:truncate_table";
    if (sql.includes("DELETE FROM")) return "delete:delete_rows";
    if (sql.includes("CREATE TABLE")) return "write:create_table";
    if (sql.includes("ALTER TABLE")) return "write:add_column";
    return "write:sql";
  }
  if (path.includes("/supabase/create-table")) return "write:create_table";
  if (path.includes("/supabase/add-column")) return "write:add_column";
  if (path.includes("/supabase/drop-table")) return "delete:drop_table";
  if (path.includes("/supabase/tables")) return "read:tables";

  return null;
}

/**
 * Gerar relatório de políticas de segurança
 */
export function generateSecurityPoliciesReport(): string {
  const grouped = {
    [OperationDangerLevel.SAFE]: SECURITY_POLICIES.filter(p => p.dangerLevel === OperationDangerLevel.SAFE),
    [OperationDangerLevel.CAUTION]: SECURITY_POLICIES.filter(p => p.dangerLevel === OperationDangerLevel.CAUTION),
    [OperationDangerLevel.DANGEROUS]: SECURITY_POLICIES.filter(p => p.dangerLevel === OperationDangerLevel.DANGEROUS),
    [OperationDangerLevel.CRITICAL]: SECURITY_POLICIES.filter(p => p.dangerLevel === OperationDangerLevel.CRITICAL),
  };

  return `
# Relatório de Políticas de Segurança

## SAFE (Automático)
${grouped[OperationDangerLevel.SAFE].map(p => `- ${p.operationType}: ${p.description}`).join("\n")}

## CAUTION (Automático com Warning)
${grouped[OperationDangerLevel.CAUTION].map(p => `- ${p.operationType}: ${p.description}`).join("\n")}

## DANGEROUS (Requer Confirmação)
${grouped[OperationDangerLevel.DANGEROUS].map(p => `- ${p.operationType}: ${p.description}`).join("\n")}

## CRITICAL (Requer Confirmação + Explicação)
${grouped[OperationDangerLevel.CRITICAL].map(p => `- ${p.operationType}: ${p.description}`).join("\n")}
  `.trim();
}
