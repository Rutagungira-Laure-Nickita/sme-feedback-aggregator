import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/authStore.js";
import { fetchSessions, revokeSession } from "../api/authApi.js";

export function useSessionsQuery() {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ["auth", "sessions"],
    queryFn: fetchSessions,
    enabled: Boolean(user)
  });
}

export function useRevokeSessionAction() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const clearUser = useAuthStore((state) => state.clearUser);

  return useMutation({
    mutationFn: (sessionId: string) => revokeSession(sessionId),
    onSuccess(result) {
      if (result.revokedCurrentSession) {
        clearUser();
        queryClient.removeQueries({ queryKey: ["auth"] });
        navigate("/login", { replace: true });
        return;
      }

      void queryClient.invalidateQueries({ queryKey: ["auth", "sessions"] });
    }
  });
}
