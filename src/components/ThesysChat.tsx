import { useState, useEffect } from 'react';
import { C1Chat, useThreadManager } from '@thesysai/genui-sdk';
import { StackProvider, StackTheme, useUser } from '@stackframe/react';
import { stackClientApp } from '../stack/client';

// Generate or retrieve session ID
function getSessionId(): string {
  const storageKey = 'relocation_c1_session';
  let sessionId = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;

  if (!sessionId) {
    sessionId = `c1_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, sessionId);
    }
  }
  return sessionId;
}

interface ThesysChatInnerProps {
  user: {
    id: string;
    displayName: string | null;
    primaryEmail: string | null;
  } | null;
}

function ThesysChatInner({ user }: ThesysChatInnerProps) {
  const [sessionId] = useState(() => getSessionId());

  // Custom message processor that includes user context
  const processMessage = async (params: { messages: Array<{ role: string; content: string }> }) => {
    const response = await fetch('/api/c1/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: params.messages,
        user: user ? {
          id: user.id,
          displayName: user.displayName,
          primaryEmail: user.primaryEmail,
        } : null,
        sessionId,
      }),
    });

    return response;
  };

  return (
    <div style={{
      height: '100%',
      minHeight: '500px',
      borderRadius: '16px',
      overflow: 'hidden',
    }}>
      <C1Chat
        processMessage={processMessage}
        agentName="Relocation Assistant"
        formFactor="full-page"
        mode="light"
        theme={{
          colors: {
            primary: '#667eea',
            secondary: '#764ba2',
          },
        }}
      />
    </div>
  );
}

// Wrapper component that provides user context
function ThesysChatWithUser() {
  const user = useUser();

  return (
    <ThesysChatInner
      user={user ? {
        id: user.id,
        displayName: user.displayName,
        primaryEmail: user.primaryEmail,
      } : null}
    />
  );
}

// Main export with Stack Auth provider
export default function ThesysChat() {
  return (
    <StackProvider app={stackClientApp}>
      <StackTheme>
        <ThesysChatWithUser />
      </StackTheme>
    </StackProvider>
  );
}
