# Trend Flow

Trend Flow es una plataforma de deteccion y monitoreo de tendencias en redes y medios digitales. Su objetivo no es prometer precision absoluta en todas las capas analiticas, sino ofrecer una herramienta clara de apoyo a decision para explorar temas en crecimiento, compararlos y explicar su contexto.

## Proposito academico

Este proyecto esta pensado como un prototipo funcional defendible en un entorno universitario:

- Recolecta tendencias base desde fuentes externas reales.
- Calcula metricas derivadas como crecimiento, score y comparacion temporal.
- Agrega capas estimadas o heuristicas para enriquecer la lectura: sentimiento, riesgo, geografia, formato sugerido y audiencia.
- Expone de forma mas transparente que datos son reales, estimados o heuristicas.

## Stack

- Frontend: React + Vite + TypeScript
- UI: Tailwind + Recharts + componentes reutilizables
- Backend: Express
- Base de datos: MySQL
- Fuentes externas: Google Trends, Reddit, Hacker News, NewsAPI, YouTube Data API
- IA opcional: OpenRouter para enriquecimiento y asistente

## Arquitectura general

- `src/`
  Frontend de Trend Flow con vistas de Dashboard, Tendencias, Analisis, Configuracion y Login.
- `backend/server.js`
  Punto de entrada del backend.
- `backend/routes/`
  Rutas separadas por responsabilidad:
  - `trends-routes.js`
  - `assistant-routes.js`
  - `user-data-routes.js`
- `backend/services/`
  Logica reutilizable de tendencias, procedencia de datos y respuestas del asistente.
- `backend/auth-routes.js`
  Registro, login, sesion, perfil y preferencias.
- `backend/db.js`
  Inicializacion de base de datos y esquema.

## Flujo de datos

1. El backend consulta fuentes externas y normaliza temas base.
2. Trend Flow calcula crecimiento, score, estado y sparklines.
3. Para las tendencias principales se agrega enriquecimiento heuristico o con IA.
4. Las capturas se almacenan como snapshots para comparacion temporal e historial.
5. El frontend consume resumentes de dashboard, tendencias y analytics.
6. La UI muestra notas metodologicas y badges de procedencia para distinguir capas reales, estimadas y heuristicas.

## Variables de entorno recomendadas

- `PORT`
- `API_BASE_URL`
- `CORS_ORIGIN`
- `JSON_LIMIT`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `NEWS_API_KEY`
- `YOUTUBE_API_KEY`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`

## Como correr el proyecto

1. Instala dependencias:
   `npm install`
2. Levanta el frontend:
   `npm run dev`
3. Levanta el backend:
   `npm run dev:api`

## Endpoints principales

- `GET /health`
- `GET /viral-trends`
- `GET /dashboard-summary`
- `GET /analytics-summary`
- `GET /historical-trends?q=...`
- `POST /assistant/chat`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `PATCH /auth/profile`
- `PATCH /auth/preferences`

## Tablas creadas por backend/db.js

- `users`
  Perfil base del usuario.
- `sessions`
  Tokens de sesion y expiracion.
- `user_preferences`
  Notificaciones y privacidad por usuario.
- `trend_snapshots`
  Capturas historicas agregadas.
- `trend_items`
  Tendencias individuales asociadas a cada snapshot.
- `trend_enrichments`
  Enriquecimiento analitico por tendencia.
- `saved_reports`
  Reportes guardados por usuario.
- `notifications`
  Alertas de tendencias sincronizadas.
- `search_history`
  Historial de busquedas.
- `audience_demographics`
  Dataset demografico real o estimado.
- `password_resets`
  Recuperacion de contrasena.

## Relaciones de base de datos

- `users -> sessions`
- `users -> user_preferences`
- `users -> saved_reports`
- `users -> notifications`
- `users -> search_history`
- `users -> password_resets`
- `trend_snapshots -> trend_items`

## Limitaciones conocidas

- Algunas APIs externas pueden fallar, tener rate limits o requerir llaves activas.
- La capa de audiencia puede ser real o estimada segun la disponibilidad del dataset.
- Sentimiento, riesgo, recomendaciones y crisis son capas de apoyo metodologico, no mediciones oficiales.
- El proyecto prioriza claridad, demo y defensa academica por encima de escalado productivo.

## Trabajo futuro

- Agregar testing automatizado para rutas clave y componentes principales.
- Mejorar observabilidad y logging estructurado del backend.
- Incorporar fuentes adicionales y jobs programados de captura.
- Exportar reportes con pipeline dedicado en lugar de impresion desde navegador.
