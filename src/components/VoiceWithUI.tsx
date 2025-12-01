import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceProvider, useVoice } from '@humeai/voice-react';
import { C1Component } from '@thesysai/genui-sdk';
import { StackProvider, StackTheme, useUser } from '@stackframe/react';
import { stackClientApp } from '../stack/client';

const HUME_CONFIG_ID = '54f86c53-cfc0-4adc-9af0-0c4b907cadc5';
const GATEWAY_URL = 'https://quest-gateway-production.up.railway.app';

// Generate or retrieve session ID
function getSessionId(): string {
  const storageKey = 'relocation_voice_session';
  let sessionId = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;

  if (!sessionId) {
    sessionId = `voice_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, sessionId);
    }
  }
  return sessionId;
}

interface VoiceWithUIInnerProps {
  user: {
    id: string;
    displayName: string | null;
    primaryEmail: string | null;
  } | null;
}

function VoiceWithUIInner({ user }: VoiceWithUIInnerProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionId] = useState(() => getSessionId());

  // Fetch access token
  useEffect(() => {
    async function fetchAccessToken() {
      try {
        const response = await fetch(`${GATEWAY_URL}/voice/access-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Failed to get access token: ${response.status}`);
        }

        const data = await response.json();
        setAccessToken(data.accessToken);
        setIsLoading(false);
      } catch (err) {
        console.error('[VoiceWithUI] Error fetching access token:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setIsLoading(false);
      }
    }

    fetchAccessToken();
  }, []);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
        background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
        borderRadius: '24px',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #667eea30',
          borderTopColor: '#667eea',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !accessToken) {
    return (
      <div style={{
        padding: '32px',
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '16px',
        textAlign: 'center',
      }}>
        <p style={{ color: '#ef4444', marginBottom: '16px' }}>{error || 'Could not initialize'}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Build the user ID for Hume tracking
  const humeUserId = user?.id || sessionId;

  console.log('[VoiceWithUI] Connecting with customSessionId:', humeUserId);

  return (
    <VoiceProvider
      auth={{ type: 'accessToken', value: accessToken }}
      configId={HUME_CONFIG_ID}
      sessionSettings={{
        customSessionId: humeUserId,
      }}
    >
      <CombinedInterface
        accessToken={accessToken}
        sessionId={sessionId}
        userId={user?.id}
      />
    </VoiceProvider>
  );
}

interface CombinedInterfaceProps {
  accessToken: string;
  sessionId: string;
  userId?: string;
}

interface RelatedContent {
  articles: Array<{ title: string; url: string; type?: string }>;
  destination_country?: string;
  topics?: string[];
}

function CombinedInterface({ accessToken, sessionId, userId }: CombinedInterfaceProps) {
  const { connect, disconnect, status, isMuted, mute, unmute, messages } = useVoice();
  const [c1Response, setC1Response] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastQuery, setLastQuery] = useState<string>('');
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [relatedContent, setRelatedContent] = useState<RelatedContent | null>(null);
  const [isNewContent, setIsNewContent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isConnected = status.value === 'connected';
  const isConnecting = status.value === 'connecting';

  // Extract profile data from conversation
  const extractProfile = async (context: Array<{ role: string; content: string }>) => {
    if (!userId || context.length < 2) return; // Need at least one exchange

    try {
      const response = await fetch('/api/profile/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          app_id: 'relocation',
          messages: context.slice(-10), // Last 5 exchanges
          session_id: sessionId,
        }),
      });

      if (response.ok) {
        // Dispatch event for UserRepo to refresh
        window.dispatchEvent(new CustomEvent('profileExtracted'));
      }
    } catch (err) {
      console.error('[VoiceWithUI] Profile extraction error:', err);
    }
  };

  // Fetch related content from gateway
  const fetchRelatedContent = async (query: string, context: Array<{ role: string; content: string }>) => {
    try {
      const response = await fetch(`${GATEWAY_URL}/voice/related-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          session_id: sessionId,
          messages: context.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newContent: RelatedContent = {
          articles: data.articles || [],
          destination_country: data.destination_country,
          topics: data.topics || []
        };

        if (newContent.articles.length > 0) {
          setRelatedContent(newContent);
          setIsNewContent(true);
          setTimeout(() => setIsNewContent(false), 2000);
        }
      }
    } catch (err) {
      console.error('[VoiceWithUI] Failed to fetch related content:', err);
    }
  };

  // Process Hume messages and trigger UI generation
  useEffect(() => {
    const processed: Array<{ role: string; content: string }> = [];
    let latestUserQuery = '';

    for (const msg of messages) {
      if (msg.type === 'user_message' && msg.message?.content) {
        processed.push({ role: 'user', content: msg.message.content });
        latestUserQuery = msg.message.content;
      } else if (msg.type === 'assistant_message' && msg.message?.content) {
        // Remove any system markers from content
        let content = msg.message.content;
        // Strip known markers
        const markers = ['---LINKS---', '---MEMORY---', '---FACTS---', '---END---'];
        for (const marker of markers) {
          if (content.includes(marker)) {
            content = content.split(marker)[0];
          }
        }
        content = content.trim();
        processed.push({ role: 'assistant', content });
      }
    }

    setConversationHistory(processed);

    // Trigger UI generation and fetch related content when new user query detected
    if (latestUserQuery && latestUserQuery !== lastQuery) {
      setLastQuery(latestUserQuery);
      generateUI(latestUserQuery, processed);
      fetchRelatedContent(latestUserQuery, processed);
      // Extract profile data (runs in background)
      extractProfile(processed);
    }
  }, [messages]);

  // Generate UI from C1 API
  const generateUI = async (query: string, context: Array<{ role: string; content: string }>) => {
    setIsGenerating(true);
    setC1Response('');

    try {
      const response = await fetch('/api/c1/generate-ui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          conversationContext: context.slice(-6), // Last 3 exchanges
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
                setIsGenerating(false);
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
      console.error('[VoiceWithUI] Error generating UI:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  const handleToggleConnection = async () => {
    if (isConnected) {
      disconnect();
    } else {
      try {
        await connect({
          auth: { type: 'accessToken', value: accessToken },
          configId: HUME_CONFIG_ID,
          accessToken: accessToken,
        } as any);
      } catch (err) {
        console.error('[VoiceWithUI] Failed to connect:', err);
      }
    }
  };

  const handleAction = useCallback((action: { humanFriendlyMessage: string; llmFriendlyMessage: string }) => {
    console.log('[VoiceWithUI] C1 Action:', action);
  }, []);

  const updateMessage = useCallback((newContent: string) => {
    setC1Response(newContent);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Voice Interface Section */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
        borderRadius: '20px',
        padding: '24px',
        color: 'white',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: isConnected ? '#22c55e' : isConnecting ? '#eab308' : '#6b7280',
              animation: isConnected ? 'pulse 2s infinite' : 'none',
            }} />
            <span style={{ fontWeight: 600 }}>
              {isConnected ? 'Listening...' : isConnecting ? 'Connecting...' : 'Voice Assistant'}
            </span>
          </div>
          {isConnected && (
            <button
              onClick={isMuted ? unmute : mute}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: 'none',
                fontSize: '13px',
                cursor: 'pointer',
                background: isMuted ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)',
                color: isMuted ? '#fca5a5' : '#86efac',
              }}
            >
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
          )}
        </div>

        {/* Messages */}
        <div style={{
          height: '200px',
          overflowY: 'auto',
          marginBottom: '20px',
          padding: '12px',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '12px',
        }}>
          {conversationHistory.length === 0 ? (
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.5)',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎙️</div>
              <p>Press the microphone to start</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {conversationHistory.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div style={{
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: msg.role === 'user'
                      ? 'rgba(147, 112, 219, 0.4)'
                      : 'rgba(255, 255, 255, 0.15)',
                    fontSize: '14px',
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Main Button */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleToggleConnection}
            disabled={isConnecting}
            style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              border: 'none',
              cursor: isConnecting ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isConnected
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #667eea, #764ba2)',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => !isConnecting && (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {isConnecting ? (
              <div style={{
                width: '28px',
                height: '28px',
                border: '3px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
            ) : isConnected ? (
              <svg style={{ width: '28px', height: '28px', color: 'white' }} fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg style={{ width: '32px', height: '32px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
        </div>

        <p style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '13px',
          marginTop: '12px',
        }}>
          {isConnected ? 'Click to end' : isConnecting ? 'Connecting...' : 'Click to start talking'}
        </p>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        `}</style>

        {/* Suggestions - show when no related content */}
        {!relatedContent && (
          <div style={{ marginTop: '20px' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '16px',
            }}>
              <p style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px',
              }}>
                Try asking
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['Visa requirements', 'Cost of living', 'Best countries', 'Digital nomad visas'].map((suggestion) => (
                  <span
                    key={suggestion}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '20px',
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '14px',
                    }}
                  >
                    {suggestion}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Related Guides - show when we have content */}
        {relatedContent?.articles && relatedContent.articles.length > 0 && (
          <div style={{
            marginTop: '20px',
            animation: isNewContent ? 'fadeIn 0.5s ease-out' : undefined,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
            }}>
              <span style={{ fontSize: '16px' }}>📚</span>
              <span style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '13px',
                fontWeight: 600,
              }}>
                Related Guides
                {relatedContent.destination_country && ` - ${relatedContent.destination_country}`}
              </span>
              {isNewContent && (
                <span style={{
                  background: '#10b981',
                  color: 'white',
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  marginLeft: 'auto',
                }}>
                  NEW
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {relatedContent.articles.slice(0, 4).map((article, i) => (
                <a
                  key={i}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    color: 'white',
                    fontSize: '14px',
                    transition: 'background 0.2s',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  }}
                >
                  <span style={{ marginRight: '8px' }}>📄</span>
                  {article.title}
                  <span style={{
                    float: 'right',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '12px'
                  }}>
                    ↗
                  </span>
                </a>
              ))}
            </div>

            <style>{`
              @keyframes fadeIn {
                0% { opacity: 0.7; transform: translateY(5px); }
                100% { opacity: 1; transform: translateY(0); }
              }
            `}</style>
          </div>
        )}
      </div>

      {/* Generative UI Section */}
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0',
        minHeight: '300px',
      }}>
        {/* Header */}
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
              Generated from your conversation
            </p>
          </div>
          {isGenerating && (
            <span style={{
              marginLeft: 'auto',
              padding: '4px 10px',
              background: '#10b981',
              color: 'white',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600,
            }}>
              GENERATING
            </span>
          )}
        </div>

        {/* Content */}
        {!lastQuery && !c1Response ? (
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
        ) : isGenerating && !c1Response ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
            borderRadius: '16px',
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
          </div>
        ) : (
          <C1Component
            c1Response={c1Response}
            isStreaming={isGenerating}
            updateMessage={updateMessage}
            onAction={handleAction}
          />
        )}
      </div>
    </div>
  );
}

// Wrapper with Stack Auth
function VoiceWithUIAuth() {
  const user = useUser();

  return (
    <VoiceWithUIInner
      user={user ? {
        id: user.id,
        displayName: user.displayName,
        primaryEmail: user.primaryEmail,
      } : null}
    />
  );
}

// Main export
export default function VoiceWithUI() {
  return (
    <StackProvider app={stackClientApp}>
      <StackTheme>
        <VoiceWithUIAuth />
      </StackTheme>
    </StackProvider>
  );
}
