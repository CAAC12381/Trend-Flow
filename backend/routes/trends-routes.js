import express from "express";
import { asyncRoute, sendError } from "../utils/http.js";
import {
  getAllTrends,
  getAnalyticsSummary,
  getDashboardSummary,
  getGoogleTrendsList,
  getHackerNewsTrendsList,
  getHistoricalTrends,
  getNewsTrendsList,
  getRedditTrendsList,
  getViralTrends,
  getYoutubeTrendsList,
  storeAudienceDemographics,
} from "../services/trends-service.js";
import { requireSessionUser } from "../auth-routes.js";

export function createTrendsRouter() {
  const router = express.Router();

  router.get("/tendencias", asyncRoute(async (_req, res) => {
    res.json(await getGoogleTrendsList());
  }));

  router.get("/reddit-trends", asyncRoute(async (_req, res) => {
    res.json(await getRedditTrendsList());
  }));

  router.get("/hackernews-trends", asyncRoute(async (_req, res) => {
    res.json(await getHackerNewsTrendsList());
  }));

  router.get("/news-trends", asyncRoute(async (_req, res) => {
    res.json(await getNewsTrendsList());
  }));

  router.get("/youtube-trends", asyncRoute(async (_req, res) => {
    res.json(await getYoutubeTrendsList());
  }));

  router.get("/all-trends", asyncRoute(async (_req, res) => {
    res.json(await getAllTrends());
  }));

  router.get("/viral-trends", asyncRoute(async (_req, res) => {
    res.json(await getViralTrends());
  }));

  router.get("/historical-trends", asyncRoute(async (req, res) => {
    res.json(await getHistoricalTrends(req.query.q));
  }));

  router.get("/dashboard-summary", asyncRoute(async (_req, res) => {
    res.json(await getDashboardSummary());
  }));

  router.get("/analytics-summary", asyncRoute(async (_req, res) => {
    res.json(await getAnalyticsSummary());
  }));

  router.post("/audience-demographics", asyncRoute(async (req, res) => {
    const auth = await requireSessionUser(req, res);
    if (!auth) {
      return;
    }

    try {
      res.json(await storeAudienceDemographics(req.body));
    } catch (error) {
      sendError(res, 400, error.message || "Unable to store audience demographics");
    }
  }));

  return router;
}
