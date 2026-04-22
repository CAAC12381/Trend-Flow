import { loadLocalEnv } from "./load-env.js";

loadLocalEnv();

function parsePort(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const PORT = parsePort(process.env.PORT, 3000);
export const API_BASE_URL =
  process.env.API_BASE_URL || `http://localhost:${PORT}`;
export const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
export const JSON_LIMIT = process.env.JSON_LIMIT || "1mb";
export const NEWS_API_KEY = process.env.NEWS_API_KEY || "";
export const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
export const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "openrouter/free";
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
export const ADMIN_EMAILS = String(process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
