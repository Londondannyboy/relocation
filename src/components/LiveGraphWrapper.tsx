import { StackProvider, StackTheme } from "@stackframe/react";
import { stackClientApp } from "../stack/client";
import LiveKnowledgeGraph from "./LiveKnowledgeGraph";

interface LiveGraphWrapperProps {
  isActive?: boolean;
  compact?: boolean;
}

export default function LiveGraphWrapper({ isActive = true, compact = true }: LiveGraphWrapperProps) {
  return (
    <StackProvider app={stackClientApp}>
      <StackTheme>
        <LiveKnowledgeGraph isActive={isActive} compact={compact} />
      </StackTheme>
    </StackProvider>
  );
}
