import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../../store/authStore.js";
import { getDefaultAuthenticatedRoute } from "../authRedirects.js";
import { AuthLoadingScreen } from "./AuthLoadingScreen.js";

type PublicOnlyRouteProps = {
  children: ReactNode;
};

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const isInitialAuthCheckComplete = useAuthStore(
    (state) => state.isInitialAuthCheckComplete
  );

  if (!isInitialAuthCheckComplete) {
    return <AuthLoadingScreen />;
  }

  if (user) {
    return <Navigate to={getDefaultAuthenticatedRoute(user)} replace />;
  }

  return <>{children}</>;
}
