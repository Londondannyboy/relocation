import { useState, useRef, useEffect } from 'react';
import { StackProvider, StackTheme, useUser } from "@stackframe/react";
import { stackClientApp } from "../stack/client";

// ============================================================
// GENERATIVE UI COMPONENT LIBRARY
// Native React components with working clickable links
// ============================================================

interface FactWithSource {
  label: string;
  value: string;
  icon?: string;
  sourceUrl?: string;
  sourceName?: string;
}

interface Article {
  title: string;
  url: string;
  image?: string;
  excerpt?: string;
  country?: string;
}

interface Service {
  name: string;
  type: string;
  url: string;
  description?: string;
  icon?: string;
}

// Country Card Component - uses MUX images from database
function CountryCard({ data }: { data: any }) {
  // Use image from API (MUX thumbnail), fallback to gradient
  const bgImage = data.image;
  const hasImage = !!bgImage;

  return (
    <div
      className="genui-country-card"
      style={hasImage
        ? { backgroundImage: `url(${bgImage})` }
        : { background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)' }
      }
    >
      <div className="country-card-overlay" />
      <div className="country-card-content">
        <div className="country-header">
          <span className="country-flag">{data.flag}</span>
          <div>
            <h3>{data.name}</h3>
            <p>{data.capital} · {data.language} · {data.currency}</p>
          </div>
        </div>
        {data.facts && (
          <div className="country-facts-row">
            {data.facts.costSingle && (
              <div className="mini-fact">
                <span className="mini-icon">💰</span>
                <span>{typeof data.facts.costSingle === 'object' ? data.facts.costSingle.value : data.facts.costSingle}/mo</span>
              </div>
            )}
            {data.facts.dnVisaCost && (
              <div className="mini-fact">
                <span className="mini-icon">🛂</span>
                <span>{typeof data.facts.dnVisaCost === 'object' ? data.facts.dnVisaCost.value : data.facts.dnVisaCost}</span>
              </div>
            )}
            {data.facts.internetSpeed && (
              <div className="mini-fact">
                <span className="mini-icon">📶</span>
                <span>{typeof data.facts.internetSpeed === 'object' ? data.facts.internetSpeed.value : data.facts.internetSpeed}</span>
              </div>
            )}
          </div>
        )}
        <button
          className="country-cta"
          onClick={() => window.open(`https://relocation.quest/guides/${data.slug || data.name.toLowerCase()}`, '_blank')}
        >
          Explore {data.name} →
        </button>
      </div>
    </div>
  );
}

// Article Grid Component - CLICKABLE LINKS
function ArticleGrid({ data }: { data: { articles: Article[] } }) {
  if (!data.articles || data.articles.length === 0) return null;

  return (
    <div className="genui-article-grid">
      {data.articles.map((article, i) => (
        <article
          key={i}
          className="article-card"
          onClick={() => window.open(article.url, '_blank')}
        >
          {article.image && (
            <div className="article-image">
              <img src={article.image} alt={article.title} />
            </div>
          )}
          <div className="article-body">
            {article.country && <span className="article-tag">{article.country}</span>}
            <h4>{article.title}</h4>
            {article.excerpt && <p>{article.excerpt.slice(0, 100)}...</p>}
            <span className="article-link">Read article →</span>
          </div>
        </article>
      ))}
    </div>
  );
}

// Fact List with Sources
function FactList({ data }: { data: { title?: string; facts: FactWithSource[] } }) {
  return (
    <div className="genui-fact-list">
      {data.title && <h4 className="fact-list-title">{data.title}</h4>}
      <div className="facts-container">
        {data.facts.map((fact, i) => (
          <div key={i} className="fact-item">
            <div className="fact-icon">{fact.icon || '📌'}</div>
            <div className="fact-content">
              <span className="fact-label">{fact.label}</span>
              <span className="fact-value">{fact.value}</span>
              {fact.sourceUrl && (
                <a
                  href={fact.sourceUrl}
                  className="fact-source"
                  onClick={(e) => { e.preventDefault(); window.open(fact.sourceUrl, '_blank'); }}
                >
                  📎 {fact.sourceName || 'Source'}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Cost Chart
function CostChart({ data }: { data: { title?: string; items: { label: string; value: number }[] } }) {
  const maxValue = Math.max(...data.items.map(i => i.value));

  return (
    <div className="genui-cost-chart">
      {data.title && <h4>{data.title}</h4>}
      <div className="chart-bars">
        {data.items.map((item, i) => (
          <div key={i} className="chart-bar-row">
            <span className="bar-label">{item.label}</span>
            <div className="bar-container">
              <div
                className="bar-fill"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
              <span className="bar-value">€{item.value.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Timeline/Steps
function Timeline({ data }: { data: { title?: string; steps: { title: string; description: string }[] } }) {
  return (
    <div className="genui-timeline">
      {data.title && <h4>{data.title}</h4>}
      <div className="timeline-steps">
        {data.steps.map((step, i) => (
          <div key={i} className="timeline-step">
            <div className="step-number">{i + 1}</div>
            <div className="step-content">
              <h5>{step.title}</h5>
              <p>{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Services Grid
function ServicesGrid({ data }: { data: { services: Service[] } }) {
  return (
    <div className="genui-services">
      {data.services.map((service, i) => (
        <div
          key={i}
          className="service-card"
          onClick={() => window.open(service.url, '_blank')}
        >
          <span className="service-icon">{service.icon || '🔗'}</span>
          <div>
            <h5>{service.name}</h5>
            <span className="service-type">{service.type}</span>
            {service.description && <p>{service.description}</p>}
          </div>
          <span className="service-arrow">→</span>
        </div>
      ))}
    </div>
  );
}

// CTA Button
function CTAButton({ data }: { data: { text: string; url: string } }) {
  return (
    <button
      className="genui-cta-button"
      onClick={() => window.open(data.url, '_blank')}
    >
      {data.text}
    </button>
  );
}

// Sources List
function SourcesList({ sources }: { sources: Array<{ title: string; url: string; id?: string }> }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="genui-sources">
      <h5>📚 Sources</h5>
      <ul>
        {sources.map((source, i) => (
          <li key={i}>
            <a
              href={source.url}
              onClick={(e) => { e.preventDefault(); window.open(source.url, '_blank'); }}
            >
              {source.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Main UI Component Renderer
function renderComponent(component: any, index: number) {
  switch (component.type) {
    case 'country_card':
      return <CountryCard key={index} data={component.data} />;
    case 'article_grid':
      return <ArticleGrid key={index} data={component.data} />;
    case 'fact_list':
      return <FactList key={index} data={component.data} />;
    case 'cost_chart':
      return <CostChart key={index} data={component.data} />;
    case 'timeline':
      return <Timeline key={index} data={component.data} />;
    case 'services':
      return <ServicesGrid key={index} data={component.data} />;
    case 'cta_button':
      return <CTAButton key={index} data={component.data} />;
    default:
      return null;
  }
}

// ============================================================
// SMART CHAT COMPONENT
// ============================================================

interface Message {
  role: 'user' | 'assistant';
  content: string;
  components?: any[];
  sources?: any[];
  followUp?: string;
}

function ChatContent() {
  const user = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat/smart-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.id && { 'x-stack-user-id': user.id }),
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }].map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Build the assistant message from structured response
      const assistantMessage: Message = {
        role: 'assistant',
        content: `${data.greeting || ''}\n\n${data.mainText || data.message || ''}`.trim(),
        components: data.components || [],
        sources: data.sources || [],
        followUp: data.followUp,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        components: [],
        sources: [],
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleFollowUp = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  const suggestions = [
    "Tell me about relocating to France",
    "What's the cost of living in Portugal?",
    "Digital nomad visa options in Europe",
    "Best countries for remote workers",
  ];

  return (
    <div className="smart-chat">
      {/* Header */}
      <header className="chat-header">
        <a href="/" className="back-link">← Back</a>
        <div className="header-content">
          <h1>Relocation Assistant</h1>
          <p>Ask me anything about relocating abroad</p>
        </div>
        {user && (
          <div className="user-badge">
            <span className="user-avatar">{user.displayName?.charAt(0) || '👤'}</span>
          </div>
        )}
      </header>

      {/* Messages */}
      <main className="chat-messages">
        {messages.length === 0 ? (
          <div className="welcome-screen">
            <div className="welcome-icon">🌍</div>
            <h2>Welcome to Relocation.Quest</h2>
            <p>Your AI-powered guide to relocating abroad. Ask me about visa requirements, cost of living, best destinations, and more.</p>
            <div className="suggestions">
              {suggestions.map((s, i) => (
                <button key={i} className="suggestion-btn" onClick={() => handleFollowUp(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, i) => (
            <div key={i} className={`message ${message.role}`}>
              {message.role === 'assistant' && (
                <div className="assistant-avatar">🤖</div>
              )}
              <div className="message-content">
                {/* Text content */}
                <div className="message-text">{message.content}</div>

                {/* Rendered UI components */}
                {message.components && message.components.length > 0 && (
                  <div className="message-components">
                    {message.components.map((comp, j) => renderComponent(comp, j))}
                  </div>
                )}

                {/* Sources */}
                {message.sources && message.sources.length > 0 && (
                  <SourcesList sources={message.sources} />
                )}

                {/* Follow-up suggestion */}
                {message.followUp && (
                  <button
                    className="follow-up-btn"
                    onClick={() => handleFollowUp(message.followUp!)}
                  >
                    💡 {message.followUp}
                  </button>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="message assistant">
            <div className="assistant-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about relocating abroad..."
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>

      <style>{chatStyles}</style>
    </div>
  );
}

const chatStyles = `
  .smart-chat {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #f8f9fa;
    font-family: 'Inter', -apple-system, sans-serif;
  }

  /* Header */
  .chat-header {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 16px 24px;
    background: white;
    border-bottom: 1px solid #eee;
  }
  .back-link {
    color: #667eea;
    text-decoration: none;
    font-weight: 500;
    font-size: 14px;
  }
  .header-content {
    flex: 1;
  }
  .header-content h1 {
    font-size: 18px;
    font-weight: 700;
    margin: 0;
    background: linear-gradient(135deg, #667eea, #764ba2);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .header-content p {
    font-size: 12px;
    color: #666;
    margin: 2px 0 0;
  }
  .user-badge {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea, #764ba2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
  }

  /* Messages */
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }
  .welcome-screen {
    text-align: center;
    padding: 60px 24px;
    max-width: 500px;
    margin: 0 auto;
  }
  .welcome-icon {
    font-size: 64px;
    margin-bottom: 20px;
  }
  .welcome-screen h2 {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 12px;
  }
  .welcome-screen p {
    color: #666;
    margin-bottom: 32px;
    line-height: 1.6;
  }
  .suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
  }
  .suggestion-btn {
    padding: 10px 16px;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 20px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .suggestion-btn:hover {
    border-color: #667eea;
    color: #667eea;
    background: #f8f7ff;
  }

  .message {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
    max-width: 900px;
  }
  .message.user {
    flex-direction: row-reverse;
    margin-left: auto;
  }
  .assistant-avatar {
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }
  .message-content {
    flex: 1;
  }
  .message.user .message-content {
    text-align: right;
  }
  .message-text {
    background: white;
    padding: 16px 20px;
    border-radius: 16px;
    line-height: 1.6;
    font-size: 14px;
    white-space: pre-wrap;
  }
  .message.user .message-text {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border-radius: 16px 16px 4px 16px;
    display: inline-block;
  }
  .message.assistant .message-text {
    border-radius: 16px 16px 16px 4px;
  }
  .message-components {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* Typing Indicator */
  .typing-indicator {
    display: flex;
    gap: 4px;
    padding: 16px 20px;
    background: white;
    border-radius: 16px;
    width: fit-content;
  }
  .typing-indicator span {
    width: 8px;
    height: 8px;
    background: #667eea;
    border-radius: 50%;
    animation: typing 1.4s infinite both;
  }
  .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
  .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes typing {
    0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
    40% { opacity: 1; transform: scale(1); }
  }

  /* Follow-up */
  .follow-up-btn {
    margin-top: 12px;
    padding: 10px 16px;
    background: #f0f7ff;
    border: 1px dashed #667eea;
    border-radius: 12px;
    font-size: 13px;
    color: #667eea;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
  }
  .follow-up-btn:hover {
    background: #667eea;
    color: white;
    border-style: solid;
  }

  /* Input Form */
  .chat-input-form {
    display: flex;
    gap: 12px;
    padding: 16px 24px 24px;
    background: white;
    border-top: 1px solid #eee;
  }
  .chat-input-form input {
    flex: 1;
    padding: 14px 20px;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    font-size: 14px;
    transition: border-color 0.2s;
  }
  .chat-input-form input:focus {
    outline: none;
    border-color: #667eea;
  }
  .chat-input-form button {
    padding: 14px 28px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border: none;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, opacity 0.2s;
  }
  .chat-input-form button:hover:not(:disabled) {
    transform: translateY(-1px);
  }
  .chat-input-form button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ============================================ */
  /* GENERATIVE UI COMPONENT STYLES */
  /* ============================================ */

  /* Country Card */
  .genui-country-card {
    position: relative;
    border-radius: 16px;
    overflow: hidden;
    min-height: 200px;
    background-size: cover;
    background-position: center;
  }
  .country-card-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%);
  }
  .country-card-content {
    position: relative;
    padding: 24px;
    color: white;
    display: flex;
    flex-direction: column;
    height: 100%;
    justify-content: flex-end;
  }
  .country-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  .country-flag {
    font-size: 40px;
  }
  .country-header h3 {
    font-size: 24px;
    font-weight: 600;
    margin: 0;
  }
  .country-header p {
    font-size: 13px;
    opacity: 0.8;
    margin: 0;
  }
  .country-facts-row {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .mini-fact {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(255,255,255,0.15);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    font-size: 13px;
  }
  .country-cta {
    align-self: flex-start;
    padding: 10px 20px;
    background: white;
    color: #1a1a1a;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s;
  }
  .country-cta:hover {
    transform: translateY(-2px);
  }

  /* Article Grid */
  .genui-article-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }
  .article-card {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  .article-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  }
  .article-image {
    height: 120px;
    overflow: hidden;
  }
  .article-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .article-body {
    padding: 14px;
  }
  .article-tag {
    display: inline-block;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #667eea;
    font-weight: 600;
    margin-bottom: 6px;
  }
  .article-body h4 {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
    margin: 0 0 6px;
  }
  .article-body p {
    font-size: 12px;
    color: #666;
    line-height: 1.5;
    margin: 0 0 8px;
  }
  .article-link {
    font-size: 12px;
    color: #667eea;
    font-weight: 600;
  }

  /* Fact List */
  .genui-fact-list {
    background: white;
    border-radius: 12px;
    padding: 20px;
  }
  .fact-list-title {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 16px;
    color: #333;
  }
  .facts-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
  }
  .fact-item {
    display: flex;
    gap: 10px;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 10px;
  }
  .fact-icon {
    font-size: 20px;
  }
  .fact-content {
    display: flex;
    flex-direction: column;
  }
  .fact-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #888;
    margin-bottom: 2px;
  }
  .fact-value {
    font-size: 15px;
    font-weight: 600;
    color: #1a1a1a;
  }
  .fact-source {
    font-size: 11px;
    color: #667eea;
    text-decoration: none;
    margin-top: 4px;
    cursor: pointer;
  }
  .fact-source:hover {
    text-decoration: underline;
  }

  /* Cost Chart */
  .genui-cost-chart {
    background: white;
    border-radius: 12px;
    padding: 20px;
  }
  .genui-cost-chart h4 {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 16px;
  }
  .chart-bars {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .chart-bar-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .bar-label {
    width: 80px;
    font-size: 13px;
    color: #666;
  }
  .bar-container {
    flex: 1;
    height: 28px;
    background: #f0f0f0;
    border-radius: 6px;
    position: relative;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #667eea, #764ba2);
    border-radius: 6px;
    transition: width 0.5s ease;
  }
  .bar-value {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 12px;
    font-weight: 600;
    color: #333;
  }

  /* Timeline */
  .genui-timeline {
    background: white;
    border-radius: 12px;
    padding: 20px;
  }
  .genui-timeline h4 {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 16px;
  }
  .timeline-steps {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .timeline-step {
    display: flex;
    gap: 12px;
  }
  .step-number {
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .step-content h5 {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 4px;
  }
  .step-content p {
    font-size: 13px;
    color: #666;
    margin: 0;
    line-height: 1.5;
  }

  /* Services */
  .genui-services {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .service-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: white;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .service-card:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }
  .service-icon {
    font-size: 28px;
  }
  .service-card h5 {
    font-size: 14px;
    font-weight: 600;
    margin: 0;
  }
  .service-type {
    font-size: 11px;
    color: #667eea;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .service-card p {
    font-size: 12px;
    color: #666;
    margin: 4px 0 0;
  }
  .service-arrow {
    margin-left: auto;
    color: #667eea;
    font-size: 18px;
  }

  /* CTA Button */
  .genui-cta-button {
    display: inline-block;
    padding: 14px 28px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .genui-cta-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
  }

  /* Sources */
  .genui-sources {
    margin-top: 16px;
    padding: 14px;
    background: #f8f9fa;
    border-radius: 10px;
  }
  .genui-sources h5 {
    font-size: 12px;
    font-weight: 600;
    color: #666;
    margin: 0 0 8px;
  }
  .genui-sources ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .genui-sources li a {
    font-size: 12px;
    color: #667eea;
    text-decoration: none;
    padding: 4px 10px;
    background: white;
    border-radius: 6px;
    display: inline-block;
  }
  .genui-sources li a:hover {
    text-decoration: underline;
  }

  /* Mobile */
  @media (max-width: 640px) {
    .chat-header {
      padding: 12px 16px;
    }
    .chat-messages {
      padding: 16px;
    }
    .chat-input-form {
      padding: 12px 16px 20px;
    }
    .genui-article-grid {
      grid-template-columns: 1fr;
    }
    .facts-container {
      grid-template-columns: 1fr;
    }
  }
`;

export default function SmartChat() {
  return (
    <StackProvider app={stackClientApp}>
      <StackTheme>
        <ChatContent />
      </StackTheme>
    </StackProvider>
  );
}
