import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import * as authApi from "../api/auth.ts";
import { tokenStorage } from "../api/client.ts";
import type { LoginData, SignupData, User } from "../types/auth.ts";
import { AuthContext } from "./AuthContext.ts";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => tokenStorage.get() !== null);

  useEffect(() => {
    if (!tokenStorage.get()) {
      return;
    }

    let active = true;

    authApi
      .getCurrentUser()
      .then(({ user }) => {
        if (active) setUser(user);
      })
      .catch(() => {
        tokenStorage.clear();
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (data: LoginData) => {
    const result = await authApi.login(data);
    tokenStorage.set(result.token);
    setUser(result.user);
  }, []);

  const signup = useCallback(async (data: SignupData) => {
    const result = await authApi.signup(data);
    tokenStorage.set(result.token);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, signup, logout }),
    [user, loading, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
