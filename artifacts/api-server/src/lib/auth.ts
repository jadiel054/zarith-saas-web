/**
 * Auth nativo Zarith — senha (scrypt) + JWT (HMAC-SHA256)
 * Sem dependência de Supabase Auth. Usa apenas Node crypto + Neon.
 */
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.SESSION_SECRET ||
  process.env.AUTH_SECRET ||
  "";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 dias

function requireSecret(): string {
  if (!JWT_SECRET || JWT_SECRET.length < 16) {
    throw Object.assign(
      new Error(
        "JWT_SECRET (ou SESSION_SECRET) deve estar definido no ambiente com pelo menos 16 caracteres."
      ),
      { statusCode: 500 }
    );
  }
  return JWT_SECRET;
}

/** Hash de senha: scrypt com salt aleatório. Formato: salt:hash (hex) */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const derived = (await scryptAsync(password, salt, 64)) as Buffer;
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlDecode(str: string): Buffer {
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export type AuthTokenPayload = {
  sub: string;
  email: string;
  name?: string | null;
  iat: number;
  exp: number;
};

export function signToken(payload: {
  userId: string;
  email: string;
  name?: string | null;
}): string {
  const secret = requireSecret();
  const now = Math.floor(Date.now() / 1000);
  const body: AuthTokenPayload = {
    sub: payload.userId,
    email: payload.email,
    name: payload.name ?? null,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadB64 = base64url(JSON.stringify(body));
  const data = `${header}.${payloadB64}`;
  const sig = createHmac("sha256", secret).update(data).digest();
  return `${data}.${base64url(sig)}`;
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    const secret = requireSecret();
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payloadB64, sigB64] = parts;
    const data = `${header}.${payloadB64}`;
    const expected = createHmac("sha256", secret).update(data).digest();
    const actual = base64urlDecode(sigB64);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return null;
    }
    const payload = JSON.parse(
      base64urlDecode(payloadB64).toString("utf8")
    ) as AuthTokenPayload;
    if (!payload.sub || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}
