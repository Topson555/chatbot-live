import { useState, useRef, useEffect } from 'react';
import { Icon } from './components/Icon';
import { ResponseTrackCards } from './components/ResponseTrackCards';
import { ChatHistoryView, KnowledgeBaseView, ApiKeysView, SystemStatusView } from './components/Views';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { ThinkingIndicator } from './components/ThinkingIndicator';

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
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [currentSessionTitle, setCurrentSessionTitle] = useState(null);
  const [sidebarSessions, setSidebarSessions] = useState([]);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Dynamic Toast Notification State
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  // Session rename/edit state
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingTitleText, setEditingTitleText] = useState('');

  const [messages, setMessages] = useState([
    { id: 1, role: 'bot', text: "Hello! I'm TOPSON AI Assistance. How can I help streamline your workflow today?" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [thinkingStep, setThinkingStep] = useState('Analyzing request...');

  const chatContainerRef = useRef(null);
  const chatEndRef = useRef(null);
  const activeEventSourceRef = useRef(null);
  const isUserScrolledUpRef = useRef(false);
  
  // Ref to hold the input element for session renaming
  const renameInputRef = useRef(null);

  // Helper to trigger toast messages
  const showToast = (message, type = 'info') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'info' }), 3000);
  };

  // Auto-select text only once when edit mode starts
  useEffect(() => {
    if (editingSessionId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [editingSessionId]);

  const fetchSidebarSessions = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/chat/sessions');
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

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isBottom = scrollHeight - scrollTop - clientHeight < 100;
    isUserScrolledUpRef.current = !isBottom;
  };

  useEffect(() => {
    if (!isUserScrolledUpRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, thinkingStep]);

  const handleStartNewChat = () => {
    handleStopGeneration();
    setCurrentSessionId(null);
    setCurrentSessionTitle(null);
    setMessages([
      { id: Date.now(), role: 'bot', text: "Hello! Started a fresh conversation thread. What are we working on?" },
    ]);
    setActiveTab('Chat');
    setIsMobileDrawerOpen(false);
  };

  const handleSelectHistorySession = async (sessionId, title) => {
    handleStopGeneration();
    setCurrentSessionId(sessionId);
    setCurrentSessionTitle(title || `Session ${sessionId.slice(-4)}`);
    setActiveTab('Chat');
    setHistoryLoading(true);
    setIsMobileDrawerOpen(false);

    try {
      const res = await fetch(`http://localhost:5000/api/chat/session/${sessionId}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.messages) && data.messages.length > 0) {
        const formattedMessages = data.messages.map((msg, index) => ({
          id: msg._id || index,
          role: msg.role === 'user' ? 'user' : 'bot',
          text: msg.content,
        }));
        setMessages(formattedMessages);
      } else {
        setMessages([
          { id: Date.now(), role: 'bot', text: `Loaded thread: "${title || 'Untitled Session'}". Continue conversation below!` },
        ]);
      }
    } catch (err) {
      console.error('Failed to load session messages:', err);
      showToast("Failed to load session messages", "error");
      setMessages([
        { id: Date.now(), role: 'bot', text: "Failed to load session messages. Please check server connection." },
      ]);
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

    // Safely stop stream if user deletes active session during generation
    if (currentSessionId === sessionId && activeEventSourceRef.current) {
      handleStopGeneration();
    }

    try {
      const res = await fetch(`http://localhost:5000/api/chat/sessions/${sessionId}`, {
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
      const res = await fetch(`http://localhost:5000/api/chat/sessions/${sessionId}`, {
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

  const handleStopGeneration = () => {
    if (activeEventSourceRef.current) {
      activeEventSourceRef.current.close();
      activeEventSourceRef.current = null;
      setLoading(false);
      fetchSidebarSessions();
    }
  };

  const sendMessageStream = (customText) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;

    isUserScrolledUpRef.current = false;
    const userMessage = { id: Date.now(), role: 'user', text: textToSend };
    const botMessageId = Date.now() + 1;

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setThinkingStep('Analyzing request...');

    setMessages((prev) => [
      ...prev,
      { id: botMessageId, role: 'bot', text: '' }
    ]);

    let streamUrl = `http://localhost:5000/api/chat/stream?prompt=${encodeURIComponent(textToSend)}`;
    if (currentSessionId) {
      streamUrl += `&sessionId=${encodeURIComponent(currentSessionId)}`;
    }

    const eventSource = new EventSource(streamUrl);
    activeEventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        handleStopGeneration();
        return;
      }

      try {
        const data = JSON.parse(event.data);

        if (data.type === 'status') {
          if (data.text) {
            setThinkingStep(data.text);
            setLoading(true);
          } else {
            setLoading(false);
          }
        }

        if (data.type === 'session_meta' && data.sessionId) {
          setCurrentSessionId(data.sessionId);
        }

        if (data.type === 'title_update' && data.title) {
          setCurrentSessionTitle(data.title);
        }

        if (data.type === 'chunk' && data.text) {
          setLoading(false);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMessageId
                ? { ...msg, text: msg.text + data.text }
                : msg
            )
          );
        }
      } catch (e) {
        console.error('Streaming parse error:', e);
      }
    };

    eventSource.onerror = (err) => {
      console.error('Stream error:', err);
      handleStopGeneration();
      showToast("Connection lost during streaming", "error");
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMessageId && !msg.text
            ? { ...msg, text: '⚠️ Connection lost while generating response. Please try again.' }
            : msg
        )
      );
    };
  };

  const exportChat = (format) => {
    let content = '';
    let filename = `chat-export-${currentSessionId || 'session'}.${format}`;

    if (format === 'json') {
      content = JSON.stringify(messages, null, 2);
    } else {
      content = messages.map((m) => `**${m.role.toUpperCase()}**: ${m.text}\n`).join('\n---\n\n');
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
              AC
            </div>
            <div>
              <h3 className="font-bold text-xs leading-tight text-slate-900">Alex Chen</h3>
              <span className="text-[10px] text-slate-500 font-medium">Pro Plan</span>
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
                className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 bg-[#f8fafc]/40"
              >
                {historyLoading ? (
                  <div className="flex items-center justify-center h-48 text-slate-400 text-sm font-medium">
                    Loading conversation thread...
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="max-w-3xl mx-auto space-y-1">
                      {msg.role === 'bot' && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 pl-11 mb-1">
                          <span>TOPSON AI Assistance</span>
                        </div>
                      )}

                      <div className={`flex gap-3 items-start ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'bot' && (
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
                          {msg.role === 'bot' ? (
                            <MarkdownRenderer
                              content={msg.text}
                              onCopySuccess={() => showToast("Code copied to clipboard", "success")}
                            />
                          ) : (
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                          )}

                          {msg.hasCards && <ResponseTrackCards />}
                          {msg.followUp && <p className="mt-4 text-slate-800">{msg.followUp}</p>}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {loading && <ThinkingIndicator step={thinkingStep} />}
                
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 sm:p-6 bg-white border-t border-slate-100 shrink-0">
                <div className="max-w-3xl mx-auto space-y-3">
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {suggestionChips.map((chip) => (
                      <button
                        key={chip}
                        disabled={loading}
                        onClick={() => sendMessageStream(chip)}
                        className="px-4 py-1.5 bg-slate-50 border border-slate-200/80 text-slate-700 rounded-full text-xs font-semibold whitespace-nowrap hover:bg-slate-100 hover:border-slate-300 transition cursor-pointer disabled:opacity-50"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (loading) {
                        handleStopGeneration();
                      } else {
                        sendMessageStream();
                      }
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-full p-1.5 flex items-center gap-1.5 shadow-xs focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100 transition"
                  >
                    <button type="button" className="p-2 text-slate-400 hover:text-slate-600 transition rounded-full cursor-pointer">
                      <Icon name="upload" className="w-5 h-5" />
                    </button>
                    
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={loading ? "Generating response..." : "Message TOPSON AI Assistance..."}
                      disabled={loading}
                      className="flex-1 bg-transparent px-2 text-slate-900 text-sm sm:text-base placeholder:text-slate-400 outline-none disabled:opacity-60"
                    />

                    <button type="button" className="p-2 text-slate-400 hover:text-slate-600 transition rounded-full cursor-pointer">
                      <Icon name="mic" className="w-5 h-5" />
                    </button>

                    {loading ? (
                      <button
                        type="button"
                        onClick={handleStopGeneration}
                        title="Stop response"
                        className="p-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white transition cursor-pointer shadow-xs"
                      >
                        <div className="w-3.5 h-3.5 bg-white rounded-xs" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!input.trim()}
                        className={`p-2.5 rounded-full transition ${
                          input.trim()
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