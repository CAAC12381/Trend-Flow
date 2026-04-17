export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function normalizeText(value, maxLength = 255) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function normalizeOptionalText(value, maxLength = 255) {
  const normalized = normalizeText(value, maxLength);
  return normalized || null;
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase().slice(0, 190);
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

export function ensureEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

export function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeBooleanRecord(value, allowedKeys) {
  const result = {};
  const source = isRecord(value) ? value : {};

  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      result[key] = Boolean(source[key]);
    }
  }

  return result;
}

export function normalizeAssistantMessages(messages, maxItems = 12, maxChars = 1200) {
  const source = Array.isArray(messages) ? messages : [];

  return source
    .filter(
      (message) =>
        message &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string",
    )
    .slice(-maxItems)
    .map((message) => ({
      role: message.role,
      content: normalizeText(message.content, maxChars),
    }))
    .filter((message) => message.content);
}

export function normalizeAudienceBreakdown(items, maxItems = 8) {
  const source = Array.isArray(items) ? items : [];

  return source
    .map((item) => ({
      name: normalizeText(item?.name, 60),
      value: clamp(Number.parseInt(String(item?.value || 0), 10) || 0, 0, 100),
    }))
    .filter((item) => item.name)
    .slice(0, maxItems);
}

export function limitDataUrl(value, maxChars = 600000) {
  if (!value) {
    return null;
  }

  const dataUrl = String(value);
  if (!dataUrl.startsWith("data:image/")) {
    return null;
  }

  return dataUrl.length <= maxChars ? dataUrl : null;
}
