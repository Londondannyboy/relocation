import { VoiceProvider, useVoice } from '@humeai/voice-react';
import { useState, useEffect, useRef } from 'react';

interface HumeVoiceInterfaceProps {
  apiUrl?: string;
  configId?: string;
}

// Hume config ID for the relocation assistant
const HUME_CONFIG_ID = '54f86c53-cfc0-4adc-9af0-0c4b907cadc5';

export default function HumeVoiceInterface({
  apiUrl = 'https://quest-gateway-production.up.railway.app',
  configId = HUME_CONFIG_ID
}: HumeVoiceInterfaceProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch access token from gateway
  useEffect(() => {
    console.log('[HumeVoiceInterface] Component mounted, fetching access token...');

    async function fetchAccessToken() {
      try {
        console.log('[HumeVoiceInterface] Fetching from:', `${apiUrl}/voice/access-token`);
        const response = await fetch(`${apiUrl}/voice/access-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        console.log('[HumeVoiceInterface] Response status:', response.status);

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Failed to get access token: ${response.status} - ${text}`);
        }

        const data = await response.json();
        console.log('[HumeVoiceInterface] Got access token, length:', data.accessToken?.length);
        setAccessToken(data.accessToken);
        setIsLoading(false);
      } catch (err) {
        console.error('[HumeVoiceInterface] Error fetching access token:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize voice interface');
        setIsLoading(false);
      }
    }

    fetchAccessToken();
  }, [apiUrl]);

  // Loading state
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(147, 112, 219, 0.3)',
            borderTopColor: '#9370DB',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Initializing voice interface...</p>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !accessToken) {
    return (
      <div style={{
        padding: '24px',
        background: 'rgba(239, 68, 68, 0.2)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '12px',
        backdropFilter: 'blur(10px)',
      }}>
        <h3 style={{ color: '#fca5a5', fontWeight: 600, marginBottom: '8px' }}>
          Voice Interface Unavailable
        </h3>
        <p style={{ color: '#fecaca', fontSize: '14px' }}>
          {error || 'Could not initialize voice interface'}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            background: 'rgba(239, 68, 68, 0.3)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Connected - render VoiceProvider
  return (
    <VoiceProvider
      onMessage={(message) => {
        console.log('[Hume] Message:', message);
      }}
      onError={(err) => {
        console.error('[Hume] Error:', err);
      }}
    >
      <VoiceInterface accessToken={accessToken} configId={configId} />
    </VoiceProvider>
  );
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  links?: RelatedContent | null;
}

interface VoiceInterfaceProps {
  accessToken: string;
  configId: string;
}

interface RelatedContent {
  articles: Array<{ title: string; url: string; excerpt?: string; type?: string }>;
  companies: Array<{ name: string; url: string; description?: string; services?: string[] }>;
  countries: Array<{ name: string; flag?: string; url: string; region?: string; capital?: string; highlights?: string[] }>;
  external: Array<{ title: string; url?: string; description?: string; type?: string }>;
}

// Parse links from assistant response (format: "text\n\n---LINKS---\n{json}")
function parseMessageWithLinks(content: string): { text: string; links: RelatedContent | null } {
  const linksSeparator = '---LINKS---';
  if (content.includes(linksSeparator)) {
    const [text, linksJson] = content.split(linksSeparator);
    try {
      const links = JSON.parse(linksJson.trim());
      return { text: text.trim(), links };
    } catch {
      return { text: content, links: null };
    }
  }
  return { text: content, links: null };
}

const GATEWAY_URL = 'https://quest-gateway-production.up.railway.app';

// Generate or retrieve session ID for ZEP memory
function getSessionId(): string {
  const storageKey = 'relocation_voice_session';
  let sessionId = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;

  if (!sessionId) {
    // Generate new session ID
    sessionId = `voice_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, sessionId);
    }
  }
  return sessionId;
}

// Inner component that uses Hume hooks
function VoiceInterface({ accessToken, configId }: VoiceInterfaceProps) {
  const { connect, disconnect, status, isMuted, mute, unmute, messages } = useVoice();
  const [displayMessages, setDisplayMessages] = useState<Message[]>([]);
  const [relatedContent, setRelatedContent] = useState<RelatedContent | null>(null);
  const [sessionId] = useState<string>(() => getSessionId());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isConnected = status.value === 'connected';
  const isConnecting = status.value === 'connecting';

  // Log status changes
  useEffect(() => {
    console.log('[VoiceInterface] Status changed:', status.value);
  }, [status.value]);

  // Log when component mounts
  useEffect(() => {
    console.log('[VoiceInterface] Component mounted, initial status:', status.value);
    console.log('[VoiceInterface] accessToken length:', accessToken?.length);
    console.log('[VoiceInterface] configId:', configId);
    console.log('[VoiceInterface] sessionId:', sessionId);
  }, []);

  // Fetch related content when user message is detected
  const fetchRelatedContent = async (query: string, conversationHistory: Message[]) => {
    if (!query) return;

    try {
      const response = await fetch(`${GATEWAY_URL}/voice/related-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          session_id: sessionId,
          messages: conversationHistory.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.articles?.length || data.companies?.length || data.countries?.length || data.external?.length) {
          setRelatedContent(data);
          console.log('[VoiceInterface] Related content found:', data);
        }
      }
    } catch (err) {
      console.error('[VoiceInterface] Failed to fetch related content:', err);
    }
  };

  // Process Hume messages into display format
  useEffect(() => {
    const processed: Message[] = [];
    let latestUserQuery = '';
    let latestInlineLinks: RelatedContent | null = null;

    for (const msg of messages) {
      if (msg.type === 'user_message' && msg.message?.content) {
        processed.push({
          role: 'user',
          content: msg.message.content
        });
        latestUserQuery = msg.message.content;
      } else if (msg.type === 'assistant_message' && msg.message?.content) {
        // Parse links from assistant response
        const { text, links } = parseMessageWithLinks(msg.message.content);
        processed.push({
          role: 'assistant',
          content: text,
          links: links
        });
        // Track inline links for facts panel
        if (links) {
          latestInlineLinks = links;
        }
      }
    }

    setDisplayMessages(processed);

    // Update related content from inline links if present
    if (latestInlineLinks) {
      setRelatedContent(prev => ({
        articles: [...(latestInlineLinks?.articles || []), ...(prev?.articles || [])].slice(0, 8),
        companies: [...(latestInlineLinks?.companies || []), ...(prev?.companies || [])].slice(0, 5),
        countries: [...(latestInlineLinks?.countries || []), ...(prev?.countries || [])].slice(0, 3),
        external: prev?.external || []
      }));
    }

    // Also fetch related content from API for each new user query
    if (latestUserQuery) {
      fetchRelatedContent(latestUserQuery, processed);
    }
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages]);

  const handleToggleConnection = async () => {
    console.log('[VoiceInterface] Button clicked, status:', status.value, 'isConnected:', isConnected);

    if (isConnected) {
      console.log('[VoiceInterface] Disconnecting...');
      disconnect();
    } else {
      console.log('[VoiceInterface] Attempting to connect with config:', configId);
      try {
        // Pass accessToken both in auth (for SDK) AND at top level (for Hume API)
        await connect({
          auth: { type: 'accessToken', value: accessToken },
          configId: configId,
          accessToken: accessToken,  // Needed for WebSocket query params
        } as any);
        console.log('[VoiceInterface] Connect resolved');
      } catch (err) {
        console.error('[VoiceInterface] Failed to connect:', err);
      }
    }
  };

  const handleToggleMute = () => {
    if (isMuted) {
      unmute();
    } else {
      mute();
    }
  };

  const containerStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  };

  const headerStyle: React.CSSProperties = {
    padding: '16px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const statusDotStyle: React.CSSProperties = {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: isConnected ? '#22c55e' : isConnecting ? '#eab308' : '#6b7280',
    animation: isConnected ? 'pulse 2s ease-in-out infinite' : 'none',
  };

  const messagesContainerStyle: React.CSSProperties = {
    height: '320px',
    overflowY: 'auto',
    padding: '16px',
  };

  const emptyStateStyle: React.CSSProperties = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.6)',
    padding: '16px',
  };

  const controlsStyle: React.CSSProperties = {
    padding: '24px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  };

  const buttonStyle: React.CSSProperties = {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    cursor: isConnecting ? 'wait' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: isConnected
      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
      : isConnecting
      ? '#eab308'
      : 'linear-gradient(135deg, #667eea, #764ba2)',
    boxShadow: isConnected
      ? '0 10px 40px rgba(239, 68, 68, 0.4)'
      : '0 10px 40px rgba(102, 126, 234, 0.4)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={statusDotStyle} />
          <span style={{ color: 'white', fontWeight: 600 }}>
            {isConnected ? 'Listening...' : isConnecting ? 'Connecting...' : 'Ready to chat'}
          </span>
        </div>
        {isConnected && (
          <button
            onClick={handleToggleMute}
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer',
              background: isMuted ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)',
              color: isMuted ? '#fca5a5' : '#86efac',
            }}
          >
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div style={messagesContainerStyle}>
        {displayMessages.length === 0 ? (
          <div style={emptyStateStyle}>
            <div style={{
              width: '72px',
              height: '72px',
              marginBottom: '20px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(102,126,234,0.3), rgba(118,75,162,0.3))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(102,126,234,0.4)',
            }}>
              <svg style={{ width: '36px', height: '36px', color: '#a5b4fc' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <p style={{ marginBottom: '8px', fontWeight: 600, fontSize: '16px' }}>Welcome to Relocation Quest!</p>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
              Press the microphone and ask about visas, cost of living, or moving abroad.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {displayMessages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '12px 16px',
                    borderRadius: '16px',
                    borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                    borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
                    background: msg.role === 'user'
                      ? 'rgba(147, 112, 219, 0.4)'
                      : 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    fontSize: '15px',
                    lineHeight: 1.5,
                  }}
                >
                  {msg.content}
                </div>
                {/* Inline links for assistant messages */}
                {msg.role === 'assistant' && msg.links && (
                  <div style={{
                    maxWidth: '80%',
                    marginTop: '8px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                  }}>
                    {msg.links.countries?.map((c, idx) => (
                      <a
                        key={`country-${idx}`}
                        href={c.url}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          background: 'rgba(102,126,234,0.3)',
                          borderRadius: '12px',
                          textDecoration: 'none',
                          color: '#a5b4fc',
                          fontSize: '12px',
                          fontWeight: 500,
                        }}
                      >
                        {c.flag || '🌍'} {c.name}
                      </a>
                    ))}
                    {msg.links.articles?.slice(0, 3).map((a, idx) => (
                      <a
                        key={`article-${idx}`}
                        href={a.url}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          background: 'rgba(255,255,255,0.15)',
                          borderRadius: '12px',
                          textDecoration: 'none',
                          color: '#e2e8f0',
                          fontSize: '12px',
                        }}
                      >
                        📄 {a.title.length > 30 ? a.title.slice(0, 30) + '...' : a.title}
                      </a>
                    ))}
                    {msg.links.companies?.slice(0, 2).map((co, idx) => (
                      <a
                        key={`company-${idx}`}
                        href={co.url}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          background: 'rgba(118,75,162,0.3)',
                          borderRadius: '12px',
                          textDecoration: 'none',
                          color: '#d8b4fe',
                          fontSize: '12px',
                        }}
                      >
                        🏢 {co.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={controlsStyle}>
        <button
          onClick={handleToggleConnection}
          disabled={isConnecting}
          style={buttonStyle}
          onMouseEnter={(e) => {
            if (!isConnecting) {
              e.currentTarget.style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {isConnecting ? (
            <div style={{
              width: '32px',
              height: '32px',
              border: '3px solid rgba(255,255,255,0.3)',
              borderTopColor: 'white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
          ) : isConnected ? (
            <svg style={{ width: '32px', height: '32px' }} fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg style={{ width: '40px', height: '40px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
          {isConnected ? 'Click to end session' : isConnecting ? 'Connecting...' : 'Click to start talking'}
        </p>
      </div>

      {/* Suggestions (hidden when we have related content) */}
      {!relatedContent && (
        <div style={{ padding: '0 24px 24px' }}>
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
              {['Visa requirements', 'Cost of living', 'Best countries'].map((suggestion) => (
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

      {/* Related Content Panel */}
      {relatedContent && (relatedContent.articles?.length > 0 || relatedContent.companies?.length > 0 || relatedContent.countries?.length > 0) && (
        <div style={{ padding: '0 24px 24px' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <p style={{
              color: '#a5b4fc',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '16px',
              fontWeight: 600,
            }}>
              📚 Related Resources
            </p>

            {/* Countries */}
            {relatedContent.countries?.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase' }}>Country Guides</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {relatedContent.countries.map((country, i) => (
                    <a
                      key={i}
                      href={country.url}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        background: 'rgba(102,126,234,0.15)',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        color: 'white',
                        transition: 'background 0.2s',
                      }}
                    >
                      <span style={{ fontSize: '20px' }}>{country.flag}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{country.name}</div>
                        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{country.region}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Articles */}
            {relatedContent.articles?.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase' }}>Guides & Articles</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {relatedContent.articles.map((article, i) => (
                    <a
                      key={i}
                      href={article.url}
                      style={{
                        display: 'block',
                        padding: '10px 14px',
                        background: 'rgba(255,255,255,0.08)',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        color: 'white',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{article.title}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{article.excerpt}</div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Companies */}
            {relatedContent.companies?.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase' }}>Service Providers</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {relatedContent.companies.map((company, i) => (
                    <a
                      key={i}
                      href={company.url}
                      style={{
                        display: 'block',
                        padding: '10px 14px',
                        background: 'rgba(118,75,162,0.15)',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        color: 'white',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{company.name}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{company.description}</div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* External Resources */}
            {relatedContent.external?.length > 0 && (
              <div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase' }}>External Resources</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {relatedContent.external.map((ext, i) => (
                    <a
                      key={i}
                      href={ext.url || '#'}
                      target={ext.url ? '_blank' : undefined}
                      rel={ext.url ? 'noopener noreferrer' : undefined}
                      style={{
                        padding: '8px 14px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '20px',
                        textDecoration: 'none',
                        color: 'rgba(255,255,255,0.8)',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {ext.type === 'government' && '🏛️'}
                      {ext.type === 'reference' && '📊'}
                      {ext.type === 'community' && '👥'}
                      {ext.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
