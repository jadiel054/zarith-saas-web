/**
 * Auth Routes
 * Rotas de autenticação nativa
 */

import { Router, type Request, type Response } from "express";
import { authService } from "../services/auth/authService";
import { sendError, sendSuccess, getBody, required } from "./toolUtils";
import { sessionService } from "../services/auth/sessionService";

const router = Router();

/**
 * POST /api/auth/register - Registrar novo usuário
 */
router.post("/register", async (req: Request, res: Response) => {
  try {
    const body = getBody(req);
    const email = required(body.email, "email");
    const password = required(body.password, "password");
    const name = body.name;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];
    
    const result = await authService.register(
      { email, password, name },
      ipAddress,
      userAgent
    );
    
    // Configurar cookie de sessão
    res.cookie("zarith_session", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      path: "/",
    });
    
    sendSuccess(res, {
      user: result.user,
      session: result.session,
    }, 201);
  } catch (error) {
    sendError(res, error, "Falha ao registrar usuário");
  }
});

/**
 * POST /api/auth/login - Login do usuário
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const body = getBody(req);
    const email = required(body.email, "email");
    const password = required(body.password, "password");
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];
    
    const result = await authService.login(
      { email, password },
      ipAddress,
      userAgent
    );
    
    // Configurar cookie de sessão
    res.cookie("zarith_session", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      path: "/",
    });
    
    sendSuccess(res, {
      user: result.user,
      session: result.session,
    });
  } catch (error) {
    sendError(res, error, "Falha ao fazer login");
  }
});

/**
 * POST /api/auth/logout - Logout do usuário
 */
router.post("/logout", async (req: Request, res: Response) => {
  try {
    const sessionToken = req.cookies.zarith_session;
    
    if (sessionToken) {
      await authService.logout(sessionToken);
      
      // Remover cookie
      res.clearCookie("zarith_session", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }
    
    sendSuccess(res, { message: "Logout realizado com sucesso" });
  } catch (error) {
    sendError(res, error, "Falha ao fazer logout");
  }
});

/**
 * GET /api/auth/me - Obter usuário atual
 */
router.get("/me", async (req: Request, res: Response) => {
  try {
    const sessionToken = req.cookies.zarith_session;
    
    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        error: "Não autorizado",
      });
    }
    
    const user = await authService.getCurrentUser(sessionToken);
    
    if (!user) {
      // Remover cookie de sessão inválida
      res.clearCookie("zarith_session", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
      
      return res.status(401).json({
        success: false,
        error: "Sessão inválida ou expirada",
      });
    }
    
    sendSuccess(res, { user });
  } catch (error) {
    sendError(res, error, "Falha ao obter usuário");
  }
});

/**
 * POST /api/auth/refresh - Refresh da sessão
 */
router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const sessionToken = req.cookies.zarith_session;
    
    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        error: "Não autorizado",
      });
    }
    
    const session = await sessionService.getByToken(sessionToken);
    if (!session) {
      res.clearCookie("zarith_session", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
      
      return res.status(401).json({
        success: false,
        error: "Sessão inválida ou expirada",
      });
    }
    
    // Atualizar expiração da sessão
    const refreshedSession = await sessionService.refresh(session.id);
    
    if (!refreshedSession) {
      return res.status(401).json({
        success: false,
        error: "Falha ao renovar sessão",
      });
    }
    
    // Configurar novo cookie
    res.cookie("zarith_session", refreshedSession.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      path: "/",
    });
    
    sendSuccess(res, {
      message: "Sessão renovada com sucesso",
      session: {
        ...refreshedSession,
        user_id: undefined,
      },
    });
  } catch (error) {
    sendError(res, error, "Falha ao renovar sessão");
  }
});

/**
 * POST /api/auth/verify-email - Verificar email
 */
router.post("/verify-email", async (req: Request, res: Response) => {
  try {
    const body = getBody(req);
    const token = required(body.token, "token");
    
    const result = await authService.verifyEmail(token);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message,
      });
    }
    
    sendSuccess(res, { message: result.message });
  } catch (error) {
    sendError(res, error, "Falha ao verificar email");
  }
});

/**
 * POST /api/auth/forgot-password - Solicitar recuperação de senha
 */
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const body = getBody(req);
    const email = required(body.email, "email");
    const ipAddress = req.ip || req.socket.remoteAddress;
    
    const result = await authService.forgotPassword(email, ipAddress);
    
    // Sempre retornar sucesso para não revelar se o email existe
    sendSuccess(res, { message: result.message });
  } catch (error) {
    sendError(res, error, "Falha ao solicitar recuperação de senha");
  }
});

/**
 * POST /api/auth/reset-password - Resetar senha
 */
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const body = getBody(req);
    const token = required(body.token, "token");
    const newPassword = required(body.newPassword, "newPassword");
    
    const result = await authService.resetPassword(token, newPassword);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message,
      });
    }
    
    sendSuccess(res, { message: result.message });
  } catch (error) {
    sendError(res, error, "Falha ao resetar senha");
  }
});

/**
 * POST /api/auth/update-password - Atualizar senha (autenticado)
 */
router.post("/update-password", async (req: Request, res: Response) => {
  try {
    const body = getBody(req);
    const sessionToken = req.cookies.zarith_session;
    
    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        error: "Não autorizado",
      });
    }
    
    const user = await authService.getCurrentUser(sessionToken);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Sessão inválida ou expirada",
      });
    }
    
    const currentPassword = required(body.currentPassword, "currentPassword");
    const newPassword = required(body.newPassword, "newPassword");
    
    const result = await authService.updatePassword(
      user.id,
      currentPassword,
      newPassword
    );
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message,
      });
    }
    
    // Invalidar sessão atual (usuário precisa fazer login novamente)
    await authService.logout(sessionToken);
    res.clearCookie("zarith_session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    
    sendSuccess(res, { message: result.message });
  } catch (error) {
    sendError(res, error, "Falha ao atualizar senha");
  }
});

/**
 * POST /api/auth/update-profile - Atualizar perfil
 */
router.post("/update-profile", async (req: Request, res: Response) => {
  try {
    const body = getBody(req);
    const sessionToken = req.cookies.zarith_session;
    
    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        error: "Não autorizado",
      });
    }
    
    const user = await authService.getCurrentUser(sessionToken);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Sessão inválida ou expirada",
      });
    }
    
    const name = body.name;
    const avatar_url = body.avatar_url;
    
    const updatedUser = await authService.updateProfile(user.id, { name, avatar_url });
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: "Usuário não encontrado",
      });
    }
    
    sendSuccess(res, { user: updatedUser });
  } catch (error) {
    sendError(res, error, "Falha ao atualizar perfil");
  }
});

/**
 * POST /api/auth/resend-verification - Reenviar email de verificação
 */
router.post("/resend-verification", async (req: Request, res: Response) => {
  try {
    const body = getBody(req);
    const email = required(body.email, "email");
    
    const result = await authService.resendVerificationEmail(email);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.message,
      });
    }
    
    sendSuccess(res, { message: result.message });
  } catch (error) {
    sendError(res, error, "Falha ao reenviar email de verificação");
  }
});

/**
 * GET /api/auth/check-email - Verificar se email está disponível
 */
router.get("/check-email", async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email é obrigatório",
      });
    }
    
    const isAvailable = await authService.isEmailAvailable(email);
    
    sendSuccess(res, { available: isAvailable });
  } catch (error) {
    sendError(res, error, "Falha ao verificar email");
  }
});

export default router;
