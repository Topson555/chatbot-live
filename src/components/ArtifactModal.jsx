import React from 'react';

export const ArtifactModal = ({ isOpen, onClose, htmlCode }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-400" />
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="w-3 h-3 rounded-full bg-emerald-400" />
            <h3 className="ml-2 font-bold text-sm text-slate-800">Artifact Live Sandbox</h3>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            Close ✕
          </button>
        </div>

        <iframe
          title="Artifact Code Sandbox"
          srcDoc={htmlCode}
          sandbox="allow-scripts allow-modals"
          className="w-full flex-1 bg-white border-0"
        />
      </div>
    </div>
  );
};