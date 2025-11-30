import { StackProvider, StackTheme, StackHandler } from "@stackframe/react";
import { stackClientApp } from "../lib/stack";

interface Props {
  path: string;
}

export default function StackAuthHandler({ path }: Props) {
  return (
    <StackProvider app={stackClientApp}>
      <StackTheme>
        <StackHandler path={path} />
      </StackTheme>
    </StackProvider>
  );
}
