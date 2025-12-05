import { useState, useEffect } from 'react';
import { StackProvider, StackTheme, useUser } from "@stackframe/react";
import { stackClientApp } from "../stack/client";

interface FactWithSource {
  value: string;
  source_url?: string;
  source_name?: string;
  verified_date?: string;
}

interface DashboardData {
  summary: {
    userName: string;
    currentLocation: { country: string | null; city: string | null };
    destination: { primary: string | null; regions: string[]; all: string[] };
    budget: { amount: string | null; currency: string };
    timeline: string | null;
    workType: string | null;
    industry: string | null;
    family: { status: string | null; hasChildren: boolean };
    motivation: string | null;
  };
  articles: Array<{
    id: number;
    title: string;
    slug: string;
    url: string;
    excerpt: string | null;
    image: string | null;
    country: string | null;
  }>;
  countries: Array<{
    id: number;
    name: string;
    slug: string;
    flag: string;
    capital: string;
    currency: string;
    language: string;
    facts: Record<string, FactWithSource | string>;
  }>;
  hubs: Array<{
    id: number;
    title: string;
    slug: string;
    url: string;
    description: string;
    location: string;
  }>;
}

function getFact(fact: FactWithSource | string | undefined): { value: string; source?: { url: string; name: string; date: string } } {
  if (!fact) return { value: 'N/A' };
  if (typeof fact === 'string') return { value: fact };
  return {
    value: fact.value || 'N/A',
    source: fact.source_url ? {
      url: fact.source_url,
      name: fact.source_name || 'Source',
      date: fact.verified_date || ''
    } : undefined
  };
}

// Country hero images (high quality stock photos)
const countryHeroImages: Record<string, string> = {
  'France': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1920&q=80',
  'Spain': 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1920&q=80',
  'Portugal': 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1920&q=80',
  'Italy': 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=1920&q=80',
  'Germany': 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1920&q=80',
  'Cyprus': 'https://images.unsplash.com/photo-1600011687085-159665c344db?w=1920&q=80',
  'Greece': 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1920&q=80',
  'Netherlands': 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=1920&q=80',
  'default': 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1920&q=80'
};

function DashboardContent() {
  const user = useUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const response = await fetch('/api/user/dashboard-data', {
          headers: { 'x-stack-user-id': user.id },
        });
        if (response.ok) {
          setData(await response.json());
        }
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  if (!user) {
    return (
      <div className="luxury-auth">
        <div className="auth-content">
          <h1>Your Journey Awaits</h1>
          <p>Sign in to access your personalized relocation dashboard</p>
          <a href="/handler/sign-in" className="auth-btn">Begin Your Journey</a>
        </div>
        <style>{authStyles}</style>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="luxury-loading">
        <div className="loader"></div>
        <p>Curating your experience...</p>
        <style>{loadingStyles}</style>
      </div>
    );
  }

  if (!data) return null;

  const { summary, articles, countries, hubs } = data;
  const destination = summary.destination.primary || 'Your Dream Destination';
  const heroImage = countryHeroImages[destination] || countryHeroImages.default;
  const featuredArticle = articles.find(a => a.image) || articles[0];

  return (
    <div className="luxury-dashboard">
      {/* Cinematic Hero */}
      <section className="hero" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <span className="hero-label">Your Relocation Journey</span>
          <h1 className="hero-title">
            {summary.currentLocation.city || summary.currentLocation.country || 'Home'}
            <span className="hero-arrow">→</span>
            {destination}
          </h1>
          <p className="hero-subtitle">
            Welcome back, {summary.userName}. Let's make your dream a reality.
          </p>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="stat-value">{summary.budget.currency === 'EUR' ? '€' : '$'}{summary.budget.amount || '—'}</span>
              <span className="stat-label">Monthly Budget</span>
            </div>
            <div className="hero-stat">
              <span className="stat-value">{summary.timeline || 'Flexible'}</span>
              <span className="stat-label">Timeline</span>
            </div>
            <div className="hero-stat">
              <span className="stat-value">{summary.workType || 'Explorer'}</span>
              <span className="stat-label">Work Style</span>
            </div>
          </div>
        </div>
        <div className="hero-scroll">
          <span>Scroll to explore</span>
          <div className="scroll-indicator"></div>
        </div>
      </section>

      {/* Quick Actions Bar */}
      <section className="actions-bar">
        <button className="action-pill" onClick={() => window.location.href = '/smart-chat'}>
          <span className="pill-icon">💬</span>
          <span>Ask AI Assistant</span>
        </button>
        <button className="action-pill" onClick={() => window.location.href = '/voice'}>
          <span className="pill-icon">🎙️</span>
          <span>Voice Chat</span>
        </button>
        <button className="action-pill" onClick={() => window.open('https://relocation.quest/guides', '_blank')}>
          <span className="pill-icon">📚</span>
          <span>All Guides</span>
        </button>
        <button className="action-pill" onClick={() => window.location.href = '/profile'}>
          <span className="pill-icon">👤</span>
          <span>Edit Profile</span>
        </button>
      </section>

      {/* Magazine Grid */}
      <section className="magazine-section">
        <div className="section-header">
          <span className="section-tag">Curated For You</span>
          <h2>Essential Reading</h2>
        </div>

        <div className="magazine-grid">
          {/* Featured Article */}
          {featuredArticle && (
            <article
              className="featured-article"
              onClick={() => window.open(featuredArticle.url, '_blank')}
              style={{ backgroundImage: featuredArticle.image ? `url(${featuredArticle.image})` : undefined }}
            >
              <div className="article-overlay"></div>
              <div className="article-content">
                {featuredArticle.country && <span className="article-tag">{featuredArticle.country}</span>}
                <h3>{featuredArticle.title}</h3>
                <p>{featuredArticle.excerpt?.slice(0, 150)}...</p>
                <span className="read-more">Read Article →</span>
              </div>
            </article>
          )}

          {/* Article Grid */}
          <div className="articles-stack">
            {articles.slice(1, 5).map((article) => (
              <article
                key={article.id}
                className="stack-article"
                onClick={() => window.open(article.url, '_blank')}
              >
                {article.image && (
                  <div className="stack-image">
                    <img src={article.image} alt={article.title} />
                  </div>
                )}
                <div className="stack-content">
                  {article.country && <span className="stack-tag">{article.country}</span>}
                  <h4>{article.title}</h4>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Destination Deep Dive */}
      {countries.length > 0 && countries.map((country) => {
        const costSingle = getFact(country.facts.cost_of_living_single);
        const visaCost = getFact(country.facts.dn_visa_cost);
        const visaDuration = getFact(country.facts.dn_visa_duration);
        const incomeTax = getFact(country.facts.income_tax_rate);
        const healthcare = getFact(country.facts.healthcare_quality);
        const internet = getFact(country.facts.internet_speed);
        const countryImage = countryHeroImages[country.name] || countryHeroImages.default;

        return (
          <section key={country.id} className="destination-section">
            <div className="destination-hero" style={{ backgroundImage: `url(${countryImage})` }}>
              <div className="destination-overlay"></div>
              <div className="destination-header">
                <span className="destination-flag">{country.flag}</span>
                <div>
                  <h2>{country.name}</h2>
                  <p>{country.capital} · {country.language} · {country.currency}</p>
                </div>
              </div>
            </div>

            <div className="facts-grid">
              <FactCard label="Cost of Living" fact={costSingle} icon="💰" highlight />
              <FactCard label="DN Visa Cost" fact={visaCost} icon="🛂" />
              <FactCard label="Visa Duration" fact={visaDuration} icon="📅" />
              <FactCard label="Income Tax" fact={incomeTax} icon="📊" />
              <FactCard label="Healthcare" fact={healthcare} icon="🏥" />
              <FactCard label="Internet Speed" fact={internet} icon="📶" />
            </div>

            <button
              className="destination-cta"
              onClick={() => window.open(`https://relocation.quest/guides/${country.slug}`, '_blank')}
            >
              Explore {country.name} Guide →
            </button>
          </section>
        );
      })}

      {/* Timeline Section */}
      <section className="timeline-section">
        <div className="section-header">
          <span className="section-tag">Your Roadmap</span>
          <h2>Relocation Timeline</h2>
        </div>

        <div className="visual-timeline">
          <TimelineStep
            number={1}
            title="Research & Planning"
            description={`You're here! Exploring ${destination}`}
            active
          />
          <TimelineStep
            number={2}
            title="Documentation"
            description="Visa applications, apostilles, translations"
          />
          <TimelineStep
            number={3}
            title="Logistics"
            description="Housing, banking, healthcare setup"
          />
          <TimelineStep
            number={4}
            title="The Move"
            description="Execute your relocation plan"
          />
        </div>
      </section>

      {/* Services Showcase */}
      <section className="services-section">
        <div className="section-header">
          <span className="section-tag">Partner Services</span>
          <h2>Essential Tools</h2>
        </div>

        <div className="services-showcase">
          <ServiceCard
            icon="🏥"
            title="SafetyWing"
            subtitle="Nomad Insurance"
            description="Global health coverage designed for remote workers and digital nomads"
            cta="Get Coverage"
            url="https://www.safetywing.com/nomad-insurance"
            color="#10b981"
          />
          <ServiceCard
            icon="💳"
            title="Wise"
            subtitle="International Banking"
            description="Multi-currency account with real exchange rates and low fees"
            cta="Open Account"
            url="https://wise.com"
            color="#667eea"
          />
          <ServiceCard
            icon="🏠"
            title="NomadList"
            subtitle="City Database"
            description="Find the best cities for remote work based on your preferences"
            cta="Explore Cities"
            url="https://nomadlist.com"
            color="#f59e0b"
          />
          <ServiceCard
            icon="✈️"
            title="Skyscanner"
            subtitle="Flight Search"
            description="Find the best deals on flights to your new destination"
            cta="Search Flights"
            url="https://www.skyscanner.com"
            color="#ef4444"
          />
        </div>
      </section>

      {/* More Articles */}
      {articles.length > 5 && (
        <section className="more-articles">
          <div className="section-header">
            <span className="section-tag">Keep Reading</span>
            <h2>More Guides</h2>
          </div>

          <div className="articles-carousel">
            {articles.slice(5, 11).map((article) => (
              <article
                key={article.id}
                className="carousel-article"
                onClick={() => window.open(article.url, '_blank')}
              >
                {article.image ? (
                  <img src={article.image} alt={article.title} />
                ) : (
                  <div className="placeholder-image">📄</div>
                )}
                <h4>{article.title}</h4>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Footer CTA */}
      <section className="footer-cta">
        <h2>Ready to Take the Next Step?</h2>
        <p>Our AI assistant is here to answer any questions about your relocation journey</p>
        <button onClick={() => window.location.href = '/smart-chat'} className="cta-button">
          Start a Conversation
        </button>
      </section>

      <style>{dashboardStyles}</style>
    </div>
  );
}

// Sub-components
function FactCard({ label, fact, icon, highlight }: {
  label: string;
  fact: { value: string; source?: { url: string; name: string; date: string } };
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div className={`fact-card ${highlight ? 'highlight' : ''}`}>
      <div className="fact-header">
        <span className="fact-icon">{icon}</span>
        <span className="fact-label">{label}</span>
      </div>
      <div className="fact-value">{fact.value}</div>
      {fact.source && (
        <a
          href={fact.source.url}
          className="fact-source"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); window.open(fact.source!.url, '_blank'); }}
        >
          📎 {fact.source.name} · {fact.source.date}
        </a>
      )}
    </div>
  );
}

function TimelineStep({ number, title, description, active }: {
  number: number;
  title: string;
  description: string;
  active?: boolean;
}) {
  return (
    <div className={`timeline-step ${active ? 'active' : ''}`}>
      <div className="step-number">{number}</div>
      <div className="step-content">
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
    </div>
  );
}

function ServiceCard({ icon, title, subtitle, description, cta, url, color }: {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  url: string;
  color: string;
}) {
  return (
    <div
      className="service-card"
      onClick={() => window.open(url, '_blank')}
      style={{ '--accent': color } as React.CSSProperties}
    >
      <span className="service-icon">{icon}</span>
      <div className="service-info">
        <h4>{title}</h4>
        <span className="service-subtitle">{subtitle}</span>
        <p>{description}</p>
      </div>
      <span className="service-cta">{cta} →</span>
    </div>
  );
}

// Styles
const authStyles = `
  .luxury-auth {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: white;
    text-align: center;
    padding: 40px;
  }
  .auth-content h1 {
    font-size: 48px;
    font-weight: 300;
    letter-spacing: -1px;
    margin-bottom: 16px;
  }
  .auth-content p {
    font-size: 18px;
    opacity: 0.7;
    margin-bottom: 32px;
  }
  .auth-btn {
    display: inline-block;
    padding: 16px 48px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    text-decoration: none;
    border-radius: 50px;
    font-weight: 600;
    font-size: 16px;
    transition: transform 0.3s, box-shadow 0.3s;
  }
  .auth-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 40px rgba(102, 126, 234, 0.4);
  }
`;

const loadingStyles = `
  .luxury-loading {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #fafafa;
  }
  .loader {
    width: 40px;
    height: 40px;
    border: 3px solid #eee;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .luxury-loading p {
    margin-top: 20px;
    color: #666;
    font-size: 14px;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
`;

const dashboardStyles = `
  .luxury-dashboard {
    font-family: 'Inter', -apple-system, sans-serif;
    background: #fafafa;
    min-height: 100vh;
  }

  /* Hero Section */
  .hero {
    position: relative;
    min-height: 80vh;
    background-size: cover;
    background-position: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    color: white;
    padding: 60px 24px;
  }
  .hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%);
  }
  .hero-content {
    position: relative;
    z-index: 1;
    max-width: 800px;
  }
  .hero-label {
    display: inline-block;
    padding: 8px 20px;
    background: rgba(255,255,255,0.15);
    backdrop-filter: blur(10px);
    border-radius: 50px;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 24px;
  }
  .hero-title {
    font-size: clamp(32px, 6vw, 64px);
    font-weight: 200;
    letter-spacing: -2px;
    margin-bottom: 16px;
    line-height: 1.1;
  }
  .hero-arrow {
    display: inline-block;
    margin: 0 20px;
    opacity: 0.6;
  }
  .hero-subtitle {
    font-size: 18px;
    opacity: 0.8;
    margin-bottom: 40px;
    font-weight: 300;
  }
  .hero-stats {
    display: flex;
    gap: 48px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .hero-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .stat-value {
    font-size: 28px;
    font-weight: 600;
  }
  .stat-label {
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    opacity: 0.7;
    margin-top: 4px;
  }
  .hero-scroll {
    position: absolute;
    bottom: 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    opacity: 0.6;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .scroll-indicator {
    width: 24px;
    height: 40px;
    border: 2px solid white;
    border-radius: 12px;
    position: relative;
  }
  .scroll-indicator::after {
    content: '';
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 8px;
    background: white;
    border-radius: 2px;
    animation: scroll-bounce 2s infinite;
  }
  @keyframes scroll-bounce {
    0%, 100% { transform: translateX(-50%) translateY(0); opacity: 1; }
    50% { transform: translateX(-50%) translateY(10px); opacity: 0.3; }
  }

  /* Actions Bar */
  .actions-bar {
    display: flex;
    gap: 12px;
    justify-content: center;
    padding: 24px;
    background: white;
    border-bottom: 1px solid #eee;
    flex-wrap: wrap;
  }
  .action-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: #f5f5f5;
    border: none;
    border-radius: 50px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  .action-pill:hover {
    background: #667eea;
    color: white;
    transform: translateY(-2px);
  }
  .pill-icon { font-size: 16px; }

  /* Section Headers */
  .section-header {
    margin-bottom: 32px;
  }
  .section-tag {
    display: inline-block;
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #667eea;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .section-header h2 {
    font-size: 32px;
    font-weight: 300;
    letter-spacing: -1px;
    color: #1a1a1a;
  }

  /* Magazine Section */
  .magazine-section {
    padding: 60px 24px;
    max-width: 1400px;
    margin: 0 auto;
  }
  .magazine-grid {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 24px;
  }
  .featured-article {
    position: relative;
    min-height: 500px;
    background: #1a1a1a;
    background-size: cover;
    background-position: center;
    border-radius: 20px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.3s;
  }
  .featured-article:hover {
    transform: scale(1.02);
  }
  .article-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.9) 100%);
  }
  .article-content {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 40px;
    color: white;
  }
  .article-tag {
    display: inline-block;
    padding: 6px 14px;
    background: rgba(255,255,255,0.2);
    border-radius: 20px;
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 16px;
  }
  .article-content h3 {
    font-size: 28px;
    font-weight: 600;
    margin-bottom: 12px;
    line-height: 1.3;
  }
  .article-content p {
    font-size: 15px;
    opacity: 0.8;
    line-height: 1.6;
    margin-bottom: 20px;
  }
  .read-more {
    font-size: 14px;
    font-weight: 600;
    opacity: 0.9;
  }
  .articles-stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .stack-article {
    display: flex;
    gap: 16px;
    padding: 16px;
    background: white;
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }
  .stack-article:hover {
    transform: translateX(8px);
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  }
  .stack-image {
    width: 100px;
    height: 80px;
    border-radius: 10px;
    overflow: hidden;
    flex-shrink: 0;
  }
  .stack-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .stack-content {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .stack-tag {
    font-size: 10px;
    color: #667eea;
    letter-spacing: 1px;
    text-transform: uppercase;
    font-weight: 600;
    margin-bottom: 6px;
  }
  .stack-content h4 {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
    color: #1a1a1a;
  }

  /* Destination Section */
  .destination-section {
    margin: 60px 0;
  }
  .destination-hero {
    position: relative;
    height: 300px;
    background-size: cover;
    background-position: center;
    display: flex;
    align-items: flex-end;
  }
  .destination-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.8) 100%);
  }
  .destination-header {
    position: relative;
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 40px;
    color: white;
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
  }
  .destination-flag {
    font-size: 56px;
  }
  .destination-header h2 {
    font-size: 42px;
    font-weight: 300;
    margin-bottom: 4px;
  }
  .destination-header p {
    font-size: 14px;
    opacity: 0.8;
  }
  .facts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    max-width: 1400px;
    margin: -40px auto 0;
    padding: 0 24px;
    position: relative;
    z-index: 1;
  }
  .fact-card {
    background: white;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    transition: transform 0.2s;
  }
  .fact-card:hover {
    transform: translateY(-4px);
  }
  .fact-card.highlight {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
  }
  .fact-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  .fact-icon { font-size: 20px; }
  .fact-label {
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
    opacity: 0.7;
  }
  .fact-value {
    font-size: 22px;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .fact-source {
    font-size: 11px;
    color: #667eea;
    text-decoration: none;
    cursor: pointer;
  }
  .fact-card.highlight .fact-source {
    color: rgba(255,255,255,0.8);
  }
  .fact-source:hover {
    text-decoration: underline;
  }
  .destination-cta {
    display: block;
    max-width: 400px;
    margin: 32px auto 0;
    padding: 16px 32px;
    background: #1a1a1a;
    color: white;
    border: none;
    border-radius: 50px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .destination-cta:hover {
    background: #667eea;
    transform: translateY(-2px);
  }

  /* Timeline Section */
  .timeline-section {
    padding: 60px 24px;
    max-width: 1000px;
    margin: 0 auto;
  }
  .visual-timeline {
    display: flex;
    gap: 20px;
    overflow-x: auto;
    padding: 20px 0;
  }
  .timeline-step {
    flex: 1;
    min-width: 200px;
    padding: 24px;
    background: white;
    border-radius: 16px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    position: relative;
    transition: all 0.2s;
  }
  .timeline-step.active {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    transform: scale(1.05);
  }
  .step-number {
    width: 36px;
    height: 36px;
    background: #f5f5f5;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
    margin-bottom: 16px;
  }
  .timeline-step.active .step-number {
    background: rgba(255,255,255,0.2);
  }
  .step-content h4 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .step-content p {
    font-size: 13px;
    opacity: 0.7;
    line-height: 1.5;
  }

  /* Services Section */
  .services-section {
    padding: 60px 24px;
    max-width: 1400px;
    margin: 0 auto;
  }
  .services-showcase {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
  }
  .service-card {
    display: flex;
    flex-direction: column;
    padding: 28px;
    background: white;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.3s;
    border: 2px solid transparent;
  }
  .service-card:hover {
    border-color: var(--accent);
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.1);
  }
  .service-icon {
    font-size: 40px;
    margin-bottom: 16px;
  }
  .service-info h4 {
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 2px;
  }
  .service-subtitle {
    font-size: 12px;
    color: var(--accent);
    letter-spacing: 1px;
    text-transform: uppercase;
    font-weight: 600;
  }
  .service-info p {
    font-size: 14px;
    color: #666;
    line-height: 1.5;
    margin-top: 12px;
  }
  .service-cta {
    margin-top: auto;
    padding-top: 16px;
    font-size: 14px;
    font-weight: 600;
    color: var(--accent);
  }

  /* More Articles */
  .more-articles {
    padding: 60px 24px;
    max-width: 1400px;
    margin: 0 auto;
  }
  .articles-carousel {
    display: flex;
    gap: 20px;
    overflow-x: auto;
    padding: 10px 0;
  }
  .carousel-article {
    flex-shrink: 0;
    width: 200px;
    cursor: pointer;
    transition: transform 0.2s;
  }
  .carousel-article:hover {
    transform: scale(1.05);
  }
  .carousel-article img {
    width: 100%;
    height: 150px;
    object-fit: cover;
    border-radius: 12px;
    margin-bottom: 12px;
  }
  .placeholder-image {
    width: 100%;
    height: 150px;
    background: #f0f0f0;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    margin-bottom: 12px;
  }
  .carousel-article h4 {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
  }

  /* Footer CTA */
  .footer-cta {
    text-align: center;
    padding: 80px 24px;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: white;
  }
  .footer-cta h2 {
    font-size: 36px;
    font-weight: 300;
    margin-bottom: 12px;
  }
  .footer-cta p {
    font-size: 16px;
    opacity: 0.7;
    margin-bottom: 32px;
  }
  .cta-button {
    padding: 18px 48px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border: none;
    border-radius: 50px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
  }
  .cta-button:hover {
    transform: translateY(-3px);
    box-shadow: 0 15px 40px rgba(102, 126, 234, 0.4);
  }

  /* Responsive */
  @media (max-width: 900px) {
    .magazine-grid {
      grid-template-columns: 1fr;
    }
    .featured-article {
      min-height: 350px;
    }
    .hero-stats {
      gap: 24px;
    }
    .facts-grid {
      margin-top: -20px;
    }
  }
`;

export default function LuxuryDashboard() {
  return (
    <StackProvider app={stackClientApp}>
      <StackTheme>
        <DashboardContent />
      </StackTheme>
    </StackProvider>
  );
}
