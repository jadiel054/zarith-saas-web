# 🎯 Configuração do Neon para Zarith SaaS

## Passo a Passo para Configurar o Neon

---

## 📋 1. Criar Conta no Neon

1. Acesse [https://neon.tech](https://neon.tech)
2. Clique em **"Sign Up"** ou **"Get Started"**
3. Faça login com GitHub, Google ou email
4. Confirme seu email

---

## 🆕 2. Criar Projeto

1. No dashboard, clique em **"New Project"**
2. Dê um nome ao projeto: `zarith-saas`
3. Selecione a região mais próxima de você
4. Clique em **"Create Project"**

---

## 🗄️ 3. Criar Banco de Dados

1. No projeto criado, clique em **"New Database"**
2. Dê um nome: `zarith`
3. Selecione a versão do PostgreSQL (recomendado: 16)
4. Clique em **"Create Database"**

---

## 🔗 4. Obter Connection String

1. No banco de dados criado, clique em **"Connect"**
2. Selecione **"Connection String"**
3. Copie a string no formato:
   ```
   postgresql://user:password@ep-xxx-123456.region.aws.neon.tech/zarith?sslmode=require
   ```
4. **Salve esta string!** Você vai precisar dela para a configuração.

---

## 🔐 5. Configurar Variáveis de Ambiente

### No Vercel:

1. Vá no seu projeto no Vercel
2. Acesse **"Settings" → "Environment Variables"**
3. Adicione as seguintes variáveis:

```bash
# Neon Database (Obrigatório)
DATABASE_URL=postgresql://user:password@ep-xxx.region.neon.tech/zarith?sslmode=require

# Supabase Auth (Opcional - se quiser manter)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### No Replit:

1. Abra o projeto no Replit
2. Clique no ícone de **"Environment Variables"** (ou "Secrets")
3. Adicione as variáveis acima

### Localmente:

1. Crie um arquivo `.env` na raiz do projeto
2. Adicione as variáveis:

```bash
# .env
DATABASE_URL=postgresql://user:password@ep-xxx.region.neon.tech/zarith?sslmode=require

# Opcional (Supabase Auth)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

---

## 🚀 6. Testar Conexão

Execute o seguinte comando para testar a conexão com o Neon:

```bash
# Instalar dependências (se não tiver)
pnpm install

# Testar conexão com o banco
pnpm --filter @workspace/db run build
```

Se tudo estiver correto, você não verá erros.

---

## 📦 7. Executar Migrações

### Usando Drizzle Kit (Recomendado)

```bash
# Gerar migrações (se não tiver)
pnpm exec drizzle-kit generate:pg

# Aplicar migrações
pnpm exec drizzle-kit push:pg
```

### Manual (SQL)

1. Copie o conteúdo de `lib/db/migrations/0000_initial_schema.sql`
2. No Neon Dashboard:
   - Vá no banco de dados
   - Clique em **"SQL Editor"**
   - Cole o SQL e execute

---

## 🔄 8. Migrar Dados do Supabase

Se você já tinha dados no Supabase, execute o script de migração:

```bash
# Configure as variáveis de ambiente do Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx

# Execute o script
pnpm --filter scripts run migrate-from-supabase
```

---

## ✅ 9. Verificar Tudo

### Verificar tabelas no Neon:

1. No Neon Dashboard
2. Vá em **"SQL Editor"**
3. Execute:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Você deve ver as seguintes tabelas:
- api_keys
- conversations
- content
- messages
- sites
- templates
- users

---

## 🎉 10. Deploy para Produção

### No Vercel:

```bash
# Fazer deploy
vercel --prod
```

### No Replit:

1. Clique em **"Run"**
2. O Replit fará deploy automaticamente

---

## 🛠️ Solução de Problemas

### Problema: "DATABASE_URL must be set"

**Causa:** Variável de ambiente não configurada

**Solução:** Verifique se a variável `DATABASE_URL` está definida no seu ambiente.

---

### Problema: "Connection refused" ou "Connection timeout"

**Causa:** Connection string incorreta ou Neon inacessível

**Solução:**
1. Verifique se a connection string está correta
2. Verifique se o Neon está acessível (tente acessar o dashboard)
3. Verifique se a região do Neon é compatível com sua localização

---

### Problema: "Table does not exist"

**Causa:** Migrações não executadas

**Solução:** Execute as migrações antes de usar a aplicação.

---

### Problema: "Permission denied for table"

**Causa:** Usuário sem permissão no Neon

**Solução:**
1. No Neon Dashboard, vá em **"Database" → "Roles"**
2. Verifique as permissões do usuário
3. Garanta que o usuário tem permissão de leitura/escrita

---

### Problema: "SSL connection error"

**Causa:** Conexão SSL não configurada corretamente

**Solução:** Adicione `?sslmode=require` na connection string:
```
postgresql://user:password@host/dbname?sslmode=require
```

---

## 📊 Monitoramento

### Verificar uso do banco:

1. No Neon Dashboard
2. Vá em **"Monitoring"**
3. Veja:
   - CPU Usage
   - Memory Usage
   - Storage Usage
   - Active Connections

### Verificar logs:

1. No Neon Dashboard
2. Vá em **"Logs"**
3. Filtre por:
   - Errors
   - Queries
   - Connections

---

## 💡 Dicas

### 1. Branch para Testes

Crie um branch no Neon para testes:
1. No Neon Dashboard
2. Clique em **"Branches"**
3. Crie um branch chamado `dev` ou `staging`
4. Use uma connection string diferente para cada ambiente

### 2. Backup

O Neon faz backup automático, mas você pode fazer backup manual:
1. No Neon Dashboard
2. Clique em **"Backups"**
3. Clique em **"Create Backup"**

### 3. Restore

Para restaurar de um backup:
1. No Neon Dashboard
2. Clique em **"Backups"**
3. Selecione o backup
4. Clique em **"Restore"**

---

## 📚 Recursos Adicionais

- [Neon Documentation](https://neon.tech/docs)
- [Neon Pricing](https://neon.tech/pricing)
- [Neon Status](https://status.neon.tech)
- [Neon Community](https://neon.tech/community)

---

## 🎯 Resumo

| Passo | Descrição | Status |
|-------|-----------|--------|
| 1 | Criar conta no Neon | ✅ |
| 2 | Criar projeto | ✅ |
| 3 | Criar banco de dados | ✅ |
| 4 | Obter connection string | ✅ |
| 5 | Configurar variáveis | ✅ |
| 6 | Testar conexão | ✅ |
| 7 | Executar migrações | ✅ |
| 8 | Migrar dados | ✅ |
| 9 | Verificar tudo | ✅ |
| 10 | Deploy | 🚀 |

---

**Pronto!** Seu sistema Zarith SaaS agora está configurado com Neon! 🎉

Se precisar de ajuda, consulte o [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) ou abra uma issue no GitHub.