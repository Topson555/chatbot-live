import React, { useState } from 'react';

export const SpeechButton = ({ text }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-Speech is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      type="button"
      onClick={toggleSpeech}
      title={isSpeaking ? 'Stop reading' : 'Read response aloud'}
      className={`p-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
        isSpeaking
          ? 'bg-cyan-500 text-white animate-pulse'
          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
      }`}
    >
      <span>{isSpeaking ? '🔊 Playing...' : '🔊 Read Aloud'}</span>
    </button>
  );
};