import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const CodeBlock = ({ language, value, onCopySuccess }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    if (onCopySuccess) onCopySuccess();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-slate-700/60 bg-[#1e1e1e] shadow-xs">
      <div className="flex justify-between items-center px-4 py-1.5 bg-[#2d2d2d] text-slate-400 text-xs font-mono border-b border-slate-700/50 select-none">
        <span className="uppercase tracking-wider font-semibold text-[11px]">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="hover:text-white transition px-2 py-0.5 rounded bg-slate-700/50 hover:bg-slate-700 cursor-pointer font-sans text-xs"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={vscDarkPlus}
        customStyle={{ margin: 0, padding: '1rem', background: 'transparent', fontSize: '13px' }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

export const MarkdownRenderer = ({ content, onCopySuccess }) => {
  if (!content) return null;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const codeString = String(children).replace(/\n$/, '');

          // Render block code if explicit language or multi-line content exists
          const isBlockCode = !inline && (match || codeString.includes('\n'));

          return isBlockCode ? (
            <CodeBlock
              language={match ? match[1] : 'text'}
              value={codeString}
              onCopySuccess={onCopySuccess}
            />
          ) : (
            <code
              className="bg-cyan-100/60 text-cyan-900 px-1.5 py-0.5 rounded text-xs font-mono font-medium"
              {...props}
            >
              {children}
            </code>
          );
        },
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-600 underline font-medium hover:text-cyan-700 transition"
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-cyan-400 pl-4 py-1 italic bg-cyan-50/40 my-2 rounded-r-lg text-slate-700">
            {children}
          </blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-3 rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-slate-100/80 font-semibold text-slate-800">{children}</thead>,
        th: ({ children }) => <th className="p-2.5 border-b border-slate-200">{children}</th>,
        td: ({ children }) => <td className="p-2.5 border-b border-slate-100">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};