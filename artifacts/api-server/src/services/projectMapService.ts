/**
 * Project Map Service
 * Gerencia o índice local do projeto para otimizar leitura de arquivos
 */

import fs from "fs";
import path from "path";
import { logger } from "../lib/logger";
import { auditLog } from "../lib/auditLog";

const PROJECT_MAP_FILE = path.join(process.cwd(), "project_map.json");

export interface ProjectMapEntry {
  path: string;
  description: string;
  type: string;
  size: string;
  features?: string[];
  endpoints?: string[];
  methods?: string[];
}

export interface ProjectMap {
  projectName: string;
  description: string;
  version: string;
  lastUpdated: string;
  structure: Record<string, any>;
  features: Record<string, any>;
  apiEndpoints: Record<string, any>;
  environmentVariables: Record<string, string[]>;
  securityLevels: Record<string, any>;
  errorRecoveryStrategies: any[];
  auditLogFormat: Record<string, string>;
  lastModified: Record<string, any>;
}

let cachedProjectMap: ProjectMap | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Ler project_map.json do disco
 */
function readProjectMapFromDisk(): ProjectMap | null {
  try {
    if (!fs.existsSync(PROJECT_MAP_FILE)) {
      logger.warn({}, "project_map.json não encontrado");
      return null;
    }

    const content = fs.readFileSync(PROJECT_MAP_FILE, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    logger.error({ error }, "Erro ao ler project_map.json");
    return null;
  }
}

/**
 * Obter project map com cache
 */
export function getProjectMap(): ProjectMap | null {
  const now = Date.now();

  // Usar cache se ainda estiver válido
  if (cachedProjectMap && (now - cacheTimestamp) < CACHE_DURATION) {
    logger.debug({}, "Usando project map em cache");
    return cachedProjectMap;
  }

  // Ler do disco e atualizar cache
  const projectMap = readProjectMapFromDisk();
  if (projectMap) {
    cachedProjectMap = projectMap;
    cacheTimestamp = now;
    logger.info({}, "Project map carregado e cacheado");
    auditLog("project_map:loaded", { fromCache: false });
  }

  return projectMap;
}

/**
 * Buscar arquivo específico no project map
 */
export function findFileInProjectMap(filePath: string): ProjectMapEntry | null {
  const projectMap = getProjectMap();
  if (!projectMap) return null;

  // Buscar em artifacts/api-server
  if (projectMap.structure?.artifacts?.["api-server"]?.files) {
    const file = projectMap.structure.artifacts["api-server"].files.find(
      (f: ProjectMapEntry) => f.path === filePath
    );
    if (file) return file;
  }

  // Buscar em artifacts/zarith
  if (projectMap.structure?.artifacts?.zarith?.files) {
    const file = projectMap.structure.artifacts.zarith.files.find(
      (f: ProjectMapEntry) => f.path === filePath
    );
    if (file) return file;
  }

  return null;
}

/**
 * Listar todos os arquivos do projeto
 */
export function listAllProjectFiles(): ProjectMapEntry[] {
  const projectMap = getProjectMap();
  if (!projectMap) return [];

  const files: ProjectMapEntry[] = [];

  // Coletar de api-server
  if (projectMap.structure?.artifacts?.["api-server"]?.files) {
    files.push(...projectMap.structure.artifacts["api-server"].files);
  }

  // Coletar de zarith
  if (projectMap.structure?.artifacts?.zarith?.files) {
    files.push(...projectMap.structure.artifacts.zarith.files);
  }

  return files;
}

/**
 * Buscar endpoints da API
 */
export function getAPIEndpoints(module?: string) {
  const projectMap = getProjectMap();
  if (!projectMap) return null;

  if (module) {
    return projectMap.apiEndpoints?.[module] || null;
  }

  return projectMap.apiEndpoints;
}

/**
 * Obter variáveis de ambiente necessárias
 */
export function getRequiredEnvironmentVariables(): string[] {
  const projectMap = getProjectMap();
  if (!projectMap) return [];

  return projectMap.environmentVariables?.required || [];
}

/**
 * Obter níveis de segurança
 */
export function getSecurityLevels() {
  const projectMap = getProjectMap();
  if (!projectMap) return null;

  return projectMap.securityLevels;
}

/**
 * Obter estratégias de recuperação de erros
 */
export function getErrorRecoveryStrategies() {
  const projectMap = getProjectMap();
  if (!projectMap) return [];

  return projectMap.errorRecoveryStrategies || [];
}

/**
 * Buscar informações sobre um serviço específico
 */
export function getServiceInfo(serviceName: string) {
  const projectMap = getProjectMap();
  if (!projectMap) return null;

  const files = listAllProjectFiles();
  return files.find(f => f.path.includes(serviceName));
}

/**
 * Invalidar cache (forçar recarga)
 */
export function invalidateProjectMapCache(): void {
  cachedProjectMap = null;
  cacheTimestamp = 0;
  logger.info({}, "Project map cache invalidado");
  auditLog("project_map:cache_invalidated", {});
}

/**
 * Atualizar project_map.json com novas informações
 */
export function updateProjectMap(updates: Partial<ProjectMap>): boolean {
  try {
    const currentMap = getProjectMap();
    if (!currentMap) return false;

    const updatedMap: ProjectMap = {
      ...currentMap,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };

    fs.writeFileSync(PROJECT_MAP_FILE, JSON.stringify(updatedMap, null, 2), "utf-8");

    // Invalidar cache para forçar recarga
    invalidateProjectMapCache();

    logger.info({}, "Project map atualizado com sucesso");
    auditLog("project_map:updated", { changes: Object.keys(updates) });

    return true;
  } catch (error) {
    logger.error({ error }, "Erro ao atualizar project_map.json");
    auditLog("project_map:update_error", { error: String(error) });
    return false;
  }
}

/**
 * Gerar resumo do projeto para contexto da Zarith
 */
export function generateProjectSummary(): string {
  const projectMap = getProjectMap();
  if (!projectMap) return "Projeto não mapeado";

  const files = listAllProjectFiles();
  const endpoints = getAPIEndpoints();
  const features = projectMap.features;

  return `
# Resumo do Projeto: ${projectMap.projectName}

## Descrição
${projectMap.description}

## Estrutura
- **Total de Arquivos**: ${files.length}
- **Versão**: ${projectMap.version}
- **Última Atualização**: ${projectMap.lastUpdated}

## Principais Arquivos
${files.slice(0, 5).map(f => `- ${f.path}: ${f.description}`).join("\n")}

## Endpoints da API
${Object.entries(endpoints || {}).map(([module, info]: [string, any]) => 
  `### ${module.toUpperCase()}\n${info.endpoints?.map((e: any) => `- [${e.method}] ${e.path}: ${e.description}`).join("\n") || ""}`
).join("\n\n")}

## Features Implementadas
${Object.entries(features || {}).map(([name, info]: [string, any]) => 
  `- **${name}**: ${info.description} (${info.status})`
).join("\n")}

## Níveis de Segurança
${projectMap.securityLevels ? Object.entries(projectMap.securityLevels).map(([level, info]: [string, any]) => 
  `- **${level}**: ${info.description}`
).join("\n") : "Não configurado"}
  `.trim();
}
