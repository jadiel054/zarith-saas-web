/**
 * Zarith Deploy Service (Backend)
 * Gerencia deploys na Vercel com tratamento de erros e logging de auditoria
 */

import axios, { AxiosError } from "axios";
import { logger } from "../lib/logger";
import { auditLog } from "../lib/auditLog";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_API_BASE = "https://api.vercel.com";

export interface DeploymentPayload {
  name: string;
  files: Array<{ file: string; data: string }>;
  projectSettings?: {
    framework?: string;
    buildCommand?: string;
  };
}

export interface DeploymentResponse {
  id: string;
  url?: string;
  status: "READY" | "QUEUED" | "BUILDING" | "ERROR" | "INITIALIZING";
  createdAt: number;
  error?: string;
}

const vercelApi = axios.create({
  baseURL: VERCEL_API_BASE,
  headers: {
    Authorization: `Bearer ${VERCEL_TOKEN}`,
    "Content-Type": "application/json",
  },
});

export const deployService = {
  /**
   * Criar novo deployment na Vercel
   */
  async createDeployment(payload: DeploymentPayload): Promise<DeploymentResponse> {
    try {
      if (!VERCEL_TOKEN) {
        throw new Error("VERCEL_TOKEN não configurado no servidor");
      }

      logger.info({ payload }, "Criando novo deployment na Vercel");
      auditLog("deploy:create:start", { projectName: payload.name });

      const response = await vercelApi.post("/v13/deployments", {
        name: payload.name,
        files: payload.files,
        projectSettings: payload.projectSettings || { framework: "nextjs" },
      });

      const result: DeploymentResponse = {
        id: response.data.id,
        url: response.data.url,
        status: response.data.status || "INITIALIZING",
        createdAt: Date.now(),
      };

      logger.info({ result }, "Deployment criado com sucesso");
      auditLog("deploy:create:success", { deploymentId: result.id, projectName: payload.name });

      return result;
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMsg = axiosError.response?.data || axiosError.message;

      logger.error({ error: errorMsg, payload }, "Erro ao criar deployment");
      auditLog("deploy:create:error", { 
        projectName: payload.name, 
        error: String(errorMsg),
        statusCode: axiosError.response?.status
      });

      throw new Error(`Falha ao criar deployment na Vercel: ${JSON.stringify(errorMsg)}`);
    }
  },

  /**
   * Verificar status de um deployment
   */
  async checkDeploymentStatus(deploymentId: string): Promise<DeploymentResponse> {
    try {
      logger.info({ deploymentId }, "Verificando status do deployment");

      const response = await vercelApi.get(`/v13/deployments/${deploymentId}`);

      const result: DeploymentResponse = {
        id: response.data.id,
        url: response.data.url,
        status: response.data.status || "INITIALIZING",
        createdAt: response.data.createdAt || Date.now(),
      };

      logger.info({ result }, "Status do deployment obtido");
      auditLog("deploy:status:check", { deploymentId, status: result.status });

      return result;
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMsg = axiosError.response?.data || axiosError.message;

      logger.error({ error: errorMsg, deploymentId }, "Erro ao verificar status");
      auditLog("deploy:status:error", { deploymentId, error: String(errorMsg) });

      throw new Error(`Falha ao verificar status do deployment: ${JSON.stringify(errorMsg)}`);
    }
  },

  /**
   * Cancelar um deployment
   */
  async cancelDeployment(deploymentId: string): Promise<void> {
    try {
      logger.info({ deploymentId }, "Cancelando deployment");
      auditLog("deploy:cancel:start", { deploymentId });

      await vercelApi.delete(`/v13/deployments/${deploymentId}`);

      logger.info({ deploymentId }, "Deployment cancelado com sucesso");
      auditLog("deploy:cancel:success", { deploymentId });
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMsg = axiosError.response?.data || axiosError.message;

      logger.error({ error: errorMsg, deploymentId }, "Erro ao cancelar deployment");
      auditLog("deploy:cancel:error", { deploymentId, error: String(errorMsg) });

      throw new Error(`Falha ao cancelar deployment: ${JSON.stringify(errorMsg)}`);
    }
  },

  /**
   * Listar todos os deployments de um projeto
   */
  async listDeployments(projectId: string): Promise<DeploymentResponse[]> {
    try {
      logger.info({ projectId }, "Listando deployments");

      const response = await vercelApi.get(`/v6/deployments?projectId=${projectId}`);

      const deployments: DeploymentResponse[] = response.data.deployments.map((d: any) => ({
        id: d.id,
        url: d.url,
        status: d.status,
        createdAt: d.createdAt,
      }));

      logger.info({ count: deployments.length }, "Deployments listados");
      auditLog("deploy:list", { projectId, count: deployments.length });

      return deployments;
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMsg = axiosError.response?.data || axiosError.message;

      logger.error({ error: errorMsg, projectId }, "Erro ao listar deployments");
      auditLog("deploy:list:error", { projectId, error: String(errorMsg) });

      throw new Error(`Falha ao listar deployments: ${JSON.stringify(errorMsg)}`);
    }
  },
};
