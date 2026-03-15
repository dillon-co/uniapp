"use client";

import { useState, useEffect, useCallback } from "react";
import { authApi, ApiError } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

const TOKEN_KEY = "uniapp_token";
const REFRESH_KEY = "uniapp_refresh";

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      authApi
        .me(token)
        .then(({ data }) => {
          setState({ user: data as User, token, isLoading: false });
        })
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_KEY);
          setState({ user: null, token: null, isLoading: false });
        });
    } else {
      setState({ user: null, token: null, isLoading: false });
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login(email, password);
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_KEY, data.refreshToken);
    setState({ user: data.user, token: data.accessToken, isLoading: false });
  }, []);

  const register = useCallback(
    async (data: { email: string; password: string; name: string }) => {
      const { data: res } = await authApi.register(data);
      localStorage.setItem(TOKEN_KEY, res.accessToken);
      localStorage.setItem(REFRESH_KEY, res.refreshToken);
      setState({ user: res.user, token: res.accessToken, isLoading: false });
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    setState({ user: null, token: null, isLoading: false });
  }, []);

  return { ...state, login, register, logout };
}

export { ApiError };
