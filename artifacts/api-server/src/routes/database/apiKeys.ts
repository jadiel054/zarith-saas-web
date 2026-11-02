/**
 * API Keys Routes
 * Rotas para gerenciamento de API keys
 */

import { Router, type Request, type Response } from "express";
import { apiKeysService } from "../../services/database";
import { sendError, getUserIdFromRequest, sendSuccess } from "../toolUtils";

const router = Router();

/**
 * GET /api-keys - Listar todas as API keys do usuário
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    const apiKeys = await apiKeysService.listByUser(userId);
    
    return sendSuccess(res, apiKeys);
  } catch (error) {
    return sendError(res, error, "Erro ao listar API keys");
  }
});

/**
 * GET /api-keys/count - Contar API keys do usuário
 */
router.get("/count", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    const count = await apiKeysService.countByUser(userId);
    
    return sendSuccess(res, { count });
  } catch (error) {
    return sendError(res, error, "Erro ao contar API keys");
  }
});

/**
 * GET /api-keys/:id - Obter API key por ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;

    const apiKey = await apiKeysService.getById(id, userId);
    
    if (!apiKey) {
      return res.status(404).json({ error: "API key não encontrada" });
    }

    // Retornar sem a chave real (apenas prefix)
    return sendSuccess(res, {
      ...apiKey,
      key: undefined,
    });
  } catch (error) {
    return sendError(res, error, "Erro ao obter API key");
  }
});

/**
 * POST /api-keys - Criar nova API key
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    const { name, permissions, rate_limit, ip_whitelist, expires_at } = req.body;

    // Validar dados
    if (!name) {
      return res.status(400).json({ error: "name é obrigatório" });
    }

    if (!permissions || permissions.length === 0) {
      return res.status(400).json({ error: "permissions é obrigatório" });
    }

    const result = await apiKeysService.create({
      user_id: userId,
      name,
      permissions,
      rate_limit: rate_limit || 100,
      ip_whitelist,
      is_active: true,
      expires_at,
    });

    // Retornar a chave apenas uma vez (importante!)
    return sendSuccess(res, {
      apiKey: {
        ...result,
        key: result.key, // Retornar a chave original
      },
      warning: "Esta é a única vez que a chave será exibida. Guarde-a em um lugar seguro.",
    }, 201);
  } catch (error) {
    return sendError(res, error, "Erro ao criar API key");
  }
});

/**
 * PUT /api-keys/:id - Atualizar API key
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;
    const { name, permissions, rate_limit, ip_whitelist, is_active, expires_at } = req.body;

    const apiKey = await apiKeysService.update(id, {
      name,
      permissions,
      rate_limit,
      ip_whitelist,
      is_active,
      expires_at,
    }, userId);

    if (!apiKey) {
      return res.status(404).json({ error: "API key não encontrada" });
    }

    return sendSuccess(res, apiKey);
  } catch (error) {
    return sendError(res, error, "Erro ao atualizar API key");
  }
});

/**
 * PATCH /api-keys/:id/rotate - Rotacionar API key
 */
router.patch("/:id/rotate", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;

    const result = await apiKeysService.rotate(id, userId);
    
    if (!result) {
      return res.status(404).json({ error: "API key não encontrada" });
    }

    // Retornar a nova chave apenas uma vez
    return sendSuccess(res, {
      apiKey: {
        ...result.apiKey,
        key: result.key, // Retornar a nova chave
      },
      warning: "Esta é a única vez que a nova chave será exibida. Guarde-a em um lugar seguro.",
    });
  } catch (error) {
    return sendError(res, error, "Erro ao rotacionar API key");
  }
});

/**
 * DELETE /api-keys/:id - Deletar API key
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;

    const apiKey = await apiKeysService.delete(id, userId);
    
    if (!apiKey) {
      return res.status(404).json({ error: "API key não encontrada" });
    }

    return sendSuccess(res, apiKey);
  } catch (error) {
    return sendError(res, error, "Erro ao deletar API key");
  }
});

/**
 * POST /api-keys/validate - Validar API key
 */
router.post("/validate", async (req: Request, res: Response) => {
  try {
    const { key } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    if (!key) {
      return res.status(400).json({ error: "key é obrigatório" });
    }

    const result = await apiKeysService.validate(key, ip);
    
    if (!result.valid) {
      return res.status(401).json({ error: result.error || "API key inválida" });
    }

    return sendSuccess(res, {
      valid: true,
      apiKey: {
        ...result.apiKey,
        key: undefined, // Nunca retornamos a chave
      },
    });
  } catch (error) {
    return sendError(res, error, "Erro ao validar API key");
  }
});

export default router;
