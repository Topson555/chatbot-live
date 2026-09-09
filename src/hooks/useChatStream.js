import { useState, useCallback, useRef } from 'react';

// Resolve production Render URL dynamically if no default parameter is passed
const DEFAULT_API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'https://chatbot-backend-qbfk.onrender.com';

export const useChatStream = (apiBaseUrl = DEFAULT_API_URL) => {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  // Controller reference to allow cancelling active fetch streams
  const abortControllerRef = useRef(null);
  const lastFailedPayloadRef = useRef(null);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);

      // Append cancellation notice to current stream
      setMessages((prev) => {
        const updated = [...prev];
        const lastMsgIdx = updated.length - 1;
        if (lastMsgIdx >= 0 && updated[lastMsgIdx].role === 'model') {
          updated[lastMsgIdx] = {
            ...updated[lastMsgIdx],
            isLoading: false,
            content: updated[lastMsgIdx].content
              ? `${updated[lastMsgIdx].content}\n\n*(Response generation stopped by user)*`
              : '*(Response generation stopped by user)*',
          };
        }
        return updated;
      });
    }
  }, []);

  const sendMessage = useCallback(
    async ({ message, image, imagePreview, retryPayload = null }) => {
      const payloadToSend = retryPayload || { message, image, imagePreview };
      lastFailedPayloadRef.current = payloadToSend;

      const userText = payloadToSend.message || '[Attached Image Query]';
      const tempUserMsgId = `user-${Date.now()}`;
      const tempAiMsgId = `ai-${Date.now()}`;

      // 1. OPTIMISTIC UPDATE: Render message immediately with imagePreview thumbnail support
      if (!retryPayload) {
        setMessages((prev) => [
          ...prev,
          {
            id: tempUserMsgId,
            role: 'user',
            content: userText,
            imagePreview: payloadToSend.imagePreview,
          },
          { id: tempAiMsgId, role: 'model', content: '', isLoading: true, isError: false },
        ]);
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.isError
              ? { ...msg, content: '', isLoading: true, isError: false }
              : msg
          )
        );
      }

      setIsStreaming(true);

      // Create new AbortController instance
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(`${apiBaseUrl}/api/chat/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            message: payloadToSend.message,
            image: payloadToSend.image,
            sessionId: currentSessionId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith('data: ')) continue;

            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') break;

            let data;
            try {
              data = JSON.parse(dataStr);
            } catch (jsonErr) {
              continue;
            }

            if (data.type === 'error') {
              throw new Error(data.error || 'Stream error occurred.');
            }

            if (data.type === 'session_meta' && data.sessionId) {
              setCurrentSessionId(data.sessionId);
            }

            if (data.type === 'chunk' && data.text) {
              setMessages((prev) => {
                const updated = [...prev];
                const lastMsgIdx = updated.length - 1;
                if (lastMsgIdx >= 0) {
                  updated[lastMsgIdx] = {
                    ...updated[lastMsgIdx],
                    isLoading: false,
                    content: updated[lastMsgIdx].content + data.text,
                  };
                }
                return updated;
              });
            }

            if (data.type === 'sources' && data.sources) {
              setMessages((prev) => {
                const updated = [...prev];
                const lastMsgIdx = updated.length - 1;
                if (lastMsgIdx >= 0) {
                  updated[lastMsgIdx].sources = data.sources;
                }
                return updated;
              });
            }
          }
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }

        console.error('Chat Streaming Error:', err);

        setMessages((prev) => {
          const updated = [...prev];
          const lastMsgIdx = updated.length - 1;
          if (lastMsgIdx >= 0 && updated[lastMsgIdx].role === 'model') {
            updated[lastMsgIdx] = {
              ...updated[lastMsgIdx],
              isLoading: false,
              isError: true,
              content: err.message || 'Failed to generate response. Please try again.',
            };
          }
          return updated;
        });
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [apiBaseUrl, currentSessionId]
  );

  const retryLastMessage = useCallback(() => {
    if (lastFailedPayloadRef.current) {
      sendMessage({ retryPayload: lastFailedPayloadRef.current });
    }
  }, [sendMessage]);

  return {
    messages,
    setMessages,
    sendMessage,
    cancelStream,
    retryLastMessage,
    isStreaming,
    currentSessionId,
  };
};