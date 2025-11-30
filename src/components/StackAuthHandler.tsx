import { useEffect } from "react";
import { StackProvider, StackTheme, StackHandler, useUser } from "@stackframe/react";
import { stackClientApp } from "../stack/client";

function AuthHandlerWithRedirect() {
  const user = useUser();
  const fullUrl = typeof window !== "undefined" ? window.location.href : "";
  const isCallback = fullUrl.includes("oauth-callback");

  useEffect(() => {
    // Only redirect from oauth-callback after successful auth
    if (user && isCallback) {
      const timer = setTimeout(() => {
        window.location.href = "/voice";
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [user, isCallback]);

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
