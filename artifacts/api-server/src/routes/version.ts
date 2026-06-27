import { Router, type Request, type Response } from "express";
import { providerFetch } from "./toolUtils";
import { logger } from "../lib/logger";

const router = Router();
const VERCEL_API = "https://api.vercel.com";
const VERCEL_APP_NAME = "zarith-saas-web";

type VercelDeploymentMeta = {
  githubCommitSha?: string;
  githubCommitMessage?: string;
};

type VercelDeployment = {
  meta?: VercelDeploymentMeta;
  createdAt?: number | string;
};

type VercelDeploymentListResponse = {
  deployments?: VercelDeployment[];
};

function unavailable(res: Response) {
  return res.status(503).json({ error: "version check unavailable" });
}

router.get("/latest", async (_req: Request, res: Response) => {
  const token = process.env.VERCEL_TOKEN?.trim();

  if (!token) {
    logger.error("[version.latest] VERCEL_TOKEN ausente.");
    return unavailable(res);
  }

  try {
    const data = await providerFetch(
      `${VERCEL_API}/v6/deployments?app=${encodeURIComponent(VERCEL_APP_NAME)}&limit=1&state=READY&target=production`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
      "Vercel",
    ) as VercelDeploymentListResponse;

    const deployment = data?.deployments?.[0];
    const sha = deployment?.meta?.githubCommitSha?.trim();
    const message = deployment?.meta?.githubCommitMessage?.trim();
    const createdAtRaw = deployment?.createdAt;

    if (!sha || !message || !createdAtRaw) {
      logger.error({ deployment }, "[version.latest] Deployment sem metadados esperados.");
      return unavailable(res);
    }

    const createdAt = new Date(createdAtRaw).toISOString();

    if (!createdAt || Number.isNaN(Date.parse(createdAt))) {
      logger.error({ createdAtRaw }, "[version.latest] createdAt inválido.");
      return unavailable(res);
    }

    res.set("Cache-Control", "public, max-age=60");
    return res.json({
      sha,
      message,
      createdAt,
    });
  } catch (error) {
    logger.error({ err: error }, "[version.latest] Falha ao consultar versão mais recente na Vercel.");
    return unavailable(res);
  }
});

export default router;
