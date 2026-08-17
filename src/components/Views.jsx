import { useState, useEffect } from 'react';
import { Icon } from './Icon';

export const ChatHistoryView = ({ onSelectSession }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5000/api/chat/sessions');
      if (!res.ok) throw new Error('Failed to fetch chat history.');
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : data.sessions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleDeleteSession = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await fetch(`http://localhost:5000/api/chat/sessions/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((item) => item._id !== id));
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-900">Chat History</h2>
        <button
          onClick={fetchSessions}
          className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 transition"
        >
          Refresh
        </button>
      </div>

      {loading && <p className="text-xs text-slate-400">Loading chat history...</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {!loading && !error && sessions.length === 0 && (
        <p className="text-xs text-slate-400">No previous sessions found.</p>
      )}

      <div className="space-y-3">
        {sessions.map((item) => (
          <div
            key={item._id}
            onClick={() => onSelectSession(item._id, item.title)}
            className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-cyan-400 cursor-pointer transition flex justify-between items-center shadow-xs group"
          >
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">{item.title || 'Untitled Session'}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'Recent'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-cyan-600 group-hover:translate-x-0.5 transition-transform">
                Open Chat →
              </span>
              <button
                onClick={(e) => handleDeleteSession(e, item._id)}
                className="text-xs text-slate-400 hover:text-red-500 transition px-2 py-1 rounded-lg hover:bg-red-50"
                title="Delete Session"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const KnowledgeBaseView = () => (
  <div className="p-6 max-w-4xl mx-auto space-y-4">
    <h2 className="text-xl font-bold text-slate-900">Knowledge Base</h2>
    <p className="text-xs text-slate-500">Upload documentation (.pdf, .txt, .json) for RAG context retrieval.</p>
    <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-slate-50 space-y-3">
      <Icon name="knowledge" className="w-8 h-8 mx-auto text-slate-400" />
      <p className="text-sm font-semibold text-slate-700">Drag & Drop knowledge files here</p>
      <button className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition">
        Browse Files
      </button>
    </div>
  </div>
);

export const ApiKeysView = () => {
  const [apiKey, setApiKey] = useState('');
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-slate-900">API Key Settings</h2>
      <div className="bg-white p-5 border border-slate-200 rounded-2xl space-y-4 shadow-xs">
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Gemini API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-100"
          />
        </div>
        <button className="px-4 py-2 bg-cyan-400 text-slate-900 font-bold text-xs rounded-xl hover:bg-cyan-500 transition">
          Save Configuration
        </button>
      </div>
    </div>
  );
};

export const SystemStatusView = () => (
  <div className="p-6 max-w-3xl mx-auto space-y-4">
    <h2 className="text-xl font-bold text-slate-900">System Status</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold text-emerald-900">Node Backend Server</h4>
          <p className="text-[11px] text-emerald-700">http://localhost:5000</p>
        </div>
        <span className="text-[10px] bg-emerald-200 text-emerald-800 font-bold px-2 py-1 rounded-md">Online</span>
      </div>
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold text-emerald-900">Gemini API Connection</h4>
          <p className="text-[11px] text-emerald-700">Status: Operational</p>
        </div>
        <span className="text-[10px] bg-emerald-200 text-emerald-800 font-bold px-2 py-1 rounded-md font-sans">Active</span>
      </div>
    </div>
  </div>
);