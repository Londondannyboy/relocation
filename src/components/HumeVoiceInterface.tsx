import { VoiceProvider } from '@humeai/voice-react';
import { useState, useEffect } from 'react';

interface HumeVoiceInterfaceProps {
  apiUrl?: string;
  configId?: string;
}

export default function HumeVoiceInterface({
  apiUrl = 'https://quest-gateway-production.up.railway.app',
  configId
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
          body: JSON.stringify({ configId })
        });

        if (!response.ok) {
          throw new Error(`Failed to get access token: ${response.statusText}`);
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
  }, [apiUrl, configId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Initializing voice interface...</p>
        </div>
      </div>
    );
  }

  if (error || !accessToken) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-semibold mb-2">Voice Interface Unavailable</h3>
        <p className="text-red-600 text-sm">{error || 'Could not initialize voice interface'}</p>
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
      onError={(error) => {
        console.error('Hume error:', error);
        setError(error.message);
      }}
    >
      <VoiceInterface />
    </VoiceProvider>
  );
}

// Inner component that uses Hume hooks
function VoiceInterface() {
  // We'll implement the UI next
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Voice Assistant
        </h2>
        <p className="text-gray-600">
          Speak with our AI-powered relocation assistant
        </p>
      </div>

      <div className="flex flex-col items-center gap-6">
        {/* We'll add voice controls here */}
        <div className="flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>

        <p className="text-sm text-gray-500 text-center max-w-md">
          Click the button above to start speaking, or type your question below
        </p>

        {/* Text input fallback */}
        <div className="w-full">
          <input
            type="text"
            placeholder="Or type your question here..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          />
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">Try asking:</h3>
        <ul className="space-y-1 text-sm text-gray-600">
          <li>• "What are the visa requirements for moving to Germany?"</li>
          <li>• "How much does it cost to relocate to Singapore?"</li>
          <li>• "Which countries have the best quality of life?"</li>
        </ul>
      </div>
    </div>
  );
}
