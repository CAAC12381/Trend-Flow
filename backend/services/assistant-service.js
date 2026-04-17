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

  const inSpanish = () => {
    if (prompt.includes("guia") || prompt.includes("como funciona")) {
      return [
        "Trend Flow monitorea temas que estan creciendo en varias plataformas y los ordena para ayudarte a decidir.",
        "Panel resume menciones, crecimiento y cambios recientes.",
        "Tendencias te deja abrir cada tema y revisar contexto, riesgo y formato sugerido.",
        "Analisis separa claramente que datos son reales, estimados o heuristicas.",
      ].join(" ");
    }

    if (prompt.includes("grafica") || prompt.includes("mapa")) {
      return [
        "La grafica sirve para interpretar el comportamiento de una tendencia, no solo verla pasar.",
        "El mapa indica donde hay mayor intensidad de conversacion.",
        "Las comparaciones ayudan a decidir si el tema esta subiendo, estabilizado o enfriandose.",
      ].join(" ");
    }

    if (prompt.includes("idea") || prompt.includes("contenido")) {
      const ideas = topThree
        .map((trend) => `${trend.palabra} en formato ${trend.recommendedFormat || "short_video"}`)
        .join(", ");
      return `Yo priorizaria contenido rapido alrededor de: ${ideas}. Enfocate en crecimiento alto y riesgo bajo o medio.`;
    }

    const summary = topThree
      .map((trend) => `${trend.palabra} (${trend.estado}, +${trend.crecimiento}%)`)
      .join(", ");
    return `Las tendencias mas fuertes ahora son: ${summary}. La lider actual es ${topTrend?.palabra || "sin datos"} y el crecimiento promedio ronda ${dashboard?.metrics?.averageGrowth || 0}%.`;
  };

  const inEnglish = () => {
    if (prompt.includes("guide") || prompt.includes("how it works")) {
      return "Trend Flow monitors rising topics across platforms and ranks them to support decisions. Dashboard gives the quick view, Trends explains each topic, and Analytics clarifies what is real, estimated, or heuristic.";
    }

    if (prompt.includes("chart") || prompt.includes("map")) {
      return "The chart helps interpret a trend, not just display it. The map shows where conversation is stronger, and the comparison views help decide whether the topic is rising or cooling down.";
    }

    if (prompt.includes("idea") || prompt.includes("content")) {
      const ideas = topThree
        .map((trend) => `${trend.palabra} in ${trend.recommendedFormat || "short_video"} format`)
        .join(", ");
      return `I would prioritize fast content around: ${ideas}. Focus on high growth and lower risk topics first.`;
    }

    const summary = topThree
      .map((trend) => `${trend.palabra} (${trend.estado}, +${trend.crecimiento}%)`)
      .join(", ");
    return `The strongest trends right now are: ${summary}. The current leader is ${topTrend?.palabra || "no data"} and average growth is around ${dashboard?.metrics?.averageGrowth || 0}%.`;
  };

  return sanitizeAssistantReply(language === "English" ? inEnglish() : inSpanish());
}
