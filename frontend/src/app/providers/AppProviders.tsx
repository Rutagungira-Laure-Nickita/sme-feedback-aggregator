import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import type { ReactNode } from "react";
import { useState } from "react";
import { AuthBootstrap } from "../../features/auth/components/AuthBootstrap.js";
import { ThemeProvider } from "../theme/ThemeProvider.js";
import { PlatformSettingsProvider } from "../../features/platform-settings/PlatformSettingsProvider.js";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps): JSX.Element {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 15_000
          }
        }
      })
  );
  const googleClientId = (
    import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  )?.trim();

  const app = (
    <>
      <AuthBootstrap />
      {children}
    </>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <PlatformSettingsProvider>
        <ThemeProvider>
          {googleClientId ? (
            <GoogleOAuthProvider clientId={googleClientId}>{app}</GoogleOAuthProvider>
          ) : (
            app
          )}
        </ThemeProvider>
      </PlatformSettingsProvider>
    </QueryClientProvider>
  );
}
