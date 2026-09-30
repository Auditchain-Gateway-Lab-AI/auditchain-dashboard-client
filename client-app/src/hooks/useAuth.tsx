import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, type PropsWithChildren } from "react";

import { API_UNAUTHORIZED_EVENT } from "@/services/api/client";
import { authService } from "@/services/auth";
import type { AuthSession, LoginCredentials } from "@/types/auth";

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthSession>;
  logout: () => Promise<void>;
  isLoggingIn: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_QUERY_KEY = ["auth", "session"] as const;

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: () => authService.getCurrentSession(),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: (session) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, session);
      queryClient.removeQueries({ queryKey: ["dashboard"] });
      queryClient.removeQueries({ queryKey: ["recovery"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.removeQueries({ queryKey: ["dashboard"] });
      queryClient.removeQueries({ queryKey: ["recovery"] });
    },
  });

  useEffect(() => {
    const handleUnauthorized = () => {
      void authService.logout();
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.removeQueries({ queryKey: ["dashboard"] });
      queryClient.removeQueries({ queryKey: ["recovery"] });
    };

    window.addEventListener(API_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(API_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        session: sessionQuery.data ?? null,
        isLoading: sessionQuery.isPending,
        login: loginMutation.mutateAsync,
        logout: logoutMutation.mutateAsync,
        isLoggingIn: loginMutation.isPending,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
