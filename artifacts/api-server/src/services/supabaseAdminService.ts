/**
 * Zarith Supabase Admin Service (Backend)
 * Gerencia execução de comandos SQL (DDL) com tratamento de erros e logging
 */

import { createClient } from "@supabase/supabase-js";
import { logger } from "../lib/logger";
import { auditLog } from "../lib/auditLog";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export interface SQLExecutionPayload {
  sql: string;
  params?: any[];
}

export interface SQLExecutionResponse {
  success: boolean;
  data?: any;
  error?: string;
  rowsAffected?: number;
}

let supabaseClient: ReturnType<typeof createClient> | null = null;

/**
 * Inicializar cliente Supabase com Service Role (admin)
 */
function getSupabaseClient() {
  if (!supabaseClient) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "Configurações do Supabase não encontradas. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY"
      );
    }

    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseClient;
}

export const supabaseAdminService = {
  /**
   * Executar comando SQL (DDL/DML) com Service Role
   */
  async executeSQL(payload: SQLExecutionPayload): Promise<SQLExecutionResponse> {
    try {
      const { sql, params } = payload;

      if (!sql || sql.trim().length === 0) {
        throw new Error("SQL query não pode estar vazio");
      }

      logger.info({ sql: sql.substring(0, 100) }, "Executando SQL no Supabase");
      auditLog("supabase:sql:execute:start", { sqlLength: sql.length });

      const client = getSupabaseClient();

      // Usar rpc ou query direto dependendo do tipo de operação
      const { data, error, status } = await client.rpc("execute_sql", {
        query: sql,
        params: params || [],
      });

      if (error) {
        throw new Error(error.message);
      }

      const result: SQLExecutionResponse = {
        success: true,
        data,
        rowsAffected: data?.rowCount || 0,
      };

      logger.info({ result }, "SQL executado com sucesso");
      auditLog("supabase:sql:execute:success", { 
        sqlLength: sql.length,
        rowsAffected: data?.rowCount || 0
      });

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      logger.error({ error: errorMsg, payload }, "Erro ao executar SQL");
      auditLog("supabase:sql:execute:error", { 
        error: errorMsg,
        sqlLength: payload.sql.length
      });

      return {
        success: false,
        error: `Falha ao executar SQL: ${errorMsg}`,
      };
    }
  },

  /**
   * Criar tabela com validação
   */
  async createTable(tableName: string, schema: Record<string, string>): Promise<SQLExecutionResponse> {
    try {
      if (!tableName || tableName.trim().length === 0) {
        throw new Error("Nome da tabela não pode estar vazio");
      }

      if (Object.keys(schema).length === 0) {
        throw new Error("Schema não pode estar vazio");
      }

      // Construir SQL CREATE TABLE
      const columns = Object.entries(schema)
        .map(([name, type]) => `${name} ${type}`)
        .join(", ");

      const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns});`;

      logger.info({ tableName, schema }, "Criando tabela no Supabase");
      auditLog("supabase:table:create:start", { tableName });

      return await this.executeSQL({ sql });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      logger.error({ error: errorMsg, tableName }, "Erro ao criar tabela");
      auditLog("supabase:table:create:error", { tableName, error: errorMsg });

      return {
        success: false,
        error: `Falha ao criar tabela: ${errorMsg}`,
      };
    }
  },

  /**
   * Adicionar coluna a uma tabela
   */
  async addColumn(
    tableName: string,
    columnName: string,
    columnType: string
  ): Promise<SQLExecutionResponse> {
    try {
      const sql = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${columnType};`;

      logger.info({ tableName, columnName, columnType }, "Adicionando coluna");
      auditLog("supabase:column:add:start", { tableName, columnName });

      return await this.executeSQL({ sql });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      logger.error({ error: errorMsg, tableName, columnName }, "Erro ao adicionar coluna");
      auditLog("supabase:column:add:error", { tableName, columnName, error: errorMsg });

      return {
        success: false,
        error: `Falha ao adicionar coluna: ${errorMsg}`,
      };
    }
  },

  /**
   * Deletar tabela (operação perigosa - requer confirmação)
   */
  async dropTable(tableName: string): Promise<SQLExecutionResponse> {
    try {
      const sql = `DROP TABLE IF EXISTS ${tableName} CASCADE;`;

      logger.warn({ tableName }, "Deletando tabela - operação perigosa");
      auditLog("supabase:table:drop:start", { tableName, warning: "dangerous_operation" });

      return await this.executeSQL({ sql });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      logger.error({ error: errorMsg, tableName }, "Erro ao deletar tabela");
      auditLog("supabase:table:drop:error", { tableName, error: errorMsg });

      return {
        success: false,
        error: `Falha ao deletar tabela: ${errorMsg}`,
      };
    }
  },

  /**
   * Executar migração (múltiplos comandos SQL)
   */
  async executeMigration(migrations: string[]): Promise<SQLExecutionResponse> {
    try {
      logger.info({ count: migrations.length }, "Executando migração com múltiplos comandos");
      auditLog("supabase:migration:start", { commandCount: migrations.length });

      const results: SQLExecutionResponse[] = [];

      for (const migration of migrations) {
        const result = await this.executeSQL({ sql: migration });
        results.push(result);

        if (!result.success) {
          logger.error({ migration, result }, "Falha em comando da migração");
          auditLog("supabase:migration:command:error", { error: result.error });
          return result; // Para na primeira falha
        }
      }

      logger.info({ count: results.length }, "Migração concluída com sucesso");
      auditLog("supabase:migration:success", { commandCount: migrations.length });

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      logger.error({ error: errorMsg }, "Erro ao executar migração");
      auditLog("supabase:migration:error", { error: errorMsg });

      return {
        success: false,
        error: `Falha ao executar migração: ${errorMsg}`,
      };
    }
  },

  /**
   * Listar todas as tabelas do banco
   */
  async listTables(): Promise<SQLExecutionResponse> {
    try {
      const sql = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `;

      logger.info({}, "Listando tabelas do banco");
      auditLog("supabase:tables:list", {});

      return await this.executeSQL({ sql });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      logger.error({ error: errorMsg }, "Erro ao listar tabelas");
      auditLog("supabase:tables:list:error", { error: errorMsg });

      return {
        success: false,
        error: `Falha ao listar tabelas: ${errorMsg}`,
      };
    }
  },
};
