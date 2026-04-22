import express from "express";
import pool from "../db.js";
import { requireAdminUser } from "../auth-routes.js";
import {
  ADMIN_EMAILS,
  GOOGLE_CLIENT_ID,
  NEWS_API_KEY,
  OPENROUTER_API_KEY,
  OPENROUTER_MODEL,
  YOUTUBE_API_KEY,
} from "../config.js";
import { asyncRoute } from "../utils/http.js";

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function boolStatus(configured, label, detail = "") {
  return {
    label,
    configured: Boolean(configured),
    detail,
  };
}

export function createAdminRouter() {
  const router = express.Router();

  router.get("/admin/summary", asyncRoute(async (req, res) => {
    const auth = await requireAdminUser(req, res);
    if (!auth) {
      return;
    }

    const [[userStats]] = await pool.query(`
      SELECT
        COUNT(*) AS totalUsers,
        SUM(role = 'admin') AS adminUsers,
        SUM(account_status = 'active') AS activeUsers,
        SUM(plan = 'Premium') AS premiumUsers
      FROM users
    `);

    const [[sessionStats]] = await pool.query(`
      SELECT
        COUNT(*) AS totalSessions,
        SUM(expires_at > NOW()) AS activeSessions
      FROM sessions
    `);

    const [[contentStats]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM saved_reports) AS savedReports,
        (SELECT COUNT(*) FROM notifications) AS notifications,
        (SELECT COUNT(*) FROM notifications WHERE is_read = 0) AS unreadNotifications,
        (SELECT COUNT(*) FROM search_history) AS searches,
        (SELECT COUNT(*) FROM trend_snapshots) AS snapshots,
        (SELECT COUNT(*) FROM trend_items) AS trendItems,
        (SELECT COUNT(*) FROM trend_enrichments) AS enrichments
    `);

    const [[latestSnapshot]] = await pool.query(`
      SELECT captured_at, source_count, total_mentions
      FROM trend_snapshots
      ORDER BY captured_at DESC
      LIMIT 1
    `);

    const [recentUsers] = await pool.query(`
      SELECT id, username, email, role, plan, account_status, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 8
    `);

    const [sourceTotals] = await pool.query(`
      SELECT source, COUNT(*) AS totalItems, COALESCE(SUM(menciones), 0) AS mentions
      FROM trend_items
      GROUP BY source
      ORDER BY mentions DESC
    `);

    const [recentActivity] = await pool.query(`
      (
        SELECT 'search' AS type, sh.query AS title, u.email AS actor, sh.created_at AS createdAt
        FROM search_history sh
        JOIN users u ON u.id = sh.user_id
        ORDER BY sh.created_at DESC
        LIMIT 6
      )
      UNION ALL
      (
        SELECT 'report' AS type, sr.title AS title, u.email AS actor, sr.created_at AS createdAt
        FROM saved_reports sr
        JOIN users u ON u.id = sr.user_id
        ORDER BY sr.created_at DESC
        LIMIT 6
      )
      ORDER BY createdAt DESC
      LIMIT 10
    `);

    res.json({
      generatedAt: new Date().toISOString(),
      totals: {
        users: Number(userStats.totalUsers || 0),
        admins: Number(userStats.adminUsers || 0),
        activeUsers: Number(userStats.activeUsers || 0),
        premiumUsers: Number(userStats.premiumUsers || 0),
        sessions: Number(sessionStats.totalSessions || 0),
        activeSessions: Number(sessionStats.activeSessions || 0),
        savedReports: Number(contentStats.savedReports || 0),
        notifications: Number(contentStats.notifications || 0),
        unreadNotifications: Number(contentStats.unreadNotifications || 0),
        searches: Number(contentStats.searches || 0),
        snapshots: Number(contentStats.snapshots || 0),
        trendItems: Number(contentStats.trendItems || 0),
        enrichments: Number(contentStats.enrichments || 0),
      },
      latestSnapshot: latestSnapshot
        ? {
            capturedAt: toIso(latestSnapshot.captured_at),
            sourceCount: Number(latestSnapshot.source_count || 0),
            totalMentions: Number(latestSnapshot.total_mentions || 0),
          }
        : null,
      recentUsers: recentUsers.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        plan: user.plan,
        accountStatus: user.account_status,
        createdAt: toIso(user.created_at),
      })),
      sourceTotals: sourceTotals.map((source) => ({
        source: source.source,
        totalItems: Number(source.totalItems || 0),
        mentions: Number(source.mentions || 0),
      })),
      recentActivity: recentActivity.map((item) => ({
        type: item.type,
        title: item.title,
        actor: item.actor,
        createdAt: toIso(item.createdAt),
      })),
      providers: [
        boolStatus(YOUTUBE_API_KEY, "YouTube Data API v3", "Tendencias reales de video"),
        boolStatus(NEWS_API_KEY, "News API", "Noticias externas monitoreadas"),
        boolStatus(GOOGLE_CLIENT_ID, "Google OAuth", "Inicio de sesion real"),
        boolStatus(OPENROUTER_API_KEY, "OpenRouter IA", OPENROUTER_MODEL),
      ],
      access: {
        mode: "role-based",
        adminEmailsConfigured: ADMIN_EMAILS.length,
      },
    });
  }));

  return router;
}
