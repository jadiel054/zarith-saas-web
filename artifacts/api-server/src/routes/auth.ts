/**
 * Auth routes — login/cadastro nativo com Neon (sem Supabase Auth)
 */
import { Router, type Request, type Response } from "express";
import { usersService } from "../services/database";
import {
  extractBearerToken,
  hashPassword,
  signToken,
  verifyPassword,
  verifyToken,
} from "../lib/auth";
import { sendError, sendSuccess } from "./toolUtils";

const router = Router();

function publicUser(user: {
  id: string;
  email: string;
  name?: string | null;
  avatar_url?: string | null;
  email_verified?: boolean | null;
  is_active?: boolean | null;
  is_admin?: boolean | null;
  created_at?: string | Date | null;
  last_login_at?: string | Date | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    avatar_url: user.avatar_url ?? null,
    email_verified: user.email_verified ?? false,
    is_active: user.is_active ?? true,
    is_admin: user.is_admin ?? false,
    created_at: user.created_at ?? null,
    last_login_at: user.last_login_at ?? null,
  };
}

/**
 * POST /auth/register
 * Body: { email, password, name? }
 */
router.post("/register", async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    const name = req.body?.name ? String(req.body.name).trim() : null;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email e senha são obrigatórios" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: "Email inválido" });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: "A senha deve ter pelo menos 6 caracteres" });
    }

    const exists = await usersService.emailExists(email);
    if (exists) {
      return res.status(409).json({
        success: false,
        error: "Este email já possui uma conta. Tente fazer login.",
      });
    }

    const password_hash = await hashPassword(password);
    const user = await usersService.create({
      email,
      name,
      password_hash,
      email_verified: true,
      is_active: true,
    });

    if (!user) {
      return res.status(500).json({ success: false, error: "Falha ao criar usuário" });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    await usersService.updateLastLogin(user.id);

    return sendSuccess(
      res,
      {
        user: publicUser(user),
        token,
      },
      201
    );
  } catch (error) {
    return sendError(res, error, "Erro ao criar conta");
  }
});

/**
 * POST /auth/login
 * Body: { email, password }
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email e senha são obrigatórios" });
    }

    const user = await usersService.getByEmail(email);
    if (!user || !user.password_hash) {
      return res.status(401).json({
        success: false,
        error: "Email ou senha incorretos. Verifique os dados e tente novamente.",
      });
    }

    if (user.is_active === false) {
      return res.status(403).json({ success: false, error: "Conta desativada." });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({
        success: false,
        error: "Email ou senha incorretos. Verifique os dados e tente novamente.",
      });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    await usersService.updateLastLogin(user.id);

    return sendSuccess(res, {
      user: publicUser(user),
      token,
    });
  } catch (error) {
    return sendError(res, error, "Erro ao fazer login");
  }
});

/**
 * GET /auth/me
 * Header: Authorization: Bearer <token>
 */
router.get("/me", async (req: Request, res: Response) => {
  try {
    const raw = extractBearerToken(req.headers.authorization);
    if (!raw) {
      return res.status(401).json({ success: false, error: "Não autorizado" });
    }
    const payload = verifyToken(raw);
    if (!payload) {
      return res.status(401).json({ success: false, error: "Sessão inválida ou expirada" });
    }

    const user = await usersService.getById(payload.sub);
    if (!user) {
      return res.status(401).json({ success: false, error: "Usuário não encontrado" });
    }

    return sendSuccess(res, publicUser(user));
  } catch (error) {
    return sendError(res, error, "Erro ao obter sessão");
  }
});

/**
 * POST /auth/logout
 * Stateless JWT — cliente só descarta o token.
 */
router.post("/logout", (_req: Request, res: Response) => {
  return sendSuccess(res, { ok: true });
});

export default router;
