import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router";
import {
  PieChart,
  BarChart3,
  Globe,
  Calendar,
  Download,
  Activity,
  MousePointerClick,
} from "lucide-react";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  getAnalyticsSummary,
  getSavedReports,
  saveReport,
  type AnalyticsSummary,
  type SavedReportItem,
} from "../lib/api";
import { useCopy } from "../lib/copy";
import { useAppPreferences } from "../context/AppPreferences";
import { AsyncStateCard } from "../components/AsyncStateCard";

const emptyAnalytics: AnalyticsSummary = {
  generatedAt: new Date(0).toISOString(),
  growthTimeline: [],
  stateBreakdown: [],
  sourceBreakdown: [],
  platformPerformance: [],
  topTrends: [],
  sentimentBreakdown: [],
  lifecycleBreakdown: [],
  featuredActions: [],
  geoOverview: [],
  crisisAlerts: [],
  ageBreakdown: [],
  genderBreakdown: [],
  audienceMeta: {
    mode: "estimated",
    provider: "estimated-model",
    source: "global",
    note: "Sin metadatos",
    capturedAt: null,
  },
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

const pieColors = ["#a78bfa", "#60a5fa", "#06b6d4", "#84cc16", "#f97316"];

const sourceLabels: Record<string, string> = {
  youtube: "YouTube",
  reddit: "Reddit",
  google: "Google Trends",
  news: "News",
  hackernews: "Hacker News",
};

const mexicoTiles = [
  { name: "Baja California", short: "BC", row: 1, col: 1 },
  { name: "Baja California Sur", short: "BCS", row: 3, col: 1 },
  { name: "Sonora", short: "SON", row: 1, col: 2 },
  { name: "Chihuahua", short: "CHIH", row: 1, col: 3 },
  { name: "Coahuila", short: "COAH", row: 1, col: 4 },
  { name: "Nuevo Leon", short: "NL", row: 1, col: 5 },
  { name: "Tamaulipas", short: "TAMPS", row: 1, col: 6 },
  { name: "Sinaloa", short: "SIN", row: 2, col: 2 },
  { name: "Durango", short: "DGO", row: 2, col: 3 },
  { name: "Zacatecas", short: "ZAC", row: 2, col: 4 },
  { name: "San Luis Potosi", short: "SLP", row: 2, col: 5 },
  { name: "Nayarit", short: "NAY", row: 3, col: 2 },
  { name: "Jalisco", short: "JAL", row: 3, col: 3 },
  { name: "Aguascalientes", short: "AGS", row: 3, col: 4 },
  { name: "Guanajuato", short: "GTO", row: 3, col: 5 },
  { name: "Queretaro", short: "QRO", row: 3, col: 6 },
  { name: "Hidalgo", short: "HGO", row: 3, col: 7 },
  { name: "Veracruz", short: "VER", row: 3, col: 8 },
  { name: "Colima", short: "COL", row: 4, col: 3 },
  { name: "Michoacan", short: "MICH", row: 4, col: 4 },
  { name: "Estado de Mexico", short: "Edomex", row: 4, col: 5 },
  { name: "Ciudad de Mexico", short: "CDMX", row: 4, col: 6 },
  { name: "Tlaxcala", short: "TLAX", row: 4, col: 7 },
  { name: "Puebla", short: "PUE", row: 4, col: 8 },
  { name: "Morelos", short: "MOR", row: 5, col: 5 },
  { name: "Guerrero", short: "GRO", row: 5, col: 4 },
  { name: "Oaxaca", short: "OAX", row: 5, col: 7 },
  { name: "Chiapas", short: "CHIS", row: 5, col: 9 },
  { name: "Tabasco", short: "TAB", row: 4, col: 9 },
  { name: "Campeche", short: "CAMP", row: 4, col: 10 },
  { name: "Yucatan", short: "YUC", row: 3, col: 10 },
  { name: "Quintana Roo", short: "QROO", row: 3, col: 11 },
];

const stateAliases: Record<string, string> = {
  "Baja California": "Baja California",
  "Baja California Sur": "Baja California Sur",
  Sonora: "Sonora",
  Chihuahua: "Chihuahua",
  Coahuila: "Coahuila",
  "Nuevo Leon": "Nuevo Leon",
  "Nuevo León": "Nuevo Leon",
  Tamaulipas: "Tamaulipas",
  Sinaloa: "Sinaloa",
  Durango: "Durango",
  Zacatecas: "Zacatecas",
  "San Luis Potosi": "San Luis Potosi",
  "San Luis Potosí": "San Luis Potosi",
  Nayarit: "Nayarit",
  Jalisco: "Jalisco",
  Aguascalientes: "Aguascalientes",
  Guanajuato: "Guanajuato",
  Queretaro: "Queretaro",
  "Querétaro": "Queretaro",
  Hidalgo: "Hidalgo",
  Veracruz: "Veracruz",
  Colima: "Colima",
  Michoacan: "Michoacan",
  "Michoacán": "Michoacan",
  "Estado de Mexico": "Estado de Mexico",
  "Estado de México": "Estado de Mexico",
  "Ciudad de Mexico": "Ciudad de Mexico",
  "Ciudad de México": "Ciudad de Mexico",
  Tlaxcala: "Tlaxcala",
  Puebla: "Puebla",
  Morelos: "Morelos",
  Guerrero: "Guerrero",
  Oaxaca: "Oaxaca",
  Chiapas: "Chiapas",
  Tabasco: "Tabasco",
  Campeche: "Campeche",
  Yucatan: "Yucatan",
  "Yucatán": "Yucatan",
  "Quintana Roo": "Quintana Roo",
};

const stateRegionCodes: Record<string, string> = {
  aguascalientes: "MX-AGU",
  "baja california": "MX-BCN",
  "baja california sur": "MX-BCS",
  campeche: "MX-CAM",
  chiapas: "MX-CHP",
  chihuahua: "MX-CHH",
  coahuila: "MX-COA",
  colima: "MX-COL",
  "ciudad de mexico": "MX-CMX",
  durango: "MX-DUR",
  guanajuato: "MX-GUA",
  guerrero: "MX-GRO",
  hidalgo: "MX-HID",
  jalisco: "MX-JAL",
  "estado de mexico": "MX-MEX",
  michoacan: "MX-MIC",
  morelos: "MX-MOR",
  nayarit: "MX-NAY",
  "nuevo leon": "MX-NLE",
  oaxaca: "MX-OAX",
  puebla: "MX-PUE",
  queretaro: "MX-QUE",
  "quintana roo": "MX-ROO",
  "san luis potosi": "MX-SLP",
  sinaloa: "MX-SIN",
  sonora: "MX-SON",
  tabasco: "MX-TAB",
  tamaulipas: "MX-TAM",
  tlaxcala: "MX-TLA",
  veracruz: "MX-VER",
  yucatan: "MX-YUC",
  zacatecas: "MX-ZAC",
};

declare global {
  interface Window {
    google?: any;
  }
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("es-MX", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCaptureDate(value: string, locale: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin captura";
  }

  return date.toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getSeverityStyles(severity: "high" | "medium" | "low") {
  if (severity === "high") {
    return {
      badge: "border-red-400/35 bg-red-500/10 text-red-200",
      glow: "shadow-[0_0_30px_rgba(239,68,68,0.18)]",
    };
  }

  if (severity === "medium") {
    return {
      badge: "border-amber-400/35 bg-amber-500/10 text-amber-100",
      glow: "shadow-[0_0_30px_rgba(245,158,11,0.12)]",
    };
  }

  return {
    badge: "border-cyan-400/35 bg-cyan-500/10 text-cyan-100",
    glow: "shadow-[0_0_30px_rgba(34,211,238,0.12)]",
  };
}

function getPulseAccent(value: number) {
  if (value >= 850) {
    return {
      ring: "rgba(168,85,247,0.5)",
      soft: "rgba(168,85,247,0.18)",
      badge: "from-[#c084fc] via-[#a855f7] to-[#60a5fa]",
    };
  }

  if (value >= 450) {
    return {
      ring: "rgba(34,211,238,0.5)",
      soft: "rgba(34,211,238,0.18)",
      badge: "from-[#67e8f9] via-[#22d3ee] to-[#3b82f6]",
    };
  }

  return {
    ring: "rgba(255,255,255,0.5)",
    soft: "rgba(255,255,255,0.14)",
    badge: "from-white via-[#bfdbfe] to-[#60a5fa]",
  };
}

function getRankCardStyles(index: number) {
  const palettes = [
    {
      border: "border-fuchsia-400/20",
      bg: "from-fuchsia-500/14 via-white/[0.05] to-indigo-500/12",
      glow: "shadow-[0_10px_30px_rgba(168,85,247,0.14)]",
      value: "text-fuchsia-200",
    },
    {
      border: "border-cyan-400/20",
      bg: "from-cyan-400/14 via-white/[0.05] to-sky-500/12",
      glow: "shadow-[0_10px_30px_rgba(34,211,238,0.14)]",
      value: "text-cyan-200",
    },
    {
      border: "border-blue-400/20",
      bg: "from-blue-500/14 via-white/[0.05] to-indigo-500/12",
      glow: "shadow-[0_10px_30px_rgba(59,130,246,0.14)]",
      value: "text-blue-200",
    },
  ];

  return palettes[index % palettes.length];
}

function normalizeGeoName(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export default function Analytics() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsSummary>(emptyAnalytics);
  const [savedReports, setSavedReports] = useState<SavedReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const geoChartRef = useRef<HTMLDivElement | null>(null);
  const stateDetailRef = useRef<HTMLDivElement | null>(null);
  const [selectedSourceFilter, setSelectedSourceFilter] = useState("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const copy = useCopy();
  const { preferences } = useAppPreferences();
  const locale = preferences.language === "en" ? "en-US" : "es-MX";
  const audienceBadge =
    analytics.audienceMeta.mode === "real" ? "Datos reales" : "Estimacion";
  const temporal = analytics.temporalComparison;

  async function exportReport() {
    const reportWindow = window.open("", "_blank", "width=960,height=720");

    if (!reportWindow) {
      return;
    }

    const rows = analytics.topTrends
      .map(
        (trend) => `
          <tr>
            <td>${trend.keyword}</td>
            <td>${sourceLabels[trend.source] || trend.source}</td>
            <td>${formatCompactNumber(trend.score)}</td>
            <td>+${trend.growth}%</td>
            <td>${trend.status}</td>
          </tr>
        `,
      )
      .join("");

    reportWindow.document.write(`
      <html>
        <head>
          <title>Treend Analytics Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #111827; }
            h1 { margin-bottom: 8px; }
            p { color: #4b5563; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
            th { background: #f3f4f6; }
            .meta { margin-top: 20px; padding: 16px; background: #f9fafb; border: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <h1>Reporte Analitico Treend</h1>
          <p>${copy.latestCapture}: ${formatCaptureDate(analytics.generatedAt, locale)}</p>
          <div class="meta">
            <strong>Nota:</strong> ${analytics.audienceMeta.note}
          </div>
          <table>
            <thead>
              <tr>
                <th>Tendencia</th>
                <th>Fuente</th>
                <th>Score</th>
                <th>Crecimiento</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();

    try {
      await saveReport({
        reportType: "analytics",
        title: `Reporte Analytics ${new Date().toLocaleString(locale)}`,
        format: "pdf",
        payload: {
          generatedAt: analytics.generatedAt,
          topTrends: analytics.topTrends,
          stateBreakdown: analytics.stateBreakdown,
          sourceBreakdown: analytics.sourceBreakdown,
        },
      });
      const nextReports = await getSavedReports(6);
      setSavedReports(nextReports);
    } catch {
      // keep UI flow even if saving report fails
    }
  }

  function openTrendDetail(keyword: string) {
    const query = keyword.trim();
    if (!query) {
      return;
    }

    navigate(`/tendencias?q=${encodeURIComponent(query)}`);
  }

  function loadAnalytics() {
    setLoading(true);
    setLoadError("");
    getAnalyticsSummary()
      .then((data) => {
        setAnalytics(data);
      })
      .catch(() => {
        setAnalytics(emptyAnalytics);
        setLoadError(copy.loadFailedMessage);
      });

    getSavedReports(6)
      .then((data) => setSavedReports(data))
      .catch(() => setSavedReports([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  const sourceChart = analytics.sourceBreakdown.map((item) => ({
    ...item,
    name: sourceLabels[item.name] || item.name,
  }));

  const platformChart = analytics.platformPerformance.map((item) => ({
    ...item,
    platform: sourceLabels[item.platform] || item.platform,
  }));

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

  const severityLabels = {
    high: copy.highSeverity,
    medium: copy.mediumSeverity,
    low: copy.lowSeverity,
  };

  const sourceFilterOptions = [
    { value: "all", label: copy.allSources },
    ...Object.entries(sourceLabels).map(([value, label]) => ({ value, label })),
  ];

  const safeGeoTrendDetails = Array.isArray(analytics.geoTrendDetails)
    ? analytics.geoTrendDetails
    : [];

  const categorySet = new Set<string>();
  for (const detail of safeGeoTrendDetails) {
    for (const category of detail.categories || []) {
      if (category.name) {
        categorySet.add(category.name);
      }
    }
  }

  const categoryFilterOptions = [
    { value: "all", label: copy.allCategories },
    ...Array.from(categorySet)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({
        value,
        label: value === "general" ? copy.generalCategory : value,
      })),
  ];

  const normalizedGeo = analytics.geoOverview
    .map((region) => {
      const normalizedName = normalizeGeoName(stateAliases[region.name] || region.name);
      const regionCode = stateRegionCodes[normalizedName];

      return {
        ...region,
        normalizedName,
        regionCode,
      };
    })
    .filter((region) => Boolean(region.regionCode));

  const filteredGeoDetails = safeGeoTrendDetails
    .map((detail) => {
      const filteredTrends = detail.trends.filter((trend) => {
        const sourceMatch =
          selectedSourceFilter === "all" || trend.source === selectedSourceFilter;
        const categoryMatch =
          selectedCategoryFilter === "all" || trend.category === selectedCategoryFilter;

        return sourceMatch && categoryMatch;
      });

      if (filteredTrends.length === 0) {
        return null;
      }

      const total = filteredTrends.reduce(
        (sum, trend) =>
          sum + Math.max(20, Math.round((trend.score || 0) / 2500) + Math.round((trend.growth || 0) / 4)),
        0,
      );

      const sourceTotals = new Map<string, number>();
      const categoryTotals = new Map<string, number>();

      for (const trend of filteredTrends) {
        sourceTotals.set(
          trend.source,
          (sourceTotals.get(trend.source) || 0) + Math.max(12, Math.round((trend.score || 0) / 3500)),
        );
        categoryTotals.set(
          trend.category,
          (categoryTotals.get(trend.category) || 0) + Math.max(12, Math.round((trend.score || 0) / 3500)),
        );
      }

      return {
        state: detail.state,
        total,
        trends: filteredTrends,
        sources: Array.from(sourceTotals.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
        categories: Array.from(categoryTotals.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
      };
    })
    .filter(Boolean) as AnalyticsSummary["geoTrendDetails"];

  const filteredGeoOverview = filteredGeoDetails
    .map((detail) => ({
      name: detail.state,
      value: detail.total,
    }))
    .sort((a, b) => b.value - a.value);

  const normalizedGeoFiltered = filteredGeoOverview
    .map((region) => {
      const normalizedName = normalizeGeoName(stateAliases[region.name] || region.name);
      const regionCode = stateRegionCodes[normalizedName];

      return {
        ...region,
        normalizedName,
        regionCode,
      };
    })
    .filter((region) => Boolean(region.regionCode));

  const selectedStateDetail =
    filteredGeoDetails.find((detail) => detail.state === selectedState) || null;
  const hoveredStateDetail =
    filteredGeoDetails.find((detail) => detail.state === hoveredState) || null;
  const activeMapState = hoveredStateDetail || selectedStateDetail;
  const activeMapAccent = getPulseAccent(activeMapState?.total || 0);

  useEffect(() => {
    if (!selectedStateDetail || !stateDetailRef.current) {
      return;
    }

    window.requestAnimationFrame(() => {
      stateDetailRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [selectedStateDetail]);

  useEffect(() => {
    if (!geoChartRef.current) {
      return;
    }

    const drawChart = () => {
      if (!geoChartRef.current || !window.google?.visualization) {
        return;
      }

      const data = window.google.visualization.arrayToDataTable([
        ["State", "Pulse"],
        ...normalizedGeoFiltered.map((region) => [region.regionCode, region.value]),
      ]);

      const isDaylight = preferences.theme === "daylight";
      const chart = new window.google.visualization.GeoChart(geoChartRef.current);
      chart.draw(data, {
        region: "MX",
        resolution: "provinces",
        backgroundColor: "transparent",
        datalessRegionColor: isDaylight ? "#fff7ed" : "rgba(255,255,255,0.08)",
        defaultColor: isDaylight ? "#f3e8ff" : "#1f2937",
        colorAxis: {
          colors: isDaylight
            ? ["#86efac", "#f9a8d4", "#a855f7"]
            : ["#1d4ed8", "#22d3ee", "#a855f7"],
        },
        legend: "none",
        tooltip: {
          textStyle: {
            color: "#0f172a",
          },
        },
      });

      if (selectedState) {
        const selectedRegion = normalizedGeoFiltered.find((region) => region.name === selectedState);
        const selectedRow = selectedRegion
          ? normalizedGeoFiltered.findIndex((region) => region.regionCode === selectedRegion.regionCode)
          : -1;

        if (selectedRow >= 0) {
          chart.setSelection([{ row: selectedRow }]);
        }
      }

      window.google.visualization.events.addListener(chart, "select", () => {
        const selection = chart.getSelection();
        if (!selection?.length) {
          return;
        }

        const row = selection[0]?.row;
        const regionCode = data.getValue(row, 0);
        const regionMatch = normalizedGeoFiltered.find((region) => region.regionCode === regionCode);

        if (regionMatch) {
          setSelectedState(regionMatch.name);
        }
      });

      window.google.visualization.events.addListener(chart, "onmouseover", (event: { row?: number }) => {
        const row = event?.row;
        if (typeof row !== "number") {
          return;
        }

        const regionCode = data.getValue(row, 0);
        const regionMatch = normalizedGeoFiltered.find((region) => region.regionCode === regionCode);
        setHoveredState(regionMatch?.name || null);
      });

      window.google.visualization.events.addListener(chart, "onmouseout", () => {
        setHoveredState(null);
      });
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-google-charts="true"]',
    );

    if (window.google?.charts) {
      window.google.charts.load("current", {
        packages: ["geochart"],
      });
      window.google.charts.setOnLoadCallback(drawChart);
      return;
    }

    const script =
      existingScript ||
      Object.assign(document.createElement("script"), {
        src: "https://www.gstatic.com/charts/loader.js",
        async: true,
      });

    script.dataset.googleCharts = "true";

    script.onload = () => {
      window.google?.charts.load("current", {
        packages: ["geochart"],
      });
      window.google?.charts.setOnLoadCallback(drawChart);
    };

    if (!existingScript) {
      document.body.appendChild(script);
    }
  }, [normalizedGeoFiltered, preferences.theme, selectedState]);

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
        onAction={loadAnalytics}
      />
    );
  }

  return (
    <div className="space-y-6">
      <style>{`
        .geo-map-shell svg path[fill]:not([fill="none"]) {
          cursor: pointer;
          transition: filter 180ms ease, opacity 180ms ease, stroke 180ms ease, stroke-width 180ms ease;
        }

        .geo-map-shell svg path[fill]:not([fill="none"]):hover {
          filter: brightness(1.18) saturate(1.18) drop-shadow(0 0 8px rgba(255,255,255,0.75)) drop-shadow(0 0 18px rgba(59,130,246,0.45));
          stroke: rgba(255,255,255,0.45);
          stroke-width: 1.25px;
        }

        .geo-map-shell svg path[fill="rgba(255,255,255,0.08)"]:hover,
        .geo-map-shell svg path[fill="rgb(255,255,255)"]:hover,
        .geo-map-shell svg path[fill="#ffffff"]:hover,
        .geo-map-shell svg path[fill="#fff"]:hover {
          filter: brightness(1.28) saturate(1) drop-shadow(0 0 8px rgba(255,255,255,0.95)) drop-shadow(0 0 18px rgba(255,255,255,0.55));
        }

        .geo-map-shell svg path[stroke-width="2"],
        .geo-map-shell svg path[stroke-width="2.0"],
        .geo-map-shell svg path[stroke-width="2px"] {
          filter: drop-shadow(0 0 12px var(--geo-active-ring)) drop-shadow(0 0 24px var(--geo-active-soft));
        }
      `}</style>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white/95">
            {copy.detailedAnalysis}
          </h2>
          <p className="mt-1 text-sm text-white/50">
            {copy.realSummary}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.08] px-4 py-2.5 text-sm font-medium text-white/90 backdrop-blur-xl transition-all hover:bg-white/[0.12]"
            type="button"
          >
            <Calendar className="h-4 w-4" />
            {formatCaptureDate(analytics.generatedAt, locale)}
          </button>
          <button
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#3b82f6] px-4 py-2.5 text-sm font-medium text-white shadow-[0_0_20px_rgba(147,51,234,0.4)] transition-all hover:shadow-[0_0_30px_rgba(147,51,234,0.6)]"
            onClick={exportReport}
            type="button"
          >
            <Download className="h-4 w-4" />
            {copy.exportReport}
          </button>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#84cc16] p-2.5 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white/95">
              {copy.historicalEvolution}
              </h2>
              <p className="text-sm text-white/50">
              {copy.realHistorySeries}
              </p>
            </div>
          </div>

        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={analytics.growthTimeline}>
            <defs>
              <linearGradient id="mentionsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="engagementGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#84cc16" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
            <XAxis
              axisLine={false}
              dataKey="period"
              stroke="rgba(255,255,255,0.4)"
              tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              stroke="rgba(255,255,255,0.4)"
              tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
              tickFormatter={(value) => formatCompactNumber(value)}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                backdropFilter: "blur(20px)",
                color: "#fff",
                fontSize: "12px",
              }}
            />
            <Area
              dataKey="mentions"
              fill="url(#mentionsGradient)"
              name="Menciones"
              stroke="#a78bfa"
              strokeWidth={3}
              type="monotone"
            />
            <Area
              dataKey="engagement"
              fill="url(#engagementGradient)"
              name="Interaccion"
              stroke="#06b6d4"
              strokeWidth={3}
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {savedReports.length > 0 && (
        <div className="rounded-[28px] border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
          <h3 className="text-lg font-semibold text-white/95">Reportes guardados</h3>
          <div className="mt-4 space-y-3">
            {savedReports.map((report) => (
              <div
                key={report.id}
                className="rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/85"
              >
                <div className="font-medium">{report.title}</div>
                <div className="mt-1 text-xs text-white/50">
                  {report.reportType} | {report.format.toUpperCase()} |{" "}
                  {new Date(report.createdAt).toLocaleString(locale)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-[24px] border border-emerald-400/18 bg-gradient-to-br from-emerald-500/[0.10] via-white/[0.04] to-cyan-500/[0.08] p-5 shadow-[0_10px_24px_rgba(16,185,129,0.08)] backdrop-blur-2xl">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">{copy.risingNow}</div>
          <div className="mt-3 space-y-3">
            {temporal.rising.slice(0, 3).map((trend) => (
              <div key={`${trend.source}-${trend.keyword}`} className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white/90">{trend.keyword}</div>
                  <div className="text-xs text-white/45">{sourceLabels[trend.source] || trend.source}</div>
                </div>
                <div className="text-sm font-semibold text-emerald-200">+{trend.changePercent || trend.change}</div>
              </div>
            ))}
            {temporal.rising.length === 0 && (
              <div className="text-sm text-white/55">Sin alzas fuertes todavia.</div>
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
              ? formatCaptureDate(temporal.previousSnapshotAt, locale)
              : "Sin comparacion previa suficiente"}
          </div>
        </div>

        <div className="rounded-[24px] border border-blue-400/18 bg-gradient-to-br from-blue-500/[0.10] via-white/[0.04] to-fuchsia-500/[0.08] p-5 shadow-[0_10px_24px_rgba(59,130,246,0.08)] backdrop-blur-2xl">
          <div className="text-xs uppercase tracking-[0.18em] text-white/40">{copy.coolingDown}</div>
          <div className="mt-3 space-y-3">
            {temporal.falling.slice(0, 3).map((trend) => (
              <div key={`${trend.source}-${trend.keyword}`} className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white/90">{trend.keyword}</div>
                  <div className="text-xs text-white/45">{sourceLabels[trend.source] || trend.source}</div>
                </div>
                <div className="text-sm font-semibold text-blue-200">{trend.changePercent || trend.change}</div>
              </div>
            ))}
            {temporal.falling.length === 0 && (
              <div className="text-sm text-white/55">No hay caidas fuertes ahora.</div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="daylight-crisis-panel rounded-[28px] border border-white/20 bg-gradient-to-br from-[#2a0e17]/90 via-[#1d1324]/92 to-[#151726]/95 p-6 shadow-[0_12px_45px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[#ef4444] to-[#f97316] p-2.5 shadow-[0_0_24px_rgba(239,68,68,0.35)]">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white/95">{copy.crisisMonitor}</h2>
              <p className="text-sm text-white/50">
                Riesgos detectados por tono, volumen y crecimiento de la conversacion.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {analytics.crisisAlerts.length > 0 ? (
              analytics.crisisAlerts.map((alert) => {
                const styles = getSeverityStyles(alert.severity);

                return (
                  <div
                    key={`${alert.affectedTrend}-${alert.severity}`}
                    className={`daylight-crisis-alert rounded-[22px] border border-white/10 bg-black/20 p-5 ${styles.glow}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-base font-semibold text-white/95">{alert.title}</div>
                        <div className="mt-1 text-xs text-white/45">
                          {sourceLabels[alert.source] || alert.source} · {alert.affectedTrend}
                        </div>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${styles.badge}`}
                      >
                        {copy.crisisPriority}: {severityLabels[alert.severity]}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-white/72">{alert.description}</p>
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/80">
                      {alert.recommendation}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-5 py-6 text-sm text-white/65">
                {copy.noCrisisAlerts}
              </div>
            )}
          </div>
        </div>

        <div className="daylight-map-panel rounded-[28px] border border-white/20 bg-gradient-to-br from-[#0f172a]/95 via-[#111827]/92 to-[#172554]/90 p-6 shadow-[0_12px_45px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#3b82f6] p-2.5 shadow-[0_0_24px_rgba(59,130,246,0.35)]">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white/95">{copy.mexicoHeatmap}</h2>
              <p className="text-sm text-white/50">{copy.regionalPulse}</p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.18em] text-white/40">
                {copy.sourceFilter}
              </span>
              <select
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition-all hover:bg-white/[0.07]"
                value={selectedSourceFilter}
                onChange={(event) => {
                  setSelectedSourceFilter(event.target.value);
                  setSelectedState(null);
                }}
              >
                {sourceFilterOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.18em] text-white/40">
                {copy.categoryFilter}
              </span>
              <select
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition-all hover:bg-white/[0.07]"
                value={selectedCategoryFilter}
                onChange={(event) => {
                  setSelectedCategoryFilter(event.target.value);
                  setSelectedState(null);
                }}
              >
                {categoryFilterOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                  Estado activo
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <span
                    className={`inline-flex rounded-full bg-gradient-to-r px-3 py-1 text-xs font-semibold text-slate-950 shadow-[0_0_24px_rgba(96,165,250,0.25)] ${activeMapAccent.badge}`}
                  >
                    {activeMapState?.state || "Explora el mapa"}
                  </span>
                  <span className="text-sm text-white/60">
                    {activeMapState ? `${copy.regionalPulse}: ${activeMapState.total}` : copy.clickStateHint}
                  </span>
                </div>
              </div>
              <div
                className="rounded-2xl border px-4 py-3 text-sm text-white/75 backdrop-blur-xl transition-all duration-300"
                style={{
                  borderColor: activeMapAccent.soft,
                  background:
                    preferences.theme === "daylight"
                      ? `linear-gradient(135deg, ${activeMapAccent.soft}, rgba(255,255,255,0.86))`
                      : `linear-gradient(135deg, ${activeMapAccent.soft}, rgba(15,23,42,0.45))`,
                  boxShadow: `0 0 26px ${activeMapAccent.soft}`,
                }}
              >
                Hover neon activo
              </div>
            </div>

            <div
              className="daylight-map-canvas geo-map-shell relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_42%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.18),transparent_36%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(17,24,39,0.88))] p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_16px_48px_rgba(0,0,0,0.35),0_0_40px_rgba(59,130,246,0.12)]"
              style={
                {
                  "--geo-active-ring": activeMapAccent.ring,
                  "--geo-active-soft": activeMapAccent.soft,
                } as CSSProperties
              }
            >
              <div className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full bg-cyan-400/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-10 left-1/4 h-24 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />
              <div
                ref={geoChartRef}
                className="h-[360px] w-full"
              />
            </div>

            <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-gradient-to-r from-cyan-500/[0.10] via-white/[0.04] to-fuchsia-500/[0.08] px-4 py-3 shadow-[0_0_22px_rgba(34,211,238,0.08)]">
              <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                {copy.heatLegend}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-white/75">
                <span className="h-3 w-8 rounded-full bg-[#1d4ed8]" />
                <span>{copy.lowIntensity}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/75">
                <span className="h-3 w-8 rounded-full bg-[#22d3ee]" />
                <span>{copy.mediumIntensity}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/75">
                <span className="h-3 w-8 rounded-full bg-[#a855f7]" />
                <span>{copy.highIntensity}</span>
              </div>
            </div>
          </div>

            <div className="mt-4 rounded-2xl border border-sky-400/15 bg-gradient-to-r from-sky-500/[0.10] via-white/[0.04] to-blue-500/[0.08] px-4 py-3 text-sm text-white/70 shadow-[0_0_24px_rgba(56,189,248,0.08)]">
              <div className="flex items-center gap-2">
                <MousePointerClick className="h-4 w-4 text-cyan-300" />
                <span>{copy.clickStateHint}</span>
              </div>
              {hoveredStateDetail && (
                <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-gradient-to-r from-cyan-500/[0.14] to-blue-500/[0.10] px-4 py-3 shadow-[0_0_24px_rgba(34,211,238,0.12)]">
                  <div className="text-sm font-semibold text-white/92">{hoveredStateDetail.state}</div>
                  <div className="mt-1 text-xs text-white/65">
                    {copy.regionalPulse}: {hoveredStateDetail.total}
                  </div>
                  {hoveredStateDetail.trends[0] && (
                  <div className="mt-2 text-sm text-cyan-100">
                    {hoveredStateDetail.trends[0].keyword}
                  </div>
                )}
              </div>
            )}
          </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(filteredGeoOverview.length > 0 ? filteredGeoOverview.slice(0, 6) : []).map((region, index) => {
                const rankStyles = getRankCardStyles(index);

                return (
                <div
                  key={region.name}
                  className={`rounded-2xl border bg-gradient-to-br px-4 py-3 ${rankStyles.border} ${rankStyles.bg} ${rankStyles.glow}`}
                >
                  <div className="text-xs text-white/45">Top {index + 1}</div>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-white/90">{region.name}</span>
                    <span className={`text-sm font-semibold ${rankStyles.value}`}>{region.value}</span>
                  </div>
                </div>
              )})}
              {filteredGeoOverview.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-5 text-sm text-white/60 sm:col-span-2">
                  {copy.noGeoData}
                </div>
              )}
            </div>

            <div
              ref={stateDetailRef}
              className="daylight-state-detail mt-6 rounded-[24px] border border-fuchsia-400/15 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.14),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(34,211,238,0.10),transparent_30%),linear-gradient(180deg,rgba(2,6,23,0.52),rgba(15,23,42,0.58))] p-5 shadow-[0_0_30px_rgba(168,85,247,0.08)]"
            >
            <div className="text-xs uppercase tracking-[0.18em] text-white/40">
              {copy.stateDetail}
            </div>

            {selectedStateDetail ? (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-xl font-semibold text-white/95">{selectedStateDetail.state}</div>
                  <div className="mt-1 text-sm text-cyan-200">
                    {copy.regionalPulse}: {selectedStateDetail.total}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                      {copy.dominantSources}
                    </div>
                    <div className="mt-3 space-y-2">
                      {selectedStateDetail.sources.slice(0, 4).map((item) => (
                        <div key={item.name} className="flex items-center justify-between text-sm text-white/80">
                          <span>{sourceLabels[item.name] || item.name}</span>
                          <span>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                      {copy.dominantCategories}
                    </div>
                    <div className="mt-3 space-y-2">
                      {selectedStateDetail.categories.slice(0, 4).map((item) => (
                        <div key={item.name} className="flex items-center justify-between text-sm text-white/80">
                          <span>{item.name === "general" ? copy.generalCategory : item.name}</span>
                          <span>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/40">
                    {copy.topTrendsInState}
                  </div>
                  <div className="mt-3 space-y-3">
                    {selectedStateDetail.trends.slice(0, 4).map((trend) => (
                      <button
                        key={`${selectedStateDetail.state}-${trend.keyword}`}
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-left transition-all hover:border-cyan-400/25 hover:bg-white/[0.07]"
                        onClick={() => openTrendDetail(trend.keyword)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-white/92">{trend.keyword}</div>
                            <div className="mt-1 text-xs text-white/50">
                              {sourceLabels[trend.source] || trend.source} · {trend.category === "general" ? copy.generalCategory : trend.category}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-cyan-200">+{trend.growth}%</div>
                            <div className="mt-1 text-xs text-white/50">{trend.status}</div>
                          </div>
                        </div>
                        {trend.summary && (
                          <div className="mt-3 text-sm text-white/70">{trend.summary}</div>
                        )}
                        <div className="mt-3 text-xs font-medium text-cyan-200">
                          {copy.openTrendDetail}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-sm text-white/60">
                {copy.noStateSelected}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="rounded-[28px] border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[#22c55e] to-[#06b6d4] p-2 shadow-[0_0_16px_rgba(34,197,94,0.35)]">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-base font-semibold text-white/95">
              {copy.sentiment}
            </h3>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <RechartsPie>
              <Pie
                cx="50%"
                cy="50%"
                data={analytics.sentimentBreakdown}
                dataKey="value"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {analytics.sentimentBreakdown.map((entry, index) => (
                  <Cell
                    key={`sentiment-${entry.name}`}
                    fill={pieColors[index % pieColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  backdropFilter: "blur(20px)",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
            </RechartsPie>
          </ResponsiveContainer>

          <div className="mt-4 space-y-2">
            {analytics.sentimentBreakdown.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: pieColors[index % pieColors.length] }}
                  />
                  <span className="text-white/60">
                    {sentimentLabels[item.name] || item.name}
                  </span>
                </div>
                <span className="font-medium text-white/90">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[#f97316] to-[#ec4899] p-2 shadow-[0_0_16px_rgba(249,115,22,0.35)]">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-base font-semibold text-white/95">
              {copy.lifecycle}
            </h3>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <RechartsPie>
              <Pie
                cx="50%"
                cy="50%"
                data={analytics.lifecycleBreakdown}
                dataKey="value"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {analytics.lifecycleBreakdown.map((entry, index) => (
                  <Cell
                    key={`lifecycle-${entry.name}`}
                    fill={pieColors[index % pieColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  backdropFilter: "blur(20px)",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
            </RechartsPie>
          </ResponsiveContainer>

          <div className="mt-4 space-y-2">
            {analytics.lifecycleBreakdown.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: pieColors[index % pieColors.length] }}
                  />
                  <span className="text-white/60">
                    {lifecycleLabels[item.name] || item.name}
                  </span>
                </div>
                <span className="font-medium text-white/90">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
          <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/75">
            <span className="font-semibold text-white/90">{audienceBadge}</span>{" "}
            | {analytics.audienceMeta.provider} |{" "}
            {analytics.audienceMeta.capturedAt
              ? new Date(analytics.audienceMeta.capturedAt).toLocaleString(locale)
              : "sin fecha"}{" "}
            | {analytics.audienceMeta.note}
          </div>

          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#3b82f6] p-2 shadow-[0_0_16px_rgba(167,139,250,0.4)]">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white/95">Por Edad</h3>
              <p className="text-xs text-white/45">
                {analytics.audienceMeta.mode === "real"
                  ? "Audiencia real"
                  : "Audiencia estimada"}
              </p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <RechartsPie>
              <Pie
                cx="50%"
                cy="50%"
                data={analytics.ageBreakdown}
                dataKey="value"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {analytics.ageBreakdown.map((entry, index) => (
                  <Cell
                    key={`age-${entry.name}`}
                    fill={pieColors[index % pieColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  backdropFilter: "blur(20px)",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
            </RechartsPie>
          </ResponsiveContainer>

          <div className="mt-4 space-y-2">
            {analytics.ageBreakdown.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: pieColors[index % pieColors.length] }}
                  />
                  <span className="text-white/60">{item.name}</span>
                </div>
                <span className="font-medium text-white/90">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[#ec4899] to-[#8b5cf6] p-2 shadow-[0_0_16px_rgba(236,72,153,0.4)]">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white/95">Por Genero</h3>
              <p className="text-xs text-white/45">
                {analytics.audienceMeta.mode === "real"
                  ? "Audiencia real"
                  : "Audiencia estimada"}
              </p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <RechartsPie>
              <Pie
                cx="50%"
                cy="50%"
                data={analytics.genderBreakdown}
                dataKey="value"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {analytics.genderBreakdown.map((entry, index) => (
                  <Cell
                    key={`gender-${entry.name}`}
                    fill={pieColors[index % pieColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  backdropFilter: "blur(20px)",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
            </RechartsPie>
          </ResponsiveContainer>

          <div className="mt-4 space-y-2">
            {analytics.genderBreakdown.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: pieColors[index % pieColors.length] }}
                  />
                  <span className="text-white/60">{item.name}</span>
                </div>
                <span className="font-medium text-white/90">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#3b82f6] p-2 shadow-[0_0_16px_rgba(167,139,250,0.4)]">
              <PieChart className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-base font-semibold text-white/95">
              Estado de Tendencias
            </h3>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <RechartsPie>
              <Pie
                cx="50%"
                cy="50%"
                data={analytics.stateBreakdown}
                dataKey="value"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {analytics.stateBreakdown.map((entry, index) => (
                  <Cell
                    key={`state-${entry.name}`}
                    fill={pieColors[index % pieColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  backdropFilter: "blur(20px)",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
            </RechartsPie>
          </ResponsiveContainer>

          <div className="mt-4 space-y-2">
            {analytics.stateBreakdown.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: pieColors[index % pieColors.length] }}
                  />
                  <span className="text-white/60">{item.name}</span>
                </div>
                <span className="font-medium text-white/90">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[#ec4899] to-[#8b5cf6] p-2 shadow-[0_0_16px_rgba(236,72,153,0.4)]">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-base font-semibold text-white/95">
              Distribucion por Fuente
            </h3>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <RechartsPie>
              <Pie
                cx="50%"
                cy="50%"
                data={sourceChart}
                dataKey="value"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {sourceChart.map((entry, index) => (
                  <Cell
                    key={`source-${entry.name}`}
                    fill={pieColors[index % pieColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCompactNumber(value)}
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  backdropFilter: "blur(20px)",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
            </RechartsPie>
          </ResponsiveContainer>

          <div className="mt-4 space-y-2">
            {sourceChart.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: pieColors[index % pieColors.length] }}
                  />
                  <span className="text-white/60">{item.name}</span>
                </div>
                <span className="font-medium text-white/90">
                  {formatCompactNumber(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-[#f97316] to-[#ef4444] p-2 shadow-[0_0_16px_rgba(249,115,22,0.4)]">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-base font-semibold text-white/95">
              Plataformas
            </h3>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={platformChart}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis
                dataKey="platform"
                tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }}
              />
              <Radar
                dataKey="engagement"
                fill="#a78bfa"
                fillOpacity={0.3}
                name="Engagement"
                stroke="#a78bfa"
              />
              <Radar
                dataKey="reach"
                fill="#06b6d4"
                fillOpacity={0.3}
                name="Alcance"
                stroke="#06b6d4"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  backdropFilter: "blur(20px)",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
            </RadarChart>
          </ResponsiveContainer>

          <div className="mt-4 flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#a78bfa]" />
              <span className="text-xs text-white/60">Engagement</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#06b6d4]" />
              <span className="text-xs text-white/60">Alcance</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#3b82f6] p-2.5 shadow-[0_0_20px_rgba(147,51,234,0.4)]">
            <PieChart className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-white/95">
            Rendimiento por Plataforma
          </h2>
        </div>

        <div className="space-y-4">
          {platformChart.map((platform) => (
            <div
              key={platform.platform}
              className="rounded-[20px] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-5 backdrop-blur-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-base font-semibold text-white/95">
                  {platform.platform}
                </span>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-white/50">Engagement</div>
                    <div className="text-sm font-semibold text-white/90">
                      {platform.engagement}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-white/50">Alcance</div>
                    <div className="text-sm font-semibold text-white/90">
                      {platform.reach}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-white/50">Crecimiento</div>
                    <div className="text-sm font-semibold text-[#4ade80]">
                      +{platform.growth}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-3 grid grid-cols-3 gap-2">
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#a78bfa] to-[#3b82f6]"
                    style={{ width: `${platform.engagement}%` }}
                  />
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#06b6d4] to-[#84cc16]"
                    style={{ width: `${platform.reach}%` }}
                  />
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#f97316] to-[#ef4444]"
                    style={{ width: `${platform.growth}%` }}
                  />
                </div>
              </div>

              <div className="text-xs text-white/45">
                {formatCompactNumber(platform.mentions)} menciones acumuladas
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[28px] border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.06] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-white/35">
              {copy.actions}
            </div>
            <div className="mt-3 space-y-2">
              {analytics.featuredActions.slice(0, 3).map((action) => (
                <div
                  key={action}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/80"
                >
                  {action}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-white/35">
              {copy.geoFocus}
            </div>
            <div className="mt-3 space-y-2">
              {analytics.geoOverview.length > 0 ? (
                analytics.geoOverview.map((region) => (
                  <div
                    key={region.name}
                    className="flex items-center justify-between text-sm text-white/80"
                  >
                    <span>{region.name}</span>
                    <span>{region.value}</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-white/55">Sin foco regional dominante.</div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-[#06b6d4] to-[#84cc16] p-2.5 shadow-[0_0_20px_rgba(6,182,212,0.4)]">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-white/95">
            Tendencias Mas Fuertes
          </h2>
        </div>

        <div className="space-y-4">
          {analytics.topTrends.map((trend) => (
            <div
              key={trend.keyword}
              className="rounded-[20px] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-5 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-base font-semibold text-white/95">
                    {trend.keyword}
                  </div>
                  <div className="mt-1 text-xs text-white/50">
                    {sourceLabels[trend.source] || trend.source}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-xs text-white/50">Score</div>
                    <div className="text-sm font-semibold text-white/90">
                      {formatCompactNumber(trend.score)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-white/50">Crecimiento</div>
                    <div className="text-sm font-semibold text-[#4ade80]">
                      +{trend.growth}%
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-white/50">Estado</div>
                    <div className="text-sm font-semibold text-[#facc15]">
                      {trend.status}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-white/50">{copy.sentiment}</div>
                    <div className="text-sm font-semibold text-white/90">
                      {sentimentLabels[trend.sentiment] || trend.sentiment}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-sm text-white/65">{trend.summary}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(trend.seoKeywords || []).slice(0, 4).map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs text-white/70"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

