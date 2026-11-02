/**
 * Content Routes
 * Rotas para gerenciamento de conteúdo
 */

import { Router, type Request, type Response } from "express";
import { contentService } from "../../services/database";
import { sendError, getUserIdFromRequest, sendSuccess } from "../toolUtils";

const router = Router();

/**
 * GET /content - Listar todo o conteúdo do usuário
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    const { page, limit, type, status, search } = req.query;
    
    const result = await contentService.listByUser(userId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      type: type ? String(type) : undefined,
      status: status ? String(status) : undefined,
      search: search ? String(search) : undefined,
    });

    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error, "Erro ao listar conteúdo");
  }
});

/**
 * GET /content/public - Listar conteúdo público
 */
router.get("/public", async (req: Request, res: Response) => {
  try {
    const { page, limit, type, search } = req.query;
    
    const result = await contentService.listPublic({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      type: type ? String(type) : undefined,
      search: search ? String(search) : undefined,
    });

    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error, "Erro ao listar conteúdo público");
  }
});

/**
 * GET /content/recent - Listar conteúdo mais recente
 */
router.get("/recent", async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    
    const content = await contentService.listRecent(limit ? Number(limit) : 10);
    
    return sendSuccess(res, content);
  } catch (error) {
    return sendError(res, error, "Erro ao listar conteúdo recente");
  }
});

/**
 * GET /content/popular - Listar conteúdo mais popular
 */
router.get("/popular", async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    
    const content = await contentService.listPopular(limit ? Number(limit) : 10);
    
    return sendSuccess(res, content);
  } catch (error) {
    return sendError(res, error, "Erro ao listar conteúdo popular");
  }
});

/**
 * GET /content/:id - Obter conteúdo por ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;

    const content = await contentService.getById(id, userId);
    
    if (!content) {
      return res.status(404).json({ error: "Conteúdo não encontrado" });
    }

    return sendSuccess(res, content);
  } catch (error) {
    return sendError(res, error, "Erro ao obter conteúdo");
  }
});

/**
 * GET /content/slug/:slug - Obter conteúdo por slug
 */
router.get("/slug/:slug", async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const content = await contentService.getBySlug(slug);
    
    if (!content) {
      return res.status(404).json({ error: "Conteúdo não encontrado" });
    }

    // Incrementar views
    await contentService.incrementViews(content.id);
    
    return sendSuccess(res, content);
  } catch (error) {
    return sendError(res, error, "Erro ao obter conteúdo por slug");
  }
});

/**
 * POST /content - Criar novo conteúdo
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    const { 
      title, 
      slug, 
      excerpt, 
      type, 
      markdown_content, 
      html_content, 
      metadata,
      is_public,
      seo_title,
      seo_description
    } = req.body;

    // Validar dados
    if (!title || !slug) {
      return res.status(400).json({ error: "title e slug são obrigatórios" });
    }

    // Verificar se slug já existe
    const existing = await contentService.getBySlug(slug);
    if (existing) {
      return res.status(400).json({ error: "Slug já existe" });
    }

    const content = await contentService.create({
      user_id: userId,
      title,
      slug,
      excerpt,
      type: type || "article",
      markdown_content,
      html_content,
      metadata,
      is_public: is_public !== undefined ? is_public : true,
      seo_title,
      seo_description,
    });

    return sendSuccess(res, content, 201);
  } catch (error) {
    return sendError(res, error, "Erro ao criar conteúdo");
  }
});

/**
 * PUT /content/:id - Atualizar conteúdo
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;
    const { 
      title, 
      slug, 
      excerpt, 
      type, 
      markdown_content, 
      html_content, 
      metadata,
      is_public,
      is_featured,
      seo_title,
      seo_description
    } = req.body;

    const content = await contentService.update(id, {
      title,
      slug,
      excerpt,
      type,
      markdown_content,
      html_content,
      metadata,
      is_public,
      is_featured,
      seo_title,
      seo_description,
    }, userId);

    if (!content) {
      return res.status(404).json({ error: "Conteúdo não encontrado" });
    }

    return sendSuccess(res, content);
  } catch (error) {
    return sendError(res, error, "Erro ao atualizar conteúdo");
  }
});

/**
 * PATCH /content/:id/publish - Publicar conteúdo
 */
router.patch("/:id/publish", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;

    const content = await contentService.publish(id, userId);
    
    if (!content) {
      return res.status(404).json({ error: "Conteúdo não encontrado" });
    }

    return sendSuccess(res, content);
  } catch (error) {
    return sendError(res, error, "Erro ao publicar conteúdo");
  }
});

/**
 * PATCH /content/:id/unpublish - Despublicar conteúdo
 */
router.patch("/:id/unpublish", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;

    const content = await contentService.unpublish(id, userId);
    
    if (!content) {
      return res.status(404).json({ error: "Conteúdo não encontrado" });
    }

    return sendSuccess(res, content);
  } catch (error) {
    return sendError(res, error, "Erro ao despublicar conteúdo");
  }
});

/**
 * PATCH /content/:id/increment-views - Incrementar contador de views
 */
router.patch("/:id/increment-views", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const content = await contentService.incrementViews(id);
    
    if (!content) {
      return res.status(404).json({ error: "Conteúdo não encontrado" });
    }

    return sendSuccess(res, content);
  } catch (error) {
    return sendError(res, error, "Erro ao incrementar contador de views");
  }
});

/**
 * PATCH /content/:id/increment-likes - Incrementar contador de likes
 */
router.patch("/:id/increment-likes", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const content = await contentService.incrementLikes(id);
    
    if (!content) {
      return res.status(404).json({ error: "Conteúdo não encontrado" });
    }

    return sendSuccess(res, content);
  } catch (error) {
    return sendError(res, error, "Erro ao incrementar contador de likes");
  }
});

/**
 * DELETE /content/:id - Deletar conteúdo
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;

    const content = await contentService.delete(id, userId);
    
    if (!content) {
      return res.status(404).json({ error: "Conteúdo não encontrado" });
    }

    return sendSuccess(res, content);
  } catch (error) {
    return sendError(res, error, "Erro ao deletar conteúdo");
  }
});

/**
 * GET /content/:id/type - Contar conteúdo por tipo
 */
router.get("/:id/type", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;

    const stats = await contentService.countByType(id);
    
    return sendSuccess(res, { stats });
  } catch (error) {
    return sendError(res, error, "Erro ao contar conteúdo por tipo");
  }
});

/**
 * GET /content/:id/status - Contar conteúdo por status
 */
router.get("/:id/status", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;

    const stats = await contentService.countByStatus(id);
    
    return sendSuccess(res, { stats });
  } catch (error) {
    return sendError(res, error, "Erro ao contar conteúdo por status");
  }
});

export default router;
