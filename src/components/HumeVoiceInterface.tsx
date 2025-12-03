import { VoiceProvider, useVoice } from '@humeai/voice-react';
import { useState, useEffect, useRef } from 'react';

interface HumeVoiceInterfaceProps {
  apiUrl?: string;
  configId?: string;
  user?: {
    id?: string;
    displayName?: string | null;
    primaryEmail?: string | null;
  } | null;
}

// Hume config ID for the relocation assistant
const HUME_CONFIG_ID = '54f86c53-cfc0-4adc-9af0-0c4b907cadc5';

// Generate or retrieve persistent user ID from localStorage
function getUserId(): string {
  const storageKey = 'relocation_quest_user_id';
  let userId = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;

  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, userId);
    }
  }
  return userId;
}

export default function HumeVoiceInterface({
  apiUrl = 'https://quest-gateway-production.up.railway.app',
  configId = HUME_CONFIG_ID,
  user = null
}: HumeVoiceInterfaceProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId] = useState<string>(() => getUserId());

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

  // Use authenticated user ID if available, otherwise fall back to localStorage ID
  const effectiveUserId = user?.id || userId;
  // Get first name for personalized greeting
  const userName = user?.displayName?.split(' ')[0] || 'there';

  console.log('[HumeVoiceInterface] Rendering with userId:', effectiveUserId, 'userName:', userName);

  // Connected - render VoiceProvider with customSessionId and dynamic variables
  return (
    <VoiceProvider
      auth={{ type: 'accessToken', value: accessToken }}
      configId={configId}
      sessionSettings={{
        customSessionId: effectiveUserId,  // Pass user ID to Hume for tracking
        variables: {
          name: userName,
          user_id: effectiveUserId,
          email: user?.primaryEmail || '',
        },
      }}
      onMessage={(message) => {
        console.log('[Hume] Message:', message);
      }}
      onError={(err) => {
        console.error('[Hume] Error:', err);
      }}
    >
      <VoiceInterface accessToken={accessToken} configId={configId} userId={effectiveUserId} />
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
  userId: string;
}

// Simplified related content - just articles with links
interface RelatedContent {
  articles: Array<{ title: string; url: string; type?: string }>;
  destination_country?: string;
  topics?: string[];
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
function VoiceInterface({ accessToken, configId, userId }: VoiceInterfaceProps) {
  const { connect, disconnect, status, isMuted, mute, unmute, messages, chatId } = useVoice();
  const [displayMessages, setDisplayMessages] = useState<Message[]>([]);
  const [relatedContent, setRelatedContent] = useState<RelatedContent | null>(null);
  const [isNewContent, setIsNewContent] = useState(false);
  const [sessionId] = useState<string>(() => getSessionId());
  const [extractedProfile, setExtractedProfile] = useState<Record<string, any> | null>(null);
  const [showTranscript, setShowTranscript] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Debounce extraction to prevent rate limiting
  const lastExtractionRef = useRef<number>(0);
  const lastQueryRef = useRef<string>('');
  const extractionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isConnected = status.value === 'connected';
  const isConnecting = status.value === 'connecting';

  // Extract profile from conversation using Gemini API
  const extractProfile = async (conversationMessages: Message[]) => {
    if (!userId || conversationMessages.length < 2) return;

    try {
      console.log('[VoiceInterface] Extracting profile for user:', userId);
      const response = await fetch('/api/profile/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          app_id: 'relocation',
          messages: conversationMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          session_id: sessionId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[VoiceInterface] Profile extracted:', data.extracted);
        setExtractedProfile(data.profile);
      } else {
        console.error('[VoiceInterface] Profile extraction failed:', response.status);
      }
    } catch (err) {
      console.error('[VoiceInterface] Profile extraction error:', err);
    }
  };

  // Log status changes and chatId
  useEffect(() => {
    console.log('[VoiceInterface] Status changed:', status.value);
    if (chatId) {
      console.log('[VoiceInterface] Chat ID:', chatId);
    }
  }, [status.value, chatId]);

  // Load profile from localStorage on mount
  useEffect(() => {
    const storedProfile = localStorage.getItem(`profile_${userId}`);
    if (storedProfile) {
      try {
        const parsed = JSON.parse(storedProfile);
        setExtractedProfile(parsed);
        console.log('[VoiceInterface] Loaded profile from localStorage:', parsed);
      } catch (e) {
        console.error('[VoiceInterface] Failed to parse stored profile:', e);
      }
    }
  }, [userId]);

  // Save profile to localStorage when updated
  useEffect(() => {
    if (extractedProfile && Object.keys(extractedProfile).length > 0) {
      localStorage.setItem(`profile_${userId}`, JSON.stringify(extractedProfile));
      console.log('[VoiceInterface] Saved profile to localStorage');
    }
  }, [extractedProfile, userId]);

  // Log when component mounts
  useEffect(() => {
    console.log('[VoiceInterface] Component mounted, initial status:', status.value);
    console.log('[VoiceInterface] accessToken length:', accessToken?.length);
    console.log('[VoiceInterface] configId:', configId);
    console.log('[VoiceInterface] sessionId:', sessionId);
    console.log('[VoiceInterface] userId:', userId);
  }, []);

  // Fetch related content when user message is detected
  const fetchRelatedContent = async (query: string, conversationHistory: Message[]) => {
    if (!query) return;

    console.log('[VoiceInterface] Fetching related content for:', query);

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

      console.log('[VoiceInterface] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[VoiceInterface] Related content response:', JSON.stringify(data).slice(0, 500));

        // Simple structure: just articles with links
        const newContent: RelatedContent = {
          articles: data.articles || [],
          destination_country: data.destination_country,
          topics: data.topics || []
        };

        // Only show if we have articles
        if (newContent.articles.length > 0) {
          console.log('[VoiceInterface] Setting related content:', newContent);
          setRelatedContent(newContent);
          setIsNewContent(true);
          setTimeout(() => setIsNewContent(false), 2000);
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

    // Fetch related content from API for each new user query
    if (latestUserQuery && latestUserQuery !== lastQueryRef.current) {
      lastQueryRef.current = latestUserQuery;
      fetchRelatedContent(latestUserQuery, processed);

      // Debounce extraction - wait 3 seconds after last call to prevent rate limiting
      if (extractionTimeoutRef.current) {
        clearTimeout(extractionTimeoutRef.current);
      }

      const timeSinceLastExtraction = Date.now() - lastExtractionRef.current;
      const minDelay = Math.max(0, 3000 - timeSinceLastExtraction); // At least 3 seconds between calls

      extractionTimeoutRef.current = setTimeout(() => {
        lastExtractionRef.current = Date.now();
        extractProfile(processed);
      }, minDelay);
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
                {/* Inline article links for assistant messages */}
                {msg.role === 'assistant' && msg.links?.articles && msg.links.articles.length > 0 && (
                  <div style={{
                    maxWidth: '80%',
                    marginTop: '8px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                  }}>
                    {msg.links.articles.slice(0, 3).map((article, idx) => (
                      <a
                        key={`article-${idx}`}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
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
                        📄 {article.title.length > 30 ? article.title.slice(0, 27) + '...' : article.title}
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

      {/* Simple Article Links Panel */}
      {relatedContent?.articles && relatedContent.articles.length > 0 && (
        <div style={{
          padding: '0 24px 24px',
          animation: isNewContent ? 'pulse 0.5s ease-out' : undefined,
        }}>
          {/* Header */}
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

          {/* Simple article list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {relatedContent.articles.map((article, i) => (
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

          {/* Animation keyframes */}
          <style>{`
            @keyframes pulse {
              0% { opacity: 0.7; transform: scale(0.98); }
              50% { opacity: 1; transform: scale(1.01); }
              100% { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}

      {/* Profile Facts Panel - shows extracted user data */}
      {extractedProfile && Object.keys(extractedProfile).length > 0 && (
        <div style={{
          padding: '0 24px 24px',
          marginTop: '16px',
        }}>
          <div style={{
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
            }}>
              <span style={{ fontSize: '16px' }}>📊</span>
              <span style={{
                color: '#86efac',
                fontSize: '13px',
                fontWeight: 600,
              }}>
                Your Profile (Extracted)
              </span>
            </div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}>
              {Object.entries(extractedProfile)
                .filter(([key, value]) => value && !['id', 'user_id', 'app_id', 'created_at', 'updated_at'].includes(key))
                .slice(0, 8)
                .map(([key, value]) => (
                  <div
                    key={key}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '16px',
                      fontSize: '12px',
                      color: 'white',
                    }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {key.replace(/_/g, ' ')}:
                    </span>{' '}
                    <span style={{ fontWeight: 500 }}>
                      {Array.isArray(value) ? value.join(', ') : String(value)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Transcript Panel - Collapsible full conversation history */}
      <div style={{
        padding: '0 24px 24px',
        marginTop: '16px',
      }}>
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          {/* Header with toggle */}
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>📝</span>
              <span style={{
                color: '#93c5fd',
                fontSize: '13px',
                fontWeight: 600,
              }}>
                Conversation Transcript
              </span>
              <span style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: '12px',
              }}>
                ({displayMessages.length} messages)
              </span>
              {chatId && (
                <span style={{
                  color: 'rgba(255,255,255,0.3)',
                  fontSize: '10px',
                  marginLeft: '8px',
                }}>
                  ID: {chatId.substring(0, 8)}...
                </span>
              )}
            </div>
            <span style={{
              color: 'rgba(255,255,255,0.5)',
              transform: showTranscript ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}>
              ▼
            </span>
          </button>

          {/* Transcript content */}
          {showTranscript && (
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              padding: '0 16px 16px',
            }}>
              {displayMessages.length === 0 ? (
                <p style={{
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '13px',
                  fontStyle: 'italic',
                  textAlign: 'center',
                  padding: '16px',
                }}>
                  No messages yet. Start a conversation to see the transcript.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {displayMessages.map((msg, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '8px 12px',
                        background: msg.role === 'user'
                          ? 'rgba(147, 112, 219, 0.2)'
                          : 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        borderLeft: msg.role === 'user'
                          ? '3px solid #9370DB'
                          : '3px solid rgba(255,255,255,0.3)',
                      }}
                    >
                      <div style={{
                        fontSize: '10px',
                        color: msg.role === 'user' ? '#c4b5fd' : 'rgba(255,255,255,0.5)',
                        marginBottom: '4px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}>
                        {msg.role === 'user' ? 'You' : 'Assistant'}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.9)',
                        lineHeight: 1.4,
                      }}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  <div ref={transcriptEndRef} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
