/**
 * SQL Routes
 * Rotas para execução SQL direta (para ferramentas de admin)
 * 
 * ⚠️ ATENÇÃO: Estas rotas são perigosas e devem ser protegidas
 */

import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { sendError, sendSuccess, getUserIdFromRequest } from "../toolUtils";
import { securityValidationMiddleware, OperationDangerLevel } from "../../middlewares/securityValidation";

const router = Router();

// Middleware de segurança para todas as rotas SQL
router.use(securityValidationMiddleware);

/**
 * POST /sql/execute - Executar SQL
 * ⚠️ Apenas para usuários admin
 */
router.post("/execute", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { query, params } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query SQL é obrigatória" });
    }

    // Verificar se o usuário é admin (implementar depois)
    // const user = await usersService.getById(userId);
    // if (!user?.is_admin) {
    //   return res.status(403).json({ error: "Apenas administradores podem executar SQL" });
    // }

    // Verificar se é uma query perigosa
    const dangerousPatterns = [
      /\bDROP\s+TABLE\b/i,
      /\bTRUNCATE\s+TABLE\b/i,
      /\bDELETE\s+FROM\b/i,
      /\bALTER\s+TABLE\b/i,
      /\bDROP\s+DATABASE\b/i,
      /\bDROP\s+SCHEMA\b/i,
    ];

    const isDangerous = dangerousPatterns.some(pattern => pattern.test(query));
    
    if (isDangerous && !req.body.confirm) {
      return res.status(403).json({
        error: "Query perigosa detectada",
        requiresConfirmation: true,
        dangerLevel: OperationDangerLevel.CRITICAL,
      });
    }

    // Executar query
    const result = await db.execute(sql.raw(query, params || []));
    
    return sendSuccess(res, { result });
  } catch (error) {
    return sendError(res, error, "Erro ao executar SQL");
  }
});

/**
 * GET /sql/tables - Listar todas as tabelas
 */
router.get("/tables", async (req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`
      SELECT table_name, table_schema
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
    `);
    
    return sendSuccess(res, { tables: result });
  } catch (error) {
    return sendError(res, error, "Erro ao listar tabelas");
  }
});

/**
 * GET /sql/tables/:tableName - Obter schema de uma tabela
 */
router.get("/tables/:tableName", async (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;
    
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = ${tableName}
      ORDER BY ordinal_position
    `);
    
    return sendSuccess(res, { columns: result });
  } catch (error) {
    return sendError(res, error, "Erro ao obter schema da tabela");
  }
});

/**
 * GET /sql/schema - Obter schema completo do banco
 */
router.get("/schema", async (req: Request, res: Response) => {
  try {
    const tablesResult = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tables = tablesResult.map(t => t.table_name);
    
    const schema: Record<string, unknown> = {};
    
    for (const table of tables) {
      const columns = await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = ${table}
        ORDER BY ordinal_position
      `);
      
      schema[table] = columns;
    }
    
    return sendSuccess(res, { schema });
  } catch (error) {
    return sendError(res, error, "Erro ao obter schema do banco");
  }
});

/**
 * POST /sql/query - Executar query SELECT
 */
router.post("/query", async (req: Request, res: Response) => {
  try {
    const { query, params } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query SQL é obrigatória" });
    }

    // Apenas SELECT é permitido
    const trimmedQuery = query.trim().toUpperCase();
    if (!trimmedQuery.startsWith("SELECT")) {
      return res.status(400).json({ error: "Apenas queries SELECT são permitidas" });
    }

    const result = await db.execute(sql.raw(query, params || []));
    
    return sendSuccess(res, { result });
  } catch (error) {
    return sendError(res, error, "Erro ao executar query");
  }
});

/**
 * GET /sql/health - Verificar saúde do banco
 */
router.get("/health", async (req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`SELECT 1 as health_check`);
    
    return sendSuccess(res, {
      healthy: true,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error) {
    return sendError(res, error, "Erro ao verificar saúde do banco");
  }
});

export default router;
