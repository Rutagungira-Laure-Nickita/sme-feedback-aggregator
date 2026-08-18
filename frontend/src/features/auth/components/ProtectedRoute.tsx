import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../../store/authStore.js";
import { AuthLoadingScreen } from "./AuthLoadingScreen.js";

type ProtectedRouteProps = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const isInitialAuthCheckComplete = useAuthStore(
    (state) => state.isInitialAuthCheckComplete
  );
  const location = useLocation();

  if (!isInitialAuthCheckComplete) {
    return <AuthLoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
