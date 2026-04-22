import express from "express";
import cors from "cors";
import { initDatabase } from "./db.js";
import { createAuthRouter } from "./auth-routes.js";
import { createTrendsRouter } from "./routes/trends-routes.js";
import { createAssistantRouter } from "./routes/assistant-routes.js";
import { createAdminRouter } from "./routes/admin-routes.js";
import { createUserDataRouter } from "./routes/user-data-routes.js";
import { CORS_ORIGIN, JSON_LIMIT, PORT, API_BASE_URL } from "./config.js";
import { sendError } from "./utils/http.js";

const app = express();

app.use(
  cors({
    origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN,
  }),
);
app.use(express.json({ limit: JSON_LIMIT }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "Trend Flow API",
    baseUrl: API_BASE_URL,
    timestamp: new Date().toISOString(),
  });
});

app.use("/auth", createAuthRouter());
app.use(createTrendsRouter());
app.use(createAssistantRouter());
app.use(createUserDataRouter());
app.use(createAdminRouter());

app.use((error, _req, res, _next) => {
  console.error("Unhandled API error:", error?.message || error);
  sendError(res, 500, "Internal server error", error?.message || error);
});

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en ${API_BASE_URL}`);
    });
  })
  .catch((error) => {
    console.error("Error inicializando base de datos:", error.message || error);
    process.exit(1);
  });
