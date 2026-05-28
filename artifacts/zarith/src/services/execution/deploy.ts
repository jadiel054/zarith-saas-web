/**
 * Zarith Execution Service - Vercel Deploy
 * Gerencia o ciclo de vida de deploys na Vercel via API.
 */

export interface DeployStatus {
  id: string;
  url?: string;
  status: 'READY' | 'QUEUED' | 'BUILDING' | 'ERROR' | 'INITIALIZING';
  createdAt: number;
}

export const deployService = {
  getVercelToken() {
    return localStorage.getItem("zarith_apikey_Vercel") || "";
  },

  async createDeployment(files: any[], projectName: string) {
    const token = this.getVercelToken();
    if (!token) throw new Error("Vercel Token não configurado.");

    // No mundo real, aqui faríamos o upload dos arquivos para a Vercel
    // Para este MVP, simulamos o disparo de um novo build via API de deploy
    const response = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: projectName,
        files: files, // Lista de objetos { file: string, data: string }
        projectSettings: {
          framework: "nextjs",
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Falha ao criar deploy na Vercel");
    }

    return await response.json() as DeployStatus;
  },

  async checkStatus(deploymentId: string) {
    const token = this.getVercelToken();
    const response = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Erro ao verificar status do deploy");
    return await response.json() as DeployStatus;
  }
};
