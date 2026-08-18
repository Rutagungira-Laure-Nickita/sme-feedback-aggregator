import { AuthLoadingScreen } from "../../features/auth/components/AuthLoadingScreen.js";
import { useAuthStore } from "../../store/authStore.js";
import { HomePage } from "../../features/public/index.js";

export function RootRedirect(): JSX.Element {
  const isInitialAuthCheckComplete = useAuthStore(
    (state) => state.isInitialAuthCheckComplete
  );

  if (!isInitialAuthCheckComplete) {
    return <AuthLoadingScreen />;
  }

  return <HomePage />;
}
