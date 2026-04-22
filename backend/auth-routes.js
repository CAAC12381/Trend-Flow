import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import axios from "axios";
import pool from "./db.js";
import {
  ensureEnum,
  isValidEmail,
  limitDataUrl,
  normalizeBooleanRecord,
  normalizeEmail,
  normalizeOptionalText,
  normalizeText,
} from "./utils/validation.js";
import { sendError } from "./utils/http.js";
import { ADMIN_EMAILS, GOOGLE_CLIENT_ID } from "./config.js";

const SESSION_DAYS = 7;

function createResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function createToken() {
  return crypto.randomBytes(48).toString("hex");
}

function roleForEmail(email, fallback = "user") {
  return ADMIN_EMAILS.includes(String(email || "").trim().toLowerCase())
    ? "admin"
    : fallback === "admin"
      ? "admin"
      : "user";
}

function createSocialIdentity(provider) {
  const normalizedProvider = ensureEnum(
    provider,
    ["google", "apple", "facebook"],
    "google",
  );
  const labels = {
    google: "Google",
    apple: "Apple",
    facebook: "Facebook",
  };

  return {
    provider: normalizedProvider,
    username: `${labels[normalizedProvider]} User`,
    email: `${normalizedProvider}.demo@trendflow.social`,
    bio: `Cuenta social de demostracion conectada con ${labels[normalizedProvider]}.`,
  };
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export async function getSession(token) {
  const [rows] = await pool.query(
    `
      SELECT s.user_id, s.expires_at, u.username, u.email, u.avatar, u.bio, u.plan, u.role, u.account_status, u.language, u.theme
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ?
      LIMIT 1
    `,
    [token],
  );

  return rows[0] || null;
}

async function getUserPreferences(userId) {
  const [rows] = await pool.query(
    "SELECT notifications_json, privacy_json FROM user_preferences WHERE user_id = ? LIMIT 1",
    [userId],
  );
  return rows[0] || null;
}

async function buildAuthResponse(userId) {
  const [users] = await pool.query(
    "SELECT * FROM users WHERE id = ? LIMIT 1",
    [userId],
  );
  const user = users[0];
  const resolvedRole = roleForEmail(user.email, user.role);
  const prefRow = await getUserPreferences(user.id);
  const token = createToken();
  const expiresAt = addDays(new Date(), SESSION_DAYS);

  await pool.query(
    "INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)",
    [user.id, token, expiresAt],
  );

  if (resolvedRole !== user.role) {
    await pool.query("UPDATE users SET role = ? WHERE id = ?", [
      resolvedRole,
      user.id,
    ]);
  }

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      plan: user.plan,
      role: resolvedRole,
      accountStatus: user.account_status,
      language: user.language,
      theme: user.theme,
      notifications: prefRow ? JSON.parse(prefRow.notifications_json) : {},
      privacy: prefRow ? JSON.parse(prefRow.privacy_json) : {},
    },
  };
}

async function ensureDefaultPreferences(userId) {
  const defaultNotifications = {
    trendAlerts: true,
    weeklyReports: true,
    mentions: false,
    appUpdates: true,
  };
  const defaultPrivacy = {
    publicProfile: true,
    showStats: true,
    allowMessages: true,
  };

  await pool.query(
    `
      INSERT INTO user_preferences (user_id, notifications_json, privacy_json)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        notifications_json = user_preferences.notifications_json,
        privacy_json = user_preferences.privacy_json
    `,
    [userId, JSON.stringify(defaultNotifications), JSON.stringify(defaultPrivacy)],
  );
}

async function verifyGoogleCredential(credential) {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("Google OAuth is not configured on the server");
  }

  const response = await axios.get("https://oauth2.googleapis.com/tokeninfo", {
    params: {
      id_token: credential,
    },
  });

  const payload = response.data || {};
  if (payload.aud !== GOOGLE_CLIENT_ID) {
    throw new Error("Google credential audience mismatch");
  }

  if (!payload.email || payload.email_verified !== "true") {
    throw new Error("Google account email is not verified");
  }

  return {
    email: normalizeEmail(payload.email),
    username: normalizeText(payload.name || payload.given_name || "Google User", 80),
    avatar: normalizeOptionalText(payload.picture, 500),
    providerId: normalizeText(payload.sub, 120),
  };
}

export function parseAuthToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    return null;
  }
  return auth.slice("Bearer ".length).trim();
}

export async function requireSessionUser(req, res) {
  const token = parseAuthToken(req);
  if (!token) {
    res.status(401).json({ error: "Missing auth token" });
    return null;
  }

  const session = await getSession(token);
  if (!session) {
    res.status(401).json({ error: "Invalid session" });
    return null;
  }

  const expiresAt = new Date(session.expires_at);
  if (expiresAt < new Date()) {
    await pool.query("DELETE FROM sessions WHERE token = ?", [token]);
    res.status(401).json({ error: "Session expired" });
    return null;
  }

  return { session, token };
}

export async function requireAdminUser(req, res) {
  const auth = await requireSessionUser(req, res);
  if (!auth) {
    return null;
  }

  const { session } = auth;
  const resolvedRole = roleForEmail(session.email, session.role);
  if (resolvedRole !== "admin") {
    sendError(res, 403, "Admin access required");
    return null;
  }

  return auth;
}

export function createAuthRouter() {
  const router = express.Router();

  router.post("/register", async (req, res) => {
    try {
      const username = normalizeText(req.body?.username, 80);
      const email = normalizeEmail(req.body?.email);
      const password = String(req.body?.password || "");

      if (!username || !email || !password) {
        sendError(res, 400, "Missing required fields");
        return;
      }

      if (!isValidEmail(email)) {
        sendError(res, 400, "Invalid email");
        return;
      }

      if (password.length < 6) {
        sendError(res, 400, "Password must be at least 6 characters");
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const [result] = await pool.query(
        "INSERT INTO users (username, email, password_hash, bio, role) VALUES (?, ?, ?, ?, ?)",
        [username, email, passwordHash, "", roleForEmail(email)],
      );

      const userId = result.insertId;
      await ensureDefaultPreferences(userId);
      res.json(await buildAuthResponse(userId));
    } catch (error) {
      if (String(error.message || "").includes("Duplicate")) {
        sendError(res, 409, "Email already registered");
        return;
      }
      console.log("Error register:", error.message || error);
      sendError(res, 500, "Register failed");
    }
  });

  router.post("/login", async (req, res) => {
    try {
      const email = normalizeEmail(req.body?.email);
      const password = String(req.body?.password || "");
      if (!email || !password) {
        sendError(res, 400, "Missing email or password");
        return;
      }

      const [users] = await pool.query(
        "SELECT * FROM users WHERE email = ? LIMIT 1",
        [email],
      );
      const user = users[0];

      if (!user) {
        sendError(res, 401, "Invalid credentials");
        return;
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        sendError(res, 401, "Invalid credentials");
        return;
      }

      res.json(await buildAuthResponse(user.id));
    } catch (error) {
      console.log("Error login:", error.message || error);
      sendError(res, 500, "Login failed");
    }
  });

  router.post("/social", async (req, res) => {
    try {
      const social = createSocialIdentity(req.body?.provider);

      let [users] = await pool.query(
        "SELECT * FROM users WHERE email = ? LIMIT 1",
        [social.email],
      );
      let user = users[0];

      if (!user) {
        const passwordHash = await bcrypt.hash(createToken(), 10);
        const [result] = await pool.query(
          "INSERT INTO users (username, email, password_hash, bio, role) VALUES (?, ?, ?, ?, ?)",
          [social.username, social.email, passwordHash, social.bio, roleForEmail(social.email)],
        );

        await ensureDefaultPreferences(result.insertId);

        [users] = await pool.query(
          "SELECT * FROM users WHERE id = ? LIMIT 1",
          [result.insertId],
        );
        user = users[0];
      }

      res.json(await buildAuthResponse(user.id));
    } catch (error) {
      console.log("Error social login:", error.message || error);
      sendError(res, 500, "Social login failed");
    }
  });

  router.post("/google", async (req, res) => {
    try {
      const credential = normalizeText(req.body?.credential, 5000);
      if (!credential) {
        sendError(res, 400, "Missing Google credential");
        return;
      }

      const googleUser = await verifyGoogleCredential(credential);
      let [users] = await pool.query(
        "SELECT * FROM users WHERE email = ? LIMIT 1",
        [googleUser.email],
      );
      let user = users[0];

      if (!user) {
        const passwordHash = await bcrypt.hash(createToken(), 10);
        const [result] = await pool.query(
          "INSERT INTO users (username, email, password_hash, bio, avatar, role) VALUES (?, ?, ?, ?, ?, ?)",
          [
            googleUser.username,
            googleUser.email,
            passwordHash,
            `Cuenta conectada con Google (${googleUser.providerId}).`,
            googleUser.avatar,
            roleForEmail(googleUser.email),
          ],
        );
        await ensureDefaultPreferences(result.insertId);
        user = { id: result.insertId };
      } else {
        await pool.query(
          "UPDATE users SET username = ?, avatar = COALESCE(?, avatar) WHERE id = ?",
          [googleUser.username, googleUser.avatar, user.id],
        );
      }

      res.json(await buildAuthResponse(user.id));
    } catch (error) {
      console.log("Error google login:", error.response?.data || error.message || error);
      sendError(res, 401, "Google login failed");
    }
  });

  router.post("/forgot-password", async (req, res) => {
    try {
      const normalizedEmail = normalizeEmail(req.body?.email);

      if (!normalizedEmail) {
        sendError(res, 400, "Email is required");
        return;
      }

      const [users] = await pool.query(
        "SELECT id, email FROM users WHERE email = ? LIMIT 1",
        [normalizedEmail],
      );
      const user = users[0];

      if (!user) {
        sendError(res, 404, "No account found with that email");
        return;
      }

      await pool.query(
        "UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE email = ? AND used_at IS NULL",
        [normalizedEmail],
      );

      const resetCode = createResetCode();
      const expiresAt = addDays(new Date(), 1);
      expiresAt.setHours(expiresAt.getHours() - 23, expiresAt.getMinutes() + 15);

      await pool.query(
        `
          INSERT INTO password_resets (user_id, email, reset_code, expires_at)
          VALUES (?, ?, ?, ?)
        `,
        [user.id, normalizedEmail, resetCode, expiresAt],
      );

      res.json({
        ok: true,
        message:
          "Codigo de recuperacion generado. En produccion esto se enviaria por correo.",
        resetCode,
      });
    } catch (error) {
      console.log("Error forgot password:", error.message || error);
      sendError(res, 500, "Unable to generate reset code");
    }
  });

  router.post("/reset-password", async (req, res) => {
    try {
      const normalizedEmail = normalizeEmail(req.body?.email);
      const normalizedCode = normalizeText(req.body?.code, 12);
      const password = String(req.body?.password || "");

      if (!normalizedEmail || !normalizedCode || !password) {
        sendError(res, 400, "Email, code and password are required");
        return;
      }

      if (password.length < 6) {
        sendError(res, 400, "Password must be at least 6 characters");
        return;
      }

      const [resetRows] = await pool.query(
        `
          SELECT id, user_id, expires_at, used_at
          FROM password_resets
          WHERE email = ? AND reset_code = ?
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [normalizedEmail, normalizedCode],
      );
      const resetRequest = resetRows[0];

      if (!resetRequest) {
        sendError(res, 400, "Invalid recovery code");
        return;
      }

      if (resetRequest.used_at) {
        sendError(res, 400, "Recovery code already used");
        return;
      }

      if (new Date(resetRequest.expires_at) < new Date()) {
        sendError(res, 400, "Recovery code expired");
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [
        passwordHash,
        resetRequest.user_id,
      ]);

      await pool.query(
        "UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE id = ?",
        [resetRequest.id],
      );

      await pool.query("DELETE FROM sessions WHERE user_id = ?", [resetRequest.user_id]);

      res.json({ ok: true, message: "Password updated successfully" });
    } catch (error) {
      console.log("Error reset password:", error.message || error);
      sendError(res, 500, "Unable to reset password");
    }
  });

  router.get("/me", async (req, res) => {
    try {
      const auth = await requireSessionUser(req, res);
      if (!auth) {
        return;
      }
      const { session } = auth;

      const prefRow = await getUserPreferences(session.user_id);
      res.json({
        user: {
          id: session.user_id,
          username: session.username,
          email: session.email,
          avatar: session.avatar,
          bio: session.bio,
          plan: session.plan,
          role: roleForEmail(session.email, session.role),
          accountStatus: session.account_status,
          language: session.language,
          theme: session.theme,
          notifications: prefRow ? JSON.parse(prefRow.notifications_json) : {},
          privacy: prefRow ? JSON.parse(prefRow.privacy_json) : {},
        },
      });
    } catch (error) {
      console.log("Error me:", error.message || error);
      sendError(res, 500, "Unable to fetch session user");
    }
  });

  router.post("/logout", async (req, res) => {
    try {
      const token = parseAuthToken(req);
      if (!token) {
        res.status(200).json({ ok: true });
        return;
      }

      await pool.query("DELETE FROM sessions WHERE token = ?", [token]);
      res.json({ ok: true });
    } catch (error) {
      console.log("Error logout:", error.message || error);
      sendError(res, 500, "Logout failed");
    }
  });

  router.patch("/profile", async (req, res) => {
    try {
      const auth = await requireSessionUser(req, res);
      if (!auth) {
        return;
      }
      const { session } = auth;

      const username = normalizeText(req.body?.username || session.username, 80);
      const email = normalizeEmail(req.body?.email || session.email);
      const bio = normalizeText(req.body?.bio || "", 320);
      const avatar = limitDataUrl(req.body?.avatar);

      if (!username || !email || !isValidEmail(email)) {
        sendError(res, 400, "Invalid profile payload");
        return;
      }

      await pool.query(
        "UPDATE users SET username = ?, email = ?, bio = ?, avatar = ? WHERE id = ?",
        [username, email, bio, avatar, session.user_id],
      );

      res.json({ ok: true });
    } catch (error) {
      console.log("Error patch profile:", error.message || error);
      sendError(res, 500, "Profile update failed");
    }
  });

  router.patch("/preferences", async (req, res) => {
    try {
      const auth = await requireSessionUser(req, res);
      if (!auth) {
        return;
      }
      const { session } = auth;

      const language = ensureEnum(req.body?.language, ["es", "en"], session.language);
      const theme = ensureEnum(req.body?.theme, ["night", "aurora", "daylight"], session.theme);
      const accountStatus = ensureEnum(req.body?.accountStatus, ["active", "paused"], session.account_status);
      const plan = ensureEnum(req.body?.plan, ["Premium", "Student"], session.plan);
      const notifications = normalizeBooleanRecord(req.body?.notifications, [
        "trendAlerts",
        "weeklyReports",
        "mentions",
        "appUpdates",
      ]);
      const privacy = normalizeBooleanRecord(req.body?.privacy, [
        "publicProfile",
        "showStats",
        "allowMessages",
      ]);

      await pool.query(
        "UPDATE users SET language = ?, theme = ?, account_status = ?, plan = ? WHERE id = ?",
        [
          language,
          theme,
          accountStatus,
          plan,
          session.user_id,
        ],
      );

      const currentPrefs = (await getUserPreferences(session.user_id)) || {
        notifications_json: JSON.stringify({}),
        privacy_json: JSON.stringify({}),
      };

      const mergedNotifications = {
        ...JSON.parse(currentPrefs.notifications_json),
        ...(notifications || {}),
      };
      const mergedPrivacy = {
        ...JSON.parse(currentPrefs.privacy_json),
        ...(privacy || {}),
      };

      await pool.query(
        `
          INSERT INTO user_preferences (user_id, notifications_json, privacy_json)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE
            notifications_json = VALUES(notifications_json),
            privacy_json = VALUES(privacy_json)
        `,
        [
          session.user_id,
          JSON.stringify(mergedNotifications),
          JSON.stringify(mergedPrivacy),
        ],
      );

      res.json({ ok: true });
    } catch (error) {
      console.log("Error patch preferences:", error.message || error);
      sendError(res, 500, "Preferences update failed");
    }
  });

  return router;
}
