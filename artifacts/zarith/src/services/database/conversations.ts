import { supabaseClient } from "@/lib/supabase";

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export const conversationsService = {
  async listConversations() {
    if (!supabaseClient) return { data: null, error: new Error("Supabase não configurado") };
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return { data: null, error: new Error("Usuário não autenticado") };

    const { data, error } = await supabaseClient
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    return { data: data as Conversation[] | null, error };
  },

  async createConversation(title: string = "Nova conversa") {
    if (!supabaseClient) return { data: null, error: new Error("Supabase não configurado") };
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return { data: null, error: new Error("Usuário não autenticado") };

    const { data, error } = await supabaseClient
      .from("conversations")
      .insert([{ user_id: user.id, title }])
      .select()
      .single();

    return { data: data as Conversation | null, error };
  },

  async updateConversation(id: string, title: string) {
    if (!supabaseClient) return { data: null, error: new Error("Supabase não configurado") };
    const { data, error } = await supabaseClient
      .from("conversations")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    return { data: data as Conversation | null, error };
  },

  async deleteConversation(id: string) {
    if (!supabaseClient) return { error: new Error("Supabase não configurado") };
    const { error } = await supabaseClient
      .from("conversations")
      .delete()
      .eq("id", id);

    return { error };
  }
};
