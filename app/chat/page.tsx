"use client";

export const dynamic = "force-dynamic";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Adicionar mensagem do usuário
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Criar placeholder para resposta da IA
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // Chamar API com streaming
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-groq-key": process.env.NEXT_PUBLIC_GROQ_KEY || "",
          "x-openrouter-key": process.env.NEXT_PUBLIC_OPENROUTER_KEY || "",
          "x-gemini-key": process.env.NEXT_PUBLIC_GEMINI_KEY || "",
        },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            {
              role: "user",
              content: input,
            },
          ],
          taskType: "chat",
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao chamar API");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data) as { token: string };
              const token = parsed.token;

              // Atualizar mensagem da IA com novo token
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1].content += token;
                return updated;
              });
            } catch {
              // Ignorar linhas inválidas
            }
          }
        }
      }
    } catch (error) {
      console.error("Erro:", error);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].content = "Erro ao processar mensagem";
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-cyan-500 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-cyan-400">ZARITH Chat</h1>
        <a href="/settings" className="text-purple-400 hover:text-purple-300">
          ⚙️ Configurações
        </a>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-5xl mb-4">🤖</div>
              <h2 className="text-2xl font-bold mb-2">Olá! Eu sou Zarith</h2>
              <p className="text-gray-400">Comece uma conversa ou use os comandos rápidos</p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xl px-4 py-3 rounded-lg ${
                message.role === "user"
                  ? "bg-cyan-600 text-white rounded-br-none"
                  : "bg-gray-800 text-gray-100 rounded-bl-none border border-purple-500"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 px-4 py-3 rounded-lg border border-purple-500">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-cyan-500 p-6">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem... (Shift+Enter para nova linha)"
            className="flex-1 bg-gray-900 text-white border border-cyan-500 rounded-lg p-3 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 resize-none"
            rows={3}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
          >
            📤
          </button>
        </div>
      </div>
    </div>
  );
}
