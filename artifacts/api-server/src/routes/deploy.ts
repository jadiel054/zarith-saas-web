import { Router, Request, Response } from "express";
import { deployService, DeploymentPayload, DeploymentResponse } from "../services/deployService";
import { logger } from "../lib/logger";
import { auditLog } from "../lib/auditLog";

const router = Router();

/**
 * POST /api/deploy/create
 * Criar novo deployment na Vercel
 */
router.post("/create", async (req: Request, res: Response): Promise<any> => {
  try {
    const payload: DeploymentPayload = req.body;

    if (!payload.name || !payload.files || payload.files.length === 0) {
      auditLog("deploy:create:validation_error", { 
        reason: "Missing required fields",
        payload: { name: payload.name, filesCount: payload.files?.length }
      });
      return res.status(400).json({
        error: "Campos obrigatórios faltando: name, files",
      });
    }

    const result = await deployService.createDeployment(payload);
    
    auditLog("deploy:create:api_success", { 
      deploymentId: result.id,
      projectName: payload.name
    });

    return res.json(result);
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    auditLog("deploy:create:api_error", { 
      error: errorMsg,
      statusCode: 500
    });

    logger.error({ error }, "Erro ao criar deployment via API");
    return res.status(500).json({
      error: errorMsg,
      status: "error",
    });
  }
});

/**
 * GET /api/deploy/status/:deploymentId
 * Verificar status de um deployment
 */
router.get("/status/:deploymentId", async (req: Request, res: Response): Promise<any> => {
  try {
    const { deploymentId } = req.params;

    if (!deploymentId) {
      return res.status(400).json({ error: "deploymentId é obrigatório" });
    }

    const result = await deployService.checkDeploymentStatus(deploymentId);
    
    auditLog("deploy:status:api_check", { deploymentId, status: result.status });

    return res.json(result);
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    auditLog("deploy:status:api_error", { 
      error: errorMsg,
      deploymentId: req.params.deploymentId
    });

    logger.error({ error }, "Erro ao verificar status do deployment");
    return res.status(500).json({
      error: errorMsg,
      status: "error",
    });
  }
});

/**
 * DELETE /api/deploy/:deploymentId
 * Cancelar um deployment
 */
router.delete("/:deploymentId", async (req: Request, res: Response): Promise<any> => {
  try {
    const { deploymentId } = req.params;

    if (!deploymentId) {
      return res.status(400).json({ error: "deploymentId é obrigatório" });
    }

    await deployService.cancelDeployment(deploymentId);
    
    auditLog("deploy:cancel:api_success", { deploymentId });

    return res.json({ success: true, message: "Deployment cancelado com sucesso" });
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    auditLog("deploy:cancel:api_error", { 
      error: errorMsg,
      deploymentId: req.params.deploymentId
    });

    logger.error({ error }, "Erro ao cancelar deployment");
    return res.status(500).json({
      error: errorMsg,
      status: "error",
    });
  }
});

/**
 * GET /api/deploy/list/:projectId
 * Listar todos os deployments de um projeto
 */
router.get("/list/:projectId", async (req: Request, res: Response): Promise<any> => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({ error: "projectId é obrigatório" });
    }

    const result = await deployService.listDeployments(projectId);
    
    auditLog("deploy:list:api_success", { projectId, count: result.length });

    return res.json({ deployments: result });
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    auditLog("deploy:list:api_error", { 
      error: errorMsg,
      projectId: req.params.projectId
    });

    logger.error({ error }, "Erro ao listar deployments");
    return res.status(500).json({
      error: errorMsg,
      status: "error",
    });
  }
});

export default router;
