import crypto from "crypto";
import { ADMIN_EMAILS } from "./config.js";

const defaultEmail =
  ADMIN_EMAILS[0] || "castroalvarezcristofer@gmail.com";

const demoState = {
  user: {
    id: 1,
    username: "@Trakas",
    email: defaultEmail,
    avatar: null,
    bio: "Cuenta demo de respaldo para la entrega de Trend Flow.",
    plan: "Premium",
    role: "admin",
    accountStatus: "active",
    language: "es",
    theme: "night",
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
    password: "Trakas23",
    resetCode: null,
  },
  sessions: new Map(),
  notifications: [],
  searchHistory: [],
  savedReports: [],
  audienceDemographics: null,
};

function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

function publicUser() {
  const { password, resetCode, ...user } = demoState.user;
  return {
    ...user,
    notifications: { ...user.notifications },
    privacy: { ...user.privacy },
  };
}

export function getDemoUser() {
  return publicUser();
}

export function updateDemoUser(patch) {
  demoState.user = {
    ...demoState.user,
    ...patch,
    notifications: patch.notifications
      ? { ...demoState.user.notifications, ...patch.notifications }
      : demoState.user.notifications,
    privacy: patch.privacy
      ? { ...demoState.user.privacy, ...patch.privacy }
      : demoState.user.privacy,
  };
  return publicUser();
}

export function createDemoAuthResponse(userPatch = {}) {
  updateDemoUser(userPatch);
  const token = createToken();
  demoState.sessions.set(token, {
    user_id: demoState.user.id,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    username: demoState.user.username,
    email: demoState.user.email,
    avatar: demoState.user.avatar,
    bio: demoState.user.bio,
    plan: demoState.user.plan,
    role: demoState.user.role,
    account_status: demoState.user.accountStatus,
    language: demoState.user.language,
    theme: demoState.user.theme,
  });

  return {
    token,
    user: publicUser(),
  };
}

export function getDemoSession(token) {
  return demoState.sessions.get(token) || null;
}

export function deleteDemoSession(token) {
  demoState.sessions.delete(token);
}

export function validateDemoCredentials(email, password) {
  return (
    String(email || "").trim().toLowerCase() ===
      demoState.user.email.toLowerCase() &&
    String(password || "") === demoState.user.password
  );
}

export function setDemoPassword(password) {
  demoState.user.password = String(password || "");
}

export function setDemoResetCode(code) {
  demoState.user.resetCode = String(code || "");
}

export function getDemoResetCode() {
  return demoState.user.resetCode;
}

export function clearDemoResetCode() {
  demoState.user.resetCode = null;
}

export function getDemoNotifications() {
  return demoState.notifications.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function syncDemoNotifications(trends) {
  const sourceLabels = {
    google: "Google Trends",
    reddit: "Reddit",
    hackernews: "Hacker News",
    news: "News",
    youtube: "YouTube",
  };

  for (const trend of trends.slice(0, 12)) {
    const trendKey = `${trend.source}:${String(trend.palabra || "").toLowerCase()}`;
    const existing = demoState.notifications.find((item) => item.trendKey === trendKey);
    const nextItem = {
      id: existing?.id || String(Date.now() + Math.random()),
      trendKey,
      title: trend.estado === "Viral" ? "Alerta viral detectada" : "Tendencia en monitoreo",
      description: trend.palabra,
      meta: `${sourceLabels[trend.source] || trend.source} | +${Number(trend.crecimiento || 0)}%`,
      read: false,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    if (existing) {
      Object.assign(existing, nextItem);
    } else {
      demoState.notifications.unshift(nextItem);
    }
  }

  demoState.notifications = demoState.notifications.slice(0, 50);
  return getDemoNotifications();
}

export function markDemoNotificationRead(id) {
  const item = demoState.notifications.find((notification) => notification.id === String(id));
  if (item) {
    item.read = true;
  }
}

export function markAllDemoNotificationsRead() {
  demoState.notifications.forEach((item) => {
    item.read = true;
  });
}

export function addDemoSearchHistory(query) {
  if (!query) {
    return;
  }
  demoState.searchHistory.unshift({
    query,
    lastAt: new Date().toISOString(),
  });
  demoState.searchHistory = demoState.searchHistory.slice(0, 40);
}

export function getDemoSearchHistory(limit = 12) {
  return demoState.searchHistory.slice(0, limit);
}

export function addDemoSavedReport(payload) {
  const item = {
    id: demoState.savedReports.length + 1,
    reportType: payload.reportType || "analytics",
    title: payload.title || "Reporte TrendFlow",
    format: payload.format || "pdf",
    createdAt: new Date().toISOString(),
  };
  demoState.savedReports.unshift(item);
  return item;
}

export function getDemoSavedReports(limit = 20) {
  return demoState.savedReports.slice(0, limit);
}

export function setDemoAudienceDemographics(payload) {
  demoState.audienceDemographics = payload;
}

export function getDemoAudienceDemographics() {
  return demoState.audienceDemographics;
}
