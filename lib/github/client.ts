/**
 * Cliente GitHub com operações de repositório
 */

export interface GitHubUser {
  login: string;
  name: string;
  bio: string;
  followers: number;
  following: number;
  public_repos: number;
  avatar_url: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  url: string;
  stars: number;
  language: string;
  updated_at: string;
}

export interface GitHubSearchResult {
  items: GitHubRepository[];
  total_count: number;
}

/**
 * Obter informações do usuário GitHub
 */
export async function getGitHubUser(username: string, token: string): Promise<GitHubUser> {
  const response = await fetch(`https://api.github.com/users/${username}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    login: string;
    name: string;
    bio: string;
    followers: number;
    following: number;
    public_repos: number;
    avatar_url: string;
  };

  return {
    login: data.login,
    name: data.name,
    bio: data.bio,
    followers: data.followers,
    following: data.following,
    public_repos: data.public_repos,
    avatar_url: data.avatar_url,
  };
}

/**
 * Listar repositórios do usuário
 */
export async function getUserRepositories(
  username: string,
  token: string,
  sort: "updated" | "stars" | "forks" = "updated"
): Promise<GitHubRepository[]> {
  const response = await fetch(
    `https://api.github.com/users/${username}/repos?sort=${sort}&per_page=30`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = (await response.json()) as Array<{
    id: number;
    name: string;
    full_name: string;
    description: string;
    html_url: string;
    stargazers_count: number;
    language: string;
    updated_at: string;
  }>;

  return data.map((repo) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description,
    url: repo.html_url,
    stars: repo.stargazers_count,
    language: repo.language,
    updated_at: repo.updated_at,
  }));
}

/**
 * Buscar repositórios por query
 */
export async function searchRepositories(
  query: string,
  token: string,
  sort: "stars" | "forks" | "updated" = "stars"
): Promise<GitHubSearchResult> {
  const response = await fetch(
    `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=${sort}&per_page=30`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    items: Array<{
      id: number;
      name: string;
      full_name: string;
      description: string;
      html_url: string;
      stargazers_count: number;
      language: string;
      updated_at: string;
    }>;
    total_count: number;
  };

  return {
    items: data.items.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      stars: repo.stargazers_count,
      language: repo.language,
      updated_at: repo.updated_at,
    })),
    total_count: data.total_count,
  };
}

/**
 * Obter informações detalhadas de um repositório
 */
export async function getRepository(
  owner: string,
  repo: string,
  token: string
): Promise<GitHubRepository> {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    id: number;
    name: string;
    full_name: string;
    description: string;
    html_url: string;
    stargazers_count: number;
    language: string;
    updated_at: string;
  };

  return {
    id: data.id,
    name: data.name,
    full_name: data.full_name,
    description: data.description,
    url: data.html_url,
    stars: data.stargazers_count,
    language: data.language,
    updated_at: data.updated_at,
  };
}
