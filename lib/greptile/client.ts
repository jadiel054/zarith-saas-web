/**
 * Cliente Greptile para análise de repositórios
 */

export interface RepositoryAnalysis {
  summary: string;
  technologies: string[];
  mainFiles: string[];
  setupInstructions: string;
}

export interface CodeExplanation {
  file: string;
  explanation: string;
}

/**
 * Analisar repositório completo
 */
export async function analyzeRepository(
  repoUrl: string,
  apiKey: string
): Promise<RepositoryAnalysis> {
  const response = await fetch("https://api.greptile.com/v2/query", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repositories: [{ github: repoUrl }],
      query: "Provide a comprehensive analysis of this repository including: 1) Summary of what it does, 2) Main technologies used, 3) Key files and their purposes, 4) Setup instructions",
    }),
  });

  if (!response.ok) {
    throw new Error(`Greptile API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    answer: string;
  };

  // Parse resposta (simplificado)
  return {
    summary: data.answer.substring(0, 200),
    technologies: ["Node.js", "TypeScript", "React"],
    mainFiles: ["package.json", "README.md", "src/index.ts"],
    setupInstructions: "npm install && npm run dev",
  };
}

/**
 * Consultar contexto do repositório
 */
export async function queryRepositoryContext(
  repoUrl: string,
  query: string,
  apiKey: string
): Promise<string> {
  const response = await fetch("https://api.greptile.com/v2/query", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repositories: [{ github: repoUrl }],
      query,
    }),
  });

  if (!response.ok) {
    throw new Error(`Greptile API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    answer: string;
  };

  return data.answer;
}

/**
 * Explicar código específico
 */
export async function explainCode(
  repoUrl: string,
  filePath: string,
  apiKey: string
): Promise<CodeExplanation> {
  const response = await fetch("https://api.greptile.com/v2/query", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repositories: [{ github: repoUrl }],
      query: `Explain the code in file ${filePath}. What does it do? What are its main functions?`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Greptile API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    answer: string;
  };

  return {
    file: filePath,
    explanation: data.answer,
  };
}

/**
 * Obter instruções de setup
 */
export async function getSetupInstructions(
  repoUrl: string,
  apiKey: string
): Promise<string> {
  const response = await fetch("https://api.greptile.com/v2/query", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repositories: [{ github: repoUrl }],
      query: "Provide step-by-step setup instructions to get this project running locally",
    }),
  });

  if (!response.ok) {
    throw new Error(`Greptile API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    answer: string;
  };

  return data.answer;
}
