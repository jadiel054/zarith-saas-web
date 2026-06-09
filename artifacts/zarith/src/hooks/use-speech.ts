import { useEffect, useState } from 'react';

export const useSpeech = () => {
  const [synth, setSynth] = useState<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSynth(window.speechSynthesis);
    }
  }, []);

  const speak = (text: string) => {
    if (synth && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.1;
      synth.speak(utterance);
    }
  };

  return { speak };
};
