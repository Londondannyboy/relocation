import { useState, useEffect } from 'react';
import { StackProvider, StackTheme, useUser } from "@stackframe/react";
import { stackClientApp } from "../stack/client";

interface ProfileData {
  summary: {
    userName: string;
    currentLocation: { country: string | null; city: string | null };
    destination: { primary: string | null; regions: string[]; all: string[] };
    budget: { amount: string | null; currency: string };
    timeline: string | null;
    workType: string | null;
  };
  articles: Array<{
    id: number;
    title: string;
    url: string;
    excerpt: string | null;
    country: string | null;
  }>;
  countries: Array<{
    name: string;
    slug: string;
    flag: string;
    facts: Record<string, any>;
  }>;
  factsCount: number;
}

function ProfileContent() {
  const user = useUser();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    fetch('/api/user/dashboard-data', {
      headers: { 'x-stack-user-id': user.id },
    })
      .then(res => res.ok ? res.json() : null)
      .then(setData)
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (!user) {
    return (
      <div style={styles.authContainer}>
        <h1 style={styles.authTitle}>Welcome to Relocation.Quest</h1>
        <p style={styles.authText}>Sign in to view your profile</p>
        <a href="/handler/sign-in" style={styles.authButton}>Sign In</a>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        <p>Loading profile...</p>
      </div>
    );
  }

  const s = data?.summary;

  return (
    <div style={styles.container}>
      {/* Top Nav */}
      <nav style={styles.nav}>
        <a href="/" style={styles.logo}>Relocation<span style={styles.logoAccent}>Quest</span></a>
        <div style={styles.navLinks}>
          <a href="/dashboard" style={styles.navLink}>Dashboard</a>
          <a href="/smart-chat" style={styles.navLink}>AI Chat</a>
          <a href="/guides" style={styles.navLink}>Guides</a>
        </div>
      </nav>

      {/* Profile Header */}
      <header style={styles.header}>
        <div style={styles.avatar}>
          {s?.userName?.[0]?.toUpperCase() || user.primaryEmail?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <h1 style={styles.name}>{s?.userName || 'Guest'}</h1>
          <p style={styles.email}>{user.primaryEmail}</p>
        </div>
      </header>

      {/* Quick Stats */}
      <section style={styles.statsGrid}>
        <StatCard icon="📍" label="From" value={s?.currentLocation?.city || s?.currentLocation?.country || 'Not set'} />
        <StatCard icon="🎯" label="To" value={s?.destination?.primary || 'Exploring'} />
        <StatCard icon="💰" label="Budget" value={s?.budget?.amount ? `${s.budget.currency === 'EUR' ? '€' : '$'}${s.budget.amount}/mo` : 'Not set'} />
        <StatCard icon="⏱️" label="Timeline" value={s?.timeline || 'Flexible'} />
      </section>

      {/* Destination Countries */}
      {data?.countries && data.countries.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Your Destinations</h2>
          <div style={styles.countryList}>
            {data.countries.slice(0, 3).map((c, i) => (
              <a
                key={i}
                href={`https://relocation.quest/guides/${c.slug}`}
                style={styles.countryCard}
              >
                <span style={styles.countryFlag}>{c.flag}</span>
                <span style={styles.countryName}>{c.name}</span>
                <span style={styles.countryArrow}>→</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Recommended Articles */}
      {data?.articles && data.articles.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Recommended for You</h2>
          <div style={styles.articleList}>
            {data.articles.slice(0, 4).map((a, i) => (
              <a key={i} href={a.url} style={styles.articleCard}>
                <span style={styles.articleTitle}>{a.title}</span>
                {a.country && <span style={styles.articleTag}>{a.country}</span>}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section style={styles.actions}>
        <a href="/smart-chat" style={styles.actionButton}>
          💬 Ask AI Assistant
        </a>
        <a href="/voice" style={styles.actionButtonSecondary}>
          🎙️ Voice Chat
        </a>
        <button
          onClick={() => user.signOut()}
          style={styles.signOutButton}
        >
          Sign Out
        </button>
      </section>

      {/* Profile Facts Count */}
      {data?.factsCount !== undefined && (
        <p style={styles.factsNote}>
          We've learned {data.factsCount} facts about your preferences
        </p>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={styles.statCard}>
      <span style={styles.statIcon}>{icon}</span>
      <span style={styles.statLabel}>{label}</span>
      <span style={styles.statValue}>{value}</span>
    </div>
  );
}

// Minimal inline styles - avoids massive CSS strings
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 800,
    margin: '0 auto',
    padding: 20,
    fontFamily: 'Inter, -apple-system, sans-serif',
    background: '#fafafa',
    minHeight: '100vh',
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 16,
    borderBottom: '1px solid #eee',
  },
  logo: {
    fontSize: 20,
    fontWeight: 700,
    textDecoration: 'none',
    color: '#1a1a1a',
  },
  logoAccent: { color: '#f59e0b' },
  navLinks: { display: 'flex', gap: 24 },
  navLink: {
    color: '#666',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    marginBottom: 32,
    padding: 24,
    background: 'white',
    borderRadius: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 600,
  },
  name: { fontSize: 24, fontWeight: 600, margin: 0 },
  email: { fontSize: 14, color: '#666', margin: '4px 0 0' },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    background: 'white',
    padding: 16,
    borderRadius: 12,
    textAlign: 'center' as const,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  statIcon: { fontSize: 24, display: 'block', marginBottom: 8 },
  statLabel: { fontSize: 12, color: '#888', display: 'block' },
  statValue: { fontSize: 16, fontWeight: 600, display: 'block', marginTop: 4 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: 600, marginBottom: 16 },
  countryList: { display: 'flex', flexDirection: 'column' as const, gap: 8 },
  countryCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    background: 'white',
    borderRadius: 12,
    textDecoration: 'none',
    color: '#1a1a1a',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  countryFlag: { fontSize: 24 },
  countryName: { flex: 1, fontWeight: 500 },
  countryArrow: { color: '#888' },
  articleList: { display: 'flex', flexDirection: 'column' as const, gap: 8 },
  articleCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'white',
    borderRadius: 12,
    textDecoration: 'none',
    color: '#1a1a1a',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  articleTitle: { fontWeight: 500, fontSize: 14 },
  articleTag: {
    fontSize: 11,
    padding: '4px 8px',
    background: '#f3f4f6',
    borderRadius: 20,
    color: '#666',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 12,
    marginTop: 32,
  },
  actionButton: {
    flex: 1,
    minWidth: 200,
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: 12,
    fontWeight: 600,
    textAlign: 'center' as const,
    fontSize: 14,
  },
  actionButtonSecondary: {
    flex: 1,
    minWidth: 200,
    padding: '14px 24px',
    background: 'white',
    color: '#1a1a1a',
    textDecoration: 'none',
    borderRadius: 12,
    fontWeight: 600,
    textAlign: 'center' as const,
    border: '1px solid #e5e7eb',
    fontSize: 14,
  },
  signOutButton: {
    padding: '14px 24px',
    background: 'transparent',
    color: '#dc2626',
    border: '1px solid #dc2626',
    borderRadius: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 14,
  },
  factsNote: {
    textAlign: 'center' as const,
    color: '#888',
    fontSize: 13,
    marginTop: 24,
  },
  authContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    color: 'white',
    textAlign: 'center' as const,
    padding: 40,
  },
  authTitle: { fontSize: 36, fontWeight: 300, marginBottom: 16 },
  authText: { fontSize: 16, opacity: 0.7, marginBottom: 32 },
  authButton: {
    padding: '16px 48px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: 50,
    fontWeight: 600,
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid #eee',
    borderTopColor: '#667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

// Export with StackProvider wrapper
export default function LightProfile() {
  return (
    <StackProvider app={stackClientApp}>
      <StackTheme>
        <ProfileContent />
      </StackTheme>
    </StackProvider>
  );
}
