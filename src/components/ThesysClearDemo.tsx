import { useState } from 'react';
import { C1Component, ThemeProvider } from '@thesysai/genui-sdk';
// Removed: import '@crayonai/react-ui/styles/index.css'; - not installed

export default function ThesysClearDemo() {
  const [rawResponse, setRawResponse] = useState('');
  const [renderedContent, setRenderedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState('');

  const prompts = [
    {
      label: "Cost Comparison Chart",
      prompt: "Create a bar chart comparing monthly cost of living between London, Lisbon, and Bangkok for a digital nomad"
    },
    {
      label: "Country Info Card",
      prompt: "Show me key facts about Portugal for someone relocating - visa options, cost of living, language, and quality of life"
    },
    {
      label: "Visa Guide",
      prompt: "Create a step-by-step guide for applying for the Portugal Digital Nomad Visa"
    },
    {
      label: "Comparison Table",
      prompt: "Compare Spain vs Portugal vs Greece for remote workers - show visa requirements, tax rates, and internet quality"
    }
  ];

  const runDemo = async (prompt: string) => {
    setSelectedPrompt(prompt);
    setIsLoading(true);
    setRawResponse('');
    setRenderedContent('');

    try {
      const response = await fetch('/api/c1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          sessionId: `demo_${Date.now()}`,
        }),
      });

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
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullResponse += parsed.content;
                  setRawResponse(fullResponse);
                  setRenderedContent(fullResponse);
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setRawResponse('Error: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemeProvider>
      <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: '800',
            marginBottom: '12px',
            background: 'linear-gradient(135deg, #667eea, #f093fb)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Thesys C1 Generative UI Demo
          </h1>
          <p style={{ color: '#666', fontSize: '18px' }}>
            Click a button below to see Thesys generate interactive UI components
          </p>
        </div>

        {/* Prompt Buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '40px',
        }}>
          {prompts.map((p, i) => (
            <button
              key={i}
              onClick={() => runDemo(p.prompt)}
              disabled={isLoading}
              style={{
                padding: '20px 16px',
                borderRadius: '12px',
                border: selectedPrompt === p.prompt ? '2px solid #667eea' : '2px solid #e5e7eb',
                background: selectedPrompt === p.prompt ? 'linear-gradient(135deg, #667eea10, #f093fb10)' : '#fff',
                cursor: isLoading ? 'wait' : 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                color: '#374151',
                transition: 'all 0.2s',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Selected Prompt Display */}
        {selectedPrompt && (
          <div style={{
            background: '#f3f4f6',
            padding: '16px 20px',
            borderRadius: '12px',
            marginBottom: '24px',
            fontSize: '14px',
          }}>
            <strong style={{ color: '#667eea' }}>Prompt:</strong>{' '}
            <span style={{ color: '#374151' }}>{selectedPrompt}</span>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#667eea',
            fontSize: '18px',
          }}>
            <div style={{ marginBottom: '12px' }}>Generating UI...</div>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
            }}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: '#667eea',
                    animation: `pulse 1.5s infinite ${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Results - Side by Side */}
        {renderedContent && !isLoading && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
          }}>
            {/* Rendered UI */}
            <div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '700',
                marginBottom: '16px',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{ fontSize: '20px' }}>✨</span>
                Rendered Generative UI
              </h3>
              <div style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
                border: '2px solid #10b98130',
                minHeight: '400px',
              }}>
                <C1Component c1Response={renderedContent} />
              </div>
            </div>

            {/* Raw Response */}
            <div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '700',
                marginBottom: '16px',
                color: '#6366f1',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{ fontSize: '20px' }}>📄</span>
                Raw API Response
              </h3>
              <div style={{
                background: '#1e1e1e',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
                border: '2px solid #6366f130',
                minHeight: '400px',
                maxHeight: '600px',
                overflow: 'auto',
              }}>
                <pre style={{
                  color: '#e5e7eb',
                  fontSize: '12px',
                  fontFamily: 'Monaco, Consolas, monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                }}>
                  {rawResponse}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Explanation */}
        {!renderedContent && !isLoading && (
          <div style={{
            background: 'linear-gradient(135deg, #f9fafb, #fff)',
            borderRadius: '16px',
            padding: '48px',
            textAlign: 'center',
            border: '2px dashed #e5e7eb',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👆</div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '12px', color: '#374151' }}>
              Click a button above to see Thesys in action
            </h3>
            <p style={{ color: '#6b7280', maxWidth: '500px', margin: '0 auto' }}>
              Thesys C1 takes your prompt and generates interactive UI components like charts,
              cards, tables, and more - not just plain text.
            </p>
          </div>
        )}

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.1); }
          }
        `}</style>
      </div>
    </ThemeProvider>
  );
}
