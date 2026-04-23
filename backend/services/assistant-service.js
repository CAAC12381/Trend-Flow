import { normalizeText } from "../utils/validation.js";

export function sanitizeAssistantReply(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*/g, "")
    .replace(/^\s*[-*]\s+/gm, "- ")
    .replace(/\|/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildLocalAssistantReply(lastUserMessage, trends, dashboard, language) {
  const prompt = normalizeText(lastUserMessage, 500).toLowerCase();
  const topTrend = trends?.[0];
  const topThree = Array.isArray(trends) ? trends.slice(0, 3) : [];
  const averageGrowth = dashboard?.metrics?.averageGrowth || 0;
  const formatTrendLine = (trend) =>
    `- ${trend.palabra}: ${trend.estado}, +${trend.crecimiento}%`;

  const inSpanish = () => {
    if (prompt.includes("guia") || prompt.includes("como funciona")) {
      return [
        "Guia rapida de Trend Flow:",
        "",
        "1. Panel",
        "- Resume menciones, crecimiento y cambios recientes.",
        "",
        "2. Tendencias",
        "- Muestra los temas que mas estan creciendo.",
        "- Puedes abrir cada uno para ver contexto, riesgo y formato sugerido.",
        "",
        "3. Analisis",
        "- Separa lo real, lo estimado y lo heuristico para que sea defendible.",
        "",
        "4. Configuracion",
        "- Ajusta tema, idioma y preferencias del sistema.",
      ].join("\n");
    }

    if (prompt.includes("grafica") || prompt.includes("mapa")) {
      return [
        "Lectura rapida:",
        "",
        "- La grafica muestra si una tendencia sigue subiendo o se esta enfriando.",
        "- El mapa indica en que zonas hay mayor intensidad de conversacion.",
        "- La comparacion temporal ayuda a ver si el tema acelera, se estabiliza o cae.",
      ].join("\n");
    }

    if (prompt.includes("idea") || prompt.includes("contenido")) {
      const ideas = topThree.map((trend) => {
        const format = trend.recommendedFormat || "short_video";
        return `- ${trend.palabra}: prueba formato ${format}`;
      });
      return [
        "Ideas de contenido recomendadas:",
        "",
        ...ideas,
        "",
        "Prioridad:",
        "- Enfocate primero en crecimiento alto y riesgo bajo o medio.",
      ].join("\n");
    }

    return [
      "Resumen de tendencias mas fuertes:",
      "",
      ...(topThree.length > 0 ? topThree.map(formatTrendLine) : ["- No hay datos suficientes ahora mismo."]),
      "",
      `Tendencia lider: ${topTrend?.palabra || "sin datos"}`,
      `Crecimiento promedio: ${averageGrowth}%`,
    ].join("\n");
  };

  const inEnglish = () => {
    if (prompt.includes("guide") || prompt.includes("how it works")) {
      return [
        "Quick guide to Trend Flow:",
        "",
        "1. Dashboard",
        "- Gives the fast view of mentions, growth, and recent movement.",
        "",
        "2. Trends",
        "- Shows the strongest rising topics.",
        "- Each trend includes context, risk, and suggested format.",
        "",
        "3. Analytics",
        "- Separates real, estimated, and heuristic data clearly.",
        "",
        "4. Settings",
        "- Lets you adjust theme, language, and preferences.",
      ].join("\n");
    }

    if (prompt.includes("chart") || prompt.includes("map")) {
      return [
        "Quick reading:",
        "",
        "- The chart shows whether a trend is still rising or starting to cool down.",
        "- The map shows where conversation is stronger.",
        "- Comparison views help decide if the topic is accelerating, stabilizing, or fading.",
      ].join("\n");
    }

    if (prompt.includes("idea") || prompt.includes("content")) {
      const ideas = topThree.map((trend) => {
        const format = trend.recommendedFormat || "short_video";
        return `- ${trend.palabra}: try ${format} format`;
      });
      return [
        "Recommended content ideas:",
        "",
        ...ideas,
        "",
        "Priority:",
        "- Start with high-growth, lower-risk topics first.",
      ].join("\n");
    }

    return [
      "Top trend summary:",
      "",
      ...(topThree.length > 0 ? topThree.map(formatTrendLine) : ["- Not enough data right now."]),
      "",
      `Current leader: ${topTrend?.palabra || "no data"}`,
      `Average growth: ${averageGrowth}%`,
    ].join("\n");
  };

  return sanitizeAssistantReply(language === "English" ? inEnglish() : inSpanish());
}
