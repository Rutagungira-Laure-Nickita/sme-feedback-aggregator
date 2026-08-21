import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../../store/authStore.js";
import { AccountPage } from "../pages/AccountPage.js";

export function AccountCompatibilityRoute(): JSX.Element {
  const role = useAuthStore((state) => state.user?.role);
  return role === "CUSTOMER" ? <Navigate to="/customer" replace /> : <AccountPage />;
}
