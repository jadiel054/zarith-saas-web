-- Criar schema isolado
CREATE SCHEMA IF NOT EXISTS zarith;

-- Usuários
CREATE TABLE zarith.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessões de chat
CREATE TABLE zarith.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES zarith.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mensagens
CREATE TABLE zarith.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES zarith.chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  model_used TEXT,   -- qual modelo da IA respondeu
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memórias de longo prazo
CREATE TABLE zarith.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES zarith.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  importance INTEGER DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configurações por usuário
CREATE TABLE zarith.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES zarith.users(id) ON DELETE CASCADE UNIQUE,
  active_model TEXT DEFAULT 'groq',  -- groq | qwen-coder | deepseek-r1 | glm | gemini
  groq_api_key_encrypted TEXT,
  openrouter_api_key_encrypted TEXT,
  gemini_api_key_encrypted TEXT,
  github_token_encrypted TEXT,
  greptile_api_key_encrypted TEXT,
  theme TEXT DEFAULT 'cyberpunk',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security em todas as tabelas
ALTER TABLE zarith.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE zarith.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE zarith.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE zarith.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE zarith.settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (usuário só vê seus próprios dados)
CREATE POLICY "users_own_data" ON zarith.users
  FOR ALL USING (auth_user_id = auth.uid());

CREATE POLICY "chats_own_data" ON zarith.chats
  FOR ALL USING (user_id IN (
    SELECT id FROM zarith.users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "messages_own_data" ON zarith.messages
  FOR ALL USING (chat_id IN (
    SELECT c.id FROM zarith.chats c
    JOIN zarith.users u ON c.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  ));

CREATE POLICY "memories_own_data" ON zarith.memories
  FOR ALL USING (user_id IN (
    SELECT id FROM zarith.users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "settings_own_data" ON zarith.settings
  FOR ALL USING (user_id IN (
    SELECT id FROM zarith.users WHERE auth_user_id = auth.uid()
  ));
