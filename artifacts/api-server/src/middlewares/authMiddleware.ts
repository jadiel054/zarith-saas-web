/**
 * Authentication Middleware
 * Middleware para validar sessões de autenticação
 */

import type { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth/authService";
import { sessionService } from "../services/auth/sessionService";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
    is_admin: boolean;
    email_verified: boolean;
  };
  session?: {
    id: string;
    token: string;
    expires_at: string;
  };
}

/**
 * Middleware para validar sessão de autenticação
 * Adiciona user e session ao request se válido
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const sessionToken = req.cookies.zarith_session;
  
  if (!sessionToken) {
    return res.status(401).json({
      success: false,
      error: "Não autorizado - Token de sessão ausente",
    });
  }
  
  // Validar sessão e obter usuário
  Promise.resolve()
    .then(async () => {
      const user = await authService.getCurrentUser(sessionToken);
      const session = await sessionService.getByToken(sessionToken);
      
      if (!user || !session) {
        // Remover cookie de sessão inválida
        res.clearCookie("zarith_session", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        });
        
        return res.status(401).json({
          success: false,
          error: "Não autorizado - Sessão inválida ou expirada",
        });
      }
      
      // Adicionar ao request
      (req as AuthenticatedRequest).user = {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        is_admin: user.is_admin || false,
        email_verified: user.email_verified || false,
      };
      
      (req as AuthenticatedRequest).session = {
        id: session.id,
        token: session.token,
        expires_at: session.expires_at,
      };
      
      next();
    })
    .catch((error) => {
      console.error("Erro no middleware de autenticação:", error);
      res.status(500).json({
        success: false,
        error: "Erro interno ao validar autenticação",
      });
    });
}

/**
 * Middleware para validar admin
 * Requer autenticação e permissão de admin
 */
export function authenticateAdmin(req: Request, res: Response, next: NextFunction) {
  const sessionToken = req.cookies.zarith_session;
  
  if (!sessionToken) {
    return res.status(401).json({
      success: false,
      error: "Não autorizado - Token de sessão ausente",
    });
  }
  
  Promise.resolve()
    .then(async () => {
      const user = await authService.getCurrentUser(sessionToken);
      const session = await sessionService.getByToken(sessionToken);
      
      if (!user || !session) {
        res.clearCookie("zarith_session", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
        });
        
        return res.status(401).json({
          success: false,
          error: "Não autorizado - Sessão inválida ou expirada",
        });
      }
      
      // Verificar se é admin
      if (!user.is_admin) {
        return res.status(403).json({
          success: false,
          error: "Acesso negado - Requer permissão de administrador",
        });
      }
      
      // Adicionar ao request
      (req as AuthenticatedRequest).user = {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        is_admin: true,
        email_verified: user.email_verified || false,
      };
      
      (req as AuthenticatedRequest).session = {
        id: session.id,
        token: session.token,
        expires_at: session.expires_at,
      };
      
      next();
    })
    .catch((error) => {
      console.error("Erro no middleware de admin:", error);
      res.status(500).json({
        success: false,
        error: "Erro interno ao validar permissão de admin",
      });
    });
}

/**
 * Middleware opcional para autenticação
 * Se houver sessão válida, adiciona user ao request
 * Se não houver, continua normalmente
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  const sessionToken = req.cookies.zarith_session;
  
  if (!sessionToken) {
    return next();
  }
  
  Promise.resolve()
    .then(async () => {
      try {
        const user = await authService.getCurrentUser(sessionToken);
        const session = await sessionService.getByToken(sessionToken);
        
        if (user && session) {
          (req as AuthenticatedRequest).user = {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar_url: user.avatar_url,
            is_admin: user.is_admin || false,
            email_verified: user.email_verified || false,
          };
          
          (req as AuthenticatedRequest).session = {
            id: session.id,
            token: session.token,
            expires_at: session.expires_at,
          };
        }
        
        next();
      } catch (error) {
        // Se houver erro, apenas continuar
        next();
      }
    });
}

/**
 * Função utilitária para obter userId do request autenticado
 * Lança erro se não houver usuário autenticado
 */
export function getAuthenticatedUserId(req: AuthenticatedRequest): string {
  if (!req.user?.id) {
    throw new Error("Usuário não autenticado");
  }
  return req.user.id;
}

/**
 * Função utilitária para verificar se o usuário é admin
 */
export function isAdmin(req: AuthenticatedRequest): boolean {
  return req.user?.is_admin || false;
}
