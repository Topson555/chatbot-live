import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Mic, MicOff, Send, FileText, Loader2, X } from 'lucide-react';

export default function ChatInput({ onSendMessage, onFileUpload }) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const recognitionRef = useRef(null);

  // Fallback explicitly to your live Render backend URL for mobile compatibility
  const API_BASE_URL =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
    'https://chatbot-backend-qbfk.onrender.com';

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  // File & Image Upload Handler
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    // Multimodal Image Handling: Convert directly to base64
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result.split(',')[1];
        const previewUrl = reader.result; // Full Data URL for UI thumbnail preview

        const filePayload = {
          filename: file.name,
          type: 'image',
          previewUrl,
          inlineData: {
            data: base64Data,
            mimeType: file.type,
          },
        };

        setSelectedFile(filePayload);
        if (onFileUpload) onFileUpload(filePayload);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
      return;
    }

    // Knowledge base Documents (PDF/TXT) -> Correct Backend Route (/api/knowledge/upload)
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/knowledge/upload`, {
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

  // Speech Recognition Handler
  const handleMicClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported on this browser/environment. Please try Google Chrome or MS Edge.');
      return;
    }

    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (err) {}
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
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert('Microphone access blocked. Click browser settings to grant permission.');
        }
      };

      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Mic error:', err);
      setIsListening(false);
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!text.trim() && !selectedFile) return;

    if (onSendMessage) {
      onSendMessage({
        message: text,
        // Send previewUrl for message bubble UI display AND base64 inlineData for Gemini API
        imagePreview: selectedFile?.type === 'image' ? selectedFile.previewUrl : null,
        image: selectedFile?.type === 'image' ? selectedFile.inlineData : null,
      });
    }

    setText('');
    setSelectedFile(null);
  };

  return (
    <div className="w-full relative z-30 pointer-events-auto">
      {/* Hidden File Input */}
      <input
        type="file"
        id="chat-file-upload"
        onChange={handleFileChange}
        accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp"
        className="hidden"
      />

      {/* Selected File / Image Preview Badge Above Bar */}
      {selectedFile && (
        <div className="mb-2 flex items-center gap-2 bg-slate-900/90 text-cyan-400 px-3 py-1.5 rounded-xl text-sm w-fit border border-cyan-500/30 shadow-md backdrop-blur-sm">
          {selectedFile.type === 'image' ? (
            <img
              src={selectedFile.previewUrl}
              alt="Uploaded Preview"
              className="w-10 h-10 object-cover rounded-lg border border-cyan-400/40"
            />
          ) : (
            <FileText size={18} className="text-cyan-400" />
          )}

          <div className="flex flex-col">
            <span className="font-medium truncate max-w-xs text-xs text-slate-100">
              {selectedFile.filename}
            </span>
            <span className="text-[10px] text-cyan-400/80 uppercase tracking-wider">
              {selectedFile.type}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setSelectedFile(null)}
            className="ml-2 text-slate-400 hover:text-red-400 transition-colors p-1 rounded-full cursor-pointer"
            title="Remove attachment"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input Container */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border border-cyan-400/40 rounded-full px-4 py-2 shadow-lg bg-slate-950/80 backdrop-blur-md relative z-30"
      >
        <label
          htmlFor="chat-file-upload"
          className="cursor-pointer text-slate-400 hover:text-cyan-400 p-2 rounded-full transition-colors shrink-0 flex items-center justify-center"
          title="Upload file or image"
        >
          {isUploading ? (
            <Loader2 size={20} className="animate-spin text-cyan-400" />
          ) : (
            <Paperclip size={20} />
          )}
        </label>

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message TOPSON AI Assistant..."
          className="flex-1 bg-transparent border-none outline-none text-slate-100 placeholder-slate-400 px-2 text-sm md:text-base"
        />

        {/* Microphone Button */}
        <button
          type="button"
          onClick={handleMicClick}
          className={`cursor-pointer p-2 rounded-full transition-colors shrink-0 ${
            isListening
              ? 'text-red-400 bg-red-500/20 animate-pulse'
              : 'text-slate-400 hover:text-cyan-400'
          }`}
          title={isListening ? 'Stop recording' : 'Start voice input'}
        >
          {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Send Button */}
        {(text.trim() || selectedFile) && (
          <button
            type="submit"
            className="cursor-pointer text-slate-950 bg-cyan-400 hover:bg-cyan-300 p-2 rounded-full transition-colors shadow-md shrink-0 font-bold"
          >
            <Send size={18} />
          </button>
        )}
      </form>
    </div>
  );
}