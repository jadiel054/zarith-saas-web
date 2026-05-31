import { Router, type Request, type Response } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { boolConfirmed, getBody, required, sendError } from "./toolUtils";

const router = Router();

function dangerousSql(sql: string) {
  return /\b(drop\s+table|truncate|delete\s+from)\b/i.test(sql);
}

function requiredEnv(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY") {
  const value = (process.env[name] || "").trim();
  if (!value) {
    throw Object.assign(new Error(`${name} não configurada no servidor.`), { statusCode: 401 });
  }
  return value;
}

function getSupabaseUrl() {
  return requiredEnv("SUPABASE_URL").replace(/\/$/, "");
}

function getSupabaseServiceRoleKey() {
  return requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function getSupabaseClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function executeSql(sql: string, params: any[] = []) {
  const rpcArgs: Record<string, unknown> = { query: sql };

  if (Array.isArray(params) && params.length > 0) {
    rpcArgs.params = params;
  }

  const { data, error } = await getSupabaseClient().rpc("execute_sql", rpcArgs);

  if (error) {
    throw Object.assign(new Error(error.message), {
      statusCode: 500,
      data: error,
    });
  }

  return data;
}

async function listTables() {
  const { data, error } = await getSupabaseClient()
    .from("information_schema.tables")
    .select("table_name, table_schema")
    .neq("table_schema", "pg_catalog")
    .neq("table_schema", "information_schema")
    .order("table_schema", { ascending: true })
    .order("table_name", { ascending: true });

  if (error) {
    throw Object.assign(new Error(error.message), {
      statusCode: Number(error.code) || 500,
      data: error,
    });
  }

  return data;
}

async function listUsers(req: Request) {
  const body = getBody(req);
  const page = Number(body.page || 1);
  const perPage = Number(body.perPage || body.per_page || 100);
  const { data, error } = await getSupabaseClient().auth.admin.listUsers({
    page: Number.isFinite(page) && page > 0 ? page : 1,
    perPage: Number.isFinite(perPage) && perPage > 0 ? perPage : 100,
  });

  if (error) {
    throw Object.assign(new Error(error.message), {
      statusCode: error.status || 500,
      data: error,
    });
  }

  return data;
}

router.post(["/execute-sql", "/execute"], async (req: Request, res: Response) => {
  try {
    const body = getBody(req);
    const sql = required(body.sql || body.query, "sql");
    if (dangerousSql(sql) && !boolConfirmed(body)) {
      return res.status(403).json({ success: false, requiresConfirmation: true, error: "Confirmação necessária para SQL destrutivo. Informe confirm: true após revisar impacto em tabelas/dados." });
    }
    return res.json({ success: true, data: await executeSql(sql, body.params || []) });
  } catch (error) { return sendError(res, error, "Não foi possível executar SQL no Supabase."); }
});

router.post(["/list-tables", "/tables"], async (_req: Request, res: Response) => {
  try {
    return res.json({ success: true, data: await listTables() });
  } catch (error) { return sendError(res, error, "Não foi possível listar tabelas."); }
});

router.get("/tables", async (_req: Request, res: Response) => {
  try {
    return res.json({ success: true, data: await listTables() });
  } catch (error) { return sendError(res, error, "Não foi possível listar tabelas."); }
});

router.post("/get-schema", async (req: Request, res: Response) => {
  try {
    const schema = String(getBody(req).schema || "public").replace(/'/g, "''");
    const sql = `select c.table_schema, c.table_name, c.column_name, c.data_type, c.is_nullable, c.column_default, c.ordinal_position from information_schema.columns c where c.table_schema = '${schema}' order by c.table_name, c.ordinal_position`;
    return res.json({ success: true, data: await executeSql(sql) });
  } catch (error) { return sendError(res, error, "Não foi possível obter schema do banco."); }
});

router.post("/create-table", async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const tableName = required(body.tableName || body.table, "tableName");
    let columnsSql = body.columnsSql;
    if (!columnsSql && body.schema && typeof body.schema === "object") {
      columnsSql = Object.entries(body.schema).map(([name, type]) => `"${name}" ${type}`).join(", ");
    }
    columnsSql = required(columnsSql || "id uuid primary key default gen_random_uuid(), created_at timestamptz default now()", "columnsSql");
    return res.json({ success: true, data: await executeSql(`create table if not exists "${tableName}" (${columnsSql});`) });
  } catch (error) { return sendError(res, error, "Não foi possível criar tabela."); }
});

router.post(["/alter-table", "/add-column"], async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const tableName = required(body.tableName || body.table, "tableName");
    const alterSql = body.alterSql || (body.columnName && body.columnType ? `add column if not exists "${body.columnName}" ${body.columnType}` : "");
    return res.json({ success: true, data: await executeSql(`alter table "${tableName}" ${required(alterSql, "alterSql")};`) });
  } catch (error) { return sendError(res, error, "Não foi possível alterar tabela."); }
});

router.post("/drop-table", async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const tables = Array.isArray(body.tables) ? body.tables : [body.tableName || body.table].filter(Boolean);
    if (!tables.length) return res.status(400).json({ success: false, error: "Informe tableName ou tables." });
    if (!boolConfirmed(body)) return res.status(403).json({ success: false, requiresConfirmation: true, tables, error: `Confirmação obrigatória: as tabelas ${tables.join(", ")} e seus dados serão apagados permanentemente.` });
    const statements = tables.map((t: string) => `drop table if exists "${String(t).replace(/"/g, "")}" cascade;`).join("\n");
    return res.json({ success: true, data: await executeSql(statements) });
  } catch (error) { return sendError(res, error, "Não foi possível apagar tabela."); }
});

router.post("/list-functions", async (req: Request, res: Response) => {
  try {
    const schema = String(getBody(req).schema || "public").replace(/'/g, "''");
    const sql = `select routine_schema, routine_name, routine_type, data_type from information_schema.routines where routine_schema = '${schema}' order by routine_name`;
    return res.json({ success: true, data: await executeSql(sql) });
  } catch (error) { return sendError(res, error, "Não foi possível listar funções/procedures."); }
});

router.post("/get-rls", async (_req: Request, res: Response) => {
  try {
    const sql = `select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check from pg_policies order by schemaname, tablename, policyname`;
    return res.json({ success: true, data: await executeSql(sql) });
  } catch (error) { return sendError(res, error, "Não foi possível obter políticas RLS."); }
});

router.post("/set-rls", async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const tableName = required(body.tableName || body.table, "tableName");
    const policyName = required(body.policyName || body.name, "policyName");
    const command = body.command || "all"; const using = body.using || "true"; const check = body.check ? ` with check (${body.check})` : "";
    const enable = body.enable === false ? "" : `alter table "${tableName}" enable row level security;`;
    const sql = `${enable}\ndrop policy if exists "${policyName}" on "${tableName}";\ncreate policy "${policyName}" on "${tableName}" for ${command} using (${using})${check};`;
    return res.json({ success: true, data: await executeSql(sql) });
  } catch (error) { return sendError(res, error, "Não foi possível criar/atualizar política RLS."); }
});

router.post("/list-users", async (req: Request, res: Response) => {
  try {
    return res.json({ success: true, data: await listUsers(req) });
  } catch (error) { return sendError(res, error, "Não foi possível listar usuários autenticados."); }
});

router.post("/get-logs", async (_req: Request, res: Response) => {
  try {
    const sql = `select now() as checked_at, 'Logs completos exigem Logflare/Supabase Management API habilitada no projeto.' as message`;
    return res.json({ success: true, data: await executeSql(sql), note: "Endpoint operacional; conecte a fonte de logs do Supabase quando disponível." });
  } catch (error) { return sendError(res, error, "Não foi possível obter logs do banco."); }
});

router.post(["/run-migration", "/migration"], async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const sql = Array.isArray(body.migrations) ? body.migrations.join("\n") : required(body.sql || body.migration, "sql");
    if (dangerousSql(sql) && !boolConfirmed(body)) return res.status(403).json({ success: false, requiresConfirmation: true, error: "Migration contém operação destrutiva. Confirme explicitamente com confirm: true." });
    return res.json({ success: true, data: await executeSql(sql, body.params || []) });
  } catch (error) { return sendError(res, error, "Não foi possível executar migration."); }
});

export default router;
