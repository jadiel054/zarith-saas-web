// Database Routes
// Rotas para gerenciamento do banco de dados via Neon

import { Router } from "express";
import conversationsRouter from "./conversations";
import messagesRouter from "./messages";
import usersRouter from "./users";
import templatesRouter from "./templates";
import sitesRouter from "./sites";
import contentRouter from "./content";
import apiKeysRouter from "./apiKeys";
import sqlRouter from "./sql";

const router = Router();

// Rotas de conversas
router.use("/conversations", conversationsRouter);

// Rotas de mensagens
router.use("/messages", messagesRouter);

// Rotas de usuários
router.use("/users", usersRouter);

// Rotas de templates
router.use("/templates", templatesRouter);

// Rotas de sites
router.use("/sites", sitesRouter);

// Rotas de conteúdo
router.use("/content", contentRouter);

// Rotas de API keys
router.use("/api-keys", apiKeysRouter);

// Rotas para execução SQL direta (para ferramentas)
router.use("/sql", sqlRouter);

export default router;
