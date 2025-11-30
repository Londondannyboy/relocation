import { useState, useEffect } from 'react';
import { StackProvider, StackTheme, useUser } from '@stackframe/react';
import { stackClientApp } from '../stack/client';

const GATEWAY_URL = 'https://quest-gateway-production.up.railway.app';
const APP_ID = 'relocation';

interface UserFact {
  category: string;
  label: string;
  value: string;
  icon: string;
}

interface UserRepoInnerProps {
  user: {
    id: string;
    displayName: string | null;
  } | null;
  sessionId: string;
}

// Get session ID
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

// Category icons and labels
const CATEGORY_CONFIG: Record<string, { icon: string; label: string; priority: number }> = {
  location: { icon: '📍', label: 'Current Location', priority: 1 },
  destination: { icon: '🎯', label: 'Destination', priority: 2 },
  family: { icon: '👨‍👩‍👧‍👦', label: 'Family', priority: 3 },
  work: { icon: '💼', label: 'Work', priority: 4 },
  budget: { icon: '💰', label: 'Budget', priority: 5 },
  visa: { icon: '🛂', label: 'Visa Status', priority: 6 },
  timeline: { icon: '📅', label: 'Timeline', priority: 7 },
  preferences: { icon: '⭐', label: 'Preferences', priority: 8 },
  languages: { icon: '🗣️', label: 'Languages', priority: 9 },
  other: { icon: '📋', label: 'Other', priority: 10 },
};

function UserRepoInner({ user, sessionId }: UserRepoInnerProps) {
  const [facts, setFacts] = useState<UserFact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch user facts from ZEP
  const fetchUserFacts = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${GATEWAY_URL}/memory/user-facts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          session_id: sessionId,
          app_id: APP_ID,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Parse and categorize facts
        const parsedFacts: UserFact[] = [];

        if (data.facts && Array.isArray(data.facts)) {
          data.facts.forEach((fact: any) => {
            const category = categorizesFact(fact.content || fact);
            const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;

            parsedFacts.push({
              category,
              label: config.label,
              value: typeof fact === 'string' ? fact : fact.content,
              icon: config.icon,
            });
          });
        }

        // Also check for structured data
        if (data.location) {
          parsedFacts.push({
            category: 'location',
            label: 'Current Location',
            value: data.location,
            icon: '📍',
          });
        }
        if (data.destination) {
          parsedFacts.push({
            category: 'destination',
            label: 'Interested In',
            value: data.destination,
            icon: '🎯',
          });
        }
        if (data.family_status) {
          parsedFacts.push({
            category: 'family',
            label: 'Family',
            value: data.family_status,
            icon: '👨‍👩‍👧‍👦',
          });
        }
        if (data.work_status) {
          parsedFacts.push({
            category: 'work',
            label: 'Work',
            value: data.work_status,
            icon: '💼',
          });
        }

        // Sort by priority and dedupe
        const uniqueFacts = Array.from(
          new Map(parsedFacts.map(f => [f.value.toLowerCase(), f])).values()
        ).sort((a, b) => {
          const aPriority = CATEGORY_CONFIG[a.category]?.priority || 10;
          const bPriority = CATEGORY_CONFIG[b.category]?.priority || 10;
          return aPriority - bPriority;
        });

        setFacts(uniqueFacts);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('[UserRepo] Failed to fetch facts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Categorize a fact based on keywords
  function categorizesFact(text: string): string {
    const lower = text.toLowerCase();

    if (lower.includes('uk') || lower.includes('london') || lower.includes('live in') ||
        lower.includes('based in') || lower.includes('from') || lower.includes('currently in')) {
      return 'location';
    }
    if (lower.includes('move to') || lower.includes('relocate to') || lower.includes('interested in') ||
        lower.includes('considering') || lower.includes('destination')) {
      return 'destination';
    }
    if (lower.includes('kid') || lower.includes('child') || lower.includes('family') ||
        lower.includes('spouse') || lower.includes('partner') || lower.includes('married') ||
        lower.includes('single')) {
      return 'family';
    }
    if (lower.includes('job') || lower.includes('work') || lower.includes('career') ||
        lower.includes('remote') || lower.includes('employed') || lower.includes('freelance') ||
        lower.includes('business') || lower.includes('entrepreneur')) {
      return 'work';
    }
    if (lower.includes('budget') || lower.includes('salary') || lower.includes('income') ||
        lower.includes('afford') || lower.includes('cost') || lower.includes('money')) {
      return 'budget';
    }
    if (lower.includes('visa') || lower.includes('passport') || lower.includes('citizenship') ||
        lower.includes('residency') || lower.includes('permit')) {
      return 'visa';
    }
    if (lower.includes('when') || lower.includes('timeline') || lower.includes('planning') ||
        lower.includes('month') || lower.includes('year') || lower.includes('soon')) {
      return 'timeline';
    }
    if (lower.includes('language') || lower.includes('speak') || lower.includes('fluent')) {
      return 'languages';
    }
    if (lower.includes('prefer') || lower.includes('want') || lower.includes('need') ||
        lower.includes('important') || lower.includes('looking for')) {
      return 'preferences';
    }

    return 'other';
  }

  // Fetch on mount and periodically
  useEffect(() => {
    fetchUserFacts();

    // Poll every 10 seconds for updates
    const interval = setInterval(fetchUserFacts, 10000);
    return () => clearInterval(interval);
  }, [user?.id, sessionId]);

  // Listen for custom events from voice conversation
  useEffect(() => {
    const handleNewFact = () => {
      fetchUserFacts();
    };

    window.addEventListener('userFactLearned', handleNewFact);
    return () => window.removeEventListener('userFactLearned', handleNewFact);
  }, []);

  if (!user) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#64748b',
      }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔐</div>
        <p style={{ fontSize: '14px' }}>Sign in to build your profile through conversation</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          margin: '0 auto 12px',
          border: '3px solid #e2e8f0',
          borderTopColor: '#667eea',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: '#64748b', fontSize: '13px' }}>Loading your profile...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '16px',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '14px',
          fontWeight: 700,
        }}>
          {user.displayName?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: '14px', color: '#1a202c', margin: 0 }}>
            {user.displayName || 'Your Profile'}
          </p>
          <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
            Learned from conversation
          </p>
        </div>
      </div>

      {/* Facts */}
      {facts.length === 0 ? (
        <div style={{
          padding: '20px',
          background: '#f8fafc',
          borderRadius: '12px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>💬</div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Start chatting! I'll learn about you as we talk.
          </p>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
            Try: "I live in the UK with my family"
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {facts.map((fact, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 12px',
                background: '#f8fafc',
                borderRadius: '10px',
                borderLeft: '3px solid #667eea',
              }}
            >
              <span style={{ fontSize: '16px' }}>{fact.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: '11px',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  margin: '0 0 2px 0',
                }}>
                  {fact.label}
                </p>
                <p style={{
                  fontSize: '13px',
                  color: '#1a202c',
                  margin: 0,
                  lineHeight: 1.4,
                }}>
                  {fact.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Last updated */}
      {lastUpdate && facts.length > 0 && (
        <p style={{
          fontSize: '10px',
          color: '#94a3b8',
          textAlign: 'center',
          marginTop: '12px',
        }}>
          Updated {lastUpdate.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

// Wrapper with Stack Auth
function UserRepoWithAuth() {
  const user = useUser();
  const [sessionId] = useState(() => getSessionId());

  return (
    <UserRepoInner
      user={user ? {
        id: user.id,
        displayName: user.displayName,
      } : null}
      sessionId={sessionId}
    />
  );
}

// Main export
export default function UserRepo() {
  return (
    <StackProvider app={stackClientApp}>
      <StackTheme>
        <UserRepoWithAuth />
      </StackTheme>
    </StackProvider>
  );
}
