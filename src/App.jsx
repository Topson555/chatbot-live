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
  const [messages, setMessages] = useState([
    { id: 1, role: 'bot', text: "Hello! I'm TOPSON AI Assistance. How can I help streamline your workflow today?" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [thinkingStep, setThinkingStep] = useState('Analyzing request...');

  const chatEndRef = useRef(null);

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

  // Fetch full session history when clicking a session card
  const handleSelectHistorySession = async (sessionId, title) => {
    setCurrentSessionId(sessionId);
    setCurrentSessionTitle(title || `Session ${sessionId.slice(-4)}`);
    setActiveTab('Chat');
    setHistoryLoading(true);

    try {
      // Endpoint matched with GET /api/chat/session/:sessionId in chatRoutes.js
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
          { 
            id: Date.now(), 
            role: 'bot', 
            text: `Loaded thread: "${title || 'Untitled Session'}". Continue conversation below!` 
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load session messages:', err);
      setMessages([
        { 
          id: Date.now(), 
          role: 'bot', 
          text: "Failed to load session messages. Please check server connection." 
        },
      ]);
    } finally {
      setHistoryLoading(false);
    }
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

    // Initialize placeholder bot message
    setMessages((prev) => [
      ...prev,
      { id: botMessageId, role: 'bot', text: '' }
    ]);

    // Build API query URL with session tracking
    let streamUrl = `http://localhost:5000/api/chat/stream?prompt=${encodeURIComponent(textToSend)}`;
    if (currentSessionId) {
      streamUrl += `&sessionId=${encodeURIComponent(currentSessionId)}`;
    }

    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        eventSource.close();
        setLoading(false);
        return;
      }

      try {
        const data = JSON.parse(event.data);

        // 1. Dynamic Backend Thinking Status Updates
        if (data.type === 'status') {
          if (data.text) {
            setThinkingStep(data.text);
            setLoading(true);
          } else {
            setLoading(false);
          }
        }

        // 2. Track & Persist Active Session ID
        if (data.type === 'session_meta' && data.sessionId) {
          setCurrentSessionId(data.sessionId);
        }

        // 3. Dynamic Title Updates
        if (data.type === 'title_update' && data.title) {
          setCurrentSessionTitle(data.title);
        }

        // 4. Render Inbound Stream Chunks
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
      
      {/* 1. LEFT NAVIGATION SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#edf3ff]/60 border-r border-slate-200/70 p-5 justify-between select-none">
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200/60 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs tracking-wider">
                AC
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight text-slate-900">Alex Chen</h3>
                <span className="text-[11px] text-slate-500 font-medium">Pro Plan</span>
              </div>
            </div>
            <span className="text-[10px] bg-slate-100 text-slate-500 font-medium px-2 py-0.5 rounded">v2.4.0</span>
          </div>

          <button
            onClick={handleStartNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition shadow-xs cursor-pointer"
          >
            <Icon name="plus" className="w-4 h-4" />
            New Chat
          </button>

          <nav className="space-y-1">
            {sidebarNavItems.map((item) => (
              <button
                key={item.label}
                onClick={() => setActiveTab(item.label)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === item.label
                    ? 'bg-[#38bdf8] text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                }`}
              >
                <Icon name={item.icon} className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* 2. MAIN CONTAINER */}
      <main className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
        <header className="h-16 border-b border-slate-100 px-6 flex items-center justify-between bg-white z-10 shrink-0">
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
          <button className="p-2 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer">
            <Icon name="settings" className="w-5 h-5" />
          </button>
        </header>

        {/* Dynamic Views */}
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

              {/* Input Component */}
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

        {/* 3. MOBILE BOTTOM NAVIGATION */}
        <div className="lg:hidden bg-white border-t border-slate-100 px-4 py-2 flex justify-around shrink-0">
          {sidebarNavItems.slice(0, 4).map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveTab(item.label)}
              className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition ${
                activeTab === item.label ? 'text-cyan-600 font-bold' : 'text-slate-400 font-normal'
              }`}
            >
              <Icon name={item.icon} className="w-5 h-5" />
              <span className="text-[10px] leading-none">{item.label}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}