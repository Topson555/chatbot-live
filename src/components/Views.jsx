import { useState } from 'react';
import { Icon } from './Icon';

export const ChatHistoryView = ({ onSelectSession }) => {
  const historyItems = [
    { id: '1', title: 'Support Ticketing System Setup', time: 'Today, 2:15 PM' },
    { id: '2', title: 'Express.js Route Debugging', time: 'Yesterday' },
    { id: '3', title: 'MERN Stack Authentication Flow', time: '3 days ago' },
  ];
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Chat History</h2>
      <div className="space-y-3">
        {historyItems.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelectSession(item.id, item.title)}
            className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-cyan-400 cursor-pointer transition flex justify-between items-center shadow-xs"
          >
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">{item.title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{item.time}</p>
            </div>
            <span className="text-xs font-semibold text-cyan-600">Open Chat →</span>
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