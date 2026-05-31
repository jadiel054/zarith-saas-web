import { Router, type Request, type Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { boolConfirmed, getBody, providerFetch, required, sendError, supabaseCreds, supabaseHeaders } from "./toolUtils";

const router = Router();

function dangerousSql(sql: string) {
  return /\b(drop\s+table|truncate|delete\s+from)\b/i.test(sql);
}

async function executeSql(req: Request, sql: string, params: any[] = []) {
  const { url, key } = supabaseCreds(req);
  return providerFetch(`${url}/rest/v1/rpc/execute_sql`, {
    method: "POST",
    headers: { ...supabaseHeaders(key), Prefer: "return=representation" },
    body: JSON.stringify({ query: sql, params }),
  }, "Supabase");
}

const LIST_TABLES_SQL = `SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;`;

async function listTables(req: Request) {
  const { url, key } = supabaseCreds(req);
  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.rpc("execute_sql", {
    query: LIST_TABLES_SQL,
  });

  if (error) {
    throw Object.assign(new Error(error.message), { statusCode: Number(error.code) || 500, data: error });
  }

  return data;
}

router.post(["/execute-sql", "/execute"], async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const sql = required(body.sql || body.query, "sql");
    if (dangerousSql(sql) && !boolConfirmed(body)) {
      return res.status(403).json({ success: false, requiresConfirmation: true, error: "Confirmação necessária para SQL destrutivo. Informe confirm: true após revisar impacto em tabelas/dados." });
    }
    return res.json({ success: true, data: await executeSql(req, sql, body.params || []) });
  } catch (error) { return sendError(res, error, "Não foi possível executar SQL no Supabase."); }
});

router.post(["/list-tables", "/tables"], async (req: Request, res: Response) => {
  try {
    return res.json({ success: true, data: await listTables(req) });
  } catch (error) { return sendError(res, error, "Não foi possível listar tabelas."); }
});

router.get("/tables", async (req: Request, res: Response) => {
  req.body = { ...req.query, ...req.body };
  try {
    return res.json({ success: true, data: await listTables(req) });
  } catch (error) { return sendError(res, error, "Não foi possível listar tabelas."); }
});

router.post("/get-schema", async (req: Request, res: Response) => {
  try {
    const schema = String(getBody(req).schema || "public").replace(/'/g, "''");
    const sql = `select c.table_schema, c.table_name, c.column_name, c.data_type, c.is_nullable, c.column_default, c.ordinal_position from information_schema.columns c where c.table_schema = '${schema}' order by c.table_name, c.ordinal_position`;
    return res.json({ success: true, data: await executeSql(req, sql) });
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
    return res.json({ success: true, data: await executeSql(req, `create table if not exists "${tableName}" (${columnsSql});`) });
  } catch (error) { return sendError(res, error, "Não foi possível criar tabela."); }
});

router.post(["/alter-table", "/add-column"], async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const tableName = required(body.tableName || body.table, "tableName");
    const alterSql = body.alterSql || (body.columnName && body.columnType ? `add column if not exists "${body.columnName}" ${body.columnType}` : "");
    return res.json({ success: true, data: await executeSql(req, `alter table "${tableName}" ${required(alterSql, "alterSql")};`) });
  } catch (error) { return sendError(res, error, "Não foi possível alterar tabela."); }
});

router.post("/drop-table", async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const tables = Array.isArray(body.tables) ? body.tables : [body.tableName || body.table].filter(Boolean);
    if (!tables.length) return res.status(400).json({ success: false, error: "Informe tableName ou tables." });
    if (!boolConfirmed(body)) return res.status(403).json({ success: false, requiresConfirmation: true, tables, error: `Confirmação obrigatória: as tabelas ${tables.join(", ")} e seus dados serão apagados permanentemente.` });
    const statements = tables.map((t: string) => `drop table if exists "${String(t).replace(/"/g, "")}" cascade;`).join("\n");
    return res.json({ success: true, data: await executeSql(req, statements) });
  } catch (error) { return sendError(res, error, "Não foi possível apagar tabela."); }
});

router.post("/list-functions", async (req: Request, res: Response) => {
  try {
    const schema = String(getBody(req).schema || "public").replace(/'/g, "''");
    const sql = `select routine_schema, routine_name, routine_type, data_type from information_schema.routines where routine_schema = '${schema}' order by routine_name`;
    return res.json({ success: true, data: await executeSql(req, sql) });
  } catch (error) { return sendError(res, error, "Não foi possível listar funções/procedures."); }
});

router.post("/get-rls", async (req: Request, res: Response) => {
  try {
    const sql = `select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check from pg_policies order by schemaname, tablename, policyname`;
    return res.json({ success: true, data: await executeSql(req, sql) });
  } catch (error) { return sendError(res, error, "Não foi possível obter políticas RLS."); }
});

router.post("/set-rls", async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const tableName = required(body.tableName || body.table, "tableName");
    const policyName = required(body.policyName || body.name, "policyName");
    const command = body.command || "all"; const using = body.using || "true"; const check = body.check ? ` with check (${body.check})` : "";
    const enable = body.enable === false ? "" : `alter table "${tableName}" enable row level security;`;
    const sql = `${enable}\ndrop policy if exists "${policyName}" on "${tableName}";\ncreate policy "${policyName}" on "${tableName}" for ${command} using (${using})${check};`;
    return res.json({ success: true, data: await executeSql(req, sql) });
  } catch (error) { return sendError(res, error, "Não foi possível criar/atualizar política RLS."); }
});

router.post("/list-users", async (req: Request, res: Response) => {
  try {
    const { url, key } = supabaseCreds(req);
    return res.json({ success: true, data: await providerFetch(`${url}/auth/v1/admin/users`, { headers: supabaseHeaders(key) }, "Supabase Auth") });
  } catch (error) { return sendError(res, error, "Não foi possível listar usuários autenticados."); }
});

router.post("/get-logs", async (req: Request, res: Response) => {
  try {
    const sql = `select now() as checked_at, 'Logs completos exigem Logflare/Supabase Management API habilitada no projeto.' as message`;
    return res.json({ success: true, data: await executeSql(req, sql), note: "Endpoint operacional; conecte a fonte de logs do Supabase quando disponível." });
  } catch (error) { return sendError(res, error, "Não foi possível obter logs do banco."); }
});

router.post(["/run-migration", "/migration"], async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const sql = Array.isArray(body.migrations) ? body.migrations.join("\n") : required(body.sql || body.migration, "sql");
    if (dangerousSql(sql) && !boolConfirmed(body)) return res.status(403).json({ success: false, requiresConfirmation: true, error: "Migration contém operação destrutiva. Confirme explicitamente com confirm: true." });
    return res.json({ success: true, data: await executeSql(req, sql, body.params || []) });
  } catch (error) { return sendError(res, error, "Não foi possível executar migration."); }
});

export default router;
