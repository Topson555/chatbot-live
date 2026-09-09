import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './components/Icon';
import { ResponseTrackCards } from './components/ResponseTrackCards';
import { ChatHistoryView, KnowledgeBaseView, ApiKeysView, SystemStatusView } from './components/Views';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { ThinkingIndicator } from './components/ThinkingIndicator';
import { useChatStream } from './hooks/useChatStream';
import { compressImage } from './utils/compressImage';

// Dynamic API Base URL resolver with Render production fallback
const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'https://chatbot-backend-qbfk.onrender.com';

const suggestionChips = [
  "Summarize my day",
  "Help me write an email",
  "Review code snippet",
];

const sidebarNavItems = [
  { label: 'Chat', icon: 'chat' },
  { label: 'Chat History', icon: 'history' },
  { label: 'Knowledge Base', icon: 'knowledge' },
  { label: 'API Keys', icon: 'key' },
  { label: 'System Status', icon: 'status' },
];

export default function Chatbot() {
  const [activeTab, setActiveTab] = useState('Chat');
  const [currentSessionTitle, setCurrentSessionTitle] = useState(null);
  const [sidebarSessions, setSidebarSessions] = useState([]);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // File & Image state
  const [selectedFilePayload, setSelectedFilePayload] = useState(null);

  // Custom Streaming & Recovery Hook initialized with dynamic API Base URL
  const {
    messages,
    setMessages,
    sendMessage,
    cancelStream,
    retryLastMessage,
    isStreaming,
    currentSessionId,
  } = useChatStream(API_BASE_URL);

  // Voice recognition state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Toast Notification State
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  // Session rename/edit state
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingTitleText, setEditingTitleText] = useState('');

  const [input, setInput] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);

  const chatContainerRef = useRef(null);
  const chatEndRef = useRef(null);
  const isUserScrolledUpRef = useRef(false);
  const isTouchingRef = useRef(false);
  const renameInputRef = useRef(null);

  const showToast = (message, type = 'info') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'info' }), 3000);
  };

  // Image & Document Upload Handler with Client-Side Compression
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      try {
        showToast('Compressing image...', 'info');
        const compressedPayload = await compressImage(file);
        setSelectedFilePayload(compressedPayload);
        showToast(`Attached image: ${file.name}`, 'info');
      } catch (err) {
        console.error('Image compression error:', err);
        showToast('Failed to process image', 'error');
      }
      e.target.value = '';
    } else {
      showToast(`Selected file: ${file.name}`, 'info');
      e.target.value = '';
    }
  };

  // Microphone / Speech Recognition Handler
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast('Speech recognition is not supported in this browser.', 'error');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        showToast('Listening... Speak now', 'info');
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        showToast(`Mic error: ${event.error}`, 'error');
      };

      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      showToast('Could not access microphone', 'error');
    }
  };

  useEffect(() => {
    if (editingSessionId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingSessionId]);

  const fetchSidebarSessions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/sessions`);
      if (res.ok) {
        const data = await res.json();
        const sessionsList = data.sessions || (Array.isArray(data) ? data : []);
        setSidebarSessions(sessionsList);
      }
    } catch (err) {
      console.error('Failed to fetch sidebar sessions:', err);
    }
  };

  useEffect(() => {
    fetchSidebarSessions();
  }, [currentSessionId]);

  // SMART SCROLL: Detect manual scroll and touch events to avoid fighting user input
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 80;
    isUserScrolledUpRef.current = !isAtBottom || isTouchingRef.current;
  };

  const handleTouchStart = () => {
    isTouchingRef.current = true;
  };

  const handleTouchEnd = () => {
    isTouchingRef.current = false;
  };

  // SMART SCROLL: Auto scroll on new chunks if user has not manually scrolled up or touched container
  useEffect(() => {
    if (!isUserScrolledUpRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  const handleStartNewChat = () => {
    setMessages([
      { id: Date.now(), role: 'model', content: "Hello! Started a fresh conversation thread. What are we working on?" },
    ]);
    setCurrentSessionTitle(null);
    setSelectedFilePayload(null);
    setActiveTab('Chat');
    setIsMobileDrawerOpen(false);
  };

  const handleSelectHistorySession = async (sessionId, title) => {
    setCurrentSessionTitle(title || `Session ${sessionId.slice(-4)}`);
    setActiveTab('Chat');
    setHistoryLoading(true);
    setIsMobileDrawerOpen(false);

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/session/${sessionId}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.messages) && data.messages.length > 0) {
        const formattedMessages = data.messages.map((msg, index) => ({
          id: msg._id || index,
          role: msg.role === 'user' ? 'user' : 'model',
          content: msg.content,
        }));
        setMessages(formattedMessages);
      } else {
        setMessages([
          { id: Date.now(), role: 'model', content: `Loaded thread: "${title || 'Untitled Session'}". Continue conversation below!` },
        ]);
      }
    } catch (err) {
      console.error('Failed to load session messages:', err);
      showToast("Failed to load session messages", "error");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDeleteSession = async (e, sessionId) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (!window.confirm("Are you sure you want to delete this chat session?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSidebarSessions((prev) => prev.filter((s) => s._id !== sessionId));
        showToast("Session deleted successfully", "success");

        if (currentSessionId === sessionId) {
          handleStartNewChat();
        }
      } else {
        showToast(data.error || "Delete failed on server", "error");
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
      showToast("Server error during deletion", "error");
    }
  };

  const handleStartRename = (e, session) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setEditingSessionId(session._id);
    setEditingTitleText(session.title || 'Untitled Chat');
  };

  const handleSaveRename = async (e, sessionId) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (!editingTitleText.trim()) {
      setEditingSessionId(null);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitleText.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSidebarSessions((prev) =>
          prev.map((s) => (s._id === sessionId ? { ...s, title: editingTitleText.trim() } : s))
        );

        if (currentSessionId === sessionId) {
          setCurrentSessionTitle(editingTitleText.trim());
        }
        showToast("Session renamed", "success");
      } else {
        showToast(data.error || "Rename failed", "error");
      }
    } catch (err) {
      console.error("Failed to rename session:", err);
      showToast("Server error during rename", "error");
    } finally {
      setEditingSessionId(null);
    }
  };

  const handleFormSubmit = (e) => {
    e?.preventDefault();
    if ((!input.trim() && !selectedFilePayload) || isStreaming) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    isUserScrolledUpRef.current = false;

    // Send both Base64 inlineData (backend) and previewUrl (UI thumbnail bubble)
    sendMessage({
      message: input,
      imagePreview: selectedFilePayload?.type === 'image' ? selectedFilePayload.previewUrl : null,
      image: selectedFilePayload?.type === 'image' ? selectedFilePayload.inlineData : null,
    });

    setInput('');
    setSelectedFilePayload(null);
  };

  const exportChat = (format) => {
    let content = '';
    let filename = `chat-export-${currentSessionId || 'session'}.${format}`;

    if (format === 'json') {
      content = JSON.stringify(messages, null, 2);
    } else {
      content = messages.map((m) => `**${m.role.toUpperCase()}**: ${m.content}\n`).join('\n---\n\n');
    }

    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setShowSettingsMenu(false);
    showToast(`Exported as ${format.toUpperCase()}`, "success");
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full justify-between select-none">
      <div className="space-y-2">
        <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-xs mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs tracking-wider">
              EM
            </div>
            <div>
              <h3 className="font-bold text-xs leading-tight text-slate-900">Emmanuel</h3>
              <span className="text-[10px] text-slate-500 font-medium">Developer</span>
            </div>
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-500 font-medium px-1.5 py-0.5 rounded">v2.4.0</span>
        </div>

        <button
          onClick={handleStartNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition shadow-xs cursor-pointer mb-2"
        >
          <Icon name="plus" className="w-4 h-4" />
          New Chat
        </button>

        <nav className="space-y-0.5">
          {sidebarNavItems.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setActiveTab(item.label);
                setIsMobileDrawerOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === item.label
                  ? 'bg-[#38bdf8] text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
              }`}
            >
              <Icon name={item.icon} className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-3 border-t border-slate-200/60">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
            Recent Chats
          </p>
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
            {sidebarSessions.map((session) => {
              const isActive = currentSessionId === session._id && activeTab === 'Chat';
              const isEditing = editingSessionId === session._id;

              return (
                <div
                  key={session._id}
                  className={`group relative flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-800 font-semibold border border-cyan-300/50'
                      : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex items-center w-full gap-1 z-20">
                      <input
                        type="text"
                        ref={renameInputRef}
                        value={editingTitleText}
                        onChange={(e) => setEditingTitleText(e.target.value)}
                        onBlur={(e) => handleSaveRename(e, session._id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(e, session._id);
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                        className="w-full bg-white border border-cyan-400 text-slate-900 px-1.5 py-0.5 rounded outline-none text-xs"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => handleSaveRename(e, session._id)}
                        className="px-1.5 py-0.5 bg-cyan-500 text-white rounded text-[10px] font-bold cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <>
                      <span
                        onClick={() => handleSelectHistorySession(session._id, session.title)}
                        className="truncate pr-14 flex-1 cursor-pointer"
                      >
                        {session.title || 'Untitled Chat'}
                      </span>

                      <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-white/95 p-0.5 rounded-lg shadow-xs transition-opacity z-10">
                        <button
                          type="button"
                          onClick={(e) => handleStartRename(e, session)}
                          className="p-1 text-slate-400 hover:text-cyan-600 transition cursor-pointer"
                          title="Rename"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(e, session._id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition cursor-pointer"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-800 overflow-hidden font-sans relative">
      {/* Toast Notification Container */}
      {toast.visible && (
        <div className={`fixed top-4 right-4 z-50 text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg border flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
          toast.type === 'error' 
            ? 'bg-red-900 text-white border-red-700' 
            : toast.type === 'success'
            ? 'bg-emerald-900 text-white border-emerald-700'
            : 'bg-slate-900 text-white border-slate-700'
        }`}>
          <span>{toast.type === 'error' ? '❌' : toast.type === 'success' ? '✓' : 'ℹ️'} {toast.message}</span>
        </div>
      )}

      <aside className="hidden lg:flex flex-col w-64 bg-[#edf3ff]/60 border-r border-slate-200/70 p-4 shrink-0">
        {renderSidebarContent()}
      </aside>

      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <aside className="relative w-72 max-w-[80%] bg-[#edf3ff] p-4 flex flex-col h-full z-10 shadow-xl border-r border-slate-200 animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
            >
              ✕
            </button>
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      <main className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
        <header className="h-16 border-b border-slate-100 px-4 sm:px-6 flex items-center justify-between bg-white z-10 shrink-0 relative">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200"
            >
              <Icon name="chat" className="w-5 h-5" />
            </button>

            <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center font-bold text-sm">
              🤖
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate max-w-[180px] sm:max-w-xs">
                {currentSessionTitle || 'TOPSON AI Assistance'}
              </h1>
              {currentSessionId && (
                <p className="text-[10px] text-slate-400 font-mono">Session ID: {currentSessionId}</p>
              )}
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer"
            >
              <Icon name="settings" className="w-5 h-5" />
            </button>
            {showSettingsMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50 text-xs">
                <p className="px-3 py-1 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Export Options</p>
                <button
                  onClick={() => exportChat('markdown')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700"
                >
                  Export as Markdown (.md)
                </button>
                <button
                  onClick={() => exportChat('json')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700"
                >
                  Export as JSON (.json)
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'Chat History' && (
            <ChatHistoryView onSelectSession={handleSelectHistorySession} />
          )}

          {activeTab === 'Knowledge Base' && <KnowledgeBaseView />}
          {activeTab === 'API Keys' && <ApiKeysView />}
          {activeTab === 'System Status' && <SystemStatusView />}

          {activeTab === 'Chat' && (
            <div className="flex flex-col h-full">
              <div
                ref={chatContainerRef}
                onScroll={handleScroll}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 bg-[#f8fafc]/40"
              >
                {historyLoading ? (
                  <div className="flex items-center justify-center h-48 text-slate-400 text-sm font-medium">
                    Loading conversation thread...
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isLastMessage = index === messages.length - 1;

                    return (
                      <div key={msg.id} className="max-w-3xl mx-auto space-y-1">
                        {msg.role === 'model' && (
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 pl-11 mb-1">
                            <span>TOPSON AI Assistance</span>
                          </div>
                        )}

                        <div className={`flex gap-3 items-start ${msg.role === 'user' ? 'justify-end' : ''}`}>
                          {msg.role === 'model' && (
                            <div className="w-8 h-8 rounded-full bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 shrink-0 mt-0.5 shadow-xs">
                              🤖
                            </div>
                          )}

                          <div
                            className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed max-w-[92%] sm:max-w-[80%] ${
                              msg.role === 'user'
                                ? 'bg-[#1b1937] text-white rounded-br-xs shadow-xs'
                                : 'bg-[#eef8f9] border border-cyan-100 text-slate-900 rounded-bl-xs'
                            }`}
                          >
                            {/* Render Attached Image Preview Thumbnail in User Bubbles */}
                            {msg.imagePreview && (
                              <div className="mb-2 overflow-hidden rounded-xl border border-white/20">
                                <img
                                  src={msg.imagePreview}
                                  alt="User attachment"
                                  className="max-h-60 w-full object-cover rounded-xl"
                                />
                              </div>
                            )}

                            {msg.isLoading ? (
                              <ThinkingIndicator step="Generating response..." />
                            ) : msg.role === 'model' ? (
                              <MarkdownRenderer
                                content={msg.content}
                                isStreaming={isStreaming && isLastMessage}
                                onCopySuccess={() => showToast("Code copied to clipboard", "success")}
                              />
                            ) : (
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            )}

                            {/* Error Recovery Inline Retry Button */}
                            {msg.isError && (
                              <div className="mt-2 pt-2 border-t border-red-200/40 flex items-center justify-between gap-2">
                                <span className="text-xs text-red-600 font-medium">{msg.content}</span>
                                <button
                                  type="button"
                                  onClick={retryLastMessage}
                                  className="px-3 py-1 bg-red-500 text-white hover:bg-red-600 text-xs font-bold rounded-lg transition shadow-xs cursor-pointer shrink-0"
                                >
                                  🔄 Retry
                                </button>
                              </div>
                            )}

                            {msg.sources && (
                              <div className="mt-3 pt-2 border-t border-slate-200/50 text-xs text-slate-500">
                                <span className="font-semibold text-slate-700">Sources:</span> {msg.sources.join(', ')}
                              </div>
                            )}

                            {msg.hasCards && <ResponseTrackCards />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                <div ref={chatEndRef} />
              </div>

              <div className="p-4 sm:p-6 bg-[#f8fafc]/40 border-t border-slate-100 shrink-0">
                <div className="max-w-3xl mx-auto space-y-3">
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {suggestionChips.map((chip) => (
                      <button
                        key={chip}
                        disabled={isStreaming}
                        onClick={() => sendMessage({ message: chip })}
                        className="px-4 py-1.5 bg-slate-50 border border-slate-200/80 text-slate-700 rounded-full text-xs font-semibold whitespace-nowrap hover:bg-slate-100 hover:border-slate-300 transition cursor-pointer disabled:opacity-50"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {/* Selected Attachment Badge */}
                  {selectedFilePayload && (
                    <div className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-xs w-fit border border-slate-300 shadow-xs">
                      {selectedFilePayload.type === 'image' && (
                        <img
                          src={selectedFilePayload.previewUrl}
                          alt="preview"
                          className="w-5 h-5 rounded object-cover"
                        />
                      )}
                      <span className="font-medium truncate max-w-xs">{selectedFilePayload.filename}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedFilePayload(null)}
                        className="ml-1 text-slate-500 hover:text-red-600 font-bold cursor-pointer"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  <form
                    onSubmit={handleFormSubmit}
                    className="bg-slate-50 border border-slate-200 rounded-full p-1.5 flex items-center gap-1.5 shadow-xs focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100 transition relative pointer-events-auto z-10"
                  >
                    <label
                      htmlFor="file-upload"
                      className="p-2 text-slate-400 hover:text-slate-600 transition rounded-full cursor-pointer flex items-center justify-center shrink-0"
                      title="Upload file or image"
                    >
                      <Icon name="upload" className="w-5 h-5" />
                      <input
                        id="file-upload"
                        type="file"
                        accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.webp"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={isStreaming ? "Generating response..." : isListening ? "Listening..." : "Message TOPSON AI Assistance..."}
                      disabled={isStreaming}
                      className="flex-1 bg-transparent px-2 text-slate-900 text-sm sm:text-base placeholder:text-slate-400 outline-none disabled:opacity-60"
                    />

                    <button
                      type="button"
                      onClick={toggleSpeechRecognition}
                      disabled={isStreaming}
                      title={isListening ? "Stop listening" : "Start listening"}
                      className={`p-2 transition rounded-full cursor-pointer shrink-0 ${
                        isListening
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Icon name="mic" className="w-5 h-5" />
                    </button>

                    {/* Swap Send Button for Stop Button while streaming */}
                    {isStreaming ? (
                      <button
                        type="button"
                        onClick={cancelStream}
                        title="Stop generating"
                        className="p-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-xs transition cursor-pointer shrink-0 flex items-center justify-center"
                      >
                        <span className="w-3.5 h-3.5 bg-white rounded-xs" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={(!input.trim() && !selectedFilePayload)}
                        className={`p-2.5 rounded-full transition shrink-0 ${
                          input.trim() || selectedFilePayload
                            ? 'bg-cyan-400 text-white shadow-xs hover:bg-cyan-500 cursor-pointer' 
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <Icon name="send" className="w-4 h-4" />
                      </button>
                    )}
                  </form>

                  <p className="text-[11px] text-center text-slate-400 hidden sm:block">
                    TOPSON AI can make mistakes. Verify important info.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}