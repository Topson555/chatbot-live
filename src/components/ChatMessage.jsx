import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export const ChatMessage = ({ role = 'assistant', content, imagePreview, sources }) => {
  const isUser = role === 'user';

  return (
    <div
      className={`flex flex-col gap-2 p-4 rounded-2xl max-w-2xl text-sm transition-all shadow-md ${
        isUser
          ? 'bg-slate-900 border border-cyan-500/30 text-slate-100 ml-auto rounded-br-none'
          : 'bg-slate-950 border border-slate-800 text-slate-100 mr-auto rounded-bl-none'
      }`}
    >
      {/* Attached Image Preview Rendering */}
      {imagePreview && (
        <div className="mb-2 overflow-hidden rounded-xl border border-cyan-500/30 bg-slate-900/50">
          <img
            src={imagePreview}
            alt="Message attachment"
            className="max-h-72 w-full object-contain rounded-xl"
          />
        </div>
      )}

      {/* Message Text / Markdown Content */}
      {content && (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <SyntaxHighlighter
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                  className="rounded-xl border border-slate-800 my-2 shadow-sm"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className="bg-slate-800/80 text-cyan-300 px-1.5 py-0.5 rounded font-mono text-xs" {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      )}

      {/* RAG Citation Sources Footer */}
      {sources && sources.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5 text-[11px]">
          <span className="text-slate-400 font-semibold flex items-center gap-1">Sources:</span>
          {sources.map((src, i) => {
            const name = typeof src === 'string' ? src : src.fileName || src.filename || `Doc #${i + 1}`;
            return (
              <span
                key={i}
                className="bg-slate-800/90 border border-slate-700/60 text-cyan-300 px-2 py-0.5 rounded-full font-mono flex items-center gap-1 shadow-xs"
              >
                📄 {name}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};