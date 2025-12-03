import { Suspense } from "react";
import { StackProvider, StackTheme, useUser } from "@stackframe/react";
import { stackClientApp } from "../stack/client";
import HumeVoiceInterface from "./HumeVoiceInterface";

interface HumeVoiceWithAuthProps {
  apiUrl?: string;
  configId?: string;
}

function HumeVoiceWithUser({ apiUrl, configId }: HumeVoiceWithAuthProps) {
  const user = useUser();

  return (
    <HumeVoiceInterface
      apiUrl={apiUrl}
      configId={configId}
      user={user ? {
        id: user.id,
        displayName: user.displayName,
        primaryEmail: user.primaryEmail,
      } : null}
    />
  );
}

function LoadingState() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid rgba(147, 112, 219, 0.3)',
          borderTopColor: '#9370DB',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Loading voice interface...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}

export default function HumeVoiceWithAuth({ apiUrl, configId }: HumeVoiceWithAuthProps) {
  return (
    <StackProvider app={stackClientApp}>
      <StackTheme>
        <Suspense fallback={<LoadingState />}>
          <HumeVoiceWithUser apiUrl={apiUrl} configId={configId} />
        </Suspense>
      </StackTheme>
    </StackProvider>
  );
}
