import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const CodeBlock = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-slate-700/60 bg-[#1e1e1e]">
      <div className="flex justify-between items-center px-4 py-1.5 bg-[#2d2d2d] text-slate-400 text-xs font-mono border-b border-slate-700/50">
        <span className="uppercase">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="hover:text-white transition px-2 py-0.5 rounded bg-slate-700/50 hover:bg-slate-700"
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

export const MarkdownRenderer = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const codeString = String(children).replace(/\n$/, '');

          return !inline && match ? (
            <CodeBlock language={match[1]} value={codeString} />
          ) : (
            <code className="bg-cyan-100/60 text-cyan-900 px-1.5 py-0.5 rounded text-xs font-mono font-medium" {...props}>
              {children}
            </code>
          );
        },
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
        strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};