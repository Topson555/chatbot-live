export const ThinkingIndicator = ({ step }) => {
  return (
    <div className="flex gap-3 items-center max-w-3xl mx-auto my-2">
      <div className="w-8 h-8 rounded-full bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 shrink-0">
        🤖
      </div>
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#eef8f9] border border-cyan-100 rounded-2xl text-xs font-medium text-cyan-800 animate-pulse">
        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
        {step || 'Thinking...'}
      </div>
    </div>
  );
};