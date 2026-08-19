import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Mic, MicOff, Send, Image as ImageIcon, FileText, Loader2 } from 'lucide-react';

export default function ChatInput({ onSendMessage, onFileUpload }) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Determine base backend URL (supports Vite, Create React App, or direct localhost)
  const API_BASE_URL =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
    process.env.REACT_APP_API_URL ||
    'http://localhost:5000';

  // Cleanup speech recognition on component unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // 1. Paperclip Click: Open File Explorer
  const handlePaperclipClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 2. Handle File Upload to Backend Endpoint
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
        alert(data.error || 'Failed to process file on server.');
      }
    } catch (err) {
      console.error('File Upload Error:', err);
      alert(`Upload failed. Ensure backend server is running on ${API_BASE_URL}`);
    } finally {
      setIsUploading(false);
      // Reset input value so re-selecting the same file fires onChange again
      if (e.target) e.target.value = '';
    }
  };

  // 3. Microphone Click: Web Speech API
  const handleMicClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or MS Edge.');
      return;
    }

    // Toggle off if currently listening
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

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = (event) => {
        console.error('Speech Recognition Error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert('Microphone access blocked. Click the lock/camera icon in your address bar to allow microphone permissions.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  // 4. Submit Query
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() && !selectedFile) return;

    onSendMessage({
      message: text,
      image: selectedFile?.type === 'image' ? selectedFile.inlineData : null,
    });

    setText('');
    setSelectedFile(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-2">
      {/* Attached File Preview Badge */}
      {selectedFile && (
        <div className="mb-2 flex items-center gap-2 bg-cyan-50 text-cyan-800 px-3 py-1.5 rounded-lg text-sm w-fit border border-cyan-200 shadow-sm">
          {selectedFile.type === 'image' ? <ImageIcon size={16} /> : <FileText size={16} />}
          <span className="font-medium truncate max-w-xs">{selectedFile.filename}</span>
          <button
            type="button"
            onClick={() => setSelectedFile(null)}
            className="ml-2 text-cyan-600 hover:text-cyan-900 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Input Bar Form Container */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border border-cyan-400 rounded-full px-4 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-cyan-300 transition-all bg-white"
      >
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp"
          className="hidden"
        />

        {/* Paperclip Button */}
        <button
          type="button"
          onClick={handlePaperclipClick}
          disabled={isUploading}
          className="text-gray-500 hover:text-cyan-600 p-1.5 rounded-full transition-colors disabled:opacity-50 flex items-center justify-center"
          title="Upload file or image"
        >
          {isUploading ? (
            <Loader2 size={20} className="animate-spin text-cyan-500" />
          ) : (
            <Paperclip size={20} />
          )}
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message TOPSON AI Assistance..."
          className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 px-2 text-sm md:text-base"
        />

        {/* Microphone Button */}
        <button
          type="button"
          onClick={handleMicClick}
          className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${
            isListening
              ? 'text-red-500 bg-red-100 animate-pulse'
              : 'text-gray-500 hover:text-cyan-600'
          }`}
          title={isListening ? 'Stop listening' : 'Start voice typing'}
        >
          {isListening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* Submit Send Button */}
        {(text.trim() || selectedFile) && (
          <button
            type="submit"
            className="text-white bg-cyan-500 hover:bg-cyan-600 p-1.5 rounded-full transition-colors shadow-sm flex items-center justify-center"
          >
            <Send size={18} />
          </button>
        )}
      </form>
    </div>
  );
}