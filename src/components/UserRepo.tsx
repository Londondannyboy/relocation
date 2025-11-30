import { useState, useEffect, useCallback } from 'react';
import { StackProvider, StackTheme, useUser } from '@stackframe/react';
import { stackClientApp } from '../stack/client';

// Profile field configuration with icons and labels
const PROFILE_FIELDS: Record<string, { icon: string; label: string; priority: number; format?: (v: any) => string }> = {
  current_country: { icon: '📍', label: 'Location', priority: 1 },
  current_city: { icon: '🏙️', label: 'City', priority: 2 },
  nationality: { icon: '🛂', label: 'Nationality', priority: 3 },
  destination_countries: {
    icon: '🎯',
    label: 'Interested In',
    priority: 4,
    format: (v: string[]) => v?.join(', ')
  },
  relationship_status: { icon: '💑', label: 'Status', priority: 5 },
  has_children: {
    icon: '👨‍👩‍👧‍👦',
    label: 'Children',
    priority: 6,
    format: (v: boolean, profile: any) => {
      if (!v) return 'No children';
      const count = profile.number_of_children;
      const ages = profile.children_ages;
      let text = count ? `${count} child${count > 1 ? 'ren' : ''}` : 'Has children';
      if (ages?.length) text += ` (ages: ${ages.join(', ')})`;
      return text;
    }
  },
  employment_status: { icon: '💼', label: 'Employment', priority: 7 },
  job_title: { icon: '👔', label: 'Role', priority: 8 },
  industry: { icon: '🏢', label: 'Industry', priority: 9 },
  remote_work: {
    icon: '🌐',
    label: 'Remote Work',
    priority: 10,
    format: (v: boolean) => v ? 'Can work remotely' : 'Office-based'
  },
  income_range: { icon: '💰', label: 'Income', priority: 11 },
  budget_monthly: {
    icon: '💵',
    label: 'Monthly Budget',
    priority: 12,
    format: (v: number) => `$${v?.toLocaleString()}`
  },
  timeline: {
    icon: '📅',
    label: 'Timeline',
    priority: 13,
    format: (v: string) => {
      const labels: Record<string, string> = {
        'asap': 'As soon as possible',
        '3-6months': '3-6 months',
        '6-12months': '6-12 months',
        '1-2years': '1-2 years',
        'exploring': 'Just exploring'
      };
      return labels[v] || v;
    }
  },
  relocation_motivation: {
    icon: '🎯',
    label: 'Motivation',
    priority: 14,
    format: (v: string[]) => v?.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(', ')
  },
  climate_preference: {
    icon: '🌡️',
    label: 'Climate',
    priority: 15,
    format: (v: string) => v?.charAt(0).toUpperCase() + v?.slice(1)
  },
  passport_countries: {
    icon: '🛂',
    label: 'Passports',
    priority: 16,
    format: (v: string[]) => v?.join(', ')
  },
  language_requirements: {
    icon: '🗣️',
    label: 'Languages',
    priority: 17,
    format: (v: string[]) => v?.join(', ')
  },
  has_pets: {
    icon: '🐾',
    label: 'Pets',
    priority: 18,
    format: (v: boolean, profile: any) => {
      if (!v) return null; // Don't show if no pets
      const types = profile.pet_types;
      return types?.length ? types.join(', ') : 'Has pets';
    }
  },
};

// Hidden fields (data exists but shown via parent field)
const HIDDEN_FIELDS = ['number_of_children', 'children_ages', 'pet_types', 'current_country_flag'];

interface UserProfile {
  [key: string]: any;
}

interface ProfileField {
  key: string;
  icon: string;
  label: string;
  value: string;
}

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

interface UserRepoInnerProps {
  user: {
    id: string;
    displayName: string | null;
  } | null;
}

function UserRepoInner({ user }: UserRepoInnerProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayFields, setDisplayFields] = useState<ProfileField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch profile from Neon
  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/profile/extract?user_id=${encodeURIComponent(user.id)}`);

      if (response.ok) {
        const data = await response.json();

        if (data.profile) {
          setProfile(data.profile);

          // Convert profile to display fields
          const fields: ProfileField[] = [];

          for (const [key, config] of Object.entries(PROFILE_FIELDS)) {
            const value = data.profile[key];

            // Skip null/undefined/empty values and hidden fields
            if (value === null || value === undefined || value === '' ||
                (Array.isArray(value) && value.length === 0) ||
                HIDDEN_FIELDS.includes(key)) {
              continue;
            }

            // Format the value
            let displayValue: string | null;
            if (config.format) {
              displayValue = config.format(value, data.profile);
            } else if (typeof value === 'boolean') {
              displayValue = value ? 'Yes' : 'No';
            } else if (Array.isArray(value)) {
              displayValue = value.join(', ');
            } else {
              displayValue = String(value);
            }

            // Skip if formatter returned null (e.g., no pets)
            if (displayValue === null) continue;

            fields.push({
              key,
              icon: config.icon,
              label: config.label,
              value: displayValue,
            });
          }

          // Sort by priority
          fields.sort((a, b) => {
            const aP = PROFILE_FIELDS[a.key]?.priority || 99;
            const bP = PROFILE_FIELDS[b.key]?.priority || 99;
            return aP - bP;
          });

          setDisplayFields(fields);
          setLastUpdate(new Date());
        }
      }
    } catch (err) {
      console.error('[UserRepo] Failed to fetch profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Fetch on mount and listen for updates
  useEffect(() => {
    fetchProfile();

    // Poll every 5 seconds for updates
    const interval = setInterval(fetchProfile, 5000);

    // Listen for extraction events
    const handleExtraction = () => {
      setTimeout(fetchProfile, 500); // Small delay for DB write
    };

    window.addEventListener('profileExtracted', handleExtraction);

    return () => {
      clearInterval(interval);
      window.removeEventListener('profileExtracted', handleExtraction);
    };
  }, [fetchProfile]);

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
        <p style={{ color: '#64748b', fontSize: '13px' }}>Loading profile...</p>
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
            Built from conversation
          </p>
        </div>
      </div>

      {/* Profile Fields */}
      {displayFields.length === 0 ? (
        <div style={{
          padding: '20px',
          background: '#f8fafc',
          borderRadius: '12px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>💬</div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            Start chatting! Your profile builds as we talk.
          </p>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
            Try: "I live in the UK with my family"
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {displayFields.map((field) => (
            <div
              key={field.key}
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
              <span style={{ fontSize: '16px', flexShrink: 0 }}>{field.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: '10px',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  margin: '0 0 2px 0',
                }}>
                  {field.label}
                </p>
                <p style={{
                  fontSize: '13px',
                  color: '#1a202c',
                  margin: 0,
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                }}>
                  {field.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completion indicator */}
      {displayFields.length > 0 && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'linear-gradient(135deg, #667eea10, #764ba210)',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '11px', color: '#667eea', margin: 0, fontWeight: 500 }}>
            {displayFields.length} of ~15 profile fields discovered
          </p>
          <p style={{ fontSize: '10px', color: '#94a3b8', margin: '4px 0 0 0' }}>
            Keep chatting to build more!
          </p>
        </div>
      )}

      {/* Last updated */}
      {lastUpdate && (
        <p style={{
          fontSize: '10px',
          color: '#94a3b8',
          textAlign: 'center',
          marginTop: '8px',
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

  return (
    <UserRepoInner
      user={user ? {
        id: user.id,
        displayName: user.displayName,
      } : null}
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
