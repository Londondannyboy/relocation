import { StackClientApp } from "@stackframe/react";

// Hardcoded for now - Astro client:only doesn't pass env vars properly
export const stackClientApp = new StackClientApp({
  projectId: "a83fe7e6-8703-4796-aca0-a8935e071e8f",
  publishableClientKey: "pck_dqs7pt56yx8h7twyshnb7reqdjs0y2x4m1tp3vxh9wg0r",
  tokenStore: "cookie",
});
