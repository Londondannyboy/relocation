import { StackProvider, StackTheme, SignIn, SignUp } from "@stackframe/react";
import { stackClientApp } from "../lib/stack";

interface Props {
  path: string;
}

export default function StackAuthHandler({ path }: Props) {
  // Determine which component to show based on path
  const isSignUp = path.includes("sign-up");

  return (
    <StackProvider app={stackClientApp}>
      <StackTheme>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem"
        }}>
          {isSignUp ? <SignUp /> : <SignIn />}
        </div>
      </StackTheme>
    </StackProvider>
  );
}
