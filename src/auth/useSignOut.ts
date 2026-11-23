import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { signOutEverywhere } from "@/api/auth";
import { useAuth } from "./store";

export const useSignOut = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const refreshToken = useAuth((state) => state.refreshToken);
  const clearSession = useAuth((state) => state.clearSession);

  return useCallback(
    async (options?: { silent?: boolean }) => {
      await signOutEverywhere(refreshToken);
      clearSession();
      queryClient.clear();
      if (!options?.silent) navigate("/sign-in", { replace: true });
    },
    [clearSession, navigate, queryClient, refreshToken],
  );
};
