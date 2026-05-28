/**
 * Zarith Execution Service - Supabase Admin
 * Gerencia a execução de comandos SQL (DDL) para evolução do banco.
 */

export const supabaseAdminService = {
  getSupabaseConfig() {
    return {
      url: localStorage.getItem("zarith_supabase_url") || "",
      key: localStorage.getItem("zarith_apikey_Supabase Service Role") || "",
    };
  },

  async executeSQL(sql: string) {
    const { url, key } = this.getSupabaseConfig();
    if (!url || !key) throw new Error("Configurações do Supabase Admin (Service Role) não encontradas.");

    // A API SQL do Supabase é acessada via o endpoint /rest/v1/rpc/exec_sql (se habilitado)
    // ou via proxy no backend. Como estamos no frontend, simulamos a chamada via API de Admin
    const response = await fetch(`${url}/rest/v1/rpc/execute_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Falha ao executar comando SQL no Supabase");
    }

    return await response.json();
  }
};
