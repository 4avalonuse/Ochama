const STORAGE_KEY = 'ochama:chart-state:v1';

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(value) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {}
}

function keyFor({ symbol, provider, interval = '1d' }) {
  return `${provider}:${symbol}:${interval}`;
}

export function createChartStateStore() {
  return {
    load({ symbol, provider, interval = '1d' }) {
      const all = readAll();
      return all.charts?.[keyFor({ symbol, provider, interval })] || null;
    },

    save({ symbol, provider, interval = '1d' }, state) {
      const all = readAll();
      all.version = 1;
      all.charts = all.charts && typeof all.charts === 'object' ? all.charts : {};
      all.charts[keyFor({ symbol, provider, interval })] = {
        ...state,
        savedAt: Date.now()
      };
      writeAll(all);
    },

    loadSelection() {
      const all = readAll();
      return all.last || null;
    },

    saveSelection({ symbol, provider, interval = '1d' }) {
      const all = readAll();
      all.version = 1;
      all.last = { symbol, provider, interval };
      writeAll(all);
    }
  };
}
