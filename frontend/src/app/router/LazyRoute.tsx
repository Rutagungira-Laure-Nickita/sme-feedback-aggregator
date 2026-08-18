import { Suspense, type ReactNode } from "react";
import { AuthLoadingScreen } from "../../features/auth/components/AuthLoadingScreen.js";

export function LazyRoute({ children }: { children: ReactNode }): JSX.Element {
  return <Suspense fallback={<AuthLoadingScreen />}>{children}</Suspense>;
}
