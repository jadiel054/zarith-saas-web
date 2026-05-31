export type ToolCallStatus = "calling" | "success" | "error";

export interface ToolCallResultEnvelope<T = unknown> {
  ok?: boolean;
  data?: T;
  result?: T;
  error?: string | { message?: string; [key: string]: unknown };
  message?: string;
  [key: string]: unknown;
}

export interface AppToolCall<TArgs = unknown, TResult = unknown> {
  id: string;
  name: string;
  args: TArgs;
  status: ToolCallStatus;
  result?: TResult;
}

export interface GitHubRepoSummary {
  name: string;
  description: string | null;
  language: string | null;
  visibility: "public" | "private" | "internal" | string;
  url: string;
  updated_at: string | null;
}

export interface NormalizedGitHubReposResult {
  repositories: GitHubRepoSummary[];
  total: number;
  displayed: number;
  source?: string;
}
