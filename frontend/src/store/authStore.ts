import { create } from "zustand";
import type { SafeUser } from "../features/auth/types/authTypes.js";

type AuthState = {
  user: SafeUser | null;
  isInitialAuthCheckComplete: boolean;
  setUser: (user: SafeUser) => void;
  clearUser: () => void;
  finishInitialAuthCheck: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isInitialAuthCheckComplete: false,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
  finishInitialAuthCheck: () => set({ isInitialAuthCheckComplete: true })
}));
