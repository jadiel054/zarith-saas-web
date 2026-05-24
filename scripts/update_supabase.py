import requests
import json

SUPABASE_URL = "https://dlwcphhzasvromnagvgh.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsd2NwaGh6YXN2cm9tbmFndmdoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ1MjAwMywiZXhwIjoyMDkxMDI4MDAzfQ.lqQAGSW0uUJoIW2qVE7VHaQFfA_qHF3Yc_mbuCWwCYI"

sql_script = """
-- ==========================================
-- ZARITH SAAS - SCHEMA UPDATE ETAPA 2
-- ==========================================

-- 1. Atualização da tabela de configurações do usuário
ALTER TABLE zarith.settings
ADD COLUMN IF NOT EXISTS custom_system_prompt TEXT,
ADD COLUMN IF NOT EXISTS web_search_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS font_size TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS animations_enabled BOOLEAN DEFAULT true;

-- 2. Tabela de Alertas
CREATE TABLE IF NOT EXISTS zarith.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('warning', 'violation', 'suspension', 'info')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_user_id UUID REFERENCES zarith.users(id),
  sent_by UUID REFERENCES zarith.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Anúncios
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

-- 4. Tabela de Tarefas (Roadmap)
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

-- 5. Tabela de Sanções
CREATE TABLE IF NOT EXISTS zarith.sanctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES zarith.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('suspension', 'ban')),
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES zarith.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Log de Erros
CREATE TABLE IF NOT EXISTS zarith.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route TEXT,
  message TEXT NOT NULL,
  stack TEXT,
  user_id UUID REFERENCES zarith.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela de Configurações Globais do Sistema
CREATE TABLE IF NOT EXISTS zarith.system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Ativação de RLS
ALTER TABLE zarith.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE zarith.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE zarith.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE zarith.sanctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE zarith.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE zarith.system_config ENABLE ROW LEVEL SECURITY;
"""

# Para executar SQL arbitrário via API, o Supabase geralmente exige o uso de uma função RPC 
# chamada 'exec_sql' ou similar que o usuário deve ter criado. 
# Se não houver, a API REST padrão (PostgREST) não permite SQL direto por segurança.
# No entanto, em ambientes de automação, às vezes usa-se a API de gerenciamento ou admin.
# Vou tentar usar o endpoint /rest/v1/rpc/exec_sql se ele existir, 
# ou informar que a execução direta de DDL via REST API sem RPC não é suportada nativamente.

def execute_sql(query):
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    # Tentativa via RPC (comum em setups Supabase para migrações via API)
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    payload = {"query": query}
    
    try:
        response = requests.post(url, headers=headers, data=json.dumps(payload))
        if response.status_code == 200 or response.status_code == 204:
            print("SQL executado com sucesso via RPC.")
            return True
        else:
            print(f"Erro ao executar SQL via RPC: {response.status_code}")
            print(response.text)
            return False
    except Exception as e:
        print(f"Exceção ao tentar RPC: {e}")
        return False

def list_tables():
    headers = {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    
    # Query para listar tabelas
    query = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'zarith' ORDER BY table_name;"
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    payload = {"query": query}
    
    try:
        response = requests.post(url, headers=headers, data=json.dumps(payload))
        if response.status_code == 200:
            tables = response.json()
            print("\nTabelas no schema 'zarith':")
            for table in tables:
                print(f"- {table.get('table_name')}")
        else:
            print(f"Erro ao listar tabelas: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Exceção ao listar tabelas: {e}")

if __name__ == "__main__":
    print("Iniciando execução do SQL no Supabase...")
    if execute_sql(sql_script):
        list_tables()
    else:
        print("\nFalha na execução. Verifique se a função RPC 'exec_sql' existe no seu banco de dados.")
        print("Caso não exista, você pode criá-la no SQL Editor do Supabase com:")
        print("CREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS json AS $$ BEGIN EXECUTE query; RETURN json_build_object('status', 'success'); END; $$ LANGUAGE plpgsql SECURITY DEFINER;")
