function section(quality, label, source, description, updatedAt = null) {
  return {
    quality,
    label,
    source,
    description,
    updatedAt,
  };
}

export function buildTrendDataOrigin(trend) {
  const collectionSource = trend.source || "unknown";
  const enrichmentProvider = trend.provider || "heuristic-engine";
  const enrichmentQuality =
    enrichmentProvider === "fast-default" ? "estimated" : "heuristic";

  return {
    narrative:
      "Trend Flow combina recoleccion real de temas con enriquecimiento interno para apoyar decisiones y presentaciones academicas.",
    sections: [
      section(
        "real",
        "Recoleccion",
        collectionSource,
        "La tendencia base proviene de una fuente externa monitoreada por el sistema.",
      ),
      section(
        enrichmentQuality,
        "Enriquecimiento",
        enrichmentProvider,
        "Sentimiento, riesgo, formato recomendado y resumen se calculan con reglas o IA como apoyo a decision.",
      ),
    ],
    methodology: [
      "Los temas base se consultan desde APIs o fuentes publicas.",
      "El score y crecimiento se calculan internamente para priorizar tendencias.",
      "Las capas de sentimiento, riesgo y geografia funcionan como apoyo analitico, no como verdad absoluta.",
    ],
  };
}

export function buildDashboardDataOrigin(featuredTrend, hasHistoricalSeries) {
  return {
    narrative:
      "El panel mezcla senales recolectadas en tiempo casi real con agregados calculados por Trend Flow para una lectura ejecutiva.",
    sections: [
      section(
        "real",
        "Fuentes base",
        featuredTrend?.source || "multiple",
        "Las tendencias del panel nacen de consultas reales a plataformas monitoreadas.",
      ),
      section(
        "heuristic",
        "Metricas derivadas",
        "trendflow-engine",
        "Crecimiento, score, tendencia lider e interacciones se calculan dentro de la plataforma.",
      ),
      section(
        hasHistoricalSeries ? "real" : "estimated",
        "Historial",
        hasHistoricalSeries ? "trend_snapshots" : "trendflow-fallback",
        hasHistoricalSeries
          ? "La comparacion temporal usa snapshots guardados en la base de datos."
          : "Si aun no hay suficientes snapshots, el panel usa una aproximacion visual basada en el estado actual.",
      ),
    ],
    methodology: [
      "Las menciones totales parten de tendencias recolectadas por fuente.",
      "Las comparaciones temporales usan snapshots cuando ya existen capturas previas.",
      "Las tarjetas del panel estan orientadas a apoyo de decision y demo.",
    ],
  };
}

export function buildAnalyticsDataOrigin(audienceMeta, hasHistoricalSeries) {
  return {
    narrative:
      "Analisis consolida tendencias reales con capas estimadas o heuristicas para explicar contexto, audiencia y riesgo de forma transparente.",
    sections: [
      section(
        "real",
        "Tendencias y fuentes",
        "multi-source",
        "Las tendencias, menciones y fuentes se construyen a partir de recoleccion real.",
      ),
      section(
        hasHistoricalSeries ? "real" : "estimated",
        "Serie temporal",
        hasHistoricalSeries ? "trend_snapshots" : "trendflow-fallback",
        hasHistoricalSeries
          ? "La evolucion usa snapshots historicos almacenados por el sistema."
          : "Si todavia no hay snapshots suficientes, algunas vistas quedan sin serie historica real.",
      ),
      section(
        audienceMeta?.mode === "real" ? "real" : "estimated",
        "Audiencia",
        audienceMeta?.provider || "estimated-model",
        audienceMeta?.note ||
          "La audiencia puede provenir de un dataset integrado o de una estimacion por fuente.",
        audienceMeta?.capturedAt || null,
      ),
      section(
        "heuristic",
        "Capas analiticas",
        "trendflow-engine",
        "Sentimiento, riesgo, ciclo de vida y crisis funcionan como apoyo metodologico.",
      ),
    ],
    methodology: [
      "Las plataformas y menciones se calculan con base en tendencias recolectadas.",
      "La demografia puede ser real o estimada segun la disponibilidad de dataset.",
      "Las alertas y clasificaciones analiticas son heuristicas explicables para una entrega academica.",
    ],
  };
}
