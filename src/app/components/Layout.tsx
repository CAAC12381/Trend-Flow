import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Settings,
  Search,
  Bell,
  Flame,
  CheckCheck,
  LogOut,
  X,
} from "lucide-react";
import {
  addSearchHistory,
  getNotifications,
  getSearchHistory,
  getViralTrends,
  markAllNotificationsRead,
  markNotificationRead,
  syncNotifications,
  type AppNotification,
  type ViralTrend,
} from "../lib/api";
import { useAppPreferences } from "../context/AppPreferences";
import { useCopy } from "../lib/copy";
import { useAuth } from "../context/AuthContext";
const AssistantWidget = lazy(() => import("./AssistantWidget"));
const sidebarLogoUrl = new URL("../../../Tr66nd-removebg-preview.png", import.meta.url).href;
const NOTIFICATIONS_SEEN_KEY = "treend-notifications-seen-at";

const sourceLabels: Record<ViralTrend["source"], string> = {
  google: "Google Trends",
  reddit: "Reddit",
  hackernews: "Hacker News",
  news: "News",
  youtube: "YouTube",
};

const searchAliases: Record<string, string[]> = {
  musica: ["musica", "music", "cancion", "song", "artista", "album"],
  moda: ["moda", "fashion", "outfit", "style", "beauty"],
  deportes: ["deportes", "sports", "futbol", "football", "nba", "nfl"],
  noticias: ["noticias", "news", "headline", "actualidad"],
  tecnologia: ["tecnologia", "technology", "chatgpt", "startup", "openai"],
  cine: ["cine", "pelicula", "movie", "trailer", "teaser", "serie"],
  gaming: ["gaming", "juego", "game", "xbox", "playstation", "nintendo"],
};

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { preferences } = useAppPreferences();
  const { logout } = useAuth();
  const copy = useCopy();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [trends, setTrends] = useState<ViralTrend[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<AppNotification[]>(
    [],
  );
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [lastSeenNotificationAt, setLastSeenNotificationAt] = useState(
    () => localStorage.getItem(NOTIFICATIONS_SEEN_KEY) || "",
  );
  const lastNotificationSyncKeyRef = useRef("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const navItems = [
    { to: "/", icon: BarChart3, label: copy.dashboard },
    { to: "/tendencias", icon: TrendingUp, label: copy.trends },
    { to: "/analisis", icon: PieChart, label: copy.analytics },
    { to: "/configuracion", icon: Settings, label: copy.settings },
  ];

  useEffect(() => {
    let cancelled = false;

    async function loadTrends() {
      try {
        const data = await getViralTrends();
        if (!cancelled) {
          setTrends(data);
        }
      } catch {
        if (!cancelled) {
          setTrends([]);
        }
      }
    }

    void loadTrends();
    const intervalId = window.setInterval(() => {
      void loadTrends();
    }, 90000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    getNotifications()
      .then((rows) => setNotificationHistory(rows))
      .catch(() => setNotificationHistory([]));
  }, []);

  useEffect(() => {
    if (!isNotificationsOpen) {
      return;
    }

    getNotifications()
      .then((rows) => setNotificationHistory(rows))
      .catch(() => setNotificationHistory([]));
  }, [isNotificationsOpen]);

  useEffect(() => {
    if (trends.length === 0) {
      return;
    }

    const syncKey = trends
      .slice(0, 8)
      .map((trend) => `${trend.source}:${trend.palabra}:${trend.estado}:${trend.crecimiento}`)
      .join("|");

    if (lastNotificationSyncKeyRef.current === syncKey) {
      return;
    }

    syncNotifications(trends.slice(0, 8))
      .then((rows) => {
        lastNotificationSyncKeyRef.current = syncKey;
        setNotificationHistory(rows);
      })
      .catch(() => {
        // Keep existing notifications if sync fails
      });
  }, [trends]);

  useEffect(() => {
    localStorage.setItem(NOTIFICATIONS_SEEN_KEY, lastSeenNotificationAt);
  }, [lastSeenNotificationAt]);

  useEffect(() => {
    getSearchHistory(8)
      .then((rows) => setSearchHistory(rows.map((item) => item.query)))
      .catch(() => setSearchHistory([]));
  }, [location.pathname]);

  const visibleNotifications = useMemo(() => {
    if (preferences.account.status === "paused") {
      return [];
    }

    return notificationHistory.filter((notification) => {
      if (notification.read) {
        return false;
      }

      if (
        notification.title.toLowerCase().includes("viral") &&
        !preferences.notifications.trendAlerts
      ) {
        return false;
      }

      return true;
    });
  }, [
    notificationHistory,
    preferences.account.status,
    preferences.notifications.trendAlerts,
  ]);

  const topSuggestions = useMemo(() => trends.slice(0, 4), [trends]);

  const filteredSuggestions = useMemo(() => {
    const normalizedQuery = searchValue.trim().toLowerCase();

    if (!normalizedQuery) {
      const historySuggestions = searchHistory
        .map((queryItem) =>
          trends.find((trend) =>
            trend.palabra.toLowerCase().includes(queryItem.toLowerCase()),
          ),
        )
        .filter((value): value is ViralTrend => Boolean(value));

      return [...historySuggestions, ...topSuggestions]
        .filter(
          (item, index, array) =>
            array.findIndex((entry) => entry.palabra === item.palabra) === index,
        )
        .slice(0, 6);
    }

    const expandedTerms = [
      normalizedQuery,
      ...Object.entries(searchAliases)
        .filter(
          ([key, aliases]) =>
            key === normalizedQuery || aliases.includes(normalizedQuery),
        )
        .flatMap(([key, aliases]) => [key, ...aliases]),
    ];

    return trends
      .filter((trend) => {
        const haystack = [
          trend.palabra.toLowerCase(),
          trend.source.toLowerCase(),
          ...(trend.tags || []),
        ].join(" ");

        return expandedTerms.some((term) => haystack.includes(term));
      })
      .slice(0, 6);
  }, [searchHistory, searchValue, topSuggestions, trends]);

  const unseenCount = useMemo(() => {
    if (!lastSeenNotificationAt) {
      return visibleNotifications.length;
    }

    const seenTime = new Date(lastSeenNotificationAt).getTime();
    if (Number.isNaN(seenTime)) {
      return visibleNotifications.length;
    }

    return visibleNotifications.filter((notification) => {
      const createdAt = new Date(notification.createdAt).getTime();
      return Number.isNaN(createdAt) || createdAt > seenTime;
    }).length;
  }, [lastSeenNotificationAt, visibleNotifications]);

  useEffect(() => {
    if (!isNotificationsOpen || visibleNotifications.length === 0) {
      return;
    }

    const latestNotificationAt = visibleNotifications.reduce((latest, notification) => {
      const currentTime = new Date(notification.createdAt).getTime();
      const latestTime = new Date(latest).getTime();

      if (Number.isNaN(currentTime)) {
        return latest;
      }

      if (!latest || Number.isNaN(latestTime) || currentTime > latestTime) {
        return notification.createdAt;
      }

      return latest;
    }, lastSeenNotificationAt);

    if (latestNotificationAt && latestNotificationAt !== lastSeenNotificationAt) {
      setLastSeenNotificationAt(latestNotificationAt);
    }
  }, [isNotificationsOpen, lastSeenNotificationAt, visibleNotifications]);

  async function openTrendSearch(keyword: string) {
    const query = keyword.trim();

    if (!query) {
      return;
    }

    try {
      await addSearchHistory(query);
    } catch {
      // Keep UX even if history fails
    }

    setSearchValue(query);
    setIsSearchOpen(false);
    navigate(`/tendencias?q=${encodeURIComponent(query)}`);
  }

  async function markNotificationAsRead(id: string) {
    try {
      await markNotificationRead(id);
      setNotificationHistory((current) =>
        current.map((notification) =>
          notification.id === id ? { ...notification, read: true } : notification,
        ),
      );
    } catch {
      // Keep silent for stability
    }
  }

  async function markAllAsRead() {
    try {
      await markAllNotificationsRead();
      setNotificationHistory((current) =>
        current.map((notification) => ({
          ...notification,
          read: true,
        })),
      );
    } catch {
      // Keep silent for stability
    }
  }

  return (
    <div
      className={`flex min-h-screen overflow-hidden ${
        preferences.theme === "daylight"
          ? "bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.14),_transparent_28%),linear-gradient(180deg,#ffffff_0%,#eef6ff_48%,#f8fbff_100%)]"
          : preferences.theme === "aurora"
          ? "bg-[radial-gradient(circle_at_top_left,_rgba(6,182,212,0.22),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(132,204,22,0.18),_transparent_26%),linear-gradient(180deg,#102033_0%,#0b1324_100%)]"
          : "bg-[#050510]"
      }`}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-20%] h-[50%] w-[60%] rounded-[100%] bg-gradient-to-br from-[#2d4663]/30 via-[#1a2744]/20 to-transparent blur-[120px]" />
        <div className="absolute right-[-15%] top-[30%] h-[60%] w-[70%] rounded-[100%] bg-gradient-to-tl from-[#334155]/25 via-[#1e3a5f]/15 to-transparent blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[20%] h-[40%] w-[50%] rounded-[100%] bg-gradient-to-tr from-[#3b4c6b]/20 via-[#1a2540]/10 to-transparent blur-[100px]" />
      </div>

      <aside className="relative z-10 flex w-72 flex-col p-6">
        <div className="flex-1 rounded-[32px] border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
            <div className="mb-10">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] shadow-[0_0_24px_rgba(96,165,250,0.18)] backdrop-blur-xl">
                  <img
                    alt="TrendFlow logo"
                    className="h-8 w-auto object-contain drop-shadow-[0_0_16px_rgba(168,85,247,0.28)]"
                    src={sidebarLogoUrl}
                  />
                </div>
                <h1 className="text-2xl font-light tracking-tight text-white">
                  <span className="bg-gradient-to-r from-[#a78bfa] via-[#60a5fa] to-[#3b82f6] bg-clip-text font-semibold text-transparent">
                    TrendFlow
                  </span>
                </h1>
              </div>
              <p className="mt-2 text-xs text-white/50">Social Analytics Platform</p>
            </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all ${
                    isActive
                      ? "border-[#a78bfa]/30 bg-gradient-to-r from-[#a78bfa]/20 to-[#3b82f6]/20 shadow-[0_0_20px_rgba(147,51,234,0.3)]"
                      : "border-transparent hover:bg-white/[0.05]"
                  }`
                }
                end={item.to === "/"}
                to={item.to}
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`rounded-xl p-2 transition-all ${
                        isActive
                          ? "bg-gradient-to-br from-[#a78bfa] to-[#3b82f6] shadow-[0_0_16px_rgba(147,51,234,0.4)]"
                          : "bg-white/[0.05] group-hover:bg-white/[0.1]"
                      }`}
                    >
                      <item.icon className="h-5 w-5 text-white" />
                    </div>
                    <span
                      className={`font-medium ${
                        isActive ? "text-white" : "text-white/60 group-hover:text-white/80"
                      }`}
                    >
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto border-t border-white/10 pt-6">
            <div className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white/[0.05] px-4 py-3 transition-all hover:bg-white/[0.08]">
              {preferences.profile.avatar ? (
                <img
                  alt="Avatar"
                  className="h-10 w-10 rounded-full border-2 border-white/20 object-cover shadow-[0_0_16px_rgba(236,72,153,0.4)]"
                  src={preferences.profile.avatar}
                />
              ) : (
                <div className="h-10 w-10 rounded-full border-2 border-white/20 bg-gradient-to-br from-[#ec4899] to-[#8b5cf6] shadow-[0_0_16px_rgba(236,72,153,0.4)]" />
              )}
              <div className="flex-1">
                <div className="text-sm font-medium text-white/95">
                  {preferences.profile.username || copy.user}
                </div>
                <div className="text-xs text-white/50">
                  {preferences.account.plan} |{" "}
                  {preferences.account.status === "active"
                    ? copy.activeState
                    : copy.pausedState}
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="relative z-10 flex-1 overflow-y-auto p-6">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-light tracking-tight text-white">
              {copy.welcome}
            </h2>
            <p className="mt-1 text-sm text-white/50">
              {new Date().toLocaleDateString(
                preferences.language === "en" ? "en-US" : "es-ES",
                {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                },
              )}
            </p>
          </div>

          <div className="relative flex items-center gap-3">
            <div className="relative">
              <button
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] backdrop-blur-xl"
                onClick={() => {
                  setIsSearchOpen((value) => !value);
                  setIsNotificationsOpen(false);
                }}
                type="button"
              >
                <Search className="h-5 w-5 text-white/90" />
              </button>

              {isSearchOpen && (
                <div className="absolute right-0 top-16 z-20 w-[380px] rounded-[24px] border border-white/20 bg-[#151726]/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
                  <div className="mb-3 text-sm font-medium text-white/90">
                    {copy.search}
                  </div>
                  <div className="relative">
                    <input
                      autoFocus
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 pr-11 text-sm text-white outline-none placeholder:text-white/35"
                      onChange={(event) => setSearchValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          void openTrendSearch(searchValue);
                        }
                      }}
                      placeholder="musica, noticias, trailer, tecnologia..."
                      ref={searchInputRef}
                      value={searchValue}
                    />
                    {searchValue && (
                      <button
                        aria-label="Limpiar busqueda"
                        className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-white/70 transition-all hover:bg-white/[0.14] hover:text-white"
                        onClick={() => {
                          setSearchValue("");
                          searchInputRef.current?.focus();
                        }}
                        type="button"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="mt-4 text-xs uppercase tracking-[0.2em] text-white/35">
                    {copy.recommended}
                  </div>
                  <div className="mt-3 space-y-2">
                    {filteredSuggestions.map((trend) => (
                      <button
                        key={trend.palabra}
                        className="flex w-full items-start justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition-all hover:bg-white/[0.08]"
                        onClick={() => {
                          void openTrendSearch(trend.palabra);
                        }}
                        type="button"
                      >
                        <div>
                          <div className="text-sm font-medium text-white/95">
                            {trend.palabra}
                          </div>
                          <div className="mt-1 text-xs text-white/45">
                            {[sourceLabels[trend.source], ...(trend.tags || []).slice(0, 2)].join(
                              " | ",
                            )}
                          </div>
                        </div>
                        <div className="text-right text-xs text-[#4ade80]">
                          +{trend.crecimiento}%
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/[0.08] shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] backdrop-blur-xl"
                onClick={() => {
                  setIsNotificationsOpen((value) => !value);
                  setIsSearchOpen(false);
                }}
                type="button"
              >
                <Bell className="h-5 w-5 text-white/90" />
                {unseenCount > 0 && !isNotificationsOpen && (
                  <div className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#f97316] to-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 top-16 z-20 w-[380px] rounded-[24px] border border-white/20 bg-[#151726]/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-medium text-white/90">
                      {copy.notifications}
                    </div>
                    <button
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white/75"
                      onClick={() => {
                        void markAllAsRead();
                      }}
                      type="button"
                    >
                      <CheckCheck className="h-4 w-4" />
                      {copy.markAll}
                    </button>
                  </div>
                  <div className="mb-3 text-xs text-white/40">
                    {visibleNotifications.length} {copy.active}
                  </div>
                  <div className="space-y-2">
                    {visibleNotifications.map((notification) => (
                      <button
                        key={notification.id}
                        className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                          notification.read
                            ? "border-white/10 bg-white/[0.03]"
                            : "border-[#f97316]/20 bg-white/[0.06]"
                        }`}
                        onClick={() => {
                          void markNotificationAsRead(notification.id);
                          void openTrendSearch(notification.description);
                          setIsNotificationsOpen(false);
                        }}
                        type="button"
                      >
                        <div className="mt-0.5 rounded-xl bg-gradient-to-br from-[#f97316] to-[#ef4444] p-2 shadow-[0_0_14px_rgba(249,115,22,0.4)]">
                          <Flame className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white/95">
                            {notification.title}
                          </div>
                          <div className="mt-1 text-xs text-white/55">
                            {notification.description}
                          </div>
                          <div className="mt-1 text-xs text-[#4ade80]">
                            {notification.meta}
                          </div>
                        </div>
                      </button>
                    ))}
                    {visibleNotifications.length === 0 && (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/55">
                        {preferences.account.status === "paused"
                          ? "La cuenta esta pausada y las alertas estan en silencio."
                          : "No hay notificaciones activas con la configuracion actual."}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-4 text-sm font-medium text-white/90 shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] backdrop-blur-xl"
              onClick={async () => {
                await logout();
                navigate("/login", { replace: true });
              }}
              type="button"
            >
              <LogOut className="h-4 w-4" />
              {copy.logout}
            </button>
          </div>
        </header>

        <Outlet />
      </main>
      <Suspense fallback={null}>
        <AssistantWidget />
      </Suspense>
    </div>
  );
}
