import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { ActionCards } from '@/components/action-cards';
import { CommandPalette } from '@/components/command-palette';
import { useSpeech } from '@/hooks/use-speech';
import { Zap, Image as ImageIcon, Send, Settings, Globe, TerminalSquare } from 'lucide-react';

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [showActionCards, setShowActionCards] = useState(true);
  const { speak } = useSpeech();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const sendMessage = async () => {
    if (!input.trim() && files.length === 0) return;
    
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    setShowActionCards(false);
    
    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Estou processando sua solicitação...' }]);
    }, 1000);
  };

  const handleActionCardClick = (action: string) => {
    setInput(action);
    setShowActionCards(false);
  };

  return (
    <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      <Sidebar 
        user={{ name: "Jadiel", email: "jadielalves54@gmail.com" }}
        sessions={[]}
        onSelectSession={() => {}}
      />
      
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-[var(--border-glow)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-orbitron font-black bg-gradient-to-r from-[#00f5ff] to-[#bf00ff] bg-clip-text text-transparent">ZARITH</h1>
          </div>
          <div className="flex items-center gap-2 text-[#00f5ff] text-xs font-bold tracking-widest uppercase">
            <Zap size={14} />
            <span>Zarith Super Agente</span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 flex flex-col items-center relative pb-32">
          {showActionCards ? (
            <div className="flex flex-col items-center justify-center h-full w-full max-w-4xl mt-12">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#00f5ff] to-[#bf00ff] flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(0,245,255,0.3)]">
                <Zap size={40} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-3 text-white">O que vamos codar hoje, Jadiel?</h2>
              <p className="text-[var(--text-secondary)] mb-12 text-center max-w-lg">
                Eu sou a Zarith. Sou rápida, ácida e resolvo seu código sem frescura. Manda a braba.
              </p>
              <ActionCards onSelectAction={handleActionCardClick} />
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mt-12 font-bold">
                Clique em um card ou escreva sua mensagem abaixo
              </p>
            </div>
          ) : (
            <div className="w-full max-w-4xl mx-auto space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-r from-[#00f5ff] to-[#bf00ff] text-white rounded-tr-sm' 
                      : 'bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-tl-sm'
                  }`}>
                    {msg.role === 'assistant' && (
                      <button onClick={() => speak(msg.content)} className="mb-2 text-[var(--text-secondary)] hover:text-[#00f5ff]">
                        🔊
                      </button>
                    )}
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Floating Input Area */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-glow)] rounded-2xl p-3 shadow-2xl shadow-black/50 backdrop-blur-xl">
            <div className="flex items-end gap-3">
              <div className="flex-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-glow)] p-1 flex items-center">
                <label htmlFor="file-upload" className="cursor-pointer p-2.5 rounded-lg hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] transition-colors">
                  <ImageIcon size={20} />
                </label>
                <input 
                  type="file" 
                  multiple 
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <textarea 
                  value={input} 
                  onChange={e => setInput(e.target.value)} 
                  placeholder="Manda a parada, Jadiel... pode anexar print, erro ou wireframe."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-2.5 resize-none max-h-32 min-h-[44px] outline-none"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center bg-[var(--bg-secondary)] border border-[var(--border-glow)] rounded-xl p-1">
                  <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--bg-card-hover)] text-sm font-bold text-[#00f5ff] transition-colors">
                    <Zap size={16} />
                    Groq
                  </button>
                  <div className="w-px h-6 bg-[var(--border-glow)] mx-1"></div>
                  <button className="p-2 rounded-lg hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] transition-colors" title="Logs">
                    <TerminalSquare size={18} />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] transition-colors" title="Web Search">
                    <Globe size={18} />
                  </button>
                </div>
                
                <button 
                  onClick={sendMessage} 
                  className="p-3.5 rounded-xl bg-gradient-to-r from-[#00f5ff] to-[#bf00ff] text-white hover:brightness-110 transition-all shadow-[0_0_15px_rgba(0,245,255,0.3)]"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <CommandPalette />
    </div>
  );
}
