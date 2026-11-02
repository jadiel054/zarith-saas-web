/**
 * Users Routes
 * Rotas para gerenciamento de usuários
 */

import { Router, type Request, type Response } from "express";
import { usersService } from "../../services/database";
import { sendError, getUserIdFromRequest, sendSuccess } from "../toolUtils";

const router = Router();

/**
 * GET /users/me - Obter dados do usuário autenticado
 */
router.get("/me", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    const user = await usersService.getById(userId);
    
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    return sendSuccess(res, user);
  } catch (error) {
    return sendError(res, error, "Erro ao obter usuário");
  }
});

/**
 * PUT /users/me - Atualizar dados do usuário autenticado
 */
router.put("/me", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    const { name, email, avatar_url } = req.body;
    
    const user = await usersService.update(userId, {
      name,
      email,
      avatar_url,
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    return sendSuccess(res, user);
  } catch (error) {
    return sendError(res, error, "Erro ao atualizar usuário");
  }
});

/**
 * GET /users - Listar todos os usuários (apenas admin)
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    // Verificar se é admin (implementar depois)
    // const user = await usersService.getById(userId);
    // if (!user?.is_admin) {
    //   return res.status(403).json({ error: "Apenas administradores podem listar usuários" });
    // }

    const { page, limit } = req.query;
    
    const result = await usersService.listAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error, "Erro ao listar usuários");
  }
});

/**
 * GET /users/:id - Obter usuário por ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;

    // Verificar se é admin ou o próprio usuário
    // const requester = await usersService.getById(userId);
    // if (!requester?.is_admin && userId !== id) {
    //   return res.status(403).json({ error: "Não autorizado" });
    // }

    const user = await usersService.getById(id);
    
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    return sendSuccess(res, user);
  } catch (error) {
    return sendError(res, error, "Erro ao obter usuário");
  }
});

/**
 * POST /users - Criar novo usuário
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { email, name, password_hash, avatar_url } = req.body;

    // Validar dados
    if (!email) {
      return res.status(400).json({ error: "Email é obrigatório" });
    }

    // Verificar se email já existe
    const emailExists = await usersService.emailExists(email);
    if (emailExists) {
      return res.status(400).json({ error: "Email já cadastrado" });
    }

    const user = await usersService.create({
      email,
      name,
      password_hash,
      avatar_url,
      email_verified: true,
      is_active: true,
    });

    return sendSuccess(res, user, 201);
  } catch (error) {
    return sendError(res, error, "Erro ao criar usuário");
  }
});

/**
 * PUT /users/:id - Atualizar usuário
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;
    const { name, email, avatar_url, is_active, is_admin } = req.body;

    // Verificar se é admin ou o próprio usuário
    // const requester = await usersService.getById(userId);
    // if (!requester?.is_admin && userId !== id) {
    //   return res.status(403).json({ error: "Não autorizado" });
    // }

    const user = await usersService.update(id, {
      name,
      email,
      avatar_url,
      is_active,
      is_admin,
    });

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    return sendSuccess(res, user);
  } catch (error) {
    return sendError(res, error, "Erro ao atualizar usuário");
  }
});

/**
 * DELETE /users/:id - Deletar usuário
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;

    // Verificar se é admin ou o próprio usuário
    // const requester = await usersService.getById(userId);
    // if (!requester?.is_admin && userId !== id) {
    //   return res.status(403).json({ error: "Não autorizado" });
    // }

    const user = await usersService.delete(id);
    
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    return sendSuccess(res, user);
  } catch (error) {
    return sendError(res, error, "Erro ao deletar usuário");
  }
});

/**
 * GET /users/search - Buscar usuários por nome ou email
 */
router.get("/search", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    const { q: query, limit } = req.query;
    
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Parâmetro q é obrigatório" });
    }

    const results = await usersService.search(query, limit ? Number(limit) : 10);
    
    return sendSuccess(res, results);
  } catch (error) {
    return sendError(res, error, "Erro ao buscar usuários");
  }
});

/**
 * GET /users/count - Contar usuários
 */
router.get("/count", async (req: Request, res: Response) => {
  try {
    const count = await usersService.count();
    
    return sendSuccess(res, { count });
  } catch (error) {
    return sendError(res, error, "Erro ao contar usuários");
  }
});

/**
 * POST /users/sync - Sincronizar usuário do Supabase
 */
router.post("/sync", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    const { email, name, avatar_url } = req.body;
    
    const user = await usersService.syncFromSupabase({
      id: userId,
      email,
      name,
      avatar_url,
    });

    return sendSuccess(res, user);
  } catch (error) {
    return sendError(res, error, "Erro ao sincronizar usuário");
  }
});

export default router;
