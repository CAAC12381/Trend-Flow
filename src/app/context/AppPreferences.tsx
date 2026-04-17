import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";

export type AppLanguage = "es" | "en";
export type AppTheme = "night" | "aurora" | "daylight";

export interface AppPreferencesState {
  language: AppLanguage;
  theme: AppTheme;
  profile: {
    username: string;
    email: string;
    bio: string;
    avatar: string | null;
  };
  notifications: {
    trendAlerts: boolean;
    weeklyReports: boolean;
    mentions: boolean;
    appUpdates: boolean;
  };
  privacy: {
    publicProfile: boolean;
    showStats: boolean;
    allowMessages: boolean;
  };
  account: {
    plan: "Premium" | "Student";
    status: "active" | "paused";
  };
}

interface AppPreferencesContextValue {
  preferences: AppPreferencesState;
  updatePreferences: (patch: Partial<AppPreferencesState>) => void;
  updateSection: <K extends keyof AppPreferencesState>(
    section: K,
    patch: Partial<AppPreferencesState[K]>,
  ) => void;
  resetPreferences: () => void;
}

const STORAGE_KEY = "treend-app-preferences";

const defaultPreferences: AppPreferencesState = {
  language: "es",
  theme: "night",
  profile: {
    username: "@trendflow_user",
    email: "user@trendflow.com",
    bio: "Analista de redes sociales apasionado",
    avatar: null,
  },
  notifications: {
    trendAlerts: true,
    weeklyReports: true,
    mentions: false,
    appUpdates: true,
  },
  privacy: {
    publicProfile: true,
    showStats: true,
    allowMessages: true,
  },
  account: {
    plan: "Premium",
    status: "active",
  },
};

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null);

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<AppPreferencesState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return defaultPreferences;
    }

    try {
      return {
        ...defaultPreferences,
        ...JSON.parse(saved),
      };
    } catch {
      return defaultPreferences;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setPreferences({
      language: user.language,
      theme: user.theme,
      profile: {
        username: user.username,
        email: user.email,
        bio: user.bio || "",
        avatar: user.avatar || null,
      },
      notifications: {
        trendAlerts: Boolean(user.notifications?.trendAlerts ?? true),
        weeklyReports: Boolean(user.notifications?.weeklyReports ?? true),
        mentions: Boolean(user.notifications?.mentions ?? false),
        appUpdates: Boolean(user.notifications?.appUpdates ?? true),
      },
      privacy: {
        publicProfile: Boolean(user.privacy?.publicProfile ?? true),
        showStats: Boolean(user.privacy?.showStats ?? true),
        allowMessages: Boolean(user.privacy?.allowMessages ?? true),
      },
      account: {
        plan: user.plan || "Premium",
        status: user.accountStatus || "active",
      },
    });
  }, [user]);

  useEffect(() => {
    document.documentElement.dataset.appTheme = preferences.theme;
  }, [preferences.theme]);

  const value = useMemo<AppPreferencesContextValue>(
    () => ({
      preferences,
      updatePreferences: (patch) =>
        setPreferences((current) => ({
          ...current,
          ...patch,
        })),
      updateSection: (section, patch) =>
        setPreferences((current) => ({
          ...current,
          [section]: {
            ...current[section],
            ...patch,
          },
        })),
      resetPreferences: () => setPreferences(defaultPreferences),
    }),
    [preferences],
  );

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext);

  if (!context) {
    throw new Error("useAppPreferences must be used within AppPreferencesProvider");
  }

  return context;
}
