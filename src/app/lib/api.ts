const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "") ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : "http://localhost:3000");
const AUTH_TOKEN_KEY = "treend-auth-token";

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function toErrorMessage(
  error: unknown,
  fallbackMessage: string,
  wakeHint = false,
) {
  if (error instanceof Error) {
    const normalizedMessage = error.message.trim();
    if (normalizedMessage && normalizedMessage !== "Failed to fetch") {
      return normalizedMessage;
    }
  }

  return wakeHint
    ? `${fallbackMessage} Si el backend estaba dormido, espera unos segundos y vuelve a intentar.`
    : fallbackMessage;
}

async function fetchWithRetry(
  input: string,
  init?: RequestInit,
  options?: {
    retries?: number;
    retryDelayMs?: number;
  },
): Promise<Response> {
  const retries = options?.retries ?? 0;
  const retryDelayMs = options?.retryDelayMs ?? 1800;

  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= retries) {
    try {
      return await fetch(input, init);
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        throw error;
      }
      await sleep(retryDelayMs);
      attempt += 1;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed");
}

export type TrendState = "Viral" | "En crecimiento" | "Emergente";
export type DataQuality = "real" | "estimated" | "heuristic";

export type TrendSource =
  | "google"
  | "reddit"
  | "hackernews"
  | "news"
  | "youtube";

export interface DataOriginSection {
  quality: DataQuality;
  label: string;
  source: string;
  description: string;
  updatedAt?: string | null;
}

export interface DataOriginMeta {
  narrative: string;
  sections: DataOriginSection[];
  methodology: string[];
}

export interface ViralTrend {
  palabra: string;
  menciones: number;
  source: TrendSource;
  crecimiento: number;
  score: number;
  estado: TrendState;
  sparkline: number[];
  url?: string | null;
  embedUrl?: string | null;
  tags?: string[];
  sentiment?: "positive" | "negative" | "mixed";
  tone?: string;
  riskLevel?: "low" | "medium" | "high";
  lifecycle?: "Emerging" | "Peak" | "Fading";
  confidenceScore?: number;
  contextLabels?: string[];
  actionIdeas?: string[];
  seoKeywords?: string[];
  geoRegions?: Array<{
    name: string;
    value: number;
  }>;
  recommendedFormat?: string;
  summary?: string;
  provider?: string;
  dataOrigin?: DataOriginMeta;
}

export interface DashboardSummary {
  metrics: {
    totalMentions: number;
    averageGrowth: number;
    activeTrends: number;
    topTrendLabel: string;
    topTrendScore: number;
  };
  featuredTrend: ViralTrend | null;
  weeklyActivity: Array<{
    day: string;
    impressions: number;
    engagement: number;
    clicks: number;
  }>;
  sourceBreakdown: Array<{
    source: string;
    total: number;
  }>;
  temporalComparison: {
    currentSnapshotAt: string;
    previousSnapshotAt: string | null;
    currentMentions: number;
    previousMentions: number;
    mentionDelta: number;
    mentionDeltaPercent: number;
    currentActiveTrends: number;
    previousActiveTrends: number;
    currentAverageGrowth: number;
    previousAverageGrowth: number;
    rising: Array<{
      keyword: string;
      source: string;
      currentMentions: number;
      previousMentions: number;
      change: number;
      changePercent: number;
    }>;
    falling: Array<{
      keyword: string;
      source: string;
      currentMentions: number;
      previousMentions: number;
      change: number;
      changePercent: number;
    }>;
    newEntries: Array<{
      keyword: string;
      source: string;
      currentMentions: number;
      previousMentions: number;
      change: number;
      changePercent: number;
    }>;
  };
  dataOrigin?: DataOriginMeta;
}

export interface AnalyticsSummary {
  generatedAt: string;
  growthTimeline: Array<{
    period: string;
    mentions: number;
    engagement: number;
  }>;
  stateBreakdown: Array<{
    name: string;
    value: number;
  }>;
  sourceBreakdown: Array<{
    name: string;
    value: number;
  }>;
  platformPerformance: Array<{
    platform: string;
    engagement: number;
    reach: number;
    growth: number;
    mentions: number;
  }>;
  topTrends: Array<{
    keyword: string;
    source: string;
    score: number;
    growth: number;
    mentions: number;
    status: string;
    sentiment: "positive" | "negative" | "mixed";
    tone: string;
    riskLevel: "low" | "medium" | "high";
    lifecycle: "Emerging" | "Peak" | "Fading";
    actionIdeas: string[];
    seoKeywords: string[];
    geoRegions: Array<{
      name: string;
      value: number;
    }>;
    recommendedFormat: string;
    summary: string;
    url?: string | null;
    embedUrl?: string | null;
  }>;
  sentimentBreakdown: Array<{
    name: string;
    value: number;
  }>;
  lifecycleBreakdown: Array<{
    name: string;
    value: number;
  }>;
  featuredActions: string[];
  geoOverview: Array<{
    name: string;
    value: number;
  }>;
  geoTrendDetails: Array<{
    state: string;
    total: number;
    sources: Array<{
      name: string;
      value: number;
    }>;
    categories: Array<{
      name: string;
      value: number;
    }>;
    trends: Array<{
      keyword: string;
      source: string;
      category: string;
      growth: number;
      score: number;
      status: string;
      summary: string;
    }>;
  }>;
  crisisAlerts: Array<{
    severity: "high" | "medium" | "low";
    title: string;
    description: string;
    affectedTrend: string;
    source: string;
    recommendation: string;
  }>;
  ageBreakdown: Array<{
    name: string;
    value: number;
  }>;
  genderBreakdown: Array<{
    name: string;
    value: number;
  }>;
  audienceMeta: {
    mode: "real" | "estimated";
    provider: string;
    source: string;
    note: string;
    capturedAt: string | null;
  };
  temporalComparison: DashboardSummary["temporalComparison"];
  dataOrigin?: DataOriginMeta;
}

export interface HistoricalTrend extends ViralTrend {
  capturedAt: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
  bio: string;
  plan: "Premium" | "Student";
  role: "user" | "admin";
  accountStatus: "active" | "paused";
  language: "es" | "en";
  theme: "night" | "aurora" | "daylight";
  notifications: Record<string, boolean>;
  privacy: Record<string, boolean>;
}

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  meta: string;
  read: boolean;
  createdAt: string;
}

export interface SearchHistoryItem {
  query: string;
  lastAt: string;
}

export interface SavedReportItem {
  id: number;
  reportType: "analytics" | "dashboard" | "trends";
  title: string;
  format: "pdf" | "json";
  createdAt: string;
}

export interface AudienceBreakdownItem {
  name: string;
  value: number;
}

export interface AssistantMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AdminSummary {
  generatedAt: string;
  totals: {
    users: number;
    admins: number;
    activeUsers: number;
    premiumUsers: number;
    sessions: number;
    activeSessions: number;
    savedReports: number;
    notifications: number;
    unreadNotifications: number;
    searches: number;
    snapshots: number;
    trendItems: number;
    enrichments: number;
  };
  latestSnapshot: {
    capturedAt: string | null;
    sourceCount: number;
    totalMentions: number;
  } | null;
  recentUsers: Array<{
    id: number;
    username: string;
    email: string;
    role: "user" | "admin";
    plan: "Premium" | "Student";
    accountStatus: "active" | "paused";
    createdAt: string | null;
  }>;
  sourceTotals: Array<{
    source: TrendSource;
    totalItems: number;
    mentions: number;
  }>;
  recentActivity: Array<{
    type: "search" | "report";
    title: string;
    actor: string;
    createdAt: string | null;
  }>;
  providers: Array<{
    label: string;
    configured: boolean;
    detail: string;
  }>;
  access: {
    mode: string;
    adminEmailsConfigured: number;
  };
}

async function readErrorMessage(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  const payload = await response.json().catch(() => null);

  if (payload && typeof payload.error === "string" && payload.error.trim()) {
    return payload.error.trim();
  }

  if (payload && typeof payload.message === "string" && payload.message.trim()) {
    return payload.message.trim();
  }

  return fallbackMessage;
}

async function fetchJson<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  let response: Response;
  try {
    response = await fetchWithRetry(`${API_BASE_URL}${path}`, { headers }, {
      retries: 1,
      retryDelayMs: 2200,
    });
  } catch (error) {
    throw new Error(
      toErrorMessage(
        error,
        "No se pudo conectar con el servidor.",
        true,
      ),
    );
  }

  if (!response.ok) {
    const fallbackMessage =
      response.status === 401
        ? "Tu sesion expiro. Vuelve a iniciar sesion."
        : response.status === 403
          ? "No tienes permiso para realizar esta accion."
          : response.status >= 500
            ? "El servidor no pudo responder en este momento."
            : `Request failed: ${response.status}`;
    throw new Error(await readErrorMessage(response, fallbackMessage));
  }

  return response.json() as Promise<T>;
}

export function setAuthToken(token: string | null) {
  if (!token) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getViralTrends() {
  return fetchJson<ViralTrend[]>("/viral-trends");
}

export function getDashboardSummary() {
  return fetchJson<DashboardSummary>("/dashboard-summary");
}

export function getAnalyticsSummary() {
  return fetchJson<AnalyticsSummary>("/analytics-summary");
}

export function getAdminSummary() {
  return fetchJson<AdminSummary>("/admin/summary");
}

export function getHistoricalTrends(query: string) {
  return fetchJson<HistoricalTrend[]>(
    `/historical-trends?q=${encodeURIComponent(query)}`,
  );
}

export function getNotifications() {
  return fetchJson<AppNotification[]>("/notifications");
}

export async function syncNotifications(trends: ViralTrend[]) {
  const token = getAuthToken();
  let response: Response;
  try {
    response = await fetchWithRetry(
      `${API_BASE_URL}/notifications/sync`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          trends: trends.map((trend) => ({
            palabra: trend.palabra,
            source: trend.source,
            crecimiento: trend.crecimiento,
            estado: trend.estado,
          })),
        }),
      },
      { retries: 1, retryDelayMs: 2000 },
    );
  } catch (error) {
    throw new Error(
      toErrorMessage(
        error,
        "No se pudo sincronizar notificaciones.",
        true,
      ),
    );
  }
  if (!response.ok) {
    throw new Error("Notifications sync failed");
  }
  return response.json() as Promise<AppNotification[]>;
}

export async function markNotificationRead(id: string) {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
    method: "PATCH",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error("Mark notification failed");
  }
}

export async function markAllNotificationsRead() {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
    method: "PATCH",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error("Mark all notifications failed");
  }
}

export async function addSearchHistory(query: string) {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/search-history`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) {
    throw new Error("Search history failed");
  }
}

export function getSearchHistory(limit = 12) {
  return fetchJson<SearchHistoryItem[]>(`/search-history?limit=${limit}`);
}

export async function saveReport(payload: {
  reportType: "analytics" | "dashboard" | "trends";
  title: string;
  format?: "pdf" | "json";
  payload: Record<string, unknown>;
}) {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/saved-reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Save report failed");
  }
  return response.json() as Promise<{ ok: true; id: number }>;
}

export function getSavedReports(limit = 20) {
  return fetchJson<SavedReportItem[]>(`/saved-reports?limit=${limit}`);
}

export async function saveAudienceDemographics(payload: {
  source?: "google" | "reddit" | "hackernews" | "news" | "youtube" | "global";
  ageBreakdown: AudienceBreakdownItem[];
  genderBreakdown: AudienceBreakdownItem[];
  isReal?: boolean;
  provider?: string;
  note?: string;
  capturedAt?: string;
}) {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/audience-demographics`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Save audience demographics failed");
  }
}

export async function chatAssistant(messages: AssistantMessage[]) {
  const token = getAuthToken();
  let response: Response;
  try {
    response = await fetchWithRetry(
      `${API_BASE_URL}/assistant/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages }),
      },
      { retries: 1, retryDelayMs: 2000 },
    );
  } catch (error) {
    throw new Error(
      toErrorMessage(
        error,
        "No se pudo conectar con el asistente.",
        true,
      ),
    );
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error || "Assistant request failed");
  }

  return response.json() as Promise<{ reply: string }>;
}

export async function registerAuth(payload: {
  username: string;
  email: string;
  password: string;
}) {
  let response: Response;
  try {
    response = await fetchWithRetry(
      `${API_BASE_URL}/auth/register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      { retries: 1, retryDelayMs: 2200 },
    );
  } catch (error) {
    throw new Error(
      toErrorMessage(
        error,
        "No se pudo crear la cuenta.",
        true,
      ),
    );
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "No se pudo crear la cuenta"));
  }
  return response.json() as Promise<{ token: string; user: AuthUser }>;
}

export async function loginAuth(payload: { email: string; password: string }) {
  let response: Response;
  try {
    response = await fetchWithRetry(
      `${API_BASE_URL}/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      { retries: 1, retryDelayMs: 2200 },
    );
  } catch (error) {
    throw new Error(
      toErrorMessage(
        error,
        "No se pudo iniciar sesion.",
        true,
      ),
    );
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "No se pudo iniciar sesion"));
  }
  return response.json() as Promise<{ token: string; user: AuthUser }>;
}

export async function socialAuth(payload: {
  provider: "google" | "apple" | "facebook";
}) {
  let response: Response;
  try {
    response = await fetchWithRetry(
      `${API_BASE_URL}/auth/social`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      { retries: 1, retryDelayMs: 2200 },
    );
  } catch (error) {
    throw new Error(
      toErrorMessage(
        error,
        "No se pudo iniciar sesion social.",
        true,
      ),
    );
  }
  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "No se pudo iniciar sesion social"),
    );
  }
  return response.json() as Promise<{ token: string; user: AuthUser }>;
}

export async function googleAuth(payload: { credential: string }) {
  let response: Response;
  try {
    response = await fetchWithRetry(
      `${API_BASE_URL}/auth/google`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      { retries: 1, retryDelayMs: 2200 },
    );
  } catch (error) {
    throw new Error(
      toErrorMessage(
        error,
        "No se pudo iniciar sesion con Google.",
        true,
      ),
    );
  }
  if (!response.ok) {
    throw new Error(
      await readErrorMessage(response, "No se pudo iniciar sesion con Google"),
    );
  }
  return response.json() as Promise<{ token: string; user: AuthUser }>;
}

export async function forgotPasswordAuth(payload: { email: string }) {
  let response: Response;
  try {
    response = await fetchWithRetry(
      `${API_BASE_URL}/auth/forgot-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      { retries: 1, retryDelayMs: 2200 },
    );
  } catch (error) {
    throw new Error(
      toErrorMessage(
        error,
        "No se pudo generar el codigo de recuperacion.",
        true,
      ),
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "Forgot password failed");
  }
  return data as Promise<{ ok: true; message: string; resetCode: string }>;
}

export async function resetPasswordAuth(payload: {
  email: string;
  code: string;
  password: string;
}) {
  let response: Response;
  try {
    response = await fetchWithRetry(
      `${API_BASE_URL}/auth/reset-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      { retries: 1, retryDelayMs: 2200 },
    );
  } catch (error) {
    throw new Error(
      toErrorMessage(
        error,
        "No se pudo cambiar la contrasena.",
        true,
      ),
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "Reset password failed");
  }
  return data as Promise<{ ok: true; message: string }>;
}

export async function meAuth() {
  const token = getAuthToken();
  let response: Response;
  try {
    response = await fetchWithRetry(
      `${API_BASE_URL}/auth/me`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      { retries: 2, retryDelayMs: 2500 },
    );
  } catch {
    throw new Error("Session invalid");
  }
  if (!response.ok) {
    throw new Error("Session invalid");
  }
  return response.json() as Promise<{ user: AuthUser }>;
}

export async function logoutAuth() {
  const token = getAuthToken();
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function patchProfileAuth(payload: {
  username: string;
  email: string;
  bio: string;
  avatar: string | null;
}) {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/auth/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Profile update failed");
  }
}

export async function patchPreferencesAuth(payload: {
  language?: "es" | "en";
  theme?: "night" | "aurora" | "daylight";
  notifications?: Record<string, boolean>;
  privacy?: Record<string, boolean>;
  accountStatus?: "active" | "paused";
  plan?: "Premium" | "Student";
}) {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/auth/preferences`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Preferences update failed");
  }
}
