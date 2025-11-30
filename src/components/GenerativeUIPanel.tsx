import { useState, useEffect, useCallback } from 'react';
import { C1Component } from '@thesysai/genui-sdk';

interface GenerativeUIPanelProps {
  query: string;
  conversationContext: Array<{ role: string; content: string }>;
  userId?: string;
  sessionId: string;
}

export default function GenerativeUIPanel({
  query,
  conversationContext,
  userId,
  sessionId,
}: GenerativeUIPanelProps) {
  const [c1Response, setC1Response] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch generative UI when query changes
  useEffect(() => {
    if (!query) return;

    const fetchGenerativeUI = async () => {
      setIsLoading(true);
      setIsStreaming(true);
      setC1Response('');

      try {
        const response = await fetch('/api/c1/generate-ui', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            conversationContext,
            userId,
            sessionId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate UI');
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  setIsStreaming(false);
                } else {
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.content) {
                      fullResponse += parsed.content;
                      setC1Response(fullResponse);
                    }
                  } catch {
                    // Skip invalid JSON
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('[GenerativeUIPanel] Error:', err);
        setC1Response('');
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
      }
    };

    fetchGenerativeUI();
  }, [query, userId, sessionId]);

  const handleAction = useCallback((action: { humanFriendlyMessage: string; llmFriendlyMessage: string }) => {
    console.log('[GenerativeUIPanel] Action:', action);
    // Could trigger follow-up queries or save to database
  }, []);

  const updateMessage = useCallback((newContent: string) => {
    setC1Response(newContent);
  }, []);

  if (!query && !c1Response) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#64748b',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        borderRadius: '16px',
        border: '2px dashed #e2e8f0',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌍</div>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#1a202c' }}>
          Start a Conversation
        </h3>
        <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>
          Ask about countries, visas, cost of living, or relocation planning.
          Beautiful insights will appear here.
        </p>
      </div>
    );
  }

  if (isLoading && !c1Response) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
        borderRadius: '16px',
        border: '1px solid #667eea30',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          margin: '0 auto 16px',
          border: '4px solid #667eea30',
          borderTopColor: '#667eea',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: '#667eea', fontWeight: 500 }}>Generating insights...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      border: '1px solid #e2e8f0',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid #e2e8f0',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
        }}>
          ✨
        </div>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a202c', margin: 0 }}>
            Live Insights
          </h3>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
            Generated based on your conversation
          </p>
        </div>
        {isStreaming && (
          <span style={{
            marginLeft: 'auto',
            padding: '4px 10px',
            background: '#10b981',
            color: 'white',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 600,
          }}>
            LIVE
          </span>
        )}
      </div>

      <C1Component
        c1Response={c1Response}
        isStreaming={isStreaming}
        updateMessage={updateMessage}
        onAction={handleAction}
      />
    </div>
  );
}
