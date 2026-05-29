import { Router } from "express";
import axios from "axios";

const router = Router();
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USER = "jadiel054";

const githubApi = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
  },
});

// POST /api/github/repos — lista repositórios de jadiel054
router.post("/repos", async (req, res) => {
  try {
    const response = await githubApi.get(`/users/${GITHUB_USER}/repos`);
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Internal Server Error" });
  }
});

// POST /api/github/read-file — lê conteúdo de um arquivo
router.post("/read-file", async (req, res): Promise<any> => {
  const { repo, path } = req.body;
  try {
    const response = await githubApi.get(`/repos/${GITHUB_USER}/${repo}/contents/${path}`);
    if (Array.isArray(response.data)) {
      return res.status(400).json({ error: "Path is a directory, not a file" });
    }
    const content = Buffer.from(response.data.content, "base64").toString("utf-8");
    return res.json({ content, sha: response.data.sha });
  } catch (error: any) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: "Internal Server Error" });
  }
});

// POST /api/github/create-file — cria ou atualiza arquivo
router.post("/create-file", async (req, res) => {
  const { repo, path, content, message, sha } = req.body;
  try {
    const response = await githubApi.put(`/repos/${GITHUB_USER}/${repo}/contents/${path}`, {
      message,
      content: Buffer.from(content).toString("base64"),
      sha,
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Internal Server Error" });
  }
});

// POST /api/github/commit — faz commit (alias para create-file neste contexto simplificado)
router.post("/commit", async (req, res) => {
  const { repo, path, content, message, sha } = req.body;
  try {
    const response = await githubApi.put(`/repos/${GITHUB_USER}/${repo}/contents/${path}`, {
      message,
      content: Buffer.from(content).toString("base64"),
      sha,
    });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: "Internal Server Error" });
  }
});

export default router;
