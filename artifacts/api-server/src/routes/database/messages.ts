/**
 * Messages Routes
 * Rotas para gerenciamento de mensagens do chat
 */

import { Router, type Request, type Response } from "express";
import { messagesService } from "../../services/database";
import { sendError, getUserIdFromRequest, sendSuccess } from "../toolUtils";

const router = Router();

/**
 * GET /messages/:conversationId - Listar mensagens de uma conversa
 */
router.get("/:conversationId", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { conversationId } = req.params;
    const { page, limit } = req.query;

    // Verificar se a conversa pertence ao usuário
    const { conversationsService } = await import("../../services/database");
    const conversation = await conversationsService.getById(conversationId, userId);
    
    if (!conversation) {
      return res.status(404).json({ error: "Conversa não encontrada ou não autorizado" });
    }

    const result = await messagesService.listByConversation(conversationId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error, "Erro ao listar mensagens");
  }
});

/**
 * GET /messages/:conversationId/last - Obter última mensagem de uma conversa
 */
router.get("/:conversationId/last", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { conversationId } = req.params;

    // Verificar se a conversa pertence ao usuário
    const { conversationsService } = await import("../../services/database");
    const conversation = await conversationsService.getById(conversationId, userId);
    
    if (!conversation) {
      return res.status(404).json({ error: "Conversa não encontrada ou não autorizado" });
    }

    const message = await messagesService.getLastByConversation(conversationId);
    
    if (!message) {
      return res.status(404).json({ error: "Nenhuma mensagem encontrada" });
    }

    return sendSuccess(res, message);
  } catch (error) {
    return sendError(res, error, "Erro ao obter última mensagem");
  }
});

/**
 * GET /messages/:conversationId/count - Contar mensagens de uma conversa
 */
router.get("/:conversationId/count", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { conversationId } = req.params;

    // Verificar se a conversa pertence ao usuário
    const { conversationsService } = await import("../../services/database");
    const conversation = await conversationsService.getById(conversationId, userId);
    
    if (!conversation) {
      return res.status(404).json({ error: "Conversa não encontrada ou não autorizado" });
    }

    const count = await messagesService.countByConversation(conversationId);
    
    return sendSuccess(res, { count });
  } catch (error) {
    return sendError(res, error, "Erro ao contar mensagens");
  }
});

/**
 * POST /messages - Criar nova mensagem
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    const { conversation_id, role, content, model, tool_call_id, tool_name, tool_arguments, tool_result, token_count } = req.body;

    // Validar dados
    if (!conversation_id || !role || !content) {
      return res.status(400).json({ error: "conversation_id, role e content são obrigatórios" });
    }

    if (!["user", "assistant", "system"].includes(role)) {
      return res.status(400).json({ error: "role deve ser user, assistant ou system" });
    }

    // Verificar se a conversa pertence ao usuário
    const { conversationsService } = await import("../../services/database");
    const conversation = await conversationsService.getById(conversation_id, userId);
    
    if (!conversation) {
      return res.status(404).json({ error: "Conversa não encontrada ou não autorizado" });
    }

    const message = await messagesService.create({
      conversation_id,
      role,
      content,
      model,
      tool_call_id,
      tool_name,
      tool_arguments,
      tool_result,
      token_count,
    });

    return sendSuccess(res, message, 201);
  } catch (error) {
    return sendError(res, error, "Erro ao criar mensagem");
  }
});

/**
 * POST /messages/batch - Criar múltiplas mensagens
 */
router.post("/batch", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    const messages = req.body;
    
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "É necessário enviar um array de mensagens" });
    }

    // Verificar se todas as conversas pertencem ao usuário
    const { conversationsService } = await import("../../services/database");
    const conversationIds = [...new Set(messages.map(m => m.conversation_id))];
    
    for (const convId of conversationIds) {
      const conversation = await conversationsService.getById(convId, userId);
      if (!conversation) {
        return res.status(404).json({ error: `Conversa ${convId} não encontrada ou não autorizado` });
      }
    }

    const result = await messagesService.createMany(messages);
    
    return sendSuccess(res, result, 201);
  } catch (error) {
    return sendError(res, error, "Erro ao criar mensagens em lote");
  }
});

/**
 * GET /messages/:id - Obter mensagem por ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;

    const message = await messagesService.getById(id);
    
    if (!message) {
      return res.status(404).json({ error: "Mensagem não encontrada" });
    }

    // Verificar se a conversa pertence ao usuário
    const { conversationsService } = await import("../../services/database");
    const conversation = await conversationsService.getById(message.conversation_id, userId);
    
    if (!conversation) {
      return res.status(404).json({ error: "Mensagem não encontrada ou não autorizado" });
    }

    return sendSuccess(res, message);
  } catch (error) {
    return sendError(res, error, "Erro ao obter mensagem");
  }
});

/**
 * PUT /messages/:id - Atualizar mensagem
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;
    const { content, model, tool_call_id, tool_name, tool_arguments, tool_result, token_count } = req.body;

    // Obter mensagem para verificar conversa
    const message = await messagesService.getById(id);
    
    if (!message) {
      return res.status(404).json({ error: "Mensagem não encontrada" });
    }

    // Verificar se a conversa pertence ao usuário
    const { conversationsService } = await import("../../services/database");
    const conversation = await conversationsService.getById(message.conversation_id, userId);
    
    if (!conversation) {
      return res.status(404).json({ error: "Mensagem não encontrada ou não autorizado" });
    }

    const updatedMessage = await messagesService.update(id, {
      content,
      model,
      tool_call_id,
      tool_name,
      tool_arguments,
      tool_result,
      token_count,
    });

    if (!updatedMessage) {
      return res.status(404).json({ error: "Mensagem não encontrada" });
    }

    return sendSuccess(res, updatedMessage);
  } catch (error) {
    return sendError(res, error, "Erro ao atualizar mensagem");
  }
});

/**
 * DELETE /messages/:id - Deletar mensagem
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;

    // Obter mensagem para verificar conversa
    const message = await messagesService.getById(id);
    
    if (!message) {
      return res.status(404).json({ error: "Mensagem não encontrada" });
    }

    // Verificar se a conversa pertence ao usuário
    const { conversationsService } = await import("../../services/database");
    const conversation = await conversationsService.getById(message.conversation_id, userId);
    
    if (!conversation) {
      return res.status(404).json({ error: "Mensagem não encontrada ou não autorizado" });
    }

    const deletedMessage = await messagesService.delete(id);
    
    if (!deletedMessage) {
      return res.status(404).json({ error: "Mensagem não encontrada" });
    }

    return sendSuccess(res, deletedMessage);
  } catch (error) {
    return sendError(res, error, "Erro ao deletar mensagem");
  }
});

/**
 * DELETE /messages/conversation/:conversationId - Deletar todas as mensagens de uma conversa
 */
router.delete("/conversation/:conversationId", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { conversationId } = req.params;

    // Verificar se a conversa pertence ao usuário
    const { conversationsService } = await import("../../services/database");
    const conversation = await conversationsService.getById(conversationId, userId);
    
    if (!conversation) {
      return res.status(404).json({ error: "Conversa não encontrada ou não autorizado" });
    }

    const deletedMessages = await messagesService.deleteByConversation(conversationId);
    
    return sendSuccess(res, deletedMessages);
  } catch (error) {
    return sendError(res, error, "Erro ao deletar mensagens");
  }
});

/**
 * GET /messages/search - Buscar mensagens por conteúdo
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

    const results = await messagesService.searchByContent(
      query,
      userId,
      limit ? Number(limit) : 20
    );

    return sendSuccess(res, results);
  } catch (error) {
    return sendError(res, error, "Erro ao buscar mensagens");
  }
});

export default router;
