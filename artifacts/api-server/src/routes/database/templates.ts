/**
 * Templates Routes
 * Rotas para gerenciamento de templates
 */

import { Router, type Request, type Response } from "express";
import { templatesService } from "../../services/database";
import { sendError, getUserIdFromRequest, sendSuccess } from "../toolUtils";

const router = Router();

/**
 * GET /templates - Listar todos os templates
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { page, limit, type, category, isPublic, search } = req.query;

    const result = await templatesService.listAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      userId: userId || undefined,
      type: type ? String(type) : undefined,
      category: category ? String(category) : undefined,
      isPublic: isPublic !== undefined ? String(isPublic) === "true" : undefined,
      search: search ? String(search) : undefined,
    });

    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error, "Erro ao listar templates");
  }
});

/**
 * GET /templates/popular - Listar templates populares
 */
router.get("/popular", async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    
    const templates = await templatesService.listPopular(limit ? Number(limit) : 10);
    
    return sendSuccess(res, templates);
  } catch (error) {
    return sendError(res, error, "Erro ao listar templates populares");
  }
});

/**
 * GET /templates/categories - Listar categorias
 */
router.get("/categories", async (req: Request, res: Response) => {
  try {
    const categories = await templatesService.listCategories();
    
    return sendSuccess(res, { categories });
  } catch (error) {
    return sendError(res, error, "Erro ao listar categorias");
  }
});

/**
 * GET /templates/types - Listar tipos
 */
router.get("/types", async (req: Request, res: Response) => {
  try {
    const types = await templatesService.listTypes();
    
    return sendSuccess(res, { types });
  } catch (error) {
    return sendError(res, error, "Erro ao listar tipos");
  }
});

/**
 * GET /templates/:id - Obter template por ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;

    const template = await templatesService.getById(id, userId);
    
    if (!template) {
      return res.status(404).json({ error: "Template não encontrado" });
    }

    return sendSuccess(res, template);
  } catch (error) {
    return sendError(res, error, "Erro ao obter template");
  }
});

/**
 * POST /templates - Criar novo template
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    const { name, description, type, files, category, tags, is_public } = req.body;

    // Validar dados
    if (!name || !files) {
      return res.status(400).json({ error: "name e files são obrigatórios" });
    }

    const template = await templatesService.create({
      user_id: userId,
      name,
      description,
      type: type || "component",
      files,
      category,
      tags,
      is_public: is_public || false,
    });

    return sendSuccess(res, template, 201);
  } catch (error) {
    return sendError(res, error, "Erro ao criar template");
  }
});

/**
 * PUT /templates/:id - Atualizar template
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;
    const { name, description, type, files, category, tags, is_public, is_featured } = req.body;

    const template = await templatesService.update(id, {
      name,
      description,
      type,
      files,
      category,
      tags,
      is_public,
      is_featured,
    }, userId);

    if (!template) {
      return res.status(404).json({ error: "Template não encontrado" });
    }

    return sendSuccess(res, template);
  } catch (error) {
    return sendError(res, error, "Erro ao atualizar template");
  }
});

/**
 * DELETE /templates/:id - Deletar template
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;

    const template = await templatesService.delete(id, userId);
    
    if (!template) {
      return res.status(404).json({ error: "Template não encontrado" });
    }

    return sendSuccess(res, template);
  } catch (error) {
    return sendError(res, error, "Erro ao deletar template");
  }
});

/**
 * PATCH /templates/:id/increment-usage - Incrementar contador de uso
 */
router.patch("/:id/increment-usage", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const template = await templatesService.incrementUsage(id);
    
    if (!template) {
      return res.status(404).json({ error: "Template não encontrado" });
    }

    return sendSuccess(res, template);
  } catch (error) {
    return sendError(res, error, "Erro ao incrementar contador de uso");
  }
});

/**
 * PATCH /templates/:id/increment-likes - Incrementar contador de likes
 */
router.patch("/:id/increment-likes", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const template = await templatesService.incrementLikes(id);
    
    if (!template) {
      return res.status(404).json({ error: "Template não encontrado" });
    }

    return sendSuccess(res, template);
  } catch (error) {
    return sendError(res, error, "Erro ao incrementar contador de likes");
  }
});

export default router;
