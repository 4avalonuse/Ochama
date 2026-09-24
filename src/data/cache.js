export function createMemoryCache() {
  const values = new Map();
  return {
    get(key) { return values.get(key); },
    set(key, value) { values.set(key, value); return value; },
    clear() { values.clear(); }
  };
}
