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
    async function fetchAccessToken() {
      try {
        const response = await fetch(`${apiUrl}/voice/access-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Failed to get access token: ${response.status} - ${text}`);
        }

        const data = await response.json();
        setAccessToken(data.accessToken);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching access token:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize voice interface');
        setIsLoading(false);
      }
    }

    fetchAccessToken();
  }, [apiUrl]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white/80">Initializing voice interface...</p>
        </div>
      </div>
    );
  }

  if (error || !accessToken) {
    return (
      <div className="p-6 bg-red-500/20 border border-red-400/30 rounded-lg backdrop-blur-sm">
        <h3 className="text-red-200 font-semibold mb-2">Voice Interface Unavailable</h3>
        <p className="text-red-300 text-sm">{error || 'Could not initialize voice interface'}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-500/30 hover:bg-red-500/40 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <VoiceProvider
      auth={{ type: 'accessToken', value: accessToken }}
      configId={configId}
      onMessage={(message) => {
        console.log('Hume message:', message);
      }}
      onError={(err) => {
        console.error('Hume error:', err);
      }}
    >
      <VoiceInterface />
    </VoiceProvider>
  );
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Inner component that uses Hume hooks
function VoiceInterface() {
  const { connect, disconnect, status, isMuted, mute, unmute, messages } = useVoice();
  const [displayMessages, setDisplayMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isConnected = status.value === 'connected';
  const isConnecting = status.value === 'connecting';

  // Process Hume messages into display format
  useEffect(() => {
    const processed: Message[] = [];

    for (const msg of messages) {
      if (msg.type === 'user_message' && msg.message?.content) {
        processed.push({
          role: 'user',
          content: msg.message.content
        });
      } else if (msg.type === 'assistant_message' && msg.message?.content) {
        processed.push({
          role: 'assistant',
          content: msg.message.content
        });
      }
    }

    setDisplayMessages(processed);
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages]);

  const handleToggleConnection = async () => {
    if (isConnected) {
      disconnect();
    } else {
      try {
        await connect();
      } catch (err) {
        console.error('Failed to connect:', err);
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

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            isConnected ? 'bg-green-400 animate-pulse' :
            isConnecting ? 'bg-yellow-400 animate-pulse' :
            'bg-gray-400'
          }`} />
          <span className="text-white font-medium">
            {isConnected ? 'Listening...' : isConnecting ? 'Connecting...' : 'Ready to chat'}
          </span>
        </div>
        {isConnected && (
          <button
            onClick={handleToggleMute}
            className={`px-3 py-1 rounded-full text-sm ${
              isMuted
                ? 'bg-red-500/30 text-red-200'
                : 'bg-green-500/30 text-green-200'
            }`}
          >
            {isMuted ? 'Unmute' : 'Mute'}
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="h-80 overflow-y-auto p-4 space-y-3">
        {displayMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-white/60 px-4">
            <div className="w-16 h-16 mb-4 rounded-full bg-white/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <p className="mb-2">Press the microphone to start</p>
            <p className="text-sm text-white/40">Ask about visa requirements, cost of living, or relocation tips</p>
          </div>
        ) : (
          displayMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-purple-500/40 text-white rounded-br-sm'
                    : 'bg-white/20 text-white rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Controls */}
      <div className="px-6 py-5 border-t border-white/10 flex flex-col items-center gap-4">
        <button
          onClick={handleToggleConnection}
          disabled={isConnecting}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
            isConnected
              ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
              : isConnecting
              ? 'bg-yellow-500 cursor-wait'
              : 'bg-gradient-to-br from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/30'
          }`}
        >
          {isConnecting ? (
            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
          ) : isConnected ? (
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
        <p className="text-white/50 text-sm">
          {isConnected ? 'Click to end session' : isConnecting ? 'Connecting...' : 'Click to start talking'}
        </p>
      </div>

      {/* Suggestions */}
      <div className="px-6 pb-6">
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Try asking</p>
          <div className="flex flex-wrap gap-2">
            {['Visa requirements', 'Cost of living', 'Best countries'].map((suggestion) => (
              <span
                key={suggestion}
                className="px-3 py-1 bg-white/10 rounded-full text-white/70 text-sm"
              >
                {suggestion}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
