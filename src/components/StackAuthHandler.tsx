import { StackProvider, StackTheme, StackHandler } from "@stackframe/react";
import { stackClientApp } from "../stack/client";

export default function StackAuthHandler() {
  // Get full URL from browser (includes query params for OAuth callbacks)
  const fullUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <StackProvider app={stackClientApp}>
      <StackTheme>
        <StackHandler fullUrl={fullUrl} />
      </StackTheme>
    </StackProvider>
  );
}
