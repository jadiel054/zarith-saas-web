import { Router, type Request, type Response } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { getBody, required, safeWorkspacePath, sendError } from "./toolUtils";

const execAsync = promisify(exec);
const router = Router();

router.post("/read", async (req: Request, res: Response) => {
  try {
    const { requested } = safeWorkspacePath(required(getBody(req).path, "path"));
    const content = await fs.readFile(requested, "utf8");
    return res.json({ success: true, data: { path: requested, content } });
  } catch (error) { return sendError(res, error, "Não foi possível ler arquivo do workspace."); }
});

router.post("/write", async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const { requested } = safeWorkspacePath(required(body.path, "path"));
    await fs.mkdir(path.dirname(requested), { recursive: true });
    await fs.writeFile(requested, String(body.content ?? ""), "utf8");
    return res.json({ success: true, data: { path: requested, bytes: Buffer.byteLength(String(body.content ?? ""), "utf8") } });
  } catch (error) { return sendError(res, error, "Não foi possível escrever arquivo no workspace."); }
});

router.post("/list", async (req: Request, res: Response) => {
  try {
    const { requested } = safeWorkspacePath(getBody(req).path || ".");
    const entries = await fs.readdir(requested, { withFileTypes: true });
    return res.json({ success: true, data: entries.map(entry => ({ name: entry.name, path: path.join(requested, entry.name), type: entry.isDirectory() ? "directory" : "file" })) });
  } catch (error) { return sendError(res, error, "Não foi possível listar diretório do workspace."); }
});

router.post("/delete", async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const { requested } = safeWorkspacePath(required(body.path, "path"));
    if (body.confirm !== true && body.confirm !== "CONFIRMAR") return res.status(403).json({ success: false, requiresConfirmation: true, error: "Confirmação necessária para deletar arquivo/diretório do workspace." });
    await fs.rm(requested, { recursive: true, force: true });
    return res.json({ success: true, data: { deleted: true, path: requested } });
  } catch (error) { return sendError(res, error, "Não foi possível deletar item do workspace."); }
});

router.post("/run-command", async (req: Request, res: Response) => {
  try {
    const body = getBody(req); const command = required(body.command, "command");
    if (/\b(rm\s+-rf\s+\/|mkfs|shutdown|reboot|:(){|dd\s+if=)\b/i.test(command)) {
      return res.status(400).json({ success: false, error: "Comando bloqueado por segurança." });
    }
    const { requested: cwd } = safeWorkspacePath(body.cwd || ".");
    const { stdout, stderr } = await execAsync(command, { cwd, timeout: Number(body.timeout || 120000), maxBuffer: 1024 * 1024 * 10, env: { ...process.env, CI: "true" } });
    return res.json({ success: true, data: { command, cwd, stdout, stderr } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message, data: { stdout: error.stdout, stderr: error.stderr, code: error.code } });
  }
});

export default router;
