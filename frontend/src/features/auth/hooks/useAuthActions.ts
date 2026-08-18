import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  linkGoogleAccount,
  login,
  loginWithGoogle,
  logout,
  logoutAll,
  requestPasswordReset,
  register,
  registerWithGoogle,
  resetPassword
} from "../api/authApi.js";
import type {
  ForgotPasswordFormValues,
  LoginFormValues,
  RegisterFormValues,
  ResetPasswordFormValues
} from "../schemas/authSchemas.js";
import { useAuthStore } from "../../../store/authStore.js";
import { getDefaultAuthenticatedRoute } from "../authRedirects.js";
import type { UserRole } from "../types/authTypes.js";

export function useLoginAction(redirectTo?: string) {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (values: LoginFormValues) => login(values),
    onSuccess(user) {
      setUser(user);
      navigate(redirectTo ?? getDefaultAuthenticatedRoute(user), { replace: true });
    }
  });
}

export function useRegisterAction() {
  const navigate = useNavigate();
  const clearUser = useAuthStore((state) => state.clearUser);

  return useMutation({
    mutationFn: (values: RegisterFormValues) => register(values),
    onSuccess(result) {
      clearUser();
      navigate("/verify-email-pending", {
        replace: true,
        state: {
          email: result.email,
          emailDeliveryStatus: result.emailDeliveryStatus
        }
      });
    }
  });
}

export function useForgotPasswordAction() {
  return useMutation({
    mutationFn: (values: ForgotPasswordFormValues) => requestPasswordReset(values)
  });
}

export function useResetPasswordAction() {
  const navigate = useNavigate();
  const clearUser = useAuthStore((state) => state.clearUser);

  return useMutation({
    mutationFn: (values: ResetPasswordFormValues) => resetPassword(values),
    onSuccess() {
      clearUser();
      navigate("/password-reset-success", { replace: true });
    }
  });
}

export function useGoogleRegisterAction() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (values: {
      credential: string;
      role: Extract<UserRole, "BUSINESS_OWNER" | "CUSTOMER">;
      firstName?: string;
      lastName?: string;
    }) => registerWithGoogle(values),
    onSuccess(user) {
      setUser(user);
      navigate(getDefaultAuthenticatedRoute(user), { replace: true });
    }
  });
}

export function useGoogleLoginAction(redirectTo?: string) {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (credential: string) => loginWithGoogle(credential),
    onSuccess(user) {
      setUser(user);
      navigate(redirectTo ?? getDefaultAuthenticatedRoute(user), { replace: true });
    }
  });
}

export function useGoogleLinkAction() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (credential: string) => linkGoogleAccount(credential),
    onSuccess(user) {
      setUser(user);
      void queryClient.invalidateQueries({ queryKey: ["auth"] });
    }
  });
}

export function useLogoutAction() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clearUser = useAuthStore((state) => state.clearUser);

  return useMutation({
    mutationFn: logout,
    onSettled() {
      clearUser();
      queryClient.removeQueries({ queryKey: ["auth"] });
      navigate("/login", { replace: true });
    }
  });
}

export function useLogoutAllAction() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clearUser = useAuthStore((state) => state.clearUser);

  return useMutation({
    mutationFn: logoutAll,
    onSettled() {
      clearUser();
      queryClient.removeQueries({ queryKey: ["auth"] });
      navigate("/login", { replace: true });
    }
  });
}
