# 🚀 Relatório de Migração: Autenticação Nativa (Supabase → Neon)

## 📋 Diagnóstico Inicial

### Data: 2024-11-02  
### Status: Em Andamento  
### Branch: `feat/native-auth`

---

## 🔍 Análise de Dependências Supabase

### Arquivos com Dependência Direta do Supabase (36 arquivos)

#### **Backend (api-server) - 12 arquivos**

| Arquivo | Tipo | Dependência | Função |
|---------|------|-------------|--------|
| `package.json` | Config | `@supabase/supabase-js` | Dependência NPM |
| `src/routes/supabase.ts` | **Core** | `@supabase/supabase-js` | 15+ endpoints SQL |
| `src/services/supabaseAdminService.ts` | **Core** | `@supabase/supabase-js` | Serviço admin |
| `src/services/database/usersService.ts` | DB | `syncFromSupabase` | Sincronização de usuários |
| `src/middlewares/securityValidation.ts` | Security | Referências | Validação de operações |
| `src/routes/index.ts` | Router | Importa `supabaseRouter` | Integração de rotas |
| `src/routes/toolUtils.ts` | Utils | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Funções de suporte |
| `src/routes/chat.ts` | Chat | - | (Verificar) |
| `project_map.json` | Config | Referências | Mapeamento de projeto |

#### **Frontend (zarith) - 24 arquivos**

| Arquivo | Tipo | Dependência | Função |
|---------|------|-------------|--------|
| `package.json` | Config | `@supabase/supabase-js`, `@supabase/ssr` | Dependências NPM |
| `src/lib/supabase.ts` | **Core** | `@supabase/supabase-js` | Cliente Supabase principal |
| `src/pages/login.tsx` | **Auth** | `supabaseClient` | Login/Signup |
| `src/pages/auth-callback.tsx` | **Auth** | `supabaseClient` | Callback OAuth |
| `src/pages/settings.tsx` | User | `supabaseClient` | Gerenciamento de usuário |
| `src/pages/chat.tsx` | Chat | `supabaseClient` | Chat principal |
| `src/pages/memories.tsx` | Data | `supabaseClient` | Memórias |
| `src/App.tsx` | App | `supabaseClient`, `getSessionWithTimeout` | Controle de autenticação |
| `src/hooks/useChatPersistence.ts` | Hook | `getCurrentUser` | Persistência de chat |
| `src/services/database/conversations.ts` | DB | - | (Verificar) |
| `src/services/database/messages.ts` | DB | - | (Verificar) |
| `src/services/execution/supabaseAdmin.ts` | Admin | Supabase | Execução SQL admin |
| `src/services/templates/templatesService.ts` | Templates | Referências | Templates |
| `src/services/tools/formatForModel.ts` | Tools | Referências | Formatação |
| `src/types/tools.ts` | Types | Referências | Tipos |
| `src/components/action-cards.tsx` | UI | Referências | Cards de ação |
| `src/components/tool-call-stream.tsx` | UI | Referências | Stream de tools |
| `src/components/tool-results/supabase/SupabaseTablesResult.tsx` | UI | Supabase | Visualização de tabelas |
| `src/components/tool-results/ToolResultRenderer.tsx` | UI | Referências | Renderer de resultados |
| `vite.config.ts` | Config | Chunk de supabase | Otimização de build |

#### **Scripts - 2 arquivos**

| Arquivo | Tipo | Dependência | Função |
|---------|------|-------------|--------|
| `package.json` | Config | `@supabase/supabase-js` | Dependência NPM |
| `src/database/migrateFromSupabase.ts` | Migration | `@supabase/supabase-js` | Migração de dados |

---

## 🎯 Arquitetura Atual de Autenticação

### Fluxo de Autenticação Atual

```
Frontend (zarith)
    ↓
src/lib/supabase.ts (createClient)
    ↓
Supabase Auth (https://xxx.supabase.co)
    ↓
Token JWT (armazena em localStorage)
    ↓
Requisições com Authorization: Bearer <token>
    ↓
Backend (api-server) - NÃO VALIDA TOKEN!
    ↓
Database (Neon PostgreSQL)
```

### Problemas Identificados

1. **Backend não valida tokens Supabase** - O backend confia no frontend para enviar o user_id
2. **getUserIdFromRequest usa JWT decodificado** - Não valida assinatura, apenas decodifica
3. **Nenhuma proteção de rotas** - Qualquer um pode enviar qualquer user_id
4. **Sessões não são gerenciadas** - Não há controle de sessões no backend
5. **Dependência total do Supabase Auth** - Se o Supabase cair, a autenticação falha

---

## 📊 Funcionalidades que Dependem de Autenticação

### ✅ Funcionalidades Core
- [ ] Cadastro de usuário
- [ ] Login com email/senha
- [ ] Logout
- [ ] Persistência de sessão
- [ ] Recuperação de senha

### ✅ Funcionalidades de Dados
- [ ] Criar conversa
- [ ] Listar conversas do usuário
- [ ] Enviar mensagem
- [ ] Listar mensagens
- [ ] Atualizar perfil
- [ ] Gerenciar templates
- [ ] Gerenciar sites
- [ ] Gerenciar conteúdo
- [ ] Gerenciar API keys

### ✅ Funcionalidades de Ferramentas
- [ ] Executar SQL (admin)
- [ ] Gerenciar usuários (admin)
- [ ] Acessar GitHub
- [ ] Acessar Vercel
- [ ] Acessar Vision

---

## 🔧 Nova Arquitetura Proposta

### Fluxo de Autenticação Nativa

```
Frontend (zarith)
    ↓
POST /api/auth/register (email, password)
    ↓
Backend (api-server)
    ↓
1. Validar email e senha
2. Hash senha com Argon2id
3. Criar usuário no Neon
4. Criar sessão
5. Gerar token JWT (assinado)
    ↓
Retornar: { user, token }
    ↓
Frontend armazena token em HttpOnly Cookie
    ↓
Todas as requisições com Cookie: zarith_session=...
    ↓
Backend valida cookie e token
    ↓
Middleware de autenticação
    ↓
Database (Neon PostgreSQL)
```

### Componentes da Nova Arquitetura

#### **1. Tabelas do Banco de Dados**

```sql
-- Usuários (já existe, adicionar campos)
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN password_reset_token TEXT;
ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMPTZ;

-- Sessões (nova tabela)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT
);

-- Tokens de recuperação (nova tabela)
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **2. Novas Rotas de Autenticação**

```
POST /api/auth/register      - Cadastro
POST /api/auth/login         - Login
POST /api/auth/logout        - Logout
POST /api/auth/refresh       - Refresh token
POST /api/auth/forgot        - Esqueci senha
POST /api/auth/reset         - Reset senha
GET  /api/auth/me            - Meus dados
```

#### **3. Middleware de Autenticação**

```typescript
// Middleware para validar sessão
function authenticate(req, res, next) {
  const token = req.cookies.zarith_session;
  if (!token) return res.status(401).json({ error: "Não autorizado" });
  
  // Validar token no banco
  const session = await db.query.sessions.findFirst({
    where: (sessions, { eq }) => eq(sessions.token, token)
  });
  
  if (!session || session.expires_at < new Date()) {
    return res.status(401).json({ error: "Sessão expirada" });
  }
  
  req.user = await db.query.users.findByPk(session.user_id);
  next();
}
```

---

## 📝 Plano de Execução

### Fase 1: Preparação do Banco de Dados (1-2 horas)
- [ ] Criar tabela de sessões
- [ ] Criar tabela de tokens de recuperação
- [ ] Adicionar campos de autenticação à tabela users
- [ ] Criar migrações Drizzle

### Fase 2: Backend - Autenticação (3-4 horas)
- [ ] Implementar rotas de autenticação
- [ ] Implementar middleware de autenticação
- [ ] Implementar hash de senhas (Argon2id)
- [ ] Implementar gerenciamento de sessões
- [ ] Implementar recuperação de senha

### Fase 3: Backend - Atualização de Serviços (2-3 horas)
- [ ] Atualizar serviços para usar autenticação nativa
- [ ] Remover dependências do Supabase
- [ ] Atualizar middlewares de segurança
- [ ] Validar todas as rotas

### Fase 4: Frontend - Autenticação (3-4 horas)
- [ ] Criar novo componente de login
- [ ] Criar novo componente de cadastro
- [ ] Criar novo componente de recuperação de senha
- [ ] Implementar gerenciamento de cookies
- [ ] Atualizar App.tsx para nova autenticação

### Fase 5: Frontend - Atualização (2-3 horas)
- [ ] Atualizar hooks para usar nova API
- [ ] Atualizar serviços para usar nova autenticação
- [ ] Remover dependências do Supabase
- [ ] Testar todos os componentes

### Fase 6: Remoção do Supabase (1-2 horas)
- [ ] Remover pacotes @supabase/*
- [ ] Remover arquivos relacionados
- [ ] Remover variáveis de ambiente
- [ ] Remover rotas desnecessárias

### Fase 7: Testes (2-3 horas)
- [ ] Testar cadastro
- [ ] Testar login
- [ ] Testar logout
- [ ] Testar persistência de sessão
- [ ] Testar recuperação de senha
- [ ] Testar proteção de rotas
- [ ] Testar isolamento de dados

### Fase 8: Deploy (1-2 horas)
- [ ] Configurar variáveis no Render
- [ ] Configurar variáveis na Vercel
- [ ] Executar migrações no Neon
- [ ] Deploy backend
- [ ] Deploy frontend

---

## ⚠️ Riscos Identificados

### Alto Risco
1. **Perda de dados de usuários** - Usuários existentes no Supabase não terão senhas no Neon
2. **Downtime da autenticação** - Durante a migração, a autenticação pode falhar
3. **Incompatibilidade de sessões** - Sessões ativas do Supabase não funcionarão com a nova autenticação

### Médio Risco
1. **Problemas de CORS** - Cookies entre Vercel e Render podem ter problemas
2. **Problemas de CSRF** - Novas rotas de autenticação precisam de proteção
3. **Rate limiting** - Ataques de brute force nas novas rotas

### Baixo Risco
1. **Problemas de build** - Novas dependências podem causar erros de build
2. **Problemas de typecheck** - Novos tipos podem causar erros de TypeScript

---

## 🛡️ Mitigação de Riscos

### Para Perda de Dados
- **Solução:** Criar script de migração de usuários do Supabase para Neon
- **Ação:** Exportar usuários do Supabase e importar no Neon
- **Observação:** Senhas não podem ser migradas (hash diferente)

### Para Downtime
- **Solução:** Manter Supabase Auth temporariamente
- **Ação:** Implementar autenticação nativa em paralelo
- **Observação:** Migração gradual com fallback

### Para Incompatibilidade de Sessões
- **Solução:** Sessões do Supabase expiram naturalmente
- **Ação:** Usuários precisam fazer login novamente
- **Observação:** Comunicar aos usuários sobre a mudança

---

## 📊 Variáveis de Ambiente Necessárias

### Novas Variáveis

```bash
# Autenticação
JWT_SECRET=super-segredo-para-assinar-tokens
SESSION_EXPIRES_IN=7d  # 7 dias
PASSWORD_RESET_EXPIRES_IN=1h  # 1 hora

# Email (para recuperação de senha)
EMAIL_PROVIDER=smtp  # smtp, sendgrid, mailgun, etc.
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASSWORD=app-password
SMTP_FROM=noreply@zarith.com

# Rate limiting
RATE_LIMIT_LOGIN=5  # 5 tentativas por minuto
RATE_LIMIT_REGISTER=3  # 3 tentativas por minuto
```

### Variáveis para Remover

```bash
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ACCESS_TOKEN=
```

### Variáveis para Manter

```bash
# Neon
DATABASE_URL=postgresql://...neon.tech/...

# Aplicação
NODE_ENV=production
PORT=3000
BASE_PATH=/
```

---

## 🎯 Critérios de Aceitação

### ✅ Funcional
- [ ] Cadastro de novo usuário funciona
- [ ] Login com email/senha funciona
- [ ] Logout funciona
- [ ] Persistência de sessão funciona
- [ ] Recuperação de senha funciona
- [ ] Proteção de rotas funciona
- [ ] Isolamento de dados funciona

### ✅ Segurança
- [ ] Senhas armazenadas com hash seguro (Argon2id)
- [ ] Tokens JWT assinados
- [ ] Cookies HttpOnly, Secure, SameSite
- [ ] Proteção contra CSRF
- [ ] Rate limiting implementado
- [ ] Nenhum vazamento de informações

### ✅ Desempenho
- [ ] Build passa no TypeScript
- [ ] Build passa no ESLint
- [ ] Deploy funciona no Render
- [ ] Deploy funciona na Vercel

### ✅ Qualidade
- [ ] Código limpo e bem documentado
- [ ] Testes cobrem casos críticos
- [ ] Nenhuma dependência do Supabase
- [ ] Arquitetura modular e extensível

---

## 📅 Cronograma Estimado

| Fase | Duração | Prioridade |
|------|----------|------------|
| 1. Preparação do Banco | 1-2 horas | 🔴🔴🔴 |
| 2. Backend - Autenticação | 3-4 horas | 🔴🔴🔴 |
| 3. Backend - Serviços | 2-3 horas | 🔴🔴 |
| 4. Frontend - Autenticação | 3-4 horas | 🔴🔴🔴 |
| 5. Frontend - Atualização | 2-3 horas | 🔴🔴 |
| 6. Remoção do Supabase | 1-2 horas | 🔴 |
| 7. Testes | 2-3 horas | 🔴🔴🔴 |
| 8. Deploy | 1-2 horas | 🔴🔴 |
| **Total** | **16-25 horas** | |

---

## 🚀 Próximos Passos

1. **Começar a implementação** - Criar tabela de sessões
2. **Implementar backend de autenticação** - Rotas e middleware
3. **Implementar frontend de autenticação** - Login, cadastro, logout
4. **Remover dependências do Supabase** - Limpeza final
5. **Testar tudo** - Garantir que funciona
6. **Fazer deploy** - Colocar em produção

---

## 📝 Notas Adicionais

### Decisões de Arquitetura

1. **Hash de Senhas:** Usar Argon2id (mais seguro que bcrypt)
2. **Sessões:** Armazenar no banco de dados (mais seguro que JWT puro)
3. **Tokens:** JWT assinados com expiração
4. **Cookies:** HttpOnly, Secure, SameSite=Lax
5. **CSRF:** Proteção via cookies e headers

### Tecnologias a Serem Usadas

- **Backend:** Express, Drizzle ORM, Argon2id, JWT
- **Frontend:** React, Wouter, Cookies
- **Banco:** Neon PostgreSQL
- **Deploy:** Render (backend), Vercel (frontend)

---

**Status:** ✅ Diagnóstico Completo  
**Próxima Ação:** Iniciar implementação  
**Responsável:** Vibe Code (Mistral AI)