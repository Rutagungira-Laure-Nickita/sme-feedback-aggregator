import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../../store/authStore.js";
import { getDefaultAuthenticatedRoute } from "../authRedirects.js";
import type { UserRole } from "../types/authTypes.js";
import { AuthLoadingScreen } from "./AuthLoadingScreen.js";

type RoleGuardProps = {
  allowedRoles: UserRole[];
  children: ReactNode;
};

export function RoleGuard({ allowedRoles, children }: RoleGuardProps): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const isInitialAuthCheckComplete = useAuthStore(
    (state) => state.isInitialAuthCheckComplete
  );

  if (!isInitialAuthCheckComplete) {
    return <AuthLoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultAuthenticatedRoute(user)} replace />;
  }

  return <>{children}</>;
}
