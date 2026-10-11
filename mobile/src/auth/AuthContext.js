import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { api, setSessionExpiredHandler, signIn as requestSignIn, signOut as requestSignOut } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearUser = useCallback(() => setUser(null), []);

  const loadCurrentUser = useCallback(async () => {
    const { data } = await api.get("auth/me/");
    setUser(data);
    return data;
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(clearUser);
    (async () => {
      try {
        if (await SecureStore.getItemAsync("keyar_access")) await loadCurrentUser();
      } catch {
        await SecureStore.deleteItemAsync("keyar_access");
        await SecureStore.deleteItemAsync("keyar_refresh");
        clearUser();
      } finally {
        setLoading(false);
      }
    })();
  }, [clearUser, loadCurrentUser]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin: user?.role_display === "Admin",
      login: async (username, password) => {
        await requestSignIn(username, password);
        try {
          await loadCurrentUser();
        } catch (error) {
          await SecureStore.deleteItemAsync("keyar_access");
          await SecureStore.deleteItemAsync("keyar_refresh");
          clearUser();
          throw error;
        }
      },
      logout: async () => {
        try {
          await requestSignOut();
        } finally {
          clearUser();
        }
      },
      refreshUser: loadCurrentUser,
    }),
    [clearUser, loadCurrentUser, loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
