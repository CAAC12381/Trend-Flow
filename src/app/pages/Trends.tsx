import { useEffect, useState } from "react";
import { TrendingUp, Hash, Flame, ExternalLink, X } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { useSearchParams } from "react-router";
import {
  getHistoricalTrends,
  getViralTrends,
  type HistoricalTrend,
  type ViralTrend,
} from "../lib/api";
import { useCopy } from "../lib/copy";
import { useAppPreferences } from "../context/AppPreferences";
import { AsyncStateCard } from "../components/AsyncStateCard";

interface TrendCard {
  id: number;
  keyword: string;
  hashtag: string;
  posts: number;
  growth: number;
  score: number;
  status: string;
  source: string;
  sourceKey: ViralTrend["source"];
  highlight: boolean;
  sparkline: number[];
  url?: string | null;
  embedUrl?: string | null;
  tags: string[];
  sentiment?: ViralTrend["sentiment"];
  riskLevel?: ViralTrend["riskLevel"];
  lifecycle?: ViralTrend["lifecycle"];
  actionIdeas?: string[];
  seoKeywords?: string[];
  geoRegions?: Array<{ name: string; value: number }>;
  recommendedFormat?: string;
  summary?: string;
}

const sourceLabel: Record<ViralTrend["source"], string> = {
  google: "Google Trends",
  reddit: "Reddit",
  hackernews: "Hacker News",
  news: "News",
  youtube: "YouTube",
};

const trendCardPalettes = [
  {
    border: "border-[#8b5cf6]/20",
    bg: "from-[#8b5cf6]/16 via-white/[0.06] to-[#3b82f6]/10",
    glow: "shadow-[0_12px_32px_rgba(139,92,246,0.14)]",
    icon: "from-[#8b5cf6] to-[#6366f1]",
    iconGlow: "shadow-[0_0_18px_rgba(139,92,246,0.28)]",
    hashtag: "from-[#c4b5fd] via-[#a78bfa] to-[#60a5fa]",
    growthBg: "bg-emerald-500/12 border-emerald-400/20",
    growthText: "text-emerald-200",
    line: "#7c3aed",
    lineGlow: "rgba(124,58,237,0.35)",
  },
  {
    border: "border-[#22d3ee]/20",
    bg: "from-[#22d3ee]/14 via-white/[0.06] to-[#84cc16]/10",
    glow: "shadow-[0_12px_32px_rgba(34,211,238,0.14)]",
    icon: "from-[#22d3ee] to-[#10b981]",
    iconGlow: "shadow-[0_0_18px_rgba(34,211,238,0.26)]",
    hashtag: "from-[#67e8f9] via-[#22d3ee] to-[#4ade80]",
    growthBg: "bg-emerald-500/12 border-emerald-400/20",
    growthText: "text-emerald-200",
    line: "#22d3ee",
    lineGlow: "rgba(34,211,238,0.35)",
  },
  {
    border: "border-[#ec4899]/20",
    bg: "from-[#ec4899]/16 via-white/[0.06] to-[#a855f7]/10",
    glow: "shadow-[0_12px_32px_rgba(236,72,153,0.14)]",
    icon: "from-[#ec4899] to-[#a855f7]",
    iconGlow: "shadow-[0_0_18px_rgba(236,72,153,0.28)]",
    hashtag: "from-[#f9a8d4] via-[#ec4899] to-[#c084fc]",
    growthBg: "bg-emerald-500/12 border-emerald-400/20",
    growthText: "text-emerald-200",
    line: "#d946ef",
    lineGlow: "rgba(217,70,239,0.35)",
  },
  {
    border: "border-[#f97316]/20",
    bg: "from-[#f97316]/16 via-white/[0.06] to-[#ef4444]/10",
    glow: "shadow-[0_12px_32px_rgba(249,115,22,0.14)]",
    icon: "from-[#f97316] to-[#ef4444]",
    iconGlow: "shadow-[0_0_18px_rgba(249,115,22,0.28)]",
    hashtag: "from-[#fdba74] via-[#f97316] to-[#fb7185]",
    growthBg: "bg-emerald-500/12 border-emerald-400/20",
    growthText: "text-emerald-200",
    line: "#f97316",
    lineGlow: "rgba(249,115,22,0.35)",
  },
  {
    border: "border-[#6366f1]/20",
    bg: "from-[#6366f1]/16 via-white/[0.06] to-[#3b82f6]/10",
    glow: "shadow-[0_12px_32px_rgba(99,102,241,0.14)]",
    icon: "from-[#818cf8] to-[#3b82f6]",
    iconGlow: "shadow-[0_0_18px_rgba(99,102,241,0.28)]",
    hashtag: "from-[#c7d2fe] via-[#818cf8] to-[#60a5fa]",
    growthBg: "bg-emerald-500/12 border-emerald-400/20",
    growthText: "text-emerald-200",
    line: "#6366f1",
    lineGlow: "rgba(99,102,241,0.35)",
  },
  {
    border: "border-[#14b8a6]/20",
    bg: "from-[#14b8a6]/16 via-white/[0.06] to-[#84cc16]/10",
    glow: "shadow-[0_12px_32px_rgba(20,184,166,0.14)]",
    icon: "from-[#2dd4bf] to-[#84cc16]",
    iconGlow: "shadow-[0_0_18px_rgba(20,184,166,0.28)]",
    hashtag: "from-[#99f6e4] via-[#2dd4bf] to-[#a3e635]",
    growthBg: "bg-emerald-500/12 border-emerald-400/20",
    growthText: "text-emerald-200",
    line: "#14b8a6",
    lineGlow: "rgba(20,184,166,0.35)",
  },
];

export default function Trends() {
  const [trendingTopics, setTrendingTopics] = useState<TrendCard[]>([]);
  const [historicalTopics, setHistoricalTopics] = useState<HistoricalTrend[]>([]);
  const [selectedTrend, setSelectedTrend] = useState<TrendCard | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [dataOrigin, setDataOrigin] = useState<ViralTrend["dataOrigin"]>();
  const copy = useCopy();
  const { preferences } = useAppPreferences();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q")?.trim().toLowerCase() || "";

  function loadTrends() {
    setLoading(true);
    setLoadError("");
    getViralTrends()
      .then((data) => {
        setDataOrigin(data[0]?.dataOrigin);
        const formatted = data.map((item, index) => ({
          id: index + 1,
          keyword: item.palabra,
          hashtag: `#${item.palabra}`,
          posts: item.menciones,
          growth: item.crecimiento,
          score: item.score,
          status: item.estado,
          source: sourceLabel[item.source],
          sourceKey: item.source,
          highlight: item.estado === "Viral",
          sparkline: item.sparkline,
          url: item.url,
          embedUrl: item.embedUrl,
          tags: item.tags || [],
          sentiment: item.sentiment,
          riskLevel: item.riskLevel,
          lifecycle: item.lifecycle,
          actionIdeas: item.actionIdeas || [],
          seoKeywords: item.seoKeywords || [],
          geoRegions: item.geoRegions || [],
          recommendedFormat: item.recommendedFormat,
          summary: item.summary,
        }));

        setTrendingTopics(formatted);
      })
      .catch(() => {
        setTrendingTopics([]);
        setDataOrigin(undefined);
        setLoadError(copy.loadFailedMessage);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadTrends();
  }, []);

  useEffect(() => {
    if (!query) {
      setHistoricalTopics([]);
      return;
    }

    getHistoricalTrends(query)
      .then((data) => {
        setHistoricalTopics(data);
      })
      .catch(() => {
        setHistoricalTopics([]);
      });
  }, [query]);

  const averageGrowth =
    trendingTopics.length > 0
      ? Math.floor(
        trendingTopics.reduce((acc, topic) => acc + topic.growth, 0) /
        trendingTopics.length,
      )
      : 0;

  const visibleTopics = query
    ? trendingTopics.filter((topic) =>
        [topic.hashtag.toLowerCase(), topic.source.toLowerCase(), ...topic.tags].join(" ").includes(query),
      )
    : trendingTopics;

  const locale = preferences.language === "en" ? "en-US" : "es-MX";
  const sentimentLabels: Record<string, string> = {
    positive: copy.positive,
    negative: copy.negative,
    mixed: copy.mixed,
  };
  const lifecycleLabels: Record<string, string> = {
    Emerging: copy.emerging,
    Peak: copy.peak,
    Fading: copy.fading,
  };

  useEffect(() => {
    if (!selectedTrend) {
      document.body.style.overflow = "";
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedTrend(null);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selectedTrend]);

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
        onAction={loadTrends}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-[24px] border border-[#fb7185]/20 bg-gradient-to-br from-[#fb7185]/18 via-white/[0.08] to-[#f97316]/12 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.32),0_0_28px_rgba(251,113,133,0.16),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[#fb7185] to-[#f97316] p-2 shadow-[0_0_18px_rgba(249,115,22,0.35)]">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm text-white/60">{copy.activeTrends}</span>
          </div>
          <div className="bg-gradient-to-r from-[#fda4af] via-white to-[#fdba74] bg-clip-text text-4xl font-bold text-transparent">
            {trendingTopics.length}
          </div>
        </div>

        <div className="rounded-[24px] border border-[#60a5fa]/20 bg-gradient-to-br from-[#60a5fa]/16 via-white/[0.08] to-[#22d3ee]/12 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.32),0_0_28px_rgba(96,165,250,0.16),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[#60a5fa] to-[#22d3ee] p-2 shadow-[0_0_18px_rgba(34,211,238,0.35)]">
              <Hash className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm text-white/60">{copy.trackedHashtags}</span>
          </div>
          <div className="bg-gradient-to-r from-[#93c5fd] via-white to-[#67e8f9] bg-clip-text text-4xl font-bold text-transparent">
            {trendingTopics.length}
          </div>
        </div>

        <div className="rounded-[24px] border border-[#a78bfa]/20 bg-gradient-to-br from-[#a78bfa]/18 via-white/[0.08] to-[#3b82f6]/12 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.32),0_0_28px_rgba(167,139,250,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#3b82f6] p-2 shadow-[0_0_18px_rgba(96,165,250,0.35)]">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm text-white/60">{copy.averageGrowth}</span>
          </div>
          <div className="bg-gradient-to-r from-[#c4b5fd] via-white to-[#60a5fa] bg-clip-text text-4xl font-bold text-transparent">
            +{averageGrowth}%
          </div>
        </div>
      </div>

      {query && (
        <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-white/75">
          {copy.resultsFor}: <span className="font-semibold text-white">"{searchParams.get("q")}"</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {visibleTopics.map((topic, index) => {
          const palette = trendCardPalettes[index % trendCardPalettes.length];

          return (
          <button
            key={topic.id}
            className={`min-w-0 rounded-[24px] border bg-gradient-to-br p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.08] sm:p-5 ${palette.border} ${palette.bg} ${palette.glow}`}
            onClick={() => setSelectedTrend(topic)}
            type="button"
          >
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex min-w-0 items-start gap-2">
                  <div className={`rounded-xl bg-gradient-to-br p-2 ${palette.icon} ${palette.iconGlow}`}>
                    <Hash className="h-4 w-4 text-white" />
                  </div>
                  <span className={`min-w-0 break-words bg-gradient-to-r bg-clip-text text-base font-semibold leading-snug text-transparent sm:text-lg ${palette.hashtag}`}>
                    {topic.hashtag}
                  </span>

                  {topic.highlight && <Flame className="mt-1 h-4 w-4 shrink-0 text-orange-400" />}
                </div>

                <div className="text-xs text-white/50">
                  {topic.posts.toLocaleString(locale)} {copy.totalMentions.toLowerCase()}
                </div>
                <div className="mt-1 text-xs text-white/45">{topic.source}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {topic.sentiment && (
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-white/60">
                      {copy.sentiment}: {sentimentLabels[topic.sentiment] || topic.sentiment}
                    </span>
                  )}
                  {topic.lifecycle && (
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-white/60">
                      {copy.lifecycle}: {lifecycleLabels[topic.lifecycle] || topic.lifecycle}
                    </span>
                  )}
                </div>
                {topic.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {topic.tags.slice(0, 3).map((tag) => (
                      <span
                        key={`${topic.id}-${tag}`}
                        className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-white/48"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2 text-left sm:block sm:text-right">
                <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${palette.growthBg} ${palette.growthText}`}>
                  +{topic.growth}%
                </div>
                <div className="text-xs text-yellow-300 sm:mt-2">{topic.status}</div>
                <div className="text-xs text-blue-300 sm:mt-1">
                  Score: {topic.score.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="h-12">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={topic.sparkline.map((value) => ({ value }))}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={palette.line}
                    strokeWidth={2}
                    dot={false}
                    style={{
                      filter: `drop-shadow(0 0 10px ${palette.lineGlow})`,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </button>
        )})}

        {visibleTopics.length === 0 && (
          <div className="rounded-[20px] border border-white/10 bg-white/5 p-5 text-sm text-white/60">
            {copy.noTrendResults}
          </div>
        )}
      </div>

      {query && historicalTopics.length > 0 && (
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
          <h3 className="text-lg font-semibold text-white">{copy.historicalMatches}</h3>
          <div className="mt-4 space-y-3">
            {historicalTopics.map((trend) => (
              <div
                key={`${trend.palabra}-${trend.capturedAt}`}
                className="rounded-[18px] border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="text-sm font-medium text-white/95">{trend.palabra}</div>
                <div className="mt-1 text-xs text-white/50">
                  {sourceLabel[trend.source]} · {copy.capturedOn}{" "}
                  {new Date(trend.capturedAt).toLocaleString(locale)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedTrend && (
        <div
          className="fixed inset-0 z-40 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm md:p-6"
          onClick={() => setSelectedTrend(null)}
          role="presentation"
        >
          <div className="flex min-h-full items-start justify-center py-4 md:items-center">
            <div
              className="relative w-full max-w-4xl rounded-[28px] border border-white/20 bg-[#151726]/95 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] md:max-h-[90vh] md:overflow-y-auto md:p-6"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
            <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-5 flex items-start justify-between gap-4 rounded-t-[28px] border-b border-white/10 bg-[#151726]/95 px-5 py-4 backdrop-blur-xl md:-mx-6 md:-mt-6 md:px-6">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-white/35">
                  {selectedTrend.source}
                </div>
                <h3 className="mt-2 text-2xl font-semibold text-white/95">
                  {selectedTrend.keyword}
                </h3>
                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                  <span className="text-[#4ade80]">+{selectedTrend.growth}%</span>
                  <span className="text-[#facc15]">{selectedTrend.status}</span>
                  <span className="text-white/55">
                    {selectedTrend.posts.toLocaleString()} menciones
                  </span>
                </div>
              </div>

              <button
                aria-label="Cerrar detalle"
                className="shrink-0 rounded-full border border-white/10 bg-white/[0.08] p-3 text-white/90 transition-all hover:bg-white/[0.14]"
                onClick={() => setSelectedTrend(null)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedTrend.embedUrl ? (
              <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black">
                <iframe
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="aspect-video w-full"
                  src={selectedTrend.embedUrl}
                  title={selectedTrend.keyword}
                />
              </div>
            ) : (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 text-white/70">
                {copy.noPreview}
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-3">
              {selectedTrend.url && (
                <a
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#3b82f6] px-4 py-2.5 text-sm font-medium text-white shadow-[0_0_20px_rgba(147,51,234,0.35)]"
                  href={selectedTrend.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink className="h-4 w-4" />
                  {copy.openSource}
                </a>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-[20px] border border-emerald-400/18 bg-gradient-to-br from-emerald-500/[0.12] via-white/[0.04] to-cyan-500/[0.08] p-4 shadow-[0_10px_28px_rgba(16,185,129,0.08)]">
                <div className="text-xs uppercase tracking-[0.2em] text-white/35">
                  {copy.sentiment}
                </div>
                <div className="mt-2 text-sm font-medium text-emerald-100">
                  {selectedTrend.sentiment
                    ? sentimentLabels[selectedTrend.sentiment] || selectedTrend.sentiment
                    : copy.mixed}
                </div>
                <div className="mt-3 text-xs uppercase tracking-[0.2em] text-white/35">
                  {copy.riskLevel}
                </div>
                <div className="mt-2 text-sm text-cyan-100">
                  {selectedTrend.riskLevel || "low"}
                </div>
                {selectedTrend.summary && (
                  <div className="mt-4 text-sm text-white/65">{selectedTrend.summary}</div>
                )}
              </div>

              <div className="rounded-[20px] border border-fuchsia-400/18 bg-gradient-to-br from-fuchsia-500/[0.12] via-white/[0.04] to-violet-500/[0.08] p-4 shadow-[0_10px_28px_rgba(217,70,239,0.08)]">
                <div className="text-xs uppercase tracking-[0.2em] text-white/35">
                  {copy.actions}
                </div>
                <div className="mt-3 space-y-2">
                  {(selectedTrend.actionIdeas || []).slice(0, 3).map((idea) => (
                    <div
                      key={idea}
                      className="rounded-2xl border border-fuchsia-300/12 bg-white/[0.05] px-3 py-2 text-sm text-white/82"
                    >
                      {idea}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[20px] border border-orange-400/18 bg-gradient-to-br from-orange-500/[0.12] via-white/[0.04] to-pink-500/[0.08] p-4 shadow-[0_10px_28px_rgba(249,115,22,0.08)]">
                <div className="text-xs uppercase tracking-[0.2em] text-white/35">
                  {copy.keywords}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(selectedTrend.seoKeywords || []).map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full border border-orange-300/14 bg-white/[0.06] px-3 py-1 text-xs text-orange-100"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[20px] border border-cyan-400/18 bg-gradient-to-br from-cyan-500/[0.12] via-white/[0.04] to-blue-500/[0.08] p-4 shadow-[0_10px_28px_rgba(34,211,238,0.08)]">
                <div className="text-xs uppercase tracking-[0.2em] text-white/35">
                  {copy.geoFocus}
                </div>
                <div className="mt-3 space-y-2">
                  {(selectedTrend.geoRegions || []).length > 0 ? (
                    (selectedTrend.geoRegions || []).slice(0, 5).map((region) => (
                      <div
                        key={region.name}
                        className="flex items-center justify-between text-sm text-white/82"
                      >
                        <span>{region.name}</span>
                        <span className="text-cyan-200">{region.value}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-white/55">Sin datos regionales fuertes.</div>
                  )}
                </div>
                <div className="mt-4 text-xs uppercase tracking-[0.2em] text-white/35">
                  {copy.recommendedFormatLabel}
                </div>
                <div className="mt-2 text-sm text-cyan-100">
                  {selectedTrend.recommendedFormat || "short_video"}
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
