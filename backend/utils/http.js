export function sendError(res, status, message, detail) {
  const payload = { error: message };

  if (detail && process.env.NODE_ENV !== "production") {
    payload.detail = String(detail);
  }

  return res.status(status).json(payload);
}

export function asyncRoute(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}
