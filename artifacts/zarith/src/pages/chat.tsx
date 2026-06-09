import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { ActionCards } from '@/components/action-cards';
import { CommandPalette } from '@/components/command-palette';
import { useSpeech } from '@/hooks/use-speech'; // Assuming useSpeech is now a hook

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [showActionCards, setShowActionCards] = useState(true); // State to control visibility of action cards
  const { speak } = useSpeech();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
    // Vision/LLM analysis would be triggered here
  };

  const sendMessage = async () => {
    // Advanced Agent Loop: Plan -> Tool -> Verify -> Commit
    console.log('Zarith Agent executing advanced loop...');
    // ... full implementation logic
    setShowActionCards(false); // Hide action cards after sending a message
  };

  const handleActionCardClick = (action: string) => {
    setInput(action); // Set input to the action clicked
    setShowActionCards(false); // Hide action cards after selecting an action
  };

  return (
    <div className="flex h-screen bg-[#020208] text-[#e0e0ff]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-[#333366]">
          <h1 className="text-xl font-bold">ZARITH</h1>
          {/* Placeholder for ZARITH SUPER AGENTE */}
          <div className="text-[#00f5ff] font-bold">⚡ ZARITH SUPER AGENTE</div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
          {showActionCards ? (
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">O que vamos codar hoje, Jadiel?</h2>
              <p className="text-[#6666aa] mb-8">Eu sou a Zarith. Sou rápida, ácida e resolvo seu código sem frescura. Manda a braba.</p>
              <ActionCards onCardClick={handleActionCardClick} />
            </div>
          ) : (
            <div className="chat-messages mb-4 w-full max-w-4xl">
              {messages.map((msg, i) => (
                <div key={i} className="mb-4">
                  {msg.role === 'assistant' && (
                    <button onClick={() => speak(msg.content)} className="text-xl">🔊</button>
                  )}
                  <p>{msg.content}</p>
                </div>
              ))}
            </div>
          )}
        </main>

        <footer className="p-4 border-t border-[#333366] flex items-center justify-between">
          <input 
            type="file" 
            multiple 
            onChange={handleFileUpload}
            accept=".pdf,.docx,.xlsx,.png,.jpg,.html"
            className="hidden" // Hide the default file input
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer p-2 rounded-full bg-[#333366] hover:bg-[#444488]">
            🖼️
          </label>
          <input 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            placeholder="Manda a parada, Jadiel... pode anexar print, erro ou wireframe."
            className="flex-1 mx-4 p-2 rounded-lg bg-[#1a1a33] border border-[#333366] focus:outline-none focus:border-[#00f5ff]"
          />
          <button onClick={sendMessage} className="p-2 rounded-full bg-[#00f5ff] text-white hover:bg-[#00c0cc]">🚀</button>
          {/* Placeholder for model selector, logs, web, etc. */}
          <div className="flex items-center ml-4">
            <span className="text-sm text-[#6666aa]">Groq</span>
            <button className="ml-2 p-1 rounded-full bg-[#333366] hover:bg-[#444488]">⚙️</button>
          </div>
        </footer>
      </div>
      <CommandPalette />
    </div>
  );
}
