import express from "express";
import pool from "../db.js";
import { requireSessionUser } from "../auth-routes.js";
import { asyncRoute, sendError } from "../utils/http.js";
import { clamp, normalizeText } from "../utils/validation.js";
import { normalizeKeyword } from "../services/trends-service.js";

export function createUserDataRouter() {
  const router = express.Router();

  router.get("/notifications", asyncRoute(async (req, res) => {
    const auth = await requireSessionUser(req, res);
    if (!auth) {
      return;
    }
    const { session } = auth;
    const [rows] = await pool.query(
      `
        SELECT id, title, description, meta, is_read, created_at
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `,
      [session.user_id],
    );
    res.json(
      rows.map((row) => ({
        id: String(row.id),
        title: row.title,
        description: row.description,
        meta: row.meta,
        read: Boolean(row.is_read),
        createdAt: new Date(row.created_at).toISOString(),
      })),
    );
  }));

  router.post("/notifications/sync", asyncRoute(async (req, res) => {
    const auth = await requireSessionUser(req, res);
    if (!auth) {
      return;
    }
    const { session } = auth;
    const trends = Array.isArray(req.body?.trends) ? req.body.trends.slice(0, 12) : [];
    const sourceLabels = {
      google: "Google Trends",
      reddit: "Reddit",
      hackernews: "Hacker News",
      news: "News",
      youtube: "YouTube",
    };

    for (const trend of trends) {
      const palabra = normalizeKeyword(trend?.palabra || "");
      const source = String(trend?.source || "youtube");
      if (!palabra) {
        continue;
      }

      await pool.query(
        `
          INSERT INTO notifications (user_id, trend_key, title, description, meta, is_read)
          VALUES (?, ?, ?, ?, ?, 0)
          ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            description = VALUES(description),
            meta = VALUES(meta),
            updated_at = CURRENT_TIMESTAMP
        `,
        [
          session.user_id,
          `${source}:${palabra.toLowerCase()}`,
          trend.estado === "Viral" ? "Alerta viral detectada" : "Tendencia en monitoreo",
          palabra,
          `${sourceLabels[source] || source} | +${Number(trend.crecimiento || 0)}%`,
        ],
      );
    }

    const [rows] = await pool.query(
      `
        SELECT id, title, description, meta, is_read, created_at
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `,
      [session.user_id],
    );
    res.json(
      rows.map((row) => ({
        id: String(row.id),
        title: row.title,
        description: row.description,
        meta: row.meta,
        read: Boolean(row.is_read),
        createdAt: new Date(row.created_at).toISOString(),
      })),
    );
  }));

  router.patch("/notifications/:id/read", asyncRoute(async (req, res) => {
    const auth = await requireSessionUser(req, res);
    if (!auth) {
      return;
    }
    const { session } = auth;
    await pool.query(
      `
        UPDATE notifications
        SET is_read = 1, read_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `,
      [req.params.id, session.user_id],
    );
    res.json({ ok: true });
  }));

  router.patch("/notifications/read-all", asyncRoute(async (req, res) => {
    const auth = await requireSessionUser(req, res);
    if (!auth) {
      return;
    }
    const { session } = auth;
    await pool.query(
      `
        UPDATE notifications
        SET is_read = 1, read_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND is_read = 0
      `,
      [session.user_id],
    );
    res.json({ ok: true });
  }));

  router.post("/search-history", asyncRoute(async (req, res) => {
    const auth = await requireSessionUser(req, res);
    if (!auth) {
      return;
    }
    const { session } = auth;
    const query = normalizeText(req.body?.query, 180);
    if (!query) {
      res.json({ ok: true });
      return;
    }
    await pool.query(
      `
        INSERT INTO search_history (user_id, query, normalized_query)
        VALUES (?, ?, ?)
      `,
      [session.user_id, query, query.toLowerCase()],
    );
    res.json({ ok: true });
  }));

  router.get("/search-history", asyncRoute(async (req, res) => {
    const auth = await requireSessionUser(req, res);
    if (!auth) {
      return;
    }
    const { session } = auth;
    const limit = clamp(Number.parseInt(String(req.query.limit || "12"), 10), 1, 40);
    const [rows] = await pool.query(
      `
        SELECT sh.query, MAX(sh.created_at) AS last_at
        FROM search_history sh
        WHERE sh.user_id = ?
        GROUP BY sh.normalized_query, sh.query
        ORDER BY last_at DESC
        LIMIT ?
      `,
      [session.user_id, limit],
    );
    res.json(
      rows.map((row) => ({
        query: row.query,
        lastAt: new Date(row.last_at).toISOString(),
      })),
    );
  }));

  router.post("/saved-reports", asyncRoute(async (req, res) => {
    const auth = await requireSessionUser(req, res);
    if (!auth) {
      return;
    }
    const { session } = auth;
    const reportType = ["analytics", "dashboard", "trends"].includes(req.body?.reportType)
      ? req.body.reportType
      : "analytics";
    const format = req.body?.format === "json" ? "json" : "pdf";
    const title = normalizeText(req.body?.title || "Reporte TrendFlow", 180) || "Reporte TrendFlow";
    const payload = req.body?.payload ?? {};

    if (typeof payload !== "object") {
      sendError(res, 400, "Invalid report payload");
      return;
    }

    const [result] = await pool.query(
      `
        INSERT INTO saved_reports (user_id, report_type, title, format, payload_json)
        VALUES (?, ?, ?, ?, ?)
      `,
      [session.user_id, reportType, title, format, JSON.stringify(payload)],
    );
    res.json({ ok: true, id: result.insertId });
  }));

  router.get("/saved-reports", asyncRoute(async (req, res) => {
    const auth = await requireSessionUser(req, res);
    if (!auth) {
      return;
    }
    const { session } = auth;
    const limit = clamp(Number.parseInt(String(req.query.limit || "20"), 10), 1, 60);
    const [rows] = await pool.query(
      `
        SELECT id, report_type, title, format, created_at
        FROM saved_reports
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `,
      [session.user_id, limit],
    );
    res.json(
      rows.map((row) => ({
        id: row.id,
        reportType: row.report_type,
        title: row.title,
        format: row.format,
        createdAt: new Date(row.created_at).toISOString(),
      })),
    );
  }));

  return router;
}
