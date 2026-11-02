/**
 * Sites Routes
 * Rotas para gerenciamento de sites
 */

import { Router, type Request, type Response } from "express";
import { sitesService } from "../../services/database";
import { sendError, getUserIdFromRequest, sendSuccess } from "../toolUtils";

const router = Router();

/**
 * GET /sites - Listar todos os sites do usuário
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    const { page, limit, status, search } = req.query;
    
    const result = await sitesService.listByUser(userId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status ? String(status) : undefined,
      search: search ? String(search) : undefined,
    });

    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error, "Erro ao listar sites");
  }
});

/**
 * GET /sites/public - Listar sites públicos
 */
router.get("/public", async (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query;
    
    const result = await sitesService.listPublic({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error, "Erro ao listar sites públicos");
  }
});

/**
 * GET /sites/:id - Obter site por ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;

    const site = await sitesService.getById(id, userId);
    
    if (!site) {
      return res.status(404).json({ error: "Site não encontrado" });
    }

    return sendSuccess(res, site);
  } catch (error) {
    return sendError(res, error, "Erro ao obter site");
  }
});

/**
 * GET /sites/domain/:domain - Obter site por domain
 */
router.get("/domain/:domain", async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;

    const site = await sitesService.getByDomain(domain);
    
    if (!site) {
      return res.status(404).json({ error: "Site não encontrado" });
    }

    return sendSuccess(res, site);
  } catch (error) {
    return sendError(res, error, "Erro ao obter site por domain");
  }
});

/**
 * POST /sites - Criar novo site
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Não autorizado" });
    }

    const { name, domain, template_id, content, is_public, is_indexable } = req.body;

    // Validar dados
    if (!name || !content) {
      return res.status(400).json({ error: "name e content são obrigatórios" });
    }

    const site = await sitesService.create({
      user_id: userId,
      name,
      domain,
      template_id,
      content,
      is_public: is_public || false,
      is_indexable: is_indexable !== undefined ? is_indexable : true,
    });

    return sendSuccess(res, site, 201);
  } catch (error) {
    return sendError(res, error, "Erro ao criar site");
  }
});

/**
 * PUT /sites/:id - Atualizar site
 */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;
    const { name, domain, template_id, content, is_public, is_indexable } = req.body;

    const site = await sitesService.update(id, {
      name,
      domain,
      template_id,
      content,
      is_public,
      is_indexable,
    }, userId);

    if (!site) {
      return res.status(404).json({ error: "Site não encontrado" });
    }

    return sendSuccess(res, site);
  } catch (error) {
    return sendError(res, error, "Erro ao atualizar site");
  }
});

/**
 * PATCH /sites/:id/deploy - Atualizar status de deploy
 */
router.patch("/:id/deploy", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;
    const { status, deploy_url, deploy_provider, deploy_id } = req.body;

    const site = await sitesService.updateDeployStatus(
      id,
      status,
      deploy_url,
      deploy_id
    );

    if (!site) {
      return res.status(404).json({ error: "Site não encontrado" });
    }

    return sendSuccess(res, site);
  } catch (error) {
    return sendError(res, error, "Erro ao atualizar status de deploy");
  }
});

/**
 * PATCH /sites/:id/increment-visits - Incrementar contador de visitas
 */
router.patch("/:id/increment-visits", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const site = await sitesService.incrementVisits(id);
    
    if (!site) {
      return res.status(404).json({ error: "Site não encontrado" });
    }

    return sendSuccess(res, site);
  } catch (error) {
    return sendError(res, error, "Erro ao incrementar contador de visitas");
  }
});

/**
 * DELETE /sites/:id - Deletar site
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;

    const site = await sitesService.delete(id, userId);
    
    if (!site) {
      return res.status(404).json({ error: "Site não encontrado" });
    }

    return sendSuccess(res, site);
  } catch (error) {
    return sendError(res, error, "Erro ao deletar site");
  }
});

/**
 * GET /sites/:id/status - Contar sites por status
 */
router.get("/:id/status", async (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { id } = req.params;

    const stats = await sitesService.countByStatus(id);
    
    return sendSuccess(res, { stats });
  } catch (error) {
    return sendError(res, error, "Erro ao contar sites por status");
  }
});

export default router;
