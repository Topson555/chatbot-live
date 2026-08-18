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
  const [messages, setMessages] = useState([
    { id: 1, role: 'bot', text: "Hello! I'm TOPSON AI Assistance. How can I help streamline your workflow today?" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [thinkingStep, setThinkingStep] = useState('Analyzing request...');

  const chatEndRef = useRef(null);

  const fetchSidebarSessions = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/chat/sessions');
      if (res.ok) {
        const data = await res.json();
        setSidebarSessions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch sidebar sessions:', err);
    }
  };

  useEffect(() => {
    fetchSidebarSessions();
  }, [currentSessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, thinkingStep]);

  const handleStartNewChat = () => {
    setCurrentSessionId(null);
    setCurrentSessionTitle(null);
    setMessages([
      { id: Date.now(), role: 'bot', text: "Hello! Started a fresh conversation thread. What are we working on?" },
    ]);
    setActiveTab('Chat');
  };

  const handleSelectHistorySession = async (sessionId, title) => {
    setCurrentSessionId(sessionId);
    setCurrentSessionTitle(title || `Session ${sessionId.slice(-4)}`);
    setActiveTab('Chat');
    setHistoryLoading(true);

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
      setMessages([
        { id: Date.now(), role: 'bot', text: "Failed to load session messages. Please check server connection." },
      ]);
    } finally {
      setHistoryLoading(false);
    }
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
  };

  const sendMessageStream = (customText) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;

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

    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        eventSource.close();
        setLoading(false);
        fetchSidebarSessions();
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

    eventSource.onerror = () => {
      eventSource.close();
      setLoading(false);
    };
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-800 overflow-hidden font-sans">
      
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#edf3ff]/60 border-r border-slate-200/70 p-4 justify-between select-none">
        <div className="space-y-2">
          {/* USER PROFILE CARD */}
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

          {/* NEW CHAT BUTTON */}
          <button
            onClick={handleStartNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition shadow-xs cursor-pointer mb-2"
          >
            <Icon name="plus" className="w-4 h-4" />
            New Chat
          </button>

          {/* MAIN SIDEBAR NAVIGATION */}
          <nav className="space-y-0.5">
            {sidebarNavItems.map((item) => (
              <button
                key={item.label}
                onClick={() => setActiveTab(item.label)}
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

          {/* SCROLLABLE RECENT CHATS SECTION */}
          <div className="pt-3 border-t border-slate-200/60">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
              Recent Chats
            </p>
            <div className="space-y-1 max-h-52 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
              {sidebarSessions.map((session) => {
                const isActive = currentSessionId === session._id && activeTab === 'Chat';
                return (
                  <button
                    key={session._id}
                    onClick={() => handleSelectHistorySession(session._id, session.title)}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium truncate transition cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-800 font-semibold border border-cyan-300/50'
                        : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
                    }`}
                  >
                    {session.title || 'Untitled Chat'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
        {/* HEADER */}
        <header className="h-16 border-b border-slate-100 px-6 flex items-center justify-between bg-white z-10 shrink-0 relative">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center font-bold text-sm">
              🤖
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
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

        {/* DYNAMIC VIEWS CONTAINER */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'Chat History' && (
            <ChatHistoryView onSelectSession={handleSelectHistorySession} />
          )}

          {activeTab === 'Knowledge Base' && <KnowledgeBaseView />}
          {activeTab === 'API Keys' && <ApiKeysView />}
          {activeTab === 'System Status' && <SystemStatusView />}

          {activeTab === 'Chat' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 bg-[#f8fafc]/40">
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
                            <MarkdownRenderer content={msg.text} />
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

              {/* INPUT BAR */}
              <div className="p-4 sm:p-6 bg-white border-t border-slate-100 shrink-0">
                <div className="max-w-3xl mx-auto space-y-3">
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {suggestionChips.map((chip) => (
                      <button
                        key={chip}
                        onClick={() => sendMessageStream(chip)}
                        className="px-4 py-1.5 bg-slate-50 border border-slate-200/80 text-slate-700 rounded-full text-xs font-semibold whitespace-nowrap hover:bg-slate-100 hover:border-slate-300 transition cursor-pointer"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  <form
                    onSubmit={(e) => { e.preventDefault(); sendMessageStream(); }}
                    className="bg-slate-50 border border-slate-200 rounded-full p-1.5 flex items-center gap-1.5 shadow-xs focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100 transition"
                  >
                    <button type="button" className="p-2 text-slate-400 hover:text-slate-600 transition rounded-full cursor-pointer">
                      <Icon name="upload" className="w-5 h-5" />
                    </button>
                    
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Message TOPSON AI Assistance..."
                      className="flex-1 bg-transparent px-2 text-slate-900 text-sm sm:text-base placeholder:text-slate-400 outline-none"
                    />

                    <button type="button" className="p-2 text-slate-400 hover:text-slate-600 transition rounded-full cursor-pointer">
                      <Icon name="mic" className="w-5 h-5" />
                    </button>

                    <button
                      type="submit"
                      disabled={!input.trim() || loading}
                      className={`p-2.5 rounded-full transition ${
                        input.trim() && !loading
                          ? 'bg-cyan-400 text-white shadow-xs hover:bg-cyan-500 cursor-pointer' 
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Icon name="send" className="w-4 h-4" />
                    </button>
                  </form>

                  <p className="text-[11px] text-center text-slate-400 hidden sm:block">
                    TOPSON AI can make mistakes. Verify important info.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ALWAYS-VISIBLE MOBILE BOTTOM NAVIGATION BAR */}
        <div className="lg:hidden bg-white border-t border-slate-200 px-4 py-2 flex justify-around items-center shrink-0 z-20 shadow-md">
          {sidebarNavItems.slice(0, 4).map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveTab(item.label)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${
                activeTab === item.label ? 'text-cyan-600 font-bold' : 'text-slate-400 font-normal hover:text-slate-600'
              }`}
            >
              <Icon name={item.icon} className="w-5 h-5" />
              <span className="text-[11px] leading-none">{item.label}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}