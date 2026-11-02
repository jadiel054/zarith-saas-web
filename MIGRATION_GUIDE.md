# 🚀 Guia de Migração do Supabase para Neon

## Visão Geral

Este guia explica como migrar o banco de dados do **Supabase** para **Neon** no projeto Zarith SaaS.

**Status:** ✅ **Tudo pronto para migração!**

---

## 📋 O que foi feito

### ✅ Backend (api-server)
- [x] Criado schema completo no Drizzle (7 tabelas)
- [x] Criadas migrações SQL
- [x] Criados serviços de banco usando Drizzle ORM
- [x] Criadas rotas REST para todas as entidades
- [x] Mantido suporte ao Supabase Auth (opcional)

### ✅ Frontend (zarith)
- [x] Criado API Client para comunicar com o backend
- [x] Atualizados serviços de mensagens e conversas
- [x] Atualizado hook useChatPersistence
- [x] Mantido Supabase Auth para autenticação

### ✅ Scripts
- [x] Criado script de migração de dados
- [x] Atualizado .env.example

---

## 🎯 Estrutura do Banco de Dados

### Tabelas Criadas

| Tabela | Descrição | Campos Principais |
|--------|-----------|------------------|
| `users` | Usuários do sistema | id, email, name, avatar_url, is_admin |
| `conversations` | Sessões de chat | id, user_id, title, model, temperature |
| `messages` | Mensagens do chat | id, conversation_id, role, content, tool_call_id |
| `templates` | Templates para geração | id, user_id, name, type, files, category |
| `sites` | Sites criados pelo usuário | id, user_id, name, domain, content, status |
| `content` | Conteúdo (artigos, posts) | id, user_id, title, slug, markdown_content |
| `api_keys` | API keys para integrações | id, user_id, name, key, permissions |

---

## 📦 Dependências

### Backend (api-server/package.json)
```json
{
  "dependencies": {
    "@workspace/db": "workspace:*",
    "drizzle-orm": "catalog:",
    "pg": "^8.12.0"
  }
}
```

### Database (lib/db/package.json)
```json
{
  "dependencies": {
    "drizzle-orm": "catalog:",
    "pg": "^8.12.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.24.2"
  }
}
```

### Frontend (artifacts/zarith/package.json)
- ❌ **REMOVER** `@supabase/supabase-js` e `@supabase/ssr` (se não usar Auth)
- ✅ **MANTER** `@supabase/supabase-js` (se usar Auth)

---

## 🔧 Configuração do Ambiente

### 1. Criar Banco no Neon

1. Acesse [https://neon.tech](https://neon.tech)
2. Crie um novo projeto
3. Crie um banco de dados
4. Copie a **connection string**

### 2. Configurar Variáveis de Ambiente

#### .env (Neon - Obrigatório)
```bash
DATABASE_URL=postgresql://user:password@ep-xxx.region.neon.tech/dbname?sslmode=require
```

#### .env (Supabase Auth - Opcional)
Se quiser manter o Supabase Auth:
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

---

## 🚀 Passos para Migração

### Passo 1: Configurar Neon

1. Crie o banco no Neon
2. Defina a variável `DATABASE_URL` no Vercel/Replit
3. Teste a conexão:

```bash
pnpm --filter @workspace/db run build
```

### Passo 2: Executar Migrações

#### Opção A: Usar Drizzle Kit
```bash
# Instalar drizzle-kit (se não tiver)
pnpm add -D drizzle-kit

# Gerar migrações
pnpm exec drizzle-kit generate:pg

# Aplicar migrações
pnpm exec drizzle-kit push:pg
```

#### Opção B: Executar SQL manualmente
```bash
# O arquivo de migração está em:
# lib/db/migrations/0000_initial_schema.sql

# Execute no Neon Dashboard ou via psql
psql postgresql://user:password@ep-xxx.neon.tech/dbname < lib/db/migrations/0000_initial_schema.sql
```

### Passo 3: Migrar Dados do Supabase

```bash
# Executar script de migração
pnpm --filter scripts run migrate-from-supabase
```

**Requisitos:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (Neon)

### Passo 4: Atualizar Frontend

#### Remover dependências do Supabase (opcional)
```bash
# Se não usar Supabase Auth, remova:
pnpm remove @supabase/supabase-js @supabase/ssr
```

#### Atualizar Vite Config
Remova o chunk de supabase em `artifacts/zarith/vite.config.ts`:
```typescript
// Remover esta linha:
supabase: ["@supabase/supabase-js", "@supabase/ssr"],
```

### Passo 5: Testar Tudo

```bash
# Testar backend
pnpm --filter @workspace/api-server run dev

# Testar frontend
pnpm --filter @workspace/zarith run dev

# Testar fluxo completo:
# 1. Login (se usar Supabase Auth)
# 2. Criar conversa
# 3. Enviar mensagem
# 4. Ver histórico
```

---

## 🔄 Manter Supabase Auth

Se você quer **manter o Supabase Auth** (recomendado):

1. **Mantenha** as dependências `@supabase/supabase-js`
2. **Mantenha** os arquivos:
   - `src/lib/supabase.ts`
   - `src/pages/login.tsx`
   - `src/pages/auth-callback.tsx`
   - `src/pages/settings.tsx`

3. **Configure o Supabase para usar Neon:**
   - No Supabase Dashboard:
     1. Vá em Authentication → Database
     2. Configure para usar o Neon como banco de dados
     3. Atualize a connection string

---

## 📊 Endpoints da API

### Base URL
```
https://seu-dominio.vercel.app/api/
```

### Conversações
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/database/conversations` | Listar conversas |
| GET | `/database/conversations/:id` | Obter conversa |
| POST | `/database/conversations` | Criar conversa |
| PUT | `/database/conversations/:id` | Atualizar conversa |
| DELETE | `/database/conversations/:id` | Deletar conversa |

### Mensagens
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/database/messages/:conversationId` | Listar mensagens |
| GET | `/database/messages/:conversationId/last` | Última mensagem |
| POST | `/database/messages` | Criar mensagem |
| POST | `/database/messages/batch` | Criar várias mensagens |
| DELETE | `/database/messages/:id` | Deletar mensagem |

### Usuários
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/database/users/me` | Meus dados |
| PUT | `/database/users/me` | Atualizar meus dados |
| GET | `/database/users` | Listar usuários (admin) |
| POST | `/database/users/sync` | Sincronizar do Supabase |

### Templates
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/database/templates` | Listar templates |
| POST | `/database/templates` | Criar template |
| PUT | `/database/templates/:id` | Atualizar template |
| DELETE | `/database/templates/:id` | Deletar template |

### Sites
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/database/sites` | Listar sites |
| POST | `/database/sites` | Criar site |
| PUT | `/database/sites/:id` | Atualizar site |
| DELETE | `/database/sites/:id` | Deletar site |

### Conteúdo
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/database/content` | Listar conteúdo |
| POST | `/database/content` | Criar conteúdo |
| PUT | `/database/content/:id` | Atualizar conteúdo |
| DELETE | `/database/content/:id` | Deletar conteúdo |

---

## 🛠️ Solução de Problemas

### Erro: "DATABASE_URL must be set"
**Solução:** Defina a variável `DATABASE_URL` no seu ambiente.

### Erro: "Connection refused"
**Solução:** Verifique se o Neon está acessível e a connection string está correta.

### Erro: "Table does not exist"
**Solução:** Execute as migrações antes de usar a aplicação.

### Erro: "Permission denied"
**Solução:** Verifique as permissões no Neon Dashboard.

---

## 📚 Documentação Adicional

- [Neon Documentation](https://neon.tech/docs)
- [Drizzle ORM](https://orm.drizzle.team/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

---

## 🎉 Próximos Passos

1. **Configurar Neon** ✅
2. **Executar migrações** ✅
3. **Migrar dados** ✅
4. **Testar aplicação** ✅
5. **Deploy para produção** 🚀

---

## 💬 Suporte

Se precisar de ajuda, abra uma issue no GitHub ou entre em contato.

---

**Versão:** 1.0.0  
**Última atualização:** 2024-11-02  
**Autor:** Vibe Code (Mistral AI) + Jadiel