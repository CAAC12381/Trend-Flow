import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getAuthToken,
  googleAuth,
  loginAuth,
  logoutAuth,
  meAuth,
  registerAuth,
  setAuthToken,
  socialAuth,
  type AuthUser,
} from "../lib/api";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  socialLogin: (provider: "google" | "apple" | "facebook") => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const result = await meAuth();
      setUser(result.user);
    } catch {
      setAuthToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login: async (email, password) => {
        const result = await loginAuth({ email, password });
        setAuthToken(result.token);
        setUser(result.user);
      },
      googleLogin: async (credential) => {
        const result = await googleAuth({ credential });
        setAuthToken(result.token);
        setUser(result.user);
      },
      socialLogin: async (provider) => {
        const result = await socialAuth({ provider });
        setAuthToken(result.token);
        setUser(result.user);
      },
      register: async (username, email, password) => {
        const result = await registerAuth({ username, email, password });
        setAuthToken(result.token);
        setUser(result.user);
      },
      logout: async () => {
        await logoutAuth();
        setAuthToken(null);
        setUser(null);
      },
      refresh,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
