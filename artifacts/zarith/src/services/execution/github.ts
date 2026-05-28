/**
 * Zarith Execution Service - GitHub API
 * Gerencia a criação de repositórios e push de código.
 */

export const githubService = {
  getGitHubToken() {
    return localStorage.getItem("zarith_apikey_GitHub") || "";
  },

  async createRepository(name: string, isPrivate: boolean = true) {
    const token = this.getGitHubToken();
    if (!token) throw new Error("GitHub Token não configurado.");

    const response = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, private: isPrivate }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Falha ao criar repositório no GitHub");
    }

    return await response.json();
  },

  async pushCode(owner: string, repo: string, path: string, content: string, message: string) {
    const token = this.getGitHubToken();
    // Primeiro, precisamos pegar o SHA do arquivo se ele já existir
    let sha;
    try {
      const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        headers: { Authorization: `token ${token}` },
      });
      if (getRes.ok) {
        const data = await getRes.json();
        sha = data.sha;
      }
    } catch (e) {}

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        content: btoa(content), // GitHub espera base64
        sha,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Falha ao fazer push para o GitHub");
    }

    return await response.json();
  }
};
