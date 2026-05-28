import { supabaseClient } from "@/lib/supabase";

export interface DBMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  created_at: string;
}

export const messagesService = {
  async listMessages(conversationId: string) {
    if (!supabaseClient) return { data: null, error: new Error("Supabase não configurado") };
    const { data, error } = await supabaseClient
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    return { data: data as DBMessage[] | null, error };
  },

  async saveMessage(conversationId: string, role: "user" | "assistant" | "system", content: string, model?: string) {
    if (!supabaseClient) return { data: null, error: new Error("Supabase não configurado") };
    const { data, error } = await supabaseClient
      .from("messages")
      .insert([{ conversation_id: conversationId, role, content, model }])
      .select()
      .single();

    return { data: data as DBMessage | null, error };
  }
};
