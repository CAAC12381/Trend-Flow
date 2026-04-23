import { useEffect, useState } from "react";
import {
  TrendingUp,
  Eye,
  Heart,
  BarChart3,
  Flame,
  MousePointerClick,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { getDashboardSummary, type DashboardSummary } from "../lib/api";
import { useCopy } from "../lib/copy";
import { useAppPreferences } from "../context/AppPreferences";
import { AsyncStateCard } from "../components/AsyncStateCard";

const emptySummary: DashboardSummary = {
  metrics: {
    totalMentions: 0,
    averageGrowth: 0,
    activeTrends: 0,
    topTrendLabel: "No data",
    topTrendScore: 0,
  },
  featuredTrend: null,
  weeklyActivity: [],
  sourceBreakdown: [],
  temporalComparison: {
    currentSnapshotAt: new Date(0).toISOString(),
    previousSnapshotAt: null,
    currentMentions: 0,
    previousMentions: 0,
    mentionDelta: 0,
    mentionDeltaPercent: 0,
    currentActiveTrends: 0,
    previousActiveTrends: 0,
    currentAverageGrowth: 0,
    previousAverageGrowth: 0,
    rising: [],
    falling: [],
    newEntries: [],
  },
};

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const copy = useCopy();
  const { preferences } = useAppPreferences();

  function loadSummary() {
    setLoading(true);
    setLoadError("");
    getDashboardSummary()
      .then((data) => setSummary(data))
      .catch(() => {
        setSummary(emptySummary);
        setLoadError(copy.loadFailedMessage);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadSummary();
  }, []);

  const locale = preferences.language === "en" ? "en-US" : "es-MX";
  const formatCompactNumber = (value: number) =>
    new Intl.NumberFormat(locale, {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1,
    }).format(value);

  const topTrend = summary.featuredTrend;
  const averageGrowth = topTrend?.crecimiento ?? summary.metrics.averageGrowth;
  const temporal = summary.temporalComparison;
  const activeTrends =
    summary.metrics.activeTrends ||
    summary.weeklyActivity.length ||
    summary.sourceBreakdown.reduce((total, item) => total + item.total, 0);
  const topTrendScore = topTrend?.score ?? summary.metrics.topTrendScore;
  const sourceCount = summary.sourceBreakdown.length > 0 ? summary.sourceBreakdown.length : topTrend ? 1 : 0;

  if (loading) {
    return (
      <AsyncStateCard
        title={copy.loadingData}
        message={copy.loadingDataMessage}
      />
    );
  }

  if (loadError) {
    return (
      <AsyncStateCard
        title={copy.loadFailed}
        message={loadError}
        actionLabel={copy.retry}
        onAction={loadSummary}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[24px] border border-white/15 bg-gradient-to-br from-white/[0.10] to-white/[0.04] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#84cc16] p-2.5 shadow-[0_0_16px_rgba(6,182,212,0.4)]">
              <Eye className="h-6 w-6 text-white" />
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-[#4ade80]">
              +{averageGrowth}%
            </span>
          </div>
          <div className="mb-1 text-sm font-medium text-white/60">{copy.totalMentions}</div>
          <div className="bg-gradient-to-br from-[#06b6d4] via-[#22d3ee] to-[#84cc16] bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
            {formatCompactNumber(summary.metrics.totalMentions)}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/15 bg-gradient-to-br from-white/[0.10] to-white/[0.04] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-xl bg-gradient-to-br from-[#ec4899] to-[#8b5cf6] p-2.5 shadow-[0_0_16px_rgba(236,72,153,0.4)]">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-medium text-[#4ade80]">
              Score {formatCompactNumber(topTrendScore)}
            </span>
          </div>
          <div className="mb-1 text-sm font-medium text-white/60">{copy.trendLeader}</div>
          <div className="bg-gradient-to-br from-[#ec4899] via-[#a855f7] to-[#8b5cf6] bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
            {topTrend ? topTrend.estado : "No data"}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/15 bg-gradient-to-br from-white/[0.10] to-white/[0.04] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#3b82f6] p-2.5 shadow-[0_0_16px_rgba(167,139,250,0.4)]">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-medium text-[#4ade80]">
              {activeTrends} {copy.trends.toLowerCase()}
            </span>
          </div>
          <div className="mb-1 text-sm font-medium text-white/60">{copy.averageGrowth}</div>
          <div className="bg-gradient-to-br from-[#a78bfa] via-[#60a5fa] to-[#3b82f6] bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
            +{averageGrowth}%
          </div>
        </div>

        <div className="rounded-[24px] border border-white/15 bg-gradient-to-br from-white/[0.10] to-white/[0.04] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-xl bg-gradient-to-br from-[#f97316] to-[#ef4444] p-2.5 shadow-[0_0_16px_rgba(249,115,22,0.4)]">
              <MousePointerClick className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-medium text-[#4ade80]">
              {sourceCount} {copy.sourceDistribution.toLowerCase().includes("fuente") ? "fuentes" : "sources"}
            </span>
          </div>
          <div className="mb-1 text-sm font-medium text-white/60">{copy.estimatedInteractions}</div>
          <div className="bg-gradient-to-br from-[#f97316] via-[#fb923c] to-[#ef4444] bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
            {formatCompactNumber(Math.round(summary.metrics.totalMentions * 0.18))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#3b82f6] p-2.5 shadow-[0_0_20px_rgba(147,51,234,0.4)]">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white/95">{copy.featuredTrend}</h2>
                <p className="break-words text-sm text-white/50">
                  {topTrend ? topTrend.palabra : "Waiting backend data"}
                </p>
              </div>
            </div>
            {topTrend && (
              <span className="flex items-center gap-1 text-sm font-medium text-[#4ade80]">
                <Flame className="h-4 w-4" />
                +{topTrend.crecimiento}%
              </span>
            )}
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <AreaChart
              data={(topTrend?.sparkline || []).map((value, index) => ({
                time: `${10 + index * 2}:00`,
                value,
              }))}
            >
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.5} />
                  <stop offset="50%" stopColor="#60a5fa" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="trendLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="50%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey="time" stroke="rgba(255,255,255,0.4)" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }} tickLine={false} />
              <Tooltip />
              <Area animationDuration={2000} dataKey="value" fill="url(#trendGradient)" stroke="url(#trendLineGradient)" strokeWidth={3} type="monotone" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-[28px] border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[#f97316] to-[#ef4444] p-2.5 shadow-[0_0_20px_rgba(249,115,22,0.4)]">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white/95">{copy.weeklyActivity}</h2>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={summary.weeklyActivity} barGap={4}>
              <defs>
                <linearGradient id="purpleBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="cyanLime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#84cc16" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="orangeRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey="day" stroke="rgba(255,255,255,0.4)" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }} tickLine={false} />
              <Tooltip />
              <Bar dataKey="impressions" fill="url(#purpleBlue)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="engagement" fill="url(#cyanLime)" radius={[8, 8, 0, 0]} />
              <Bar dataKey="clicks" fill="url(#orangeRed)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-[24px] border border-emerald-400/18 bg-gradient-to-br from-emerald-500/[0.10] via-white/[0.04] to-cyan-500/[0.08] p-5 shadow-[0_10px_24px_rgba(16,185,129,0.08)] backdrop-blur-2xl">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">{copy.risingNow}</div>
          <div className="mt-3 space-y-3">
            {(temporal.rising.length > 0 ? temporal.rising : []).slice(0, 3).map((item) => (
              <div key={`${item.source}-${item.keyword}`} className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white/90">{item.keyword}</div>
                  <div className="text-xs text-white/45">{item.source}</div>
                </div>
                <div className="text-sm font-semibold text-emerald-200">+{item.changePercent || item.change}</div>
              </div>
            ))}
            {temporal.rising.length === 0 && (
              <div className="text-sm text-white/55">{copy.noTrendResults}</div>
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-amber-400/18 bg-gradient-to-br from-amber-500/[0.10] via-white/[0.04] to-orange-500/[0.08] p-5 shadow-[0_10px_24px_rgba(245,158,11,0.08)] backdrop-blur-2xl">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">{copy.vsPreviousCapture}</div>
          <div className="mt-3 text-3xl font-semibold text-white/94">
            {temporal.mentionDelta >= 0 ? "+" : ""}
            {formatCompactNumber(temporal.mentionDelta)}
          </div>
          <div className="mt-1 text-sm text-amber-200">
            {temporal.mentionDeltaPercent >= 0 ? "+" : ""}
            {temporal.mentionDeltaPercent}% {copy.totalMentions.toLowerCase()}
          </div>
          <div className="mt-4 text-xs text-white/50">
            {temporal.previousSnapshotAt
              ? new Date(temporal.previousSnapshotAt).toLocaleString(locale)
              : "Sin historial previo suficiente"}
          </div>
        </div>

        <div className="rounded-[24px] border border-fuchsia-400/18 bg-gradient-to-br from-fuchsia-500/[0.10] via-white/[0.04] to-violet-500/[0.08] p-5 shadow-[0_10px_24px_rgba(217,70,239,0.08)] backdrop-blur-2xl">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">{copy.newEntries}</div>
          <div className="mt-3 space-y-3">
            {(temporal.newEntries.length > 0 ? temporal.newEntries : []).slice(0, 3).map((item) => (
              <div key={`${item.source}-${item.keyword}`} className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white/90">{item.keyword}</div>
                  <div className="text-xs text-white/45">{item.source}</div>
                </div>
                <div className="text-sm font-semibold text-fuchsia-200">{formatCompactNumber(item.currentMentions)}</div>
              </div>
            ))}
            {temporal.newEntries.length === 0 && (
              <div className="text-sm text-white/55">Sin cambios nuevos fuertes.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
