const memoryCache = new Map();

export async function getCachedValue(key, ttlMs, loader) {
  const cached = memoryCache.get(key);
  const now = Date.now();

  if (cached?.value && cached.expiresAt > now) {
    return cached.value;
  }

  if (cached?.promise) {
    return cached.promise;
  }

  const promise = (async () => {
    try {
      const value = await loader();
      memoryCache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
      return value;
    } finally {
      const latest = memoryCache.get(key);
      if (latest?.promise) {
        memoryCache.set(key, {
          value: latest.value,
          expiresAt: latest.expiresAt || 0,
        });
      }
    }
  })();

  memoryCache.set(key, {
    value: cached?.value,
    expiresAt: cached?.expiresAt || 0,
    promise,
  });

  return promise;
}
