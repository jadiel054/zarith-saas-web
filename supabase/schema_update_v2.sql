-- Coluna adicional em zarith.settings
ALTER TABLE zarith.settings
ADD COLUMN IF NOT EXISTS custom_system_prompt TEXT,
ADD COLUMN IF NOT EXISTS web_search_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS font_size TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS animations_enabled BOOLEAN DEFAULT true;

-- Alertas
CREATE TABLE IF NOT EXISTS zarith.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('warning', 'violation', 'suspension', 'info')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_user_id UUID REFERENCES zarith.users(id),
  sent_by UUID REFERENCES zarith.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Anúncios
CREATE TABLE IF NOT EXISTS zarith.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  version TEXT,
  is_featured BOOLEAN DEFAULT false,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tarefas do roadmap
CREATE TABLE IF NOT EXISTS zarith.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'done')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sanções
CREATE TABLE IF NOT EXISTS zarith.sanctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES zarith.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('suspension', 'ban')),
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES zarith.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log de erros
CREATE TABLE IF NOT EXISTS zarith.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route TEXT,
  message TEXT NOT NULL,
  stack TEXT,
  user_id UUID REFERENCES zarith.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configurações do sistema
CREATE TABLE IF NOT EXISTS zarith.system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS nas novas tabelas
ALTER TABLE zarith.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE zarith.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE zarith.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE zarith.sanctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE zarith.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE zarith.system_config ENABLE ROW LEVEL SECURITY;
