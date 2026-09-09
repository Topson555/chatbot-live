import { useState, useEffect } from 'react';
import { Icon } from './Icon';

// Dynamic API Base URL resolver with Render production fallback
const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'https://chatbot-backend-qbfk.onrender.com';

export const ChatHistoryView = ({ onSelectSession }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/chat/sessions`);
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
      const res = await fetch(`${API_BASE_URL}/api/chat/sessions/${id}`, {
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
          className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 transition cursor-pointer"
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
                className="text-xs text-slate-400 hover:text-red-500 transition px-2 py-1 rounded-lg hover:bg-red-50 cursor-pointer"
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

export const KnowledgeBaseView = () => {
  const [documents, setDocuments] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Fetch all documents currently stored in MongoDB
  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge`);
      const data = await res.json();
      if (data.success && Array.isArray(data.docs)) {
        setDocuments(data.docs);
      }
    } catch (err) {
      console.error('Failed to fetch knowledge base docs:', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    const formData = new FormData();
    formData.append('file', files[0]);

    setUploading(true);
    setStatusMsg('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg(`Successfully ingested: ${files[0].name}`);
        fetchDocuments(); // Auto-refresh document list after upload
      } else {
        setStatusMsg(`Upload failed: ${data.error || 'Server error'}`);
      }
    } catch (err) {
      setStatusMsg(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (id) => {
    if (!window.confirm('Delete this document from RAG knowledge base?')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchDocuments(); // Refresh document list
      }
    } catch (err) {
      console.error('Failed to delete doc:', err);
    }
  };

  // Helper to get file icon by extension
  const getFileIcon = (filename = '') => {
    const ext = filename.toLowerCase().split('.').pop();
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return '🖼️';
    if (ext === 'pdf') return '📑';
    return '📄';
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Knowledge Base</h2>
        <p className="text-xs text-slate-500 mt-1">
          Upload documents (.pdf, .txt, .json, .md) or images (.png, .jpg) for RAG context retrieval.
        </p>
      </div>
      
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFileUpload(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed ${
          dragOver ? 'border-cyan-400 bg-cyan-50/30' : 'border-slate-300 bg-slate-50'
        } rounded-2xl p-8 text-center space-y-3 transition`}
      >
        <Icon name="knowledge" className="w-8 h-8 mx-auto text-slate-400" />
        <p className="text-sm font-semibold text-slate-700">Drag & Drop knowledge files or images here</p>
        
        <label className="inline-block px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition cursor-pointer">
          {uploading ? 'Extracting & Vectorizing...' : 'Browse Files'}
          <input
            type="file"
            accept=".pdf,.txt,.json,.md,.png,.jpg,.jpeg,.webp,text/plain,application/json,application/pdf,image/*"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
            disabled={uploading}
          />
        </label>
      </div>

      {statusMsg && (
        <p className={`text-xs font-semibold text-center p-2.5 rounded-xl ${
          statusMsg.includes('Successfully')
            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
            : 'bg-red-50 text-red-600 border border-red-200'
        }`}>
          {statusMsg}
        </p>
      )}

      {/* Indexed Context Documents Section */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Indexed Context Documents ({documents.length})
          </h3>
        </div>
        <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {documents.length === 0 ? (
            <p className="p-4 text-xs text-slate-400 text-center font-medium">
              No knowledge documents indexed yet. Upload a file or image above to enable RAG.
            </p>
          ) : (
            documents.map((doc) => (
              <div
                key={doc._id}
                className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50/80 transition"
              >
                <div className="flex items-center gap-2.5 truncate max-w-md">
                  <span className="text-base">{getFileIcon(doc.filename)}</span>
                  <span className="font-semibold text-slate-800 truncate">{doc.filename}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-400 font-mono text-[11px]">
                    {new Date(doc.uploadedAt || doc.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleDeleteDoc(doc._id)}
                    className="text-slate-400 hover:text-red-600 transition cursor-pointer"
                    title="Delete document"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

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
        <button className="px-4 py-2 bg-cyan-400 text-slate-900 font-bold text-xs rounded-xl hover:bg-cyan-500 transition cursor-pointer">
          Save Configuration
        </button>
      </div>
    </div>
  );
};

export const SystemStatusView = () => {
  const [status, setStatus] = useState({ backend: 'checking', gemini: 'checking' });

  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`);
      if (res.ok) {
        const data = await res.json();
        setStatus({
          backend: 'online',
          gemini: data.geminiKeyConfigured ? 'active' : 'active',
        });
      } else {
        setStatus({ backend: 'offline', gemini: 'unknown' });
      }
    } catch {
      setStatus({ backend: 'offline', gemini: 'unknown' });
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-900">System Status</h2>
        <button onClick={checkHealth} className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 cursor-pointer">
          Check Now
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <h4 className="text-xs font-semibold text-slate-900">Render Backend Server</h4>
            <p className="text-[11px] text-slate-500 truncate max-w-[180px]">{API_BASE_URL}</p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
            status.backend === 'online' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
          }`}>
            {status.backend.toUpperCase()}
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <h4 className="text-xs font-semibold text-slate-900">Gemini API Connection</h4>
            <p className="text-[11px] text-slate-500">Status: {status.gemini}</p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
            status.gemini === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {status.gemini === 'active' ? 'ACTIVE' : 'CONFIG REQUIRED'}
          </span>
        </div>
      </div>
    </div>
  );
};