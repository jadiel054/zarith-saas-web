import { Router, Request, Response } from "express";
import { supabaseAdminService, SQLExecutionPayload } from "../services/supabaseAdminService";
import { logger } from "../lib/logger";
import { auditLog } from "../lib/auditLog";

const router = Router();

/**
 * POST /api/supabase/execute
 * Executar comando SQL (DDL/DML)
 */
router.post("/execute", async (req: Request, res: Response): Promise<any> => {
  try {
    const payload: SQLExecutionPayload = req.body;

    if (!payload.sql || payload.sql.trim().length === 0) {
      auditLog("supabase:execute:validation_error", { reason: "SQL vazio" });
      return res.status(400).json({ error: "SQL query é obrigatório" });
    }

    // Validação de segurança: alertar sobre operações perigosas
    const sqlUpper = payload.sql.toUpperCase();
    const isDangerous = sqlUpper.includes("DROP TABLE") || 
                       sqlUpper.includes("DELETE FROM") || 
                       sqlUpper.includes("TRUNCATE");

    if (isDangerous) {
      auditLog("supabase:execute:dangerous_operation_warning", { 
        sql: payload.sql.substring(0, 100),
        isDangerous: true
      });
      logger.warn({ sql: payload.sql.substring(0, 100) }, "Operação perigosa detectada");
    }

    const result = await supabaseAdminService.executeSQL(payload);
    
    auditLog("supabase:execute:api_success", { 
      sqlLength: payload.sql.length,
      success: result.success,
      isDangerous
    });

    return res.json(result);
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    auditLog("supabase:execute:api_error", { error: errorMsg });

    logger.error({ error }, "Erro ao executar SQL via API");
    return res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

/**
 * POST /api/supabase/create-table
 * Criar tabela com validação
 */
router.post("/create-table", async (req: Request, res: Response): Promise<any> => {
  try {
    const { tableName, schema } = req.body;

    if (!tableName || !schema || Object.keys(schema).length === 0) {
      return res.status(400).json({ 
        error: "Campos obrigatórios faltando: tableName, schema" 
      });
    }

    const result = await supabaseAdminService.createTable(tableName, schema);
    
    auditLog("supabase:create_table:api_success", { 
      tableName,
      columnCount: Object.keys(schema).length
    });

    return res.json(result);
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    auditLog("supabase:create_table:api_error", { 
      error: errorMsg,
      tableName: req.body.tableName
    });

    logger.error({ error }, "Erro ao criar tabela via API");
    return res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

/**
 * POST /api/supabase/add-column
 * Adicionar coluna a uma tabela
 */
router.post("/add-column", async (req: Request, res: Response): Promise<any> => {
  try {
    const { tableName, columnName, columnType } = req.body;

    if (!tableName || !columnName || !columnType) {
      return res.status(400).json({ 
        error: "Campos obrigatórios faltando: tableName, columnName, columnType" 
      });
    }

    const result = await supabaseAdminService.addColumn(tableName, columnName, columnType);
    
    auditLog("supabase:add_column:api_success", { tableName, columnName });

    return res.json(result);
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    auditLog("supabase:add_column:api_error", { 
      error: errorMsg,
      tableName: req.body.tableName,
      columnName: req.body.columnName
    });

    logger.error({ error }, "Erro ao adicionar coluna via API");
    return res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

/**
 * POST /api/supabase/drop-table (PERIGOSO - requer confirmação)
 * Deletar tabela
 */
router.post("/drop-table", async (req: Request, res: Response): Promise<any> => {
  try {
    const { tableName, confirm } = req.body;

    if (!tableName) {
      return res.status(400).json({ error: "tableName é obrigatório" });
    }

    if (!confirm) {
      auditLog("supabase:drop_table:confirmation_required", { tableName });
      return res.status(403).json({ 
        error: "Confirmação necessária para deletar tabela",
        requiresConfirmation: true
      });
    }

    const result = await supabaseAdminService.dropTable(tableName);
    
    auditLog("supabase:drop_table:api_success", { 
      tableName,
      warning: "dangerous_operation_executed"
    });

    return res.json(result);
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    auditLog("supabase:drop_table:api_error", { 
      error: errorMsg,
      tableName: req.body.tableName
    });

    logger.error({ error }, "Erro ao deletar tabela via API");
    return res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

/**
 * POST /api/supabase/migration
 * Executar migração com múltiplos comandos
 */
router.post("/migration", async (req: Request, res: Response): Promise<any> => {
  try {
    const { migrations } = req.body;

    if (!Array.isArray(migrations) || migrations.length === 0) {
      return res.status(400).json({ 
        error: "migrations deve ser um array não vazio" 
      });
    }

    const result = await supabaseAdminService.executeMigration(migrations);
    
    auditLog("supabase:migration:api_success", { 
      commandCount: migrations.length,
      success: result.success
    });

    return res.json(result);
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    auditLog("supabase:migration:api_error", { 
      error: errorMsg,
      commandCount: req.body.migrations?.length
    });

    logger.error({ error }, "Erro ao executar migração via API");
    return res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

/**
 * GET /api/supabase/tables
 * Listar todas as tabelas do banco
 */
router.get("/tables", async (req: Request, res: Response): Promise<any> => {
  try {
    const result = await supabaseAdminService.listTables();
    
    auditLog("supabase:list_tables:api_success", { 
      tableCount: result.data?.length || 0
    });

    return res.json(result);
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    auditLog("supabase:list_tables:api_error", { error: errorMsg });

    logger.error({ error }, "Erro ao listar tabelas via API");
    return res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

export default router;
