/**
 * Script de migração de dados do Supabase para Neon
 * 
 * Uso:
 *   pnpm --filter scripts run migrate-from-supabase
 * 
 * Requisitos:
 *   1. Configure DATABASE_URL com a connection string do Neon
 *   2. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
 *   3. Execute o script
 */

import { createClient } from "@supabase/supabase-js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

// Configuração
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL é obrigatório");
  process.exit(1);
}

// Cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Função para migrar usuários
async function migrateUsers() {
  console.log("🔄 Migrando usuários...");
  
  const { data: users, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error("❌ Erro ao listar usuários do Supabase:", error);
    return;
  }
  
  if (!users || users.length === 0) {
    console.log("✅ Não há usuários para migrar");
    return;
  }
  
  console.log(`📊 Encontrados ${users.length} usuários para migrar`);
  
  for (const user of users) {
    try {
      // Verificar se usuário já existe no Neon
      const [existing] = await db
        .select()
        .from(sql`users`)
        .where(sql`id = ${user.id}`)
        .limit(1);
      
      if (existing) {
        console.log(`⏭️ Usuário ${user.id} já existe, pulando...`);
        continue;
      }
      
      // Inserir usuário
      await db.insert(sql`users`).values({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email,
        avatar_url: user.user_metadata?.avatar_url,
        email_verified: user.email_confirmed_at !== null,
        is_active: true,
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at,
        last_login_at: user.last_sign_in_at,
      });
      
      console.log(`✅ Usuário ${user.id} migrado`);
    } catch (err) {
      console.error(`❌ Erro ao migrar usuário ${user.id}:`, err);
    }
  }
  
  console.log("✅ Migração de usuários concluída");
}

// Função para migrar conversas
async function migrateConversations() {
  console.log("🔄 Migrando conversas...");
  
  const { data, error } = await supabase
    .from("conversations")
    .select("*");
  
  if (error) {
    console.error("❌ Erro ao listar conversas do Supabase:", error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log("✅ Não há conversas para migrar");
    return;
  }
  
  console.log(`📊 Encontradas ${data.length} conversas para migrar`);
  
  for (const conv of data) {
    try {
      // Verificar se conversa já existe
      const [existing] = await db
        .select()
        .from(sql`conversations`)
        .where(sql`id = ${conv.id}`)
        .limit(1);
      
      if (existing) {
        console.log(`⏭️ Conversa ${conv.id} já existe, pulando...`);
        continue;
      }
      
      // Inserir conversa
      await db.insert(sql`conversations`).values({
        id: conv.id,
        user_id: conv.user_id,
        title: conv.title || "Nova conversa",
        model: conv.model || "zarith-default",
        temperature: conv.temperature || "0.7",
        is_public: conv.is_public || false,
        share_token: conv.share_token,
        created_at: conv.created_at,
        updated_at: conv.updated_at || conv.created_at,
        messages_count: conv.messages_count || 0,
        tokens_used: conv.tokens_used || 0,
      });
      
      console.log(`✅ Conversa ${conv.id} migrada`);
    } catch (err) {
      console.error(`❌ Erro ao migrar conversa ${conv.id}:`, err);
    }
  }
  
  console.log("✅ Migração de conversas concluída");
}

// Função para migrar mensagens
async function migrateMessages() {
  console.log("🔄 Migrando mensagens...");
  
  const { data, error } = await supabase
    .from("messages")
    .select("*");
  
  if (error) {
    console.error("❌ Erro ao listar mensagens do Supabase:", error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log("✅ Não há mensagens para migrar");
    return;
  }
  
  console.log(`📊 Encontradas ${data.length} mensagens para migrar`);
  
  for (const msg of data) {
    try {
      // Verificar se mensagem já existe
      const [existing] = await db
        .select()
        .from(sql`messages`)
        .where(sql`id = ${msg.id}`)
        .limit(1);
      
      if (existing) {
        console.log(`⏭️ Mensagem ${msg.id} já existe, pulando...`);
        continue;
      }
      
      // Inserir mensagem
      await db.insert(sql`messages`).values({
        id: msg.id,
        conversation_id: msg.conversation_id,
        role: msg.role,
        content: msg.content,
        model: msg.model,
        token_count: msg.token_count,
        tool_call_id: msg.tool_call_id,
        tool_name: msg.tool_name,
        tool_arguments: msg.tool_arguments,
        tool_result: msg.tool_result,
        created_at: msg.created_at,
      });
      
      console.log(`✅ Mensagem ${msg.id} migrada`);
    } catch (err) {
      console.error(`❌ Erro ao migrar mensagem ${msg.id}:`, err);
    }
  }
  
  console.log("✅ Migração de mensagens concluída");
}

// Função para migrar templates
async function migrateTemplates() {
  console.log("🔄 Migrando templates...");
  
  const { data, error } = await supabase
    .from("templates")
    .select("*");
  
  if (error) {
    console.error("❌ Erro ao listar templates do Supabase:", error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log("✅ Não há templates para migrar");
    return;
  }
  
  console.log(`📊 Encontrados ${data.length} templates para migrar`);
  
  for (const template of data) {
    try {
      // Verificar se template já existe
      const [existing] = await db
        .select()
        .from(sql`templates`)
        .where(sql`id = ${template.id}`)
        .limit(1);
      
      if (existing) {
        console.log(`⏭️ Template ${template.id} já existe, pulando...`);
        continue;
      }
      
      // Inserir template
      await db.insert(sql`templates`).values({
        id: template.id,
        user_id: template.user_id,
        name: template.name,
        description: template.description,
        type: template.type || "component",
        files: template.files || [],
        category: template.category,
        tags: template.tags || [],
        is_public: template.is_public || false,
        is_featured: template.is_featured || false,
        created_at: template.created_at,
        updated_at: template.updated_at || template.created_at,
        usage_count: template.usage_count || 0,
        like_count: template.like_count || 0,
      });
      
      console.log(`✅ Template ${template.id} migrado`);
    } catch (err) {
      console.error(`❌ Erro ao migrar template ${template.id}:`, err);
    }
  }
  
  console.log("✅ Migração de templates concluída");
}

// Função para migrar sites
async function migrateSites() {
  console.log("🔄 Migrando sites...");
  
  const { data, error } = await supabase
    .from("sites")
    .select("*");
  
  if (error) {
    console.error("❌ Erro ao listar sites do Supabase:", error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log("✅ Não há sites para migrar");
    return;
  }
  
  console.log(`📊 Encontrados ${data.length} sites para migrar`);
  
  for (const site of data) {
    try {
      // Verificar se site já existe
      const [existing] = await db
        .select()
        .from(sql`sites`)
        .where(sql`id = ${site.id}`)
        .limit(1);
      
      if (existing) {
        console.log(`⏭️ Site ${site.id} já existe, pulando...`);
        continue;
      }
      
      // Inserir site
      await db.insert(sql`sites`).values({
        id: site.id,
        user_id: site.user_id,
        name: site.name,
        domain: site.domain,
        status: site.status || "draft",
        template_id: site.template_id,
        content: site.content || {},
        deploy_url: site.deploy_url,
        deploy_provider: site.deploy_provider,
        deploy_id: site.deploy_id,
        is_public: site.is_public || false,
        is_indexable: site.is_indexable !== undefined ? site.is_indexable : true,
        created_at: site.created_at,
        updated_at: site.updated_at || site.created_at,
        deployed_at: site.deployed_at,
        visits: site.visits || 0,
      });
      
      console.log(`✅ Site ${site.id} migrado`);
    } catch (err) {
      console.error(`❌ Erro ao migrar site ${site.id}:`, err);
    }
  }
  
  console.log("✅ Migração de sites concluída");
}

// Função para migrar conteúdo
async function migrateContent() {
  console.log("🔄 Migrando conteúdo...");
  
  const { data, error } = await supabase
    .from("content")
    .select("*");
  
  if (error) {
    console.error("❌ Erro ao listar conteúdo do Supabase:", error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log("✅ Não há conteúdo para migrar");
    return;
  }
  
  console.log(`📊 Encontrados ${data.length} conteúdos para migrar`);
  
  for (const content of data) {
    try {
      // Verificar se conteúdo já existe
      const [existing] = await db
        .select()
        .from(sql`content`)
        .where(sql`id = ${content.id}`)
        .limit(1);
      
      if (existing) {
        console.log(`⏭️ Conteúdo ${content.id} já existe, pulando...`);
        continue;
      }
      
      // Inserir conteúdo
      await db.insert(sql`content`).values({
        id: content.id,
        user_id: content.user_id,
        title: content.title,
        slug: content.slug,
        excerpt: content.excerpt,
        type: content.type || "article",
        markdown_content: content.markdown_content,
        html_content: content.html_content,
        metadata: content.metadata || {},
        status: content.status || "draft",
        is_public: content.is_public !== undefined ? content.is_public : true,
        is_featured: content.is_featured || false,
        created_at: content.created_at,
        updated_at: content.updated_at || content.created_at,
        published_at: content.published_at,
        views: content.views || 0,
        likes: content.likes || 0,
        comments_count: content.comments_count || 0,
        seo_title: content.seo_title,
        seo_description: content.seo_description,
      });
      
      console.log(`✅ Conteúdo ${content.id} migrado`);
    } catch (err) {
      console.error(`❌ Erro ao migrar conteúdo ${content.id}:`, err);
    }
  }
  
  console.log("✅ Migração de conteúdo concluída");
}

// Função principal
async function main() {
  console.log("🚀 Iniciando migração de dados do Supabase para Neon");
  console.log("=" .repeat(60));
  
  try {
    // Testar conexão com Neon
    console.log("🔍 Testando conexão com Neon...");
    await db.execute(sql`SELECT 1`);
    console.log("✅ Conexão com Neon funcionando");
    
    // Testar conexão com Supabase
    console.log("🔍 Testando conexão com Supabase...");
    const { data, error } = await supabase.from("conversations").select("*").limit(1);
    if (error) {
      console.error("❌ Erro ao conectar com Supabase:", error);
      process.exit(1);
    }
    console.log("✅ Conexão com Supabase funcionando");
    
    console.log("");
    console.log("📋 Iniciando migração...");
    console.log("-" .repeat(60));
    
    // Migrar em ordem
    await migrateUsers();
    console.log("");
    
    await migrateConversations();
    console.log("");
    
    await migrateMessages();
    console.log("");
    
    await migrateTemplates();
    console.log("");
    
    await migrateSites();
    console.log("");
    
    await migrateContent();
    console.log("");
    
    console.log("=" .repeat(60));
    console.log("✅ Migração concluída com sucesso!");
    console.log("=" .repeat(60));
    
  } catch (err) {
    console.error("❌ Erro durante a migração:", err);
    process.exit(1);
  }
}

main();
