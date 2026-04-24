import googleTrends from "google-trends-api";
import axios from "axios";
import pool from "../db.js";
import { isDatabaseAvailable } from "../db.js";
import {
  getDemoAudienceDemographics,
  setDemoAudienceDemographics,
} from "../demo-store.js";
import {
  API_BASE_URL,
  NEWS_API_KEY,
  OPENROUTER_API_KEY,
  OPENROUTER_MODEL,
  YOUTUBE_API_KEY,
} from "../config.js";
import { getCachedValue } from "../cache.js";
import {
  buildAnalyticsDataOrigin,
  buildDashboardDataOrigin,
  buildTrendDataOrigin,
} from "./data-origin.js";
import {
  clamp,
  ensureEnum,
  normalizeAudienceBreakdown,
  normalizeText,
} from "../utils/validation.js";

const PROVIDER_TIMEOUT_MS = 8000;

export function normalizeKeyword(text = "") {
  return text.replace(/\s+/g, " ").trim();
}

function parseJsonField(value, fallback = []) {
  if (!value) {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function withTimeout(promise, label, timeoutMs = PROVIDER_TIMEOUT_MS) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function convertMentions(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  if (typeof value === "string") {
    const clean = value.replace(/[+,]/g, "").trim().toUpperCase();
    if (!clean) {
      return 0;
    }
    if (clean.endsWith("K")) {
      return Math.round(Number.parseFloat(clean) * 1000);
    }
    if (clean.endsWith("M")) {
      return Math.round(Number.parseFloat(clean) * 1000000);
    }

    const parsed = Number.parseInt(clean, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function inferTags(keyword, source) {
  const text = normalizeKeyword(keyword).toLowerCase();
  const categoryMap = {
    musica: ["song", "music", "official video", "album", "performance", "letra"],
    cine: ["trailer", "teaser", "movie", "film", "serie", "cinematic"],
    tecnologia: ["openai", "chatgpt", "tesla", "startup", "tech", "iphone"],
    noticias: ["news", "regulation", "debate", "trial", "headline", "global"],
    deportes: ["match", "football", "soccer", "nba", "nfl", "league", "sports"],
    gaming: ["game", "gaming", "xbox", "playstation", "nintendo"],
    entretenimiento: ["viral", "show", "celebrity", "trailer"],
  };

  const sourceDefaults = {
    youtube: ["video", "entretenimiento"],
    reddit: ["comunidad", "social"],
    google: ["busqueda"],
    news: ["noticias", "actualidad"],
    hackernews: ["tecnologia", "desarrollo"],
  };

  const matches = Object.entries(categoryMap)
    .filter(([, keywords]) => keywords.some((keywordPart) => text.includes(keywordPart)))
    .map(([category]) => category);

  return [...new Set([...(sourceDefaults[source] || []), ...matches])];
}

function createTrend({ palabra, menciones, source, url = null, embedUrl = null }) {
  return {
    palabra: normalizeKeyword(palabra),
    menciones: convertMentions(menciones),
    source,
    url,
    embedUrl,
    tags: inferTags(palabra, source),
  };
}

function combineTrends(collections) {
  return collections
    .flat()
    .filter((item) => item?.palabra && Number.isFinite(item?.menciones))
    .sort((a, b) => b.menciones - a.menciones)
    .slice(0, 20);
}

function buildSparkline(menciones, crecimiento) {
  const growthMultiplier = 1 + crecimiento / 100;
  const base = Math.max(1, Math.round(menciones / growthMultiplier));
  return [0.45, 0.62, 0.78, 0.91, 1].map((factor) =>
    Math.max(1, Math.round(base * factor)),
  );
}

function calculateGrowth({ menciones, source }, context) {
  const maxMentions = Math.max(context.maxMentions, 1);
  const minMentions = Math.min(context.minMentions, maxMentions);
  const range = Math.max(maxMentions - minMentions, 1);
  const relativePosition = (menciones - minMentions) / range;
  const sourceBoost = {
    google: 28,
    youtube: 24,
    reddit: 18,
    news: 14,
    hackernews: 10,
  };

  return clamp(
    Math.round(55 + relativePosition * 110 + (sourceBoost[source] || 12)),
    45,
    210,
  );
}

function calculateTrendScore(menciones, crecimiento) {
  const normalizedMentions = Math.min(menciones, 250000);
  return Math.round(normalizedMentions * 0.6 + crecimiento * 100 * 0.4);
}

function calculateState(score) {
  if (score >= 155000) {
    return "Viral";
  }
  if (score >= 85000) {
    return "En crecimiento";
  }
  return "Emergente";
}

function createTrendKey(palabra, source) {
  return `${String(source || "").toLowerCase()}:${normalizeKeyword(palabra).toLowerCase()}`;
}

function normalizeFormat(format) {
  return ensureEnum(
    format,
    ["short_video", "thread", "meme", "news_post", "carousel"],
    "short_video",
  );
}

function normalizeSentiment(value) {
  return ensureEnum(value, ["positive", "negative", "mixed"], "mixed");
}

function normalizeRisk(value) {
  return ensureEnum(value, ["low", "medium", "high"], "low");
}

function normalizeLifecycle(value) {
  return ensureEnum(value, ["Emerging", "Peak", "Fading"], "Emerging");
}

function parseFirstJsonObject(text) {
  const content = String(text || "").trim();
  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  try {
    return JSON.parse(content.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

async function getTrendHistoryPoints(palabra, source, limit = 8) {
  if (!isDatabaseAvailable()) {
    return [];
  }
  const [rows] = await pool.query(
    `
      SELECT ti.menciones, ti.crecimiento, ts.captured_at
      FROM trend_items ti
      JOIN trend_snapshots ts ON ts.id = ti.snapshot_id
      WHERE ti.palabra = ? AND ti.source = ?
      ORDER BY ts.captured_at DESC
      LIMIT ?
    `,
    [palabra, source, limit],
  );

  return rows.map((row) => ({
    mentions: Number(row.menciones || 0),
    growth: Number(row.crecimiento || 0),
    capturedAt: new Date(row.captured_at).toISOString(),
  }));
}

async function getRecentSnapshots(limit = 8) {
  if (!isDatabaseAvailable()) {
    return [];
  }
  const [rows] = await pool.query(
    `
      SELECT id, captured_at, source_count, total_mentions
      FROM trend_snapshots
      ORDER BY captured_at DESC
      LIMIT ?
    `,
    [limit],
  );

  return rows.map((row) => ({
    id: Number(row.id),
    capturedAt: new Date(row.captured_at).toISOString(),
    sourceCount: Number(row.source_count || 0),
    totalMentions: Number(row.total_mentions || 0),
  }));
}

async function getHistoricalAggregateSeries(limit = 6) {
  const snapshots = await getRecentSnapshots(limit);
  if (snapshots.length === 0) {
    return [];
  }

  return snapshots
    .slice()
    .reverse()
    .map((snapshot, index, array) => {
      const previous = array[index - 1]?.totalMentions || snapshot.totalMentions || 0;
      return {
        period: new Date(snapshot.capturedAt).toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        mentions: snapshot.totalMentions,
        engagement: Math.round(snapshot.totalMentions * 0.44),
        sourceCount: snapshot.sourceCount,
        capturedAt: snapshot.capturedAt,
        changeRatio: previous > 0 ? snapshot.totalMentions / previous : 1,
      };
    });
}

async function getTemporalComparison(currentTrends) {
  const recentSnapshots = await getRecentSnapshots(12);
  const latestSnapshot = recentSnapshots[0] || null;
  const previousSnapshot = recentSnapshots[1] || null;

  const currentMentions = currentTrends.reduce(
    (total, trend) => total + Number(trend.menciones || 0),
    0,
  );
  const currentAverageGrowth =
    currentTrends.length > 0
      ? Math.round(
          currentTrends.reduce((total, trend) => total + Number(trend.crecimiento || 0), 0) /
            currentTrends.length,
        )
      : 0;

  const previousMentions = previousSnapshot?.totalMentions || 0;
  const mentionDelta = currentMentions - previousMentions;
  const previousSnapshotId = previousSnapshot?.id || latestSnapshot?.id || null;
  let previousTrendRows = [];

  if (previousSnapshotId) {
    if (isDatabaseAvailable()) {
      const [rows] = await pool.query(
        `
          SELECT palabra, source, menciones
          FROM trend_items
          WHERE snapshot_id = ?
        `,
        [previousSnapshotId],
      );
      previousTrendRows = rows;
    }
  }

  const previousTrendMap = new Map(
    previousTrendRows.map((row) => [
      createTrendKey(row.palabra, row.source),
      Number(row.menciones || 0),
    ]),
  );

  const trendDiffs = currentTrends
    .map((trend) => {
      const previousValue = previousTrendMap.get(createTrendKey(trend.palabra, trend.source)) || 0;
      const change = Number(trend.menciones || 0) - previousValue;
      return {
        keyword: trend.palabra,
        source: trend.source,
        currentMentions: Number(trend.menciones || 0),
        previousMentions: previousValue,
        change,
        changePercent: previousValue > 0 ? Math.round((change / previousValue) * 100) : 0,
      };
    })
    .sort((a, b) => b.change - a.change);

  return {
    currentSnapshotAt: new Date().toISOString(),
    previousSnapshotAt: previousSnapshot?.capturedAt || latestSnapshot?.capturedAt || null,
    currentMentions,
    previousMentions,
    mentionDelta,
    mentionDeltaPercent:
      previousMentions > 0 ? Math.round((mentionDelta / previousMentions) * 100) : 0,
    currentActiveTrends: currentTrends.length,
    previousActiveTrends: previousTrendRows.length,
    currentAverageGrowth,
    previousAverageGrowth: previousSnapshot ? Math.max(0, currentAverageGrowth - 12) : currentAverageGrowth,
    rising: trendDiffs.filter((item) => item.change > 0).slice(0, 3),
    falling: trendDiffs.filter((item) => item.change < 0).sort((a, b) => a.change - b.change).slice(0, 3),
    newEntries: trendDiffs.filter((item) => item.previousMentions === 0).slice(0, 3),
  };
}

function inferLifecycle(history, currentTrend) {
  if (!history || history.length < 2) {
    return currentTrend.crecimiento >= 120 ? "Peak" : "Emerging";
  }

  const latest = history[0]?.mentions || currentTrend.menciones || 0;
  const previous = history[1]?.mentions || latest;
  const delta = latest - previous;
  const ratio = previous > 0 ? latest / previous : 1;

  if (ratio >= 1.18 || currentTrend.crecimiento >= 135) {
    return "Emerging";
  }
  if (ratio <= 0.92 || delta < 0 || currentTrend.crecimiento < 70) {
    return "Fading";
  }
  return "Peak";
}

function buildGeoOverview(trends, limit = 12) {
  const totals = new Map();
  for (const trend of trends) {
    for (const region of trend.geoRegions || []) {
      const name = normalizeText(region.name, 80);
      const value = Number(region.value || 0);
      if (!name || value <= 0) {
        continue;
      }
      totals.set(name, (totals.get(name) || 0) + value);
    }
  }

  return Array.from(totals.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function buildGeoTrendDetails(trends, limit = 20) {
  const regions = new Map();

  for (const trend of trends) {
    const category = trend.tags?.[0] || "general";
    for (const region of trend.geoRegions || []) {
      const state = normalizeText(region.name, 80);
      const value = Number(region.value || 0);
      if (!state || value <= 0) {
        continue;
      }

      if (!regions.has(state)) {
        regions.set(state, {
          state,
          total: 0,
          sources: new Map(),
          categories: new Map(),
          trends: [],
        });
      }

      const bucket = regions.get(state);
      bucket.total += value;
      bucket.sources.set(trend.source, (bucket.sources.get(trend.source) || 0) + value);
      bucket.categories.set(category, (bucket.categories.get(category) || 0) + value);
      bucket.trends.push({
        keyword: trend.palabra,
        source: trend.source,
        category,
        growth: trend.crecimiento,
        score: trend.score,
        status: trend.estado,
        summary: trend.summary || "",
        impact: value,
      });
    }
  }

  return Array.from(regions.values())
    .map((region) => ({
      state: region.state,
      total: region.total,
      sources: Array.from(region.sources.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      categories: Array.from(region.categories.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      trends: region.trends
        .sort((a, b) => (b.impact !== a.impact ? b.impact - a.impact : b.score - a.score))
        .slice(0, 5)
        .map(({ impact: _impact, ...trend }) => trend),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

function buildCrisisAlerts(trends) {
  return trends
    .filter((trend) => {
      const mentions = Number(trend.menciones || 0);
      const growth = Number(trend.crecimiento || 0);
      return (
        (trend.riskLevel === "high" && mentions >= 80000) ||
        (trend.sentiment === "negative" && growth >= 95) ||
        (trend.riskLevel === "medium" && trend.sentiment === "mixed" && mentions >= 120000)
      );
    })
    .sort((a, b) => (b.menciones || 0) - (a.menciones || 0))
    .slice(0, 4)
    .map((trend) => ({
      severity: trend.riskLevel === "high" ? "high" : trend.riskLevel === "medium" ? "medium" : "low",
      title:
        trend.riskLevel === "high"
          ? `Riesgo alto en ${trend.palabra}`
          : `Conversacion sensible: ${trend.palabra}`,
      description:
        trend.sentiment === "negative"
          ? `${trend.palabra} combina tono negativo con alto volumen. Conviene revisar contexto antes de publicar.`
          : `${trend.palabra} muestra conversacion polarizada y merece validacion adicional.`,
      affectedTrend: trend.palabra,
      source: trend.source,
      recommendation:
        trend.riskLevel === "high"
          ? "Revisa contexto y evita tono promocional sin validacion previa."
          : "Usa seguimiento prudente antes de escalar contenido.",
    }));
}

function buildHeuristicEnrichment(trend, lifecycle, geoRegions) {
  const text = `${trend.palabra} ${(trend.tags || []).join(" ")}`.toLowerCase();
  const positiveKeywords = ["official", "performance", "trailer", "launch", "release", "award"];
  const negativeKeywords = ["trial", "liable", "crisis", "debate", "controversy", "problem"];
  const mixedKeywords = ["rumor", "leak", "versus", "vs", "debate"];
  let sentiment = "mixed";
  let tone = "expectante";
  let riskLevel = "low";

  if (negativeKeywords.some((word) => text.includes(word))) {
    sentiment = "negative";
    tone = "tenso";
    riskLevel = "high";
  } else if (positiveKeywords.some((word) => text.includes(word))) {
    sentiment = "positive";
    tone = "entusiasta";
  } else if (mixedKeywords.some((word) => text.includes(word))) {
    tone = "polarizado";
    riskLevel = "medium";
  }

  const sourceFormatMap = {
    youtube: "short_video",
    reddit: "thread",
    news: "news_post",
    google: "carousel",
    hackernews: "thread",
  };

  return {
    sentiment,
    tone,
    riskLevel,
    lifecycle,
    confidenceScore: 62,
    contextLabels: (trend.tags || []).slice(0, 4),
    actionIdeas: [
      `Explica por que ${trend.palabra} esta captando atencion ahora mismo.`,
      `Propone una reaccion breve conectada con ${trend.palabra}.`,
      "Monitorea su crecimiento durante las proximas horas antes de escalar contenido.",
    ],
    seoKeywords: [trend.palabra, ...((trend.tags || []).slice(0, 4))].slice(0, 5),
    geoRegions,
    recommendedFormat: sourceFormatMap[trend.source] || "short_video",
    summary:
      `${trend.palabra} muestra un tono ${tone} y una fase ${lifecycle.toLowerCase()}. ` +
      `Conviene responder con contexto y seguimiento cercano.`,
    provider: "heuristic-engine",
  };
}

function buildRegionalFallback(trend) {
  const baseBySource = {
    youtube: [
      { name: "Ciudad de Mexico", value: 100 },
      { name: "Estado de Mexico", value: 92 },
      { name: "Jalisco", value: 84 },
      { name: "Nuevo Leon", value: 80 },
      { name: "Puebla", value: 73 },
      { name: "Veracruz", value: 68 },
    ],
    reddit: [
      { name: "Ciudad de Mexico", value: 100 },
      { name: "Nuevo Leon", value: 90 },
      { name: "Jalisco", value: 82 },
      { name: "Queretaro", value: 71 },
      { name: "Estado de Mexico", value: 67 },
      { name: "Baja California", value: 64 },
    ],
    news: [
      { name: "Ciudad de Mexico", value: 100 },
      { name: "Estado de Mexico", value: 88 },
      { name: "Jalisco", value: 74 },
      { name: "Nuevo Leon", value: 72 },
      { name: "Puebla", value: 66 },
      { name: "Guanajuato", value: 60 },
    ],
    google: [
      { name: "Ciudad de Mexico", value: 100 },
      { name: "Jalisco", value: 91 },
      { name: "Nuevo Leon", value: 89 },
      { name: "Estado de Mexico", value: 87 },
      { name: "Puebla", value: 76 },
      { name: "Veracruz", value: 71 },
    ],
    hackernews: [
      { name: "Ciudad de Mexico", value: 100 },
      { name: "Nuevo Leon", value: 95 },
      { name: "Jalisco", value: 88 },
      { name: "Queretaro", value: 81 },
      { name: "Baja California", value: 73 },
      { name: "Chihuahua", value: 67 },
    ],
  };

  return (baseBySource[trend.source] || baseBySource.youtube).slice(0, 6);
}

async function fetchGeoRegions(trend) {
  try {
    const response = await withTimeout(
      googleTrends.interestByRegion({
        keyword: normalizeKeyword(trend?.palabra || ""),
        geo: "MX",
        resolution: "REGION",
      }),
      "Google Trends region",
      5000,
    );
    const data = JSON.parse(response);
    const geoData = data?.default?.geoMapData || [];
    const liveRegions = geoData
      .map((item) => ({
        name: item.geoName,
        value: Number.parseInt(item.value?.[0] || "0", 10) || 0,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return liveRegions.length >= 3 ? liveRegions : buildRegionalFallback(trend);
  } catch {
    return buildRegionalFallback(trend);
  }
}

async function generateAiEnrichment(trend, lifecycle, geoRegions) {
  if (!OPENROUTER_API_KEY) {
    return buildHeuristicEnrichment(trend, lifecycle, geoRegions);
  }

  try {
    const prompt = `Analiza esta tendencia y responde SOLO con JSON valido. Tendencia: ${JSON.stringify({
      palabra: trend.palabra,
      source: trend.source,
      mentions: trend.menciones,
      growth: trend.crecimiento,
      score: trend.score,
      status: trend.estado,
      tags: trend.tags || [],
      lifecycle,
      geoRegions,
    })}`;

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: OPENROUTER_MODEL,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: "Responde SOLO JSON valido sin markdown. Incluye sentiment, tone, riskLevel, confidenceScore, contextLabels, actionIdeas, seoKeywords, recommendedFormat y summary.",
          },
          { role: "user", content: prompt },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:5173",
          "X-Title": "TrendFlow Enrichment",
        },
        timeout: PROVIDER_TIMEOUT_MS,
      },
    );

    const content = response.data?.choices?.[0]?.message?.content || "";
    const parsed = parseFirstJsonObject(content);
    if (!parsed) {
      return buildHeuristicEnrichment(trend, lifecycle, geoRegions);
    }

    const heuristic = buildHeuristicEnrichment(trend, lifecycle, geoRegions);
    return {
      sentiment: normalizeSentiment(parsed.sentiment),
      tone: normalizeText(parsed.tone || heuristic.tone, 60),
      riskLevel: normalizeRisk(parsed.riskLevel),
      lifecycle,
      confidenceScore: clamp(Number.parseInt(String(parsed.confidenceScore || 60), 10) || 60, 0, 100),
      contextLabels: Array.isArray(parsed.contextLabels)
        ? parsed.contextLabels.map((item) => normalizeText(item, 40)).filter(Boolean).slice(0, 4)
        : heuristic.contextLabels,
      actionIdeas: Array.isArray(parsed.actionIdeas)
        ? parsed.actionIdeas.map((item) => normalizeText(item, 160)).filter(Boolean).slice(0, 3)
        : heuristic.actionIdeas,
      seoKeywords: Array.isArray(parsed.seoKeywords)
        ? parsed.seoKeywords.map((item) => normalizeText(item, 60)).filter(Boolean).slice(0, 5)
        : heuristic.seoKeywords,
      geoRegions,
      recommendedFormat: normalizeFormat(String(parsed.recommendedFormat || "")),
      summary: normalizeText(parsed.summary || heuristic.summary, 180),
      provider: "openrouter-ai",
    };
  } catch {
    return buildHeuristicEnrichment(trend, lifecycle, geoRegions);
  }
}

async function getTrendEnrichment(trend) {
  if (!isDatabaseAvailable()) {
    const history = await getTrendHistoryPoints(trend.palabra, trend.source, 8);
    const lifecycle = inferLifecycle(history, trend);
    const geoRegions = await fetchGeoRegions(trend);
    return generateAiEnrichment(trend, lifecycle, geoRegions);
  }

  const trendKey = createTrendKey(trend.palabra, trend.source);
  const [cachedRows] = await pool.query(
    `
      SELECT *
      FROM trend_enrichments
      WHERE trend_key = ?
      LIMIT 1
    `,
    [trendKey],
  );

  const cached = cachedRows[0];
  if (cached) {
    const ageHours = (Date.now() - new Date(cached.updated_at).getTime()) / 3600000;
    const cachedGeoRegions = parseJsonField(cached.geo_regions_json, []);
    if (ageHours < 6 && cachedGeoRegions.length >= 3) {
      return {
        sentiment: cached.sentiment,
        tone: cached.tone,
        riskLevel: cached.risk_level,
        lifecycle: cached.lifecycle,
        confidenceScore: Number(cached.confidence_score || 50),
        contextLabels: parseJsonField(cached.context_labels_json, []),
        actionIdeas: parseJsonField(cached.action_ideas_json, []),
        seoKeywords: parseJsonField(cached.seo_keywords_json, []),
        geoRegions: cachedGeoRegions,
        recommendedFormat: cached.recommended_format,
        summary: cached.summary,
        provider: cached.provider,
      };
    }
  }

  const history = await getTrendHistoryPoints(trend.palabra, trend.source, 8);
  const lifecycle = inferLifecycle(history, trend);
  const geoRegions = await fetchGeoRegions(trend);
  const enrichment = await generateAiEnrichment(trend, lifecycle, geoRegions);

  await pool.query(
    `
      INSERT INTO trend_enrichments
        (trend_key, palabra, source, sentiment, tone, risk_level, lifecycle, confidence_score, context_labels_json, action_ideas_json, seo_keywords_json, geo_regions_json, recommended_format, summary, provider, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        sentiment = VALUES(sentiment),
        tone = VALUES(tone),
        risk_level = VALUES(risk_level),
        lifecycle = VALUES(lifecycle),
        confidence_score = VALUES(confidence_score),
        context_labels_json = VALUES(context_labels_json),
        action_ideas_json = VALUES(action_ideas_json),
        seo_keywords_json = VALUES(seo_keywords_json),
        geo_regions_json = VALUES(geo_regions_json),
        recommended_format = VALUES(recommended_format),
        summary = VALUES(summary),
        provider = VALUES(provider),
        updated_at = CURRENT_TIMESTAMP
    `,
    [
      trendKey,
      trend.palabra,
      trend.source,
      enrichment.sentiment,
      enrichment.tone,
      enrichment.riskLevel,
      enrichment.lifecycle,
      enrichment.confidenceScore,
      JSON.stringify(enrichment.contextLabels || []),
      JSON.stringify(enrichment.actionIdeas || []),
      JSON.stringify(enrichment.seoKeywords || []),
      JSON.stringify(enrichment.geoRegions || []),
      enrichment.recommendedFormat,
      enrichment.summary,
      enrichment.provider,
    ],
  );

  return enrichment;
}

async function getAudienceDemographics(primarySource, estimatedAge, estimatedGender) {
  if (!isDatabaseAvailable()) {
    const demoData = getDemoAudienceDemographics();
    if (!demoData) {
      return {
        ageBreakdown: estimatedAge,
        genderBreakdown: estimatedGender,
        audienceMeta: {
          mode: "estimated",
          provider: "estimated-model",
          source: primarySource,
          note: "Modo demo activo: audiencia estimada por fuente.",
          capturedAt: null,
        },
      };
    }

    return {
      ageBreakdown: demoData.ageBreakdown || estimatedAge,
      genderBreakdown: demoData.genderBreakdown || estimatedGender,
      audienceMeta: demoData.audienceMeta || {
        mode: "estimated",
        provider: "demo-store",
        source: primarySource,
        note: "Modo demo activo.",
        capturedAt: null,
      },
    };
  }

  const [rows] = await pool.query(
    `
      SELECT source, age_json, gender_json, is_real, provider, note, captured_at
      FROM audience_demographics
      WHERE source IN (?, 'global')
      ORDER BY CASE WHEN source = ? THEN 0 ELSE 1 END, captured_at DESC
      LIMIT 1
    `,
    [primarySource, primarySource],
  );

  const row = rows[0];
  if (!row) {
    return {
      ageBreakdown: estimatedAge,
      genderBreakdown: estimatedGender,
      audienceMeta: {
        mode: "estimated",
        provider: "estimated-model",
        source: primarySource,
        note: "Sin dataset demografico real; se usa estimacion por fuente.",
        capturedAt: null,
      },
    };
  }

  return {
    ageBreakdown: parseJsonField(row.age_json, estimatedAge),
    genderBreakdown: parseJsonField(row.gender_json, estimatedGender),
    audienceMeta: {
      mode: Boolean(row.is_real) ? "real" : "estimated",
      provider: row.provider || "estimated-model",
      source: row.source || primarySource,
      note:
        row.note ||
        (Boolean(row.is_real)
          ? "Datos demograficos reales desde proveedor integrado."
          : "Datos demograficos estimados por modelo."),
      capturedAt: row.captured_at ? new Date(row.captured_at).toISOString() : null,
    },
  };
}

async function saveHistorySnapshot(trends) {
  if (!isDatabaseAvailable()) {
    return;
  }
  if (!Array.isArray(trends) || trends.length === 0) {
    return;
  }

  const [latestRows] = await pool.query(
    "SELECT id, captured_at FROM trend_snapshots ORDER BY captured_at DESC LIMIT 1",
  );
  const latest = latestRows[0];
  if (latest) {
    const diffMinutes = (Date.now() - new Date(latest.captured_at).getTime()) / 60000;
    if (diffMinutes < 20) {
      return;
    }
  }

  const sourceCount = new Set(trends.map((trend) => trend.source)).size;
  const totalMentions = trends.reduce((total, trend) => total + trend.menciones, 0);
  const [snapshotResult] = await pool.query(
    "INSERT INTO trend_snapshots (source_count, total_mentions) VALUES (?, ?)",
    [sourceCount, totalMentions],
  );
  const snapshotId = snapshotResult.insertId;

  for (const trend of trends.slice(0, 20)) {
    await pool.query(
      `
        INSERT INTO trend_items
          (snapshot_id, palabra, menciones, source, crecimiento, score, estado, url, embed_url, tags_json, sparkline_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        snapshotId,
        trend.palabra,
        trend.menciones,
        trend.source,
        trend.crecimiento,
        trend.score,
        trend.estado,
        trend.url || null,
        trend.embedUrl || null,
        JSON.stringify(trend.tags || []),
        JSON.stringify(trend.sparkline || []),
      ],
    );
  }
}

export async function getGoogleTrendsList() {
  try {
    const results = await withTimeout(
      googleTrends.dailyTrends({ geo: "MX" }),
      "Google Trends",
    );
    const data = JSON.parse(results);
    return data.default.trendingSearchesDays[0].trendingSearches.slice(0, 10).map((trend) =>
      createTrend({
        palabra: trend.title.query,
        menciones: trend.formattedTraffic,
        source: "google",
        url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(trend.title.query)}`,
      }),
    );
  } catch {
    return [
      createTrend({ palabra: "ChatGPT", menciones: 30000, source: "google" }),
      createTrend({ palabra: "iPhone 17", menciones: 25000, source: "google" }),
      createTrend({ palabra: "Tesla AI", menciones: 20000, source: "google" }),
    ];
  }
}

export async function getRedditTrendsList() {
  try {
    const response = await axios.get("https://www.reddit.com/r/popular.json", {
      headers: { "User-Agent": "TrendFlowUniversityProject/1.0" },
      timeout: PROVIDER_TIMEOUT_MS,
    });
    return response.data.data.children.slice(0, 10).map((post) =>
      createTrend({
        palabra: post.data.title,
        menciones: post.data.ups + post.data.num_comments * 8,
        source: "reddit",
        url: `https://www.reddit.com${post.data.permalink}`,
      }),
    );
  } catch {
    return [
      createTrend({ palabra: "Reddit IA Debate", menciones: 12000, source: "reddit", url: "https://www.reddit.com/r/artificial" }),
      createTrend({ palabra: "Nueva tecnologia VR", menciones: 9800, source: "reddit", url: "https://www.reddit.com/r/technology" }),
    ];
  }
}

export async function getHackerNewsTrendsList() {
  try {
    const response = await axios.get("https://hacker-news.firebaseio.com/v0/topstories.json", {
      timeout: PROVIDER_TIMEOUT_MS,
    });
    const ids = response.data.slice(0, 10);
    const stories = await Promise.all(
      ids.map((id) =>
        axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
          timeout: PROVIDER_TIMEOUT_MS,
        }),
      ),
    );
    return stories.map((story) =>
      createTrend({
        palabra: story.data.title,
        menciones: (story.data.score || 0) + (story.data.descendants || 0) * 6,
        source: "hackernews",
        url: story.data.url || `https://news.ycombinator.com/item?id=${story.data.id}`,
      }),
    );
  } catch {
    return [
      createTrend({ palabra: "Nueva IA revoluciona programacion", menciones: 9000, source: "hackernews", url: "https://news.ycombinator.com/" }),
      createTrend({ palabra: "Startup levanta funding", menciones: 7200, source: "hackernews", url: "https://news.ycombinator.com/" }),
    ];
  }
}

export async function getNewsTrendsList() {
  try {
    if (!NEWS_API_KEY) {
      throw new Error("Missing NEWS_API_KEY");
    }

    const response = await axios.get(
      `https://newsapi.org/v2/top-headlines?country=us&pageSize=10&apiKey=${NEWS_API_KEY}`,
      { timeout: PROVIDER_TIMEOUT_MS },
    );
    return response.data.articles.map((article, index) =>
      createTrend({
        palabra: article.title,
        menciones: 32000 - index * 1800,
        source: "news",
        url: article.url,
      }),
    );
  } catch {
    return [
      createTrend({ palabra: "Global AI regulation debate", menciones: 12000, source: "news", url: "https://news.google.com/" }),
      createTrend({ palabra: "Tech companies invest billions in AI", menciones: 15000, source: "news", url: "https://news.google.com/" }),
    ];
  }
}

export async function getYoutubeTrendsList() {
  try {
    if (!YOUTUBE_API_KEY) {
      throw new Error("Missing YOUTUBE_API_KEY");
    }

    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=US&maxResults=10&key=${YOUTUBE_API_KEY}`,
      { timeout: PROVIDER_TIMEOUT_MS },
    );
    return response.data.items.map((video) =>
      createTrend({
        palabra: video.snippet.title,
        menciones:
          Number.parseInt(video.statistics?.viewCount || "0", 10) +
          Number.parseInt(video.statistics?.likeCount || "0", 10) * 4,
        source: "youtube",
        url: `https://www.youtube.com/watch?v=${video.id}`,
        embedUrl: `https://www.youtube.com/embed/${video.id}`,
      }),
    );
  } catch {
    return [
      createTrend({ palabra: "Nuevo trailer de pelicula viral", menciones: 30000, source: "youtube", url: "https://www.youtube.com/" }),
      createTrend({ palabra: "Video viral de tecnologia", menciones: 25000, source: "youtube", url: "https://www.youtube.com/" }),
    ];
  }
}

export async function getAllTrends() {
  const [google, reddit, hackernews, news, youtube] = await Promise.all([
    getGoogleTrendsList(),
    getRedditTrendsList(),
    getHackerNewsTrendsList(),
    getNewsTrendsList(),
    getYoutubeTrendsList(),
  ]);
  return combineTrends([google, reddit, hackernews, news, youtube]);
}

export async function getViralTrends() {
  return getCachedValue("viral-trends", 90000, async () => {
    const trends = await getAllTrends();
    const context = {
      maxMentions: Math.max(...trends.map((item) => item.menciones), 1),
      minMentions: Math.min(...trends.map((item) => item.menciones), 0),
    };

    const baseAnalysis = trends
      .map((trend) => {
        const crecimiento = calculateGrowth(trend, context);
        const score = calculateTrendScore(trend.menciones, crecimiento);
        return {
          ...trend,
          crecimiento,
          score,
          estado: calculateState(score),
          sparkline: buildSparkline(trend.menciones, crecimiento),
        };
      })
      .sort((a, b) => b.score - a.score);

    const enriched = await Promise.all(
      baseAnalysis.map(async (trend, index) => {
        if (index > 5) {
          const fastTrend = {
            ...trend,
            sentiment: "mixed",
            tone: "neutral",
            riskLevel: "low",
            lifecycle: trend.crecimiento >= 120 ? "Emerging" : "Peak",
            confidenceScore: 50,
            contextLabels: trend.tags || [],
            actionIdeas: [],
            seoKeywords: [trend.palabra, ...(trend.tags || []).slice(0, 4)].slice(0, 5),
            geoRegions: buildRegionalFallback(trend),
            recommendedFormat: "short_video",
            summary: "",
            provider: "fast-default",
          };

          return {
            ...fastTrend,
            dataOrigin: buildTrendDataOrigin(fastTrend),
          };
        }

        const enrichment = await getTrendEnrichment(trend);
        const combined = { ...trend, ...enrichment };
        return {
          ...combined,
          dataOrigin: buildTrendDataOrigin(combined),
        };
      }),
    );

    await saveHistorySnapshot(enriched);
    return enriched;
  });
}

export async function getHistoricalTrends(query) {
  const normalizedQuery = normalizeText(query, 120).toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  if (!isDatabaseAvailable()) {
    const trends = await getViralTrends();
    return trends
      .filter((trend) =>
        [trend.palabra, trend.source, ...(trend.tags || [])]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
      .slice(0, 12)
      .map((trend) => ({
        ...trend,
        capturedAt: new Date().toISOString(),
      }));
  }

  const [rows] = await pool.query(
    `
      SELECT
        ts.captured_at,
        ti.palabra,
        ti.menciones,
        ti.source,
        ti.crecimiento,
        ti.score,
        ti.estado,
        ti.url,
        ti.embed_url,
        ti.tags_json,
        ti.sparkline_json
      FROM trend_items ti
      JOIN trend_snapshots ts ON ts.id = ti.snapshot_id
      ORDER BY ts.captured_at DESC
      LIMIT 600
    `,
  );

  const matches = rows
    .map((row) => ({
      capturedAt: new Date(row.captured_at).toISOString(),
      palabra: row.palabra,
      menciones: Number(row.menciones || 0),
      source: row.source,
      crecimiento: Number(row.crecimiento || 0),
      score: Number(row.score || 0),
      estado: row.estado,
      url: row.url,
      embedUrl: row.embed_url,
      tags: parseJsonField(row.tags_json, []),
      sparkline: parseJsonField(row.sparkline_json, []),
      dataOrigin: {
        narrative: "El historial proviene de snapshots guardados por Trend Flow en la base de datos local.",
        sections: [
          {
            quality: "real",
            label: "Historial",
            source: "trend_snapshots",
            description: "Este resultado proviene de una captura historica almacenada.",
            updatedAt: new Date(row.captured_at).toISOString(),
          },
        ],
        methodology: [
          "El historial depende de capturas previas guardadas en la base de datos.",
        ],
      },
    }))
    .filter((trend) => [trend.palabra, trend.source, ...(trend.tags || [])].join(" ").toLowerCase().includes(normalizedQuery))
    .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());

  return matches.filter(
    (trend, index, array) => array.findIndex((item) => item.palabra === trend.palabra) === index,
  ).slice(0, 12);
}

export async function getDashboardSummary() {
  return getCachedValue("dashboard-summary", 60000, async () => {
    const viralTrends = await getViralTrends();
    const topTrend = viralTrends[0] || null;
    const temporalComparison = await getTemporalComparison(viralTrends);
    const historicalSeries = await getHistoricalAggregateSeries(6);

    const totalMentions = viralTrends.reduce((total, trend) => total + trend.menciones, 0);
    const averageGrowth =
      viralTrends.length > 0
        ? Math.round(
            viralTrends.reduce((total, trend) => total + trend.crecimiento, 0) / viralTrends.length,
          )
        : 0;

    return {
      metrics: {
        totalMentions,
        averageGrowth,
        activeTrends: viralTrends.length,
        topTrendLabel: topTrend?.palabra || "Sin datos",
        topTrendScore: topTrend?.score || 0,
      },
      featuredTrend: topTrend,
      weeklyActivity:
        historicalSeries.length > 0
          ? historicalSeries.map((point) => ({
              day: point.period,
              impressions: Math.round(point.mentions * 0.82),
              engagement: Math.round(point.engagement),
              clicks: Math.round(point.mentions * 0.18),
            }))
          : viralTrends.slice(0, 5).map((trend, index) => ({
              day: ["Lun", "Mar", "Mie", "Jue", "Vie"][index] || `D${index + 1}`,
              impressions: Math.round(trend.menciones * 0.82),
              engagement: Math.round(trend.menciones * 0.51),
              clicks: Math.round(trend.menciones * 0.18),
            })),
      sourceBreakdown: Object.entries(
        viralTrends.reduce((acc, trend) => {
          acc[trend.source] = (acc[trend.source] || 0) + 1;
          return acc;
        }, {}),
      ).map(([source, total]) => ({ source, total })),
      temporalComparison,
      dataOrigin: buildDashboardDataOrigin(topTrend, historicalSeries.length > 0),
    };
  });
}

export async function getAnalyticsSummary() {
  return getCachedValue("analytics-summary", 60000, async () => {
    const viralTrends = await getViralTrends();
    const historicalSeries = await getHistoricalAggregateSeries(6);
    const temporalComparison = await getTemporalComparison(viralTrends);

    const totalsBySource = viralTrends.reduce((acc, trend) => {
      if (!acc[trend.source]) {
        acc[trend.source] = {
          source: trend.source,
          mentions: 0,
          growth: 0,
          count: 0,
        };
      }
      acc[trend.source].mentions += trend.menciones;
      acc[trend.source].growth += trend.crecimiento;
      acc[trend.source].count += 1;
      return acc;
    }, {});

    const totalMentions = viralTrends.reduce((total, trend) => total + trend.menciones, 0);
    const platformPerformance = Object.values(totalsBySource)
      .map((item) => ({
        platform: item.source,
        engagement: clamp(Math.round((item.mentions / Math.max(totalMentions, 1)) * 100), 8, 100),
        reach: clamp(Math.round((item.count / Math.max(viralTrends.length, 1)) * 100), 8, 100),
        growth: Math.round(item.growth / Math.max(item.count, 1)),
        mentions: item.mentions,
      }))
      .sort((a, b) => b.mentions - a.mentions);

    const primarySource = platformPerformance[0]?.platform || "youtube";
    const ageBreakdownBySource = {
      youtube: [{ name: "18-24", value: 31 }, { name: "25-34", value: 34 }, { name: "35-44", value: 19 }, { name: "45-54", value: 10 }, { name: "55+", value: 6 }],
      reddit: [{ name: "18-24", value: 27 }, { name: "25-34", value: 39 }, { name: "35-44", value: 20 }, { name: "45-54", value: 9 }, { name: "55+", value: 5 }],
      google: [{ name: "18-24", value: 24 }, { name: "25-34", value: 31 }, { name: "35-44", value: 23 }, { name: "45-54", value: 13 }, { name: "55+", value: 9 }],
      news: [{ name: "18-24", value: 18 }, { name: "25-34", value: 26 }, { name: "35-44", value: 25 }, { name: "45-54", value: 18 }, { name: "55+", value: 13 }],
      hackernews: [{ name: "18-24", value: 14 }, { name: "25-34", value: 33 }, { name: "35-44", value: 29 }, { name: "45-54", value: 15 }, { name: "55+", value: 9 }],
    };
    const genderBreakdownBySource = {
      youtube: [{ name: "Femenino", value: 52 }, { name: "Masculino", value: 45 }, { name: "Otro", value: 3 }],
      reddit: [{ name: "Femenino", value: 39 }, { name: "Masculino", value: 58 }, { name: "Otro", value: 3 }],
      google: [{ name: "Femenino", value: 49 }, { name: "Masculino", value: 48 }, { name: "Otro", value: 3 }],
      news: [{ name: "Femenino", value: 47 }, { name: "Masculino", value: 50 }, { name: "Otro", value: 3 }],
      hackernews: [{ name: "Femenino", value: 28 }, { name: "Masculino", value: 69 }, { name: "Otro", value: 3 }],
    };

    const demographics = await getAudienceDemographics(
      primarySource,
      ageBreakdownBySource[primarySource] || ageBreakdownBySource.youtube,
      genderBreakdownBySource[primarySource] || genderBreakdownBySource.youtube,
    );

    return {
      generatedAt: new Date().toISOString(),
      growthTimeline: historicalSeries.map((point) => ({
        period: point.period,
        mentions: point.mentions,
        engagement: point.engagement,
      })),
      stateBreakdown: ["Viral", "En crecimiento", "Emergente"].map((state) => ({
        name: state,
        value: viralTrends.filter((trend) => trend.estado === state).length,
      })),
      sourceBreakdown: platformPerformance.map((item) => ({ name: item.platform, value: item.mentions })),
      platformPerformance,
      topTrends: viralTrends.slice(0, 5).map((trend) => ({
        keyword: trend.palabra,
        source: trend.source,
        score: trend.score,
        growth: trend.crecimiento,
        mentions: trend.menciones,
        status: trend.estado,
        sentiment: trend.sentiment || "mixed",
        tone: trend.tone || "neutral",
        riskLevel: trend.riskLevel || "low",
        lifecycle: trend.lifecycle || "Emerging",
        actionIdeas: trend.actionIdeas || [],
        seoKeywords: trend.seoKeywords || [],
        geoRegions: trend.geoRegions || [],
        recommendedFormat: trend.recommendedFormat || "short_video",
        summary: trend.summary || "",
        url: trend.url || null,
        embedUrl: trend.embedUrl || null,
      })),
      sentimentBreakdown: ["positive", "mixed", "negative"].map((sentiment) => ({
        name: sentiment,
        value: viralTrends.filter((trend) => trend.sentiment === sentiment).length,
      })),
      lifecycleBreakdown: ["Emerging", "Peak", "Fading"].map((stage) => ({
        name: stage,
        value: viralTrends.filter((trend) => trend.lifecycle === stage).length,
      })),
      featuredActions: viralTrends[0]?.actionIdeas || [],
      geoOverview: buildGeoOverview(viralTrends, 16),
      geoTrendDetails: buildGeoTrendDetails(viralTrends, 20),
      crisisAlerts: buildCrisisAlerts(viralTrends),
      ageBreakdown: demographics.ageBreakdown,
      genderBreakdown: demographics.genderBreakdown,
      audienceMeta: demographics.audienceMeta,
      temporalComparison,
      dataOrigin: buildAnalyticsDataOrigin(demographics.audienceMeta, historicalSeries.length > 0),
    };
  });
}

export async function storeAudienceDemographics(payload) {
  const validSources = ["google", "reddit", "hackernews", "news", "youtube", "global"];
  const source = ensureEnum(String(payload?.source || "global"), validSources, "global");
  const ageBreakdown = normalizeAudienceBreakdown(payload?.ageBreakdown);
  const genderBreakdown = normalizeAudienceBreakdown(payload?.genderBreakdown);

  if (ageBreakdown.length === 0 || genderBreakdown.length === 0) {
    throw new Error("ageBreakdown and genderBreakdown are required");
  }

  const provider = normalizeText(payload?.provider || "manual-import", 120);
  const note = normalizeText(payload?.note || "", 255) || null;
  const capturedAt = payload?.capturedAt ? new Date(payload.capturedAt) : new Date();

  if (!isDatabaseAvailable()) {
    setDemoAudienceDemographics({
      ageBreakdown,
      genderBreakdown,
      audienceMeta: {
        mode: payload?.isReal === false ? "estimated" : "real",
        provider: provider || "manual-import",
        source,
        note: note || "Modo demo activo.",
        capturedAt: Number.isNaN(capturedAt.getTime())
          ? new Date().toISOString()
          : capturedAt.toISOString(),
      },
    });
    return { ok: true };
  }

  await pool.query(
    `
      INSERT INTO audience_demographics
        (source, age_json, gender_json, is_real, provider, note, captured_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      source,
      JSON.stringify(ageBreakdown),
      JSON.stringify(genderBreakdown),
      payload?.isReal === false ? 0 : 1,
      provider || "manual-import",
      note,
      Number.isNaN(capturedAt.getTime()) ? new Date() : capturedAt,
    ],
  );

  return { ok: true };
}
