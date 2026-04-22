import mysql from "mysql2/promise";
import { loadLocalEnv } from "./load-env.js";
import { ADMIN_EMAILS } from "./config.js";

loadLocalEnv();

const DB_HOST = process.env.DB_HOST || "127.0.0.1";
const DB_PORT = Number.parseInt(process.env.DB_PORT || "3306", 10);
const DB_USER = process.env.DB_USER || "root";
const DB_PASSWORD = process.env.DB_PASSWORD || "";
const DB_NAME = process.env.DB_NAME || "treend_db";

const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function initDatabase() {
  const bootstrapPool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 2,
    queueLimit: 0,
  });

  await bootstrapPool.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await bootstrapPool.end();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(80) NOT NULL,
      email VARCHAR(190) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      avatar LONGTEXT NULL,
      bio TEXT NULL,
      plan ENUM('Premium','Student') NOT NULL DEFAULT 'Premium',
      role ENUM('user','admin') NOT NULL DEFAULT 'user',
      account_status ENUM('active','paused') NOT NULL DEFAULT 'active',
      language ENUM('es','en') NOT NULL DEFAULT 'es',
      theme ENUM('night','aurora','daylight') NOT NULL DEFAULT 'night',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    ALTER TABLE users
    MODIFY theme ENUM('night','aurora','daylight') NOT NULL DEFAULT 'night'
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role ENUM('user','admin') NOT NULL DEFAULT 'user'
    AFTER plan
  `);

  if (ADMIN_EMAILS.length > 0) {
    await pool.query(
      "UPDATE users SET role = 'admin' WHERE LOWER(email) IN (?)",
      [ADMIN_EMAILS],
    );
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      INDEX idx_sessions_user (user_id),
      CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id INT PRIMARY KEY,
      notifications_json JSON NOT NULL,
      privacy_json JSON NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS trend_snapshots (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      captured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      source_count INT NOT NULL DEFAULT 0,
      total_mentions BIGINT NOT NULL DEFAULT 0,
      INDEX idx_trend_snapshots_captured (captured_at)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS trend_items (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      snapshot_id BIGINT NOT NULL,
      palabra VARCHAR(255) NOT NULL,
      menciones BIGINT NOT NULL DEFAULT 0,
      source ENUM('google','reddit','hackernews','news','youtube') NOT NULL,
      crecimiento INT NOT NULL DEFAULT 0,
      score INT NOT NULL DEFAULT 0,
      estado VARCHAR(50) NOT NULL,
      url TEXT NULL,
      embed_url TEXT NULL,
      tags_json JSON NOT NULL,
      sparkline_json JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_trend_items_snapshot (snapshot_id),
      INDEX idx_trend_items_palabra (palabra),
      FULLTEXT INDEX ft_trend_items_search (palabra),
      CONSTRAINT fk_trend_items_snapshot FOREIGN KEY (snapshot_id) REFERENCES trend_snapshots(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS saved_reports (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      report_type ENUM('analytics','dashboard','trends') NOT NULL DEFAULT 'analytics',
      title VARCHAR(180) NOT NULL,
      format ENUM('pdf','json') NOT NULL DEFAULT 'pdf',
      payload_json JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_saved_reports_user_created (user_id, created_at),
      CONSTRAINT fk_saved_reports_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      trend_key VARCHAR(255) NOT NULL,
      title VARCHAR(200) NOT NULL,
      description VARCHAR(255) NOT NULL,
      meta VARCHAR(255) NOT NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      read_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_notifications_user_trend (user_id, trend_key),
      INDEX idx_notifications_user_read_created (user_id, is_read, created_at),
      CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS search_history (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      query VARCHAR(180) NOT NULL,
      normalized_query VARCHAR(180) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_search_history_user_created (user_id, created_at),
      INDEX idx_search_history_norm (normalized_query),
      CONSTRAINT fk_search_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audience_demographics (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      source ENUM('google','reddit','hackernews','news','youtube','global') NOT NULL DEFAULT 'global',
      age_json JSON NOT NULL,
      gender_json JSON NOT NULL,
      is_real TINYINT(1) NOT NULL DEFAULT 0,
      provider VARCHAR(120) NOT NULL DEFAULT 'estimated-model',
      note VARCHAR(255) NULL,
      captured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_audience_source_captured (source, captured_at)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      email VARCHAR(190) NOT NULL,
      reset_code VARCHAR(12) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_password_resets_email (email),
      INDEX idx_password_resets_code (reset_code),
      CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS trend_enrichments (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      trend_key VARCHAR(320) NOT NULL UNIQUE,
      palabra VARCHAR(255) NOT NULL,
      source ENUM('google','reddit','hackernews','news','youtube') NOT NULL,
      sentiment ENUM('positive','negative','mixed') NOT NULL DEFAULT 'mixed',
      tone VARCHAR(60) NOT NULL DEFAULT 'neutral',
      risk_level ENUM('low','medium','high') NOT NULL DEFAULT 'low',
      lifecycle ENUM('Emerging','Peak','Fading') NOT NULL DEFAULT 'Emerging',
      confidence_score INT NOT NULL DEFAULT 50,
      context_labels_json JSON NOT NULL,
      action_ideas_json JSON NOT NULL,
      seo_keywords_json JSON NOT NULL,
      geo_regions_json JSON NOT NULL,
      recommended_format VARCHAR(60) NOT NULL DEFAULT 'short_video',
      summary TEXT NOT NULL,
      provider VARCHAR(120) NOT NULL DEFAULT 'heuristic-engine',
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_trend_enrichments_source_updated (source, updated_at)
    )
  `);
}

export default pool;
