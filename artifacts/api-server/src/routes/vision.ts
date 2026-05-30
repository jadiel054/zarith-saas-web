import { Router, type Request, type Response } from "express";
import { getBody, providerFetch, required, sendError, tokenFrom } from "./toolUtils";

const router = Router();

function geminiKey(req: Request) {
  return tokenFrom(req, "GEMINI_API_KEY", ["token", "geminiKey", "gemini_key", "apiKey"]);
}

function keyOrThrow(req: Request) {
  const key = geminiKey(req);
  if (!key) throw Object.assign(new Error("GEMINI_API_KEY não configurada. Envie { apiKey: \"AIza...\" } ou configure a variável de ambiente."), { statusCode: 401 });
  return key;
}

async function analyze(req: Request, parts: any[], prompt: string) {
  const key = keyOrThrow(req);
  return providerFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }, ...parts] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
    }),
  }, "Gemini Vision");
}

function inlineBase64(body: any) {
  const data = required(body.image || body.base64 || body.document || body.file, "base64").replace(/^data:[^;]+;base64,/, "");
  const mimeType = body.mimeType || body.mime || (body.document ? "application/pdf" : "image/png");
  return { inlineData: { mimeType, data } };
}

function textFromGemini(data: any) {
  return data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("\n") || "";
}

router.post("/analyze-image", async (req: Request, res: Response) => {
  try {
    const body = getBody(req);
    const prompt = body.prompt || "Analise esta imagem como engenheira de software: descreva layout, componentes, tecnologias prováveis, problemas visuais e recomendações práticas em português brasileiro.";
    const data = await analyze(req, [inlineBase64(body)], prompt);
    return res.json({ success: true, data, text: textFromGemini(data) });
  } catch (error) { return sendError(res, error, "Não foi possível analisar a imagem."); }
});

router.post("/extract-text", async (req: Request, res: Response) => {
  try {
    const data = await analyze(req, [inlineBase64(getBody(req))], "Extraia todo o texto visível desta imagem com OCR. Preserve ordem, quebras de linha e idioma original.");
    return res.json({ success: true, data, text: textFromGemini(data) });
  } catch (error) { return sendError(res, error, "Não foi possível extrair texto da imagem."); }
});

router.post("/analyze-document", async (req: Request, res: Response) => {
  try {
    const body = getBody(req);
    const prompt = body.prompt || "Analise este documento/PDF. Faça resumo executivo, pontos de ação, riscos técnicos e requisitos importantes em português brasileiro.";
    const data = await analyze(req, [inlineBase64({ ...body, document: body.document || body.base64 || body.file, mimeType: body.mimeType || "application/pdf" })], prompt);
    return res.json({ success: true, data, text: textFromGemini(data) });
  } catch (error) { return sendError(res, error, "Não foi possível analisar documento."); }
});

router.post("/analyze-url", async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const url = required(body.url, "url");
    const html = await providerFetch(url, { headers: { "User-Agent": "Zarith-Agent/1.0" } }, "URL externa");
    const text = typeof html === "string" ? html.slice(0, 16000) : JSON.stringify(html).slice(0, 16000);
    const data = await analyze(req, [], `${body.prompt || "Analise este site/URL como engenheira frontend, incluindo estrutura, UI, tecnologias prováveis, acessibilidade e oportunidades de melhoria."}\n\nURL: ${url}\n\nCONTEÚDO/HTML:\n${text}`);
    return res.json({ success: true, data, text: textFromGemini(data) });
  } catch (error) { return sendError(res, error, "Não foi possível analisar URL."); }
});

export default router;
