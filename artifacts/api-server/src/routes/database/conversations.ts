/**
 * Conversations Routes
 * Rotas para gerenciamento de conversas (sessões de chat)
 */

import { Router, type Request, type Response } from "express";
import { conversationsService } from "../../services/database";
import { sendError, getUserIdFromRequest, sendSuccess } from "../toolUtils";

const router = Router();

/**
 * GET /conversations - Listar conversas do usuário
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    const { page, limit, search } = req.query;
    
    const result = await conversationsService.listByUser(userId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search ? String(search) : undefined,
    });

    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error, "Erro ao listar conversas");
  }
});

/**
 * GET /conversations/:id - Obter conversa por ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;

    const conversation = await conversationsService.getById(id, userId);
    
    if (!conversation) {
      return res.status(404).json({ error: "Conversa não encontrada" });
    }

    return sendSuccess(res, conversation);
  } catch (error) {
    return sendError(res, error, "Erro ao obter conversa");
  }
});

/**
 * POST /conversations - Criar nova conversa
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    const { title, model, temperature } = req.body;
    
    const conversation = await conversationsService.create({
      user_id: userId,
      title: title || "Nova conversa",
      model: model || "zarith-default",
      temperature: temperature || "0.7",
    });

    return sendSuccess(res, conversation, 201);
  } catch (error) {
    return sendError(res, error, "Erro ao criar conversa");
  }
});

/**
 * PUT /conversations/:id - Atualizar conversa
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;
    const { title, model, temperature, is_public, share_token } = req.body;

    const conversation = await conversationsService.update(id, {
      title,
      model,
      temperature,
      is_public,
      share_token,
    }, userId);

    if (!conversation) {
      return res.status(404).json({ error: "Conversa não encontrada" });
    }

    return sendSuccess(res, conversation);
  } catch (error) {
    return sendError(res, error, "Erro ao atualizar conversa");
  }
});

/**
 * DELETE /conversations/:id - Deletar conversa
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;

    const conversation = await conversationsService.delete(id, userId);
    
    if (!conversation) {
      return res.status(404).json({ error: "Conversa não encontrada" });
    }

    return sendSuccess(res, conversation);
  } catch (error) {
    return sendError(res, error, "Erro ao deletar conversa");
  }
});

/**
 * PATCH /conversations/:id/increment-messages - Incrementar contador de mensagens
 */
router.patch("/:id/increment-messages", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const conversation = await conversationsService.incrementMessagesCount(id);
    
    if (!conversation) {
      return res.status(404).json({ error: "Conversa não encontrada" });
    }

    return sendSuccess(res, conversation);
  } catch (error) {
    return sendError(res, error, "Erro ao incrementar contador");
  }
});

/**
 * PATCH /conversations/:id/tokens - Atualizar tokens usados
 */
router.patch("/:id/tokens", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tokens } = req.body;
    
    if (typeof tokens !== "number") {
      return res.status(400).json({ error: "Tokens deve ser um número" });
    }

    const conversation = await conversationsService.updateTokensUsed(id, tokens);
    
    if (!conversation) {
      return res.status(404).json({ error: "Conversa não encontrada" });
    }

    return sendSuccess(res, conversation);
  } catch (error) {
    return sendError(res, error, "Erro ao atualizar tokens");
  }
});

export default router;
