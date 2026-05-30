import { Router, type Request, type Response } from "express";
import { getBody, providerFetch, required, sendError, tokenFrom } from "./toolUtils";

const router = Router();

router.post("/fetch-url", async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const url = required(body.url, "url");
    const content = await providerFetch(url, { headers: { "User-Agent": body.userAgent || "Zarith-Agent/1.0" } }, "Web Fetch");
    return res.json({ success: true, data: content, url });
  } catch (error) { return sendError(res, error, "Não foi possível buscar conteúdo da URL."); }
});

router.post("/search", async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const query = required(body.query || body.q, "query");
    const token = tokenFrom(req, "TAVILY_API_KEY", ["token", "tavilyKey", "apiKey"]);
    if (!token) throw Object.assign(new Error("TAVILY_API_KEY não configurada. Envie { apiKey: \"tvly-...\" } ou configure a variável de ambiente."), { statusCode: 401 });
    const data = await providerFetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query, max_results: body.max_results || body.maxResults || 5, search_depth: body.search_depth || "basic", include_answer: body.include_answer !== false, include_raw_content: Boolean(body.include_raw_content) }),
    }, "Tavily");
    return res.json({ success: true, data });
  } catch (error) { return sendError(res, error, "Não foi possível pesquisar na web via Tavily."); }
});

router.post("/analyze-site", async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const url = required(body.url, "url");
    const html = String(await providerFetch(url, { headers: { "User-Agent": "Zarith-Agent/1.0" } }, "Site externo"));
    const scripts = Array.from(html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)).map(m => m[1]).slice(0, 50);
    const stylesheets = Array.from(html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi)).map(m => m[1]).slice(0, 50);
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "";
    const metaDescription = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1] || "";
    const frameworks = [
      html.includes("__NEXT_DATA__") ? "Next.js" : "",
      html.includes("data-reactroot") || html.includes("react") ? "React" : "",
      html.includes("vite") ? "Vite" : "",
      html.includes("wp-content") ? "WordPress" : "",
      html.includes("shopify") ? "Shopify" : "",
    ].filter(Boolean);
    return res.json({ success: true, data: { url, title, metaDescription, scripts, stylesheets, frameworks, htmlPreview: html.slice(0, 12000) } });
  } catch (error) { return sendError(res, error, "Não foi possível analisar estrutura do site."); }
});

export default router;
