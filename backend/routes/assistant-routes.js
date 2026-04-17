import express from "express";
import axios from "axios";
import { requireSessionUser } from "../auth-routes.js";
import { getCachedValue } from "../cache.js";
import { API_BASE_URL, OPENROUTER_API_KEY, OPENROUTER_MODEL } from "../config.js";
import { buildLocalAssistantReply, sanitizeAssistantReply } from "../services/assistant-service.js";
import { normalizeAssistantMessages } from "../utils/validation.js";
import { asyncRoute } from "../utils/http.js";

async function fetchLocalEndpoint(path) {
  const { data } = await axios.get(`${API_BASE_URL}${path}`);
  return data;
}

export function createAssistantRouter() {
  const router = express.Router();

  router.post("/assistant/chat", asyncRoute(async (req, res) => {
    const auth = await requireSessionUser(req, res);
    if (!auth) {
      return;
    }

    const { session } = auth;
    const cleanMessages = normalizeAssistantMessages(req.body?.messages);
    const [trends, dashboard, analytics] = await Promise.all([
      getCachedValue("assistant-viral-context", 45000, () => fetchLocalEndpoint("/viral-trends")),
      getCachedValue("assistant-dashboard-context", 45000, () => fetchLocalEndpoint("/dashboard-summary")),
      getCachedValue("assistant-analytics-context", 45000, () => fetchLocalEndpoint("/analytics-summary")),
    ]);

    const language = session.language === "en" ? "English" : "Spanish";
    const lastUserMessage =
      cleanMessages.filter((message) => message.role === "user").at(-1)?.content || "";

    if (!OPENROUTER_API_KEY) {
      res.json({
        reply: buildLocalAssistantReply(lastUserMessage, trends, dashboard, language),
      });
      return;
    }

    const context = trends.slice(0, 5).map((trend) => ({
      palabra: trend.palabra,
      source: trend.source,
      estado: trend.estado,
      crecimiento: trend.crecimiento,
      score: trend.score,
      menciones: trend.menciones,
      tags: trend.tags || [],
      dataOrigin: trend.dataOrigin || null,
    }));

    try {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: OPENROUTER_MODEL,
          temperature: 0.6,
          messages: [
            {
              role: "system",
              content:
                `You are TrendFlow AI, a friendly assistant specialized in social media trends, dashboards, analytics, and onboarding for this app. Reply in ${language}. ` +
                "Explain when the app uses real, estimated, or heuristic data if the user asks. Keep answers concise and practical. Use plain text only.",
            },
            {
              role: "system",
              content:
                "Modules: Dashboard, Trends, Analytics, Settings, login, report export, notifications, search, history, and AI assistant.",
            },
            {
              role: "system",
              content: `Current top trend context: ${JSON.stringify(context)}`,
            },
            {
              role: "system",
              content: `Current dashboard summary: ${JSON.stringify(dashboard?.metrics || {})}`,
            },
            {
              role: "system",
              content: `Current analytics summary: ${JSON.stringify({
                topTrends: analytics?.topTrends?.slice?.(0, 3) || [],
                audienceMeta: analytics?.audienceMeta || null,
                dataOrigin: analytics?.dataOrigin || null,
              })}`,
            },
            ...cleanMessages,
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "TrendFlow Assistant",
          },
        },
      );

      res.json({
        reply:
          sanitizeAssistantReply(response.data?.choices?.[0]?.message?.content) ||
          "No pude generar respuesta por ahora.",
      });
    } catch {
      res.json({
        reply: buildLocalAssistantReply(lastUserMessage, trends, dashboard, language),
      });
    }
  }));

  return router;
}
