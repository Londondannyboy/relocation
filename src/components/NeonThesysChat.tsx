import { useState, useRef, useEffect } from 'react';
import { C1Component, ThemeProvider } from '@thesysai/genui-sdk';
import '@crayonai/react-ui/styles/index.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function NeonThesysChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponse]);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    setInput('');
    setIsLoading(true);
    setCurrentResponse('');

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);

    try {
      const response = await fetch('/api/c1/neon-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          sessionId: `neon_${Date.now()}`,
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

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
                  setCurrentResponse(fullResponse);
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      setMessages([...newMessages, { role: 'assistant', content: fullResponse }]);
      setCurrentResponse('');
    } catch (error) {
      console.error('Error:', error);
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Sorry, there was an error. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const suggestedQueries = [
    { icon: '🇵🇹', text: 'Tell me about relocating to Portugal' },
    { icon: '📊', text: 'Compare cost of living: Spain vs Thailand' },
    { icon: '🛂', text: 'Best digital nomad visa options in Europe' },
    { icon: '🏠', text: 'Show me guides for moving to Dubai' },
  ];

  return (
    <ThemeProvider>
      <div className="neon-chat-container">
        {/* Messages Area */}
        <div className="messages-area">
          {messages.length === 0 && !currentResponse && (
            <div className="welcome-screen">
              <div className="welcome-icon">🌍</div>
              <h2 className="welcome-title">Relocation Assistant</h2>
              <p className="welcome-subtitle">
                Powered by Thesys C1 + Neon Database
              </p>
              <p className="welcome-description">
                Ask me anything about relocation, visas, cost of living, or country comparisons.
                I'll generate interactive UI with real data from our database.
              </p>

              <div className="suggestions-grid">
                {suggestedQueries.map((q, i) => (
                  <button
                    key={i}
                    className="suggestion-btn"
                    onClick={() => sendMessage(q.text)}
                  >
                    <span className="suggestion-icon">{q.icon}</span>
                    <span className="suggestion-text">{q.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`message ${message.role}`}
            >
              {message.role === 'user' ? (
                <div className="user-message">
                  <div className="user-avatar">You</div>
                  <div className="user-content">{message.content}</div>
                </div>
              ) : (
                <div className="assistant-message">
                  <div className="assistant-header">
                    <span className="assistant-icon">✨</span>
                    <span className="assistant-label">Relocation Assistant</span>
                  </div>
                  <div className="assistant-content">
                    <C1Component c1Response={message.content} />
                  </div>
                </div>
              )}
            </div>
          ))}

          {currentResponse && (
            <div className="message assistant">
              <div className="assistant-message">
                <div className="assistant-header">
                  <span className="assistant-icon">✨</span>
                  <span className="assistant-label">Generating...</span>
                </div>
                <div className="assistant-content streaming">
                  <C1Component c1Response={currentResponse} />
                </div>
              </div>
            </div>
          )}

          {isLoading && !currentResponse && (
            <div className="loading-indicator">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="loading-text">Querying Neon database...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="input-area">
          <div className="input-wrapper">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about countries, visas, cost of living..."
              disabled={isLoading}
              className="chat-input"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="send-btn"
            >
              {isLoading ? (
                <span className="btn-loading"></span>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              )}
            </button>
          </div>
          <p className="input-hint">
            Data powered by Neon PostgreSQL • UI by Thesys C1
          </p>
        </form>

        <style>{`
          .neon-chat-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            min-height: 600px;
            background: #f9fafb;
            border-radius: 16px;
            overflow: hidden;
          }

          .messages-area {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
          }

          .welcome-screen {
            text-align: center;
            padding: 48px 24px;
            max-width: 600px;
            margin: 0 auto;
          }

          .welcome-icon {
            font-size: 64px;
            margin-bottom: 16px;
          }

          .welcome-title {
            font-size: 32px;
            font-weight: 800;
            margin-bottom: 8px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .welcome-subtitle {
            font-size: 14px;
            color: #667eea;
            font-weight: 600;
            margin-bottom: 16px;
          }

          .welcome-description {
            color: #6b7280;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 32px;
          }

          .suggestions-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }

          .suggestion-btn {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            cursor: pointer;
            text-align: left;
            transition: all 0.2s;
          }

          .suggestion-btn:hover {
            border-color: #667eea;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
            transform: translateY(-2px);
          }

          .suggestion-icon {
            font-size: 24px;
          }

          .suggestion-text {
            font-size: 14px;
            color: #374151;
            font-weight: 500;
          }

          .message {
            margin-bottom: 24px;
          }

          .user-message {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            justify-content: flex-end;
          }

          .user-avatar {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: #fff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 700;
            order: 2;
          }

          .user-content {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: #fff;
            padding: 12px 18px;
            border-radius: 18px 18px 4px 18px;
            max-width: 70%;
            font-size: 15px;
            line-height: 1.5;
          }

          .assistant-message {
            max-width: 100%;
          }

          .assistant-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
          }

          .assistant-icon {
            font-size: 20px;
          }

          .assistant-label {
            font-size: 14px;
            font-weight: 600;
            color: #667eea;
          }

          .assistant-content {
            background: #fff;
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
            border: 1px solid #e5e7eb;
          }

          .assistant-content.streaming {
            border-color: #667eea;
            animation: pulse-border 2s infinite;
          }

          @keyframes pulse-border {
            0%, 100% { border-color: #667eea; }
            50% { border-color: #f093fb; }
          }

          .loading-indicator {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            color: #667eea;
          }

          .loading-dots {
            display: flex;
            gap: 4px;
          }

          .loading-dots span {
            width: 8px;
            height: 8px;
            background: #667eea;
            border-radius: 50%;
            animation: bounce 1.4s infinite ease-in-out both;
          }

          .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
          .loading-dots span:nth-child(2) { animation-delay: -0.16s; }

          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
          }

          .loading-text {
            font-size: 14px;
            font-weight: 500;
          }

          .input-area {
            padding: 20px 24px;
            background: #fff;
            border-top: 1px solid #e5e7eb;
          }

          .input-wrapper {
            display: flex;
            gap: 12px;
            align-items: center;
          }

          .chat-input {
            flex: 1;
            padding: 14px 20px;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            font-size: 15px;
            outline: none;
            transition: border-color 0.2s;
          }

          .chat-input:focus {
            border-color: #667eea;
          }

          .chat-input:disabled {
            background: #f3f4f6;
          }

          .send-btn {
            width: 48px;
            height: 48px;
            border: none;
            border-radius: 12px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: #fff;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
          }

          .send-btn:hover:not(:disabled) {
            transform: scale(1.05);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }

          .send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .btn-loading {
            width: 20px;
            height: 20px;
            border: 2px solid #fff;
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .input-hint {
            font-size: 12px;
            color: #9ca3af;
            text-align: center;
            margin-top: 12px;
          }

          @media (max-width: 640px) {
            .suggestions-grid {
              grid-template-columns: 1fr;
            }

            .user-content {
              max-width: 85%;
            }
          }
        `}</style>
      </div>
    </ThemeProvider>
  );
}
