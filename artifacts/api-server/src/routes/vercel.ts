import { Router, type Request, type Response } from "express";
import { getBody, providerFetch, required, sendError, tokenFrom, vercelHeaders } from "./toolUtils";

const router = Router();
const API = "https://api.vercel.com";

function token(req: Request) {
  return tokenFrom(req, "VERCEL_TOKEN", ["token", "vercelToken", "vercel_token"]);
}

function teamQuery(req: Request) {
  const body = getBody(req);
  return body.teamId ? `?teamId=${encodeURIComponent(body.teamId)}` : "";
}

function withTeam(req: Request, baseHasQuery = false) {
  const body = getBody(req);
  if (!body.teamId) return "";
  return `${baseHasQuery ? "&" : "?"}teamId=${encodeURIComponent(body.teamId)}`;
}

async function vf(req: Request, endpoint: string, init: RequestInit = {}) {
  return providerFetch(`${API}${endpoint}`, {
    ...init,
    headers: { ...vercelHeaders(token(req)), ...(init.headers || {}) },
  }, "Vercel");
}

router.post("/list-projects", async (req: Request, res: Response) => {
  try { return res.json({ success: true, data: await vf(req, `/v9/projects${teamQuery(req)}`) }); }
  catch (error) { return sendError(res, error, "Não foi possível listar projetos da Vercel."); }
});

router.post("/get-project", async (req: Request, res: Response) => {
  try { const idOrName = required(getBody(req).projectId || getBody(req).project || getBody(req).name, "projectId"); return res.json({ success: true, data: await vf(req, `/v9/projects/${encodeURIComponent(idOrName)}${teamQuery(req)}`) }); }
  catch (error) { return sendError(res, error, "Não foi possível obter o projeto da Vercel."); }
});

router.post("/get-deployments", async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const params = new URLSearchParams();
    if (body.projectId || body.project) params.set("projectId", body.projectId || body.project);
    if (body.limit) params.set("limit", String(body.limit)); else params.set("limit", "50");
    if (body.teamId) params.set("teamId", body.teamId);
    return res.json({ success: true, data: await vf(req, `/v6/deployments?${params.toString()}`) });
  } catch (error) { return sendError(res, error, "Não foi possível listar deployments."); }
});

router.post("/get-deployment", async (req: Request, res: Response) => {
  try { const idOrUrl = required(getBody(req).deploymentId || getBody(req).id || getBody(req).url, "deploymentId"); return res.json({ success: true, data: await vf(req, `/v13/deployments/${encodeURIComponent(idOrUrl)}${teamQuery(req)}`) }); }
  catch (error) { return sendError(res, error, "Não foi possível obter detalhes do deployment."); }
});

router.post("/get-build-logs", async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const deploymentId = required(body.deploymentId || body.id, "deploymentId");
    const params = new URLSearchParams({ follow: "0", limit: String(body.limit || 100) });
    if (body.since) params.set("since", String(body.since));
    if (body.until) params.set("until", String(body.until));
    if (body.teamId) params.set("teamId", body.teamId);
    return res.json({ success: true, data: await vf(req, `/v2/deployments/${encodeURIComponent(deploymentId)}/events?${params.toString()}`) });
  } catch (error) { return sendError(res, error, "Não foi possível obter logs de build."); }
});

router.post("/get-runtime-logs", async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const deploymentId = required(body.deploymentId || body.id, "deploymentId");
    const params = new URLSearchParams({ limit: String(body.limit || 100) });
    if (body.teamId) params.set("teamId", body.teamId);
    const endpoint = `/v2/deployments/${encodeURIComponent(deploymentId)}/events?${params.toString()}`;
    const data = await vf(req, endpoint);
    return res.json({ success: true, data, note: "A Vercel expõe runtime/build events neste endpoint; filtre por tipo no cliente quando necessário." });
  } catch (error) { return sendError(res, error, "Não foi possível obter logs de runtime."); }
});

router.post("/get-env-vars", async (req: Request, res: Response) => {
  try { const projectId = required(getBody(req).projectId || getBody(req).project, "projectId"); return res.json({ success: true, data: await vf(req, `/v10/projects/${encodeURIComponent(projectId)}/env${teamQuery(req)}`) }); }
  catch (error) { return sendError(res, error, "Não foi possível listar variáveis de ambiente."); }
});

router.post("/set-env-var", async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const projectId = required(body.projectId || body.project, "projectId");
    const payload = { key: required(body.key, "key"), value: required(String(body.value ?? ""), "value"), type: body.type || "encrypted", target: body.target || ["production", "preview", "development"] };
    if (body.envId || body.id) {
      const id = body.envId || body.id;
      return res.json({ success: true, data: await vf(req, `/v10/projects/${encodeURIComponent(projectId)}/env/${encodeURIComponent(id)}${teamQuery(req)}`, { method: "PATCH", body: JSON.stringify(payload) }) });
    }
    return res.json({ success: true, data: await vf(req, `/v10/projects/${encodeURIComponent(projectId)}/env${teamQuery(req)}`, { method: "POST", body: JSON.stringify(payload) }) });
  } catch (error) { return sendError(res, error, "Não foi possível criar/atualizar variável de ambiente."); }
});

router.post("/trigger-deploy", async (req: Request, res: Response) => {
  try {
    const body = getBody(req);
    if (body.deployHookUrl) {
      return res.json({ success: true, data: await providerFetch(body.deployHookUrl, { method: "POST" }, "Vercel Deploy Hook") });
    }
    const project = required(body.project || body.name || body.projectName, "project");
    const payload = { name: project, target: body.target || "production", gitSource: body.gitSource, projectSettings: body.projectSettings };
    return res.json({ success: true, data: await vf(req, `/v13/deployments${teamQuery(req)}`, { method: "POST", body: JSON.stringify(payload) }) });
  } catch (error) { return sendError(res, error, "Não foi possível disparar novo deploy."); }
});

router.post("/get-domains", async (req: Request, res: Response) => {
  try {
    const body = getBody(req);
    if (body.projectId || body.project) return res.json({ success: true, data: await vf(req, `/v9/projects/${encodeURIComponent(body.projectId || body.project)}/domains${teamQuery(req)}`) });
    return res.json({ success: true, data: await vf(req, `/v5/domains${teamQuery(req)}`) });
  } catch (error) { return sendError(res, error, "Não foi possível listar domínios."); }
});

export default router;
