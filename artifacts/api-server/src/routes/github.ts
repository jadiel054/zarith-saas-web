import { Router, type Request, type Response } from "express";
import { boolConfirmed, decodeBase64, encodeBase64, getBody, githubHeaders, normalizeOwnerRepo, providerFetch, required, sendError, tokenFrom } from "./toolUtils";

const router = Router();
const API = "https://api.github.com";

function token(req: Request) {
  return tokenFrom(req, "GITHUB_TOKEN", ["token", "githubToken", "github_token"]);
}

function repoParts(req: Request) {
  const body = getBody(req);
  const { owner, repo } = normalizeOwnerRepo(body);
  return { owner, repo: required(repo || body.name, "repo") };
}

async function gh(req: Request, endpoint: string, init: RequestInit = {}) {
  return providerFetch(`${API}${endpoint}`, {
    ...init,
    headers: { ...githubHeaders(token(req)), ...(init.headers || {}) },
  }, "GitHub");
}

router.post(["/get-user", "/user"], async (req: Request, res: Response) => {
  try { return res.json({ success: true, data: await gh(req, "/user") }); }
  catch (error) { return sendError(res, error, "Não foi possível obter o usuário autenticado do GitHub."); }
});

router.post(["/list-repos", "/repos"], async (req: Request, res: Response) => {
  try {
    const body = getBody(req);
    const visibility = body.visibility || "all";
    const affiliation = body.affiliation || "owner,collaborator,organization_member";
    const data = await gh(req, `/user/repos?per_page=100&sort=updated&visibility=${encodeURIComponent(visibility)}&affiliation=${encodeURIComponent(affiliation)}`);
    return res.json({ success: true, data });
  } catch (error: any) {
    if (error?.statusCode === 401 && !token(req)) {
      try {
        const user = getBody(req).user || getBody(req).owner || "jadiel054";
        const publicRepos = await providerFetch(`${API}/users/${user}/repos?per_page=100&sort=updated`, { headers: { Accept: "application/vnd.github+json" } }, "GitHub");
        return res.json({ success: true, data: publicRepos, warning: "Sem token: retornando apenas repositórios públicos." });
      } catch (fallbackError) { return sendError(res, fallbackError, "Não foi possível listar repositórios públicos."); }
    }
    return sendError(res, error, "Não foi possível listar repositórios do GitHub.");
  }
});

router.post("/get-repo", async (req: Request, res: Response) => {
  try { const { owner, repo } = repoParts(req); return res.json({ success: true, data: await gh(req, `/repos/${owner}/${repo}`) }); }
  catch (error) { return sendError(res, error, "Não foi possível obter detalhes do repositório."); }
});

router.post("/create-repo", async (req: Request, res: Response) => {
  try {
    const body = getBody(req);
    const name = required(body.name || body.repo, "name");
    const payload = { name, description: body.description || "", private: body.private !== false, auto_init: Boolean(body.auto_init || body.autoInit) };
    return res.json({ success: true, data: await gh(req, "/user/repos", { method: "POST", body: JSON.stringify(payload) }) });
  } catch (error) { return sendError(res, error, "Não foi possível criar o repositório."); }
});

router.post("/delete-repo", async (req: Request, res: Response) => {
  try {
    if (!boolConfirmed(getBody(req))) return res.status(403).json({ success: false, requiresConfirmation: true, error: "Confirmação necessária para deletar repositório. Impacto: o repositório, issues, PRs, branches e histórico serão removidos permanentemente." });
    const { owner, repo } = repoParts(req);
    await gh(req, `/repos/${owner}/${repo}`, { method: "DELETE" });
    return res.json({ success: true, data: { deleted: true, owner, repo } });
  } catch (error) { return sendError(res, error, "Não foi possível deletar o repositório."); }
});

router.post("/list-branches", async (req: Request, res: Response) => {
  try { const { owner, repo } = repoParts(req); return res.json({ success: true, data: await gh(req, `/repos/${owner}/${repo}/branches?per_page=100`) }); }
  catch (error) { return sendError(res, error, "Não foi possível listar branches."); }
});

router.post("/create-branch", async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const { owner, repo } = repoParts(req);
    const newBranch = required(body.branch || body.newBranch, "branch");
    const fromBranch = body.from || body.base || "main";
    const baseRef = await gh(req, `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(fromBranch)}`);
    const data = await gh(req, `/repos/${owner}/${repo}/git/refs`, { method: "POST", body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: baseRef.object.sha }) });
    return res.json({ success: true, data });
  } catch (error) { return sendError(res, error, "Não foi possível criar branch."); }
});

router.post("/delete-branch", async (req: Request, res: Response) => {
  try {
    const body = getBody(req);
    if (!boolConfirmed(body)) return res.status(403).json({ success: false, requiresConfirmation: true, error: "Confirmação necessária para deletar branch. Impacto: commits exclusivos dessa branch podem ficar inacessíveis e PRs abertos podem quebrar." });
    const { owner, repo } = repoParts(req); const branch = required(body.branch, "branch");
    await gh(req, `/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, { method: "DELETE" });
    return res.json({ success: true, data: { deleted: true, owner, repo, branch } });
  } catch (error) { return sendError(res, error, "Não foi possível deletar branch."); }
});

router.post(["/get-file", "/read-file"], async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const { owner, repo } = repoParts(req); const filePath = required(body.path || body.filePath, "path");
    const ref = body.ref || body.branch ? `?ref=${encodeURIComponent(body.ref || body.branch)}` : "";
    const data = await gh(req, `/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath).replace(/%2F/g, "/")}${ref}`);
    if (Array.isArray(data)) return res.status(400).json({ success: false, error: "O caminho informado é um diretório, não um arquivo." });
    return res.json({ success: true, data: { ...data, decodedContent: data.content ? decodeBase64(data.content) : "" }, content: data.content ? decodeBase64(data.content) : "", sha: data.sha });
  } catch (error) { return sendError(res, error, "Não foi possível ler arquivo do GitHub."); }
});

router.post(["/list-files"], async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const { owner, repo } = repoParts(req); const dir = body.path || "";
    const ref = body.ref || body.branch ? `?ref=${encodeURIComponent(body.ref || body.branch)}` : "";
    return res.json({ success: true, data: await gh(req, `/repos/${owner}/${repo}/contents/${encodeURIComponent(dir).replace(/%2F/g, "/")}${ref}`) });
  } catch (error) { return sendError(res, error, "Não foi possível listar arquivos."); }
});

async function putContent(req: Request, mustHaveSha: boolean, method = "PUT") {
  const body = getBody(req); const { owner, repo } = repoParts(req); const filePath = required(body.path || body.filePath, "path");
  const payload: any = { message: body.message || `Atualiza ${filePath} via Zarith`, content: encodeBase64(String(body.content ?? "")), branch: body.branch };
  if (body.sha) payload.sha = body.sha;
  if (mustHaveSha && !payload.sha) {
    const existing = await gh(req, `/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath).replace(/%2F/g, "/")}${body.branch ? `?ref=${encodeURIComponent(body.branch)}` : ""}`);
    payload.sha = existing.sha;
  }
  return gh(req, `/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath).replace(/%2F/g, "/")}`, { method, body: JSON.stringify(payload) });
}

router.post(["/create-file", "/commit"], async (req: Request, res: Response) => {
  try { return res.json({ success: true, data: await putContent(req, false) }); }
  catch (error) { return sendError(res, error, "Não foi possível criar arquivo no GitHub."); }
});

router.post("/update-file", async (req: Request, res: Response) => {
  try { return res.json({ success: true, data: await putContent(req, true) }); }
  catch (error) { return sendError(res, error, "Não foi possível atualizar arquivo no GitHub."); }
});

router.post("/delete-file", async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const { owner, repo } = repoParts(req); const filePath = required(body.path || body.filePath, "path");
    let sha = body.sha;
    if (!sha) { const existing = await gh(req, `/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath).replace(/%2F/g, "/")}${body.branch ? `?ref=${encodeURIComponent(body.branch)}` : ""}`); sha = existing.sha; }
    const payload = { message: body.message || `Remove ${filePath} via Zarith`, sha, branch: body.branch };
    return res.json({ success: true, data: await gh(req, `/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath).replace(/%2F/g, "/")}`, { method: "DELETE", body: JSON.stringify(payload) }) });
  } catch (error) { return sendError(res, error, "Não foi possível deletar arquivo no GitHub."); }
});

router.post("/get-tree", async (req: Request, res: Response) => {
  try { const body = getBody(req); const { owner, repo } = repoParts(req); const treeSha = body.sha || body.branch || "HEAD"; return res.json({ success: true, data: await gh(req, `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(treeSha)}?recursive=1`) }); }
  catch (error) { return sendError(res, error, "Não foi possível obter árvore do repositório."); }
});

router.post("/search-code", async (req: Request, res: Response) => {
  try { const body = getBody(req); const query = required(body.query || body.q, "query"); const owner = body.owner || body.user || "jadiel054"; const repo = body.repo ? `+repo:${owner}/${body.repo}` : `+user:${owner}`; return res.json({ success: true, data: await gh(req, `/search/code?q=${encodeURIComponent(query + repo)}&per_page=50`) }); }
  catch (error) { return sendError(res, error, "Não foi possível buscar código."); }
});

router.post("/create-commit", async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const files = Array.isArray(body.files) ? body.files : [];
    if (!files.length) return res.status(400).json({ success: false, error: "files deve ser um array com { path, content, sha? }." });
    const results = [];
    for (const file of files) {
      req.body = { ...body, ...file, message: body.message || file.message || "Commit múltiplo via Zarith" };
      results.push(await putContent(req, Boolean(file.update || file.sha)));
    }
    req.body = body;
    return res.json({ success: true, data: results });
  } catch (error) { return sendError(res, error, "Não foi possível criar commit múltiplo."); }
});

router.post("/get-commits", async (req: Request, res: Response) => {
  try { const body = getBody(req); const { owner, repo } = repoParts(req); const sha = body.branch || body.sha || ""; return res.json({ success: true, data: await gh(req, `/repos/${owner}/${repo}/commits?per_page=50${sha ? `&sha=${encodeURIComponent(sha)}` : ""}`) }); }
  catch (error) { return sendError(res, error, "Não foi possível listar commits."); }
});

router.post("/create-pr", async (req: Request, res: Response) => {
  try { const body = getBody(req); const { owner, repo } = repoParts(req); const payload = { title: required(body.title, "title"), head: required(body.head, "head"), base: body.base || "main", body: body.body || "" }; return res.json({ success: true, data: await gh(req, `/repos/${owner}/${repo}/pulls`, { method: "POST", body: JSON.stringify(payload) }) }); }
  catch (error) { return sendError(res, error, "Não foi possível criar Pull Request."); }
});

router.post("/list-prs", async (req: Request, res: Response) => {
  try { const body = getBody(req); const { owner, repo } = repoParts(req); return res.json({ success: true, data: await gh(req, `/repos/${owner}/${repo}/pulls?state=${encodeURIComponent(body.state || "open")}&per_page=50`) }); }
  catch (error) { return sendError(res, error, "Não foi possível listar Pull Requests."); }
});

router.post("/merge-pr", async (req: Request, res: Response) => {
  try { const body = getBody(req); const { owner, repo } = repoParts(req); const pullNumber = required(String(body.pull_number || body.pullNumber || body.number || ""), "pull_number"); return res.json({ success: true, data: await gh(req, `/repos/${owner}/${repo}/pulls/${pullNumber}/merge`, { method: "PUT", body: JSON.stringify({ commit_title: body.commit_title, commit_message: body.commit_message, merge_method: body.merge_method || "merge" }) }) }); }
  catch (error) { return sendError(res, error, "Não foi possível fazer merge do PR."); }
});

router.post("/get-issues", async (req: Request, res: Response) => {
  try { const body = getBody(req); const { owner, repo } = repoParts(req); return res.json({ success: true, data: await gh(req, `/repos/${owner}/${repo}/issues?state=${encodeURIComponent(body.state || "open")}&per_page=50`) }); }
  catch (error) { return sendError(res, error, "Não foi possível listar issues."); }
});

router.post("/create-issue", async (req: Request, res: Response) => {
  try { const body = getBody(req); const { owner, repo } = repoParts(req); return res.json({ success: true, data: await gh(req, `/repos/${owner}/${repo}/issues`, { method: "POST", body: JSON.stringify({ title: required(body.title, "title"), body: body.body || "", labels: body.labels || [] }) }) }); }
  catch (error) { return sendError(res, error, "Não foi possível criar issue."); }
});

export default router;
