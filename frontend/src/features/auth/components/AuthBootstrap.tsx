import { useEffect } from "react";
import { normalizeApiError } from "../../../api/axios.js";
import { useAuthStore } from "../../../store/authStore.js";
import type { SafeUser } from "../types/authTypes.js";
import { fetchCurrentUser, refreshCurrentUser } from "../api/authApi.js";

let initialAuthPromise: Promise<SafeUser | null> | null = null;

export function AuthBootstrap(): null {
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);
  const finishInitialAuthCheck = useAuthStore((state) => state.finishInitialAuthCheck);

  useEffect(() => {
    let isMounted = true;

    loadInitialUser()
      .then((user) => {
        if (isMounted) {
          if (user) {
            setUser(user);
          } else {
            clearUser();
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          clearUser();
        }
      })
      .finally(() => {
        if (isMounted) {
          finishInitialAuthCheck();
        }
      });

    return () => {
      isMounted = false;
    };
  }, [clearUser, finishInitialAuthCheck, setUser]);

  return null;
}

async function loadInitialUser(): Promise<SafeUser | null> {
  initialAuthPromise ??= fetchCurrentUser()
    .catch(async (error: unknown) => {
      const apiError = normalizeApiError(error);

      if (apiError.status === 401 && isInvalidAccessTokenError(apiError.code)) {
        return refreshCurrentUser();
      }

      return null;
    })
    .finally(() => {
      initialAuthPromise = null;
    });

  return initialAuthPromise;
}

function isInvalidAccessTokenError(code: string): boolean {
  return code === "INVALID_TOKEN" || code === "INVALID_ACCESS_TOKEN";
}
