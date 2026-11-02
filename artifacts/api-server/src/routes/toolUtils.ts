import type { Request, Response } from "express";
import path from "node:path";
import { extractBearerToken, verifyToken } from "../lib/auth";

export type JsonRecord = Record<string, any>;

export function sendSuccess<T>(res: Response, data: T, statusCode: number = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

export function getUserIdFromRequest(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  const bearer = extractBearerToken(
    typeof authHeader === "string" ? authHeader : undefined
  );

  if (bearer) {
    // 1) JWT nativo Zarith (assinado com JWT_SECRET)
    const zarith = verifyToken(bearer);
    if (zarith?.sub) return zarith.sub;

    // 2) Fallback: JWT do Supabase (legado) — só lê o payload, sem verificar assinatura
    try {
      const base64Payload = bearer.split(".")[1];
      if (base64Payload) {
        const payload = JSON.parse(
          Buffer.from(base64Payload, "base64").toString("utf8")
        );
        const id = payload.sub || payload.user_id || payload.id;
        if (typeof id === "string" && id) return id;
      }
    } catch {
      // ignore
    }
  }

  if (req.body && typeof req.body === "object") {
    const id = req.body.userId || req.body.user_id;
    if (typeof id === "string" && id) return id;
  }

  if (req.query && typeof req.query === "object") {
    const id = req.query.userId || req.query.user_id;
    if (typeof id === "string" && id) return id;
  }

  return undefined;
}

export function getBody(req: Request): JsonRecord {
  return req.body && typeof req.body === "object" ? req.body : {};
}

export function tokenFrom(req: Request, envName: string, bodyKeys: string[] = ["token"]): string {
  const body = getBody(req);
  for (const key of bodyKeys) {
    if (typeof body[key] === "string" && body[key].trim()) return body[key].trim();
  }
  const envValue = process.env[envName];
  return typeof envValue === "string" ? envValue.trim() : "";
}

export function required(value: any, name: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw Object.assign(new Error(`Campo obrigatório ausente: ${name}.`), { statusCode: 400 });
  }
  return value.trim();
}

export function boolConfirmed(body: JsonRecord): boolean {
  return (
    body.confirm === true ||
    body.confirmation === true ||
    body.confirm === "CONFIRMAR" ||
    body.confirmation === "CONFIRMAR"
  );
}

export function sendError(res: Response, error: any, fallback = "Erro interno no api-server.") {
  const status = Number(error?.statusCode || error?.status || error?.response?.status || 500);
  const providerMessage =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback;
  return res.status(status).json({
    success: false,
    error: providerMessage,
    message: `Falha na execução: ${providerMessage}`,
    status,
  });
}

export async function providerFetch(
  url: string,
  init: RequestInit = {},
  providerName = "serviço externo"
) {
  const response = await fetch(url, init);
  const text = await response.text();
  let data: any = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* mantém texto */
  }
  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      data?.error_description ||
      text ||
      `${providerName} retornou HTTP ${response.status}`;
    throw Object.assign(new Error(message), { statusCode: response.status, data });
  }
  return data;
}

export function githubHeaders(token: string) {
  if (!token)
    throw Object.assign(
      new Error(
        'GITHUB_TOKEN não configurado. Envie { token: "ghp_..." } ou configure a variável de ambiente.'
      ),
      { statusCode: 401 }
    );
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

export function vercelHeaders(token: string) {
  if (!token)
    throw Object.assign(
      new Error(
        'VERCEL_TOKEN não configurado. Envie { token: "..." } ou configure a variável de ambiente.'
      ),
      { statusCode: 401 }
    );
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export function supabaseCreds(req: Request) {
  const body = getBody(req);
  const url = (
    body.url ||
    body.supabaseUrl ||
    body.SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ""
  ).trim();
  const key = (
    body.key ||
    body.serviceRoleKey ||
    body.service_role_key ||
    body.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();
  if (!url)
    throw Object.assign(
      new Error(
        'SUPABASE_URL não configurada. Envie { url: "https://xxxx.supabase.co" } ou configure a variável de ambiente.'
      ),
      { statusCode: 401 }
    );
  if (!key)
    throw Object.assign(
      new Error(
        'SUPABASE_SERVICE_ROLE_KEY não configurada. Envie { serviceRoleKey: "eyJ..." } ou configure a variável de ambiente.'
      ),
      { statusCode: 401 }
    );
  return { url: url.replace(/\/$/, ""), key };
}

export function supabaseHeaders(key: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export function encodeBase64(content: string) {
  return Buffer.from(content, "utf8").toString("base64");
}

export function decodeBase64(content: string) {
  return Buffer.from(content.replace(/\n/g, ""), "base64").toString("utf8");
}

export function safeWorkspacePath(inputPath = ".") {
  const workspaceRoot = path.resolve(process.env.ZARITH_WORKSPACE_DIR || process.cwd());
  const requested = path.resolve(workspaceRoot, inputPath);
  if (!requested.startsWith(workspaceRoot)) {
    throw Object.assign(
      new Error("Caminho inválido: tentativa de acessar fora do workspace da Zarith."),
      { statusCode: 400 }
    );
  }
  return { workspaceRoot, requested };
}

export function normalizeOwnerRepo(body: JsonRecord) {
  const owner = required(
    body.owner || body.user || body.username || process.env.GITHUB_OWNER || "jadiel054",
    "owner"
  );
  const repo = body.repo ? required(body.repo, "repo") : "";
  return { owner, repo };
}
