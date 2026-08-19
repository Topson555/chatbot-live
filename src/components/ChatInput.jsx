import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Mic, MicOff, Send, Image as ImageIcon, FileText, Loader2 } from 'lucide-react';

export default function ChatInput({ onSendMessage, onFileUpload }) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  const API_BASE_URL =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
    'http://localhost:5000';

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  // Paperclip Action: Direct DOM Click
  const handlePaperclipClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // File Upload Logic
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/knowledge/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSelectedFile(data);
        if (onFileUpload) onFileUpload(data);
      } else {
        alert(data.error || 'Upload rejected by server');
      }
    } catch (err) {
      console.error('File Upload Error:', err);
      alert(`Cannot upload file. Verify backend runs on ${API_BASE_URL}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Speech Recognition Action
  const handleMicClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition requires Google Chrome or MS Edge on Desktop.');
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };
      recognition.onerror = (event) => {
        console.error('Speech error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert('Microphone access blocked. Enable permissions in the address bar lock icon.');
        }
      };
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Mic initialization error:', err);
      setIsListening(false);
    }
  };

  // Form Submit Action
  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!text.trim() && !selectedFile) return;

    onSendMessage({
      message: text,
      image: selectedFile?.type === 'image' ? selectedFile.inlineData : null,
    });

    setText('');
    setSelectedFile(null);
  };

  return (
    <div className="relative z-50 w-full max-w-4xl mx-auto p-2">
      {/* Hidden Native File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp"
        className="hidden"
        style={{ display: 'none' }}
      />

      {/* Selected File Indicator */}
      {selectedFile && (
        <div className="mb-2 flex items-center gap-2 bg-cyan-50 text-cyan-800 px-3 py-1.5 rounded-lg text-sm w-fit border border-cyan-200">
          {selectedFile.type === 'image' ? <ImageIcon size={16} /> : <FileText size={16} />}
          <span className="font-medium truncate max-w-xs">{selectedFile.filename}</span>
          <button
            type="button"
            onClick={() => setSelectedFile(null)}
            className="ml-2 text-cyan-600 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Input Outer Bar */}
      <div className="flex items-center gap-2 border border-cyan-400 rounded-full px-4 py-2 shadow-sm bg-white pointer-events-auto">
        {/* Paperclip Button */}
        <button
          type="button"
          onClick={handlePaperclipClick}
          disabled={isUploading}
          className="cursor-pointer text-gray-500 hover:text-cyan-600 p-2 rounded-full transition-colors flex-shrink-0"
          title="Upload file or image"
        >
          {isUploading ? <Loader2 size={20} className="animate-spin text-cyan-500" /> : <Paperclip size={20} />}
        </button>

        {/* Text Area Input */}
        <form onSubmit={handleSubmit} className="flex-1 flex items-center">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message TOPSON AI Assistance..."
            className="w-full bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 px-2 text-sm md:text-base"
          />
        </form>

        {/* Microphone Button */}
        <button
          type="button"
          onClick={handleMicClick}
          className={`cursor-pointer p-2 rounded-full transition-colors flex-shrink-0 ${
            isListening ? 'text-red-500 bg-red-100 animate-pulse' : 'text-gray-500 hover:text-cyan-600'
          }`}
          title={isListening ? 'Stop recording' : 'Start voice input'}
        >
          {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Send Button */}
        {(text.trim() || selectedFile) && (
          <button
            type="button"
            onClick={handleSubmit}
            className="cursor-pointer text-white bg-cyan-500 hover:bg-cyan-600 p-2 rounded-full transition-colors shadow-sm flex-shrink-0"
          >
            <Send size={18} />
          </button>
        )}
      </div>
    </div>
  );
}