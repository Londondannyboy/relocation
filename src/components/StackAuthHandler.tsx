import { useEffect } from "react";
import { StackProvider, StackTheme, StackHandler, useUser } from "@stackframe/react";
import { stackClientApp } from "../stack/client";

function AuthHandlerWithRedirect() {
  const user = useUser();
  const fullUrl = typeof window !== "undefined" ? window.location.href : "";
  const isCallback = fullUrl.includes("oauth-callback");

  useEffect(() => {
    // If user is authenticated and we're on a callback/handler page, redirect to voice
    if (user && (isCallback || fullUrl.includes("/handler/"))) {
      // Small delay to let Stack Auth finish processing
      const timer = setTimeout(() => {
        window.location.href = "/voice";
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, isCallback, fullUrl]);

  return <StackHandler fullUrl={fullUrl} />;
}

export default function StackAuthHandler() {
  return (
    <StackProvider app={stackClientApp}>
      <StackTheme>
        <AuthHandlerWithRedirect />
      </StackTheme>
    </StackProvider>
  );
}
