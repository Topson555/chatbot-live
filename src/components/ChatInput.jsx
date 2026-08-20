import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Mic, MicOff, Send, Image as ImageIcon, FileText, Loader2 } from 'lucide-react';

export default function ChatInput({ onSendMessage, onFileUpload }) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [debugStatus, setDebugStatus] = useState('');

  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  const API_BASE_URL =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
    'http://localhost:5000';

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore cleanup errors
        }
      }
    };
  }, []);

  // 1. Paperclip Handler
  const handlePaperclipClick = (e) => {
    e.stopPropagation();
    setDebugStatus('Paperclip clicked');

    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      setDebugStatus('Error: File input ref missing');
    }
  };

  // 2. File Selection & Upload Handler
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setDebugStatus(`Processing file: ${file.name}`);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result.split(',')[1];
        const filePayload = {
          filename: file.name,
          type: 'image',
          inlineData: {
            data: base64Data,
            mimeType: file.type,
          },
        };
        setSelectedFile(filePayload);
        if (onFileUpload) onFileUpload(filePayload);
        setIsUploading(false);
        setDebugStatus(`Image attached: ${file.name}`);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/knowledge/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.success) {
        const filePayload = {
          filename: file.name,
          type: 'document',
          ...data,
        };
        setSelectedFile(filePayload);
        if (onFileUpload) onFileUpload(filePayload);
        setDebugStatus(`Document processed: ${file.name}`);
      } else {
        alert(data.error || 'Server rejected file upload.');
      }
    } catch (err) {
      console.error('Upload Error:', err);
      alert(`Cannot upload file to backend. Verify server is running on ${API_BASE_URL}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // 3. Speech Recognition Handler
  const handleMicClick = (e) => {
    e.stopPropagation();
    setDebugStatus('Microphone clicked');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your browser. Please use Chrome or MS Edge.');
      return;
    }

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error(err);
      }
      setIsListening(false);
      setDebugStatus('Voice listening stopped');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setDebugStatus('Listening for voice input...');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setDebugStatus(`Captured: "${transcript}"`);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setDebugStatus(`Speech error: ${event.error}`);
        if (event.error === 'not-allowed') {
          alert('Microphone access is blocked. Please check browser permissions in address bar.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Mic initialization error:', err);
      setIsListening(false);
      setDebugStatus(`Mic error: ${err.message}`);
    }
  };

  // 4. Form Submit Handler
  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!text.trim() && !selectedFile) return;

    if (onSendMessage) {
      onSendMessage({
        message: text,
        image: selectedFile?.type === 'image' ? selectedFile.inlineData : null,
      });
    }

    setText('');
    setSelectedFile(null);
    setDebugStatus('Message sent');
  };

  return (
    <div className="relative z-50 w-full max-w-4xl mx-auto p-2 pointer-events-auto">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp"
        className="hidden"
      />

      {debugStatus && (
        <div className="mb-1 text-xs text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 w-fit">
          Status: {debugStatus}
        </div>
      )}

      {selectedFile && (
        <div className="mb-2 flex items-center gap-2 bg-cyan-50 text-cyan-800 px-3 py-1.5 rounded-lg text-sm w-fit border border-cyan-200 shadow-sm">
          {selectedFile.type === 'image' ? <ImageIcon size={16} /> : <FileText size={16} />}
          <span className="font-medium truncate max-w-xs">{selectedFile.filename}</span>
          <button
            type="button"
            onClick={() => setSelectedFile(null)}
            className="ml-2 text-cyan-600 font-bold hover:text-cyan-900 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border border-cyan-400 rounded-full px-4 py-2 shadow-sm bg-white pointer-events-auto relative z-10"
      >
        <button
          type="button"
          onClick={handlePaperclipClick}
          disabled={isUploading}
          className="cursor-pointer text-gray-500 hover:text-cyan-600 p-2 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 relative z-20"
          title="Upload file or image"
        >
          {isUploading ? <Loader2 size={20} className="animate-spin text-cyan-500" /> : <Paperclip size={20} />}
        </button>

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message TOPSON AI Assistance..."
          className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 px-2 text-sm md:text-base"
        />

        <button
          type="button"
          onClick={handleMicClick}
          className={`cursor-pointer p-2 rounded-full transition-colors flex-shrink-0 relative z-20 ${
            isListening ? 'text-red-500 bg-red-100 animate-pulse' : 'text-gray-500 hover:text-cyan-600'
          }`}
          title={isListening ? 'Stop recording' : 'Start voice input'}
        >
          {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {(text.trim() || selectedFile) && (
          <button
            type="submit"
            className="cursor-pointer text-white bg-cyan-500 hover:bg-cyan-600 p-2 rounded-full transition-colors shadow-sm flex-shrink-0 relative z-20"
          >
            <Send size={18} />
          </button>
        )}
      </form>
    </div>
  );
}