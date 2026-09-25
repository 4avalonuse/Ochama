export function createDataClient(baseUrl) {
  const root = String(baseUrl).replace(/\/$/, '');

  async function request(path, options = {}) {
    const response = await fetch(`${root}${path}`, {
      ...options,
      headers: { Accept: 'application/json', ...(options.headers || {}) },
      cache: 'no-store'
    });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; }
    catch { throw new Error('Data API retornou JSON inválido'); }
    if (!response.ok) {
      throw new Error(payload?.error || payload?.message || `Data API HTTP ${response.status}`);
    }
    return payload;
  }

  return {
    async loadCandles({ provider, symbol, interval, currency = null, kind = 'ohlcv' }) {
      const catalog = await request('/api/datasets');
      if (!catalog?.ok || !Array.isArray(catalog.data)) {
        throw new Error('Contrato do catálogo inválido');
      }

      const dataset = catalog.data.find(item =>
        item?.provider === provider &&
        item?.symbol === symbol &&
        item?.interval === interval &&
        item?.kind === kind &&
        (currency == null || item?.currency === currency)
      );

      if (!dataset?.id) {
        throw new Error(`Dataset não encontrado: ${provider}/${symbol}/${interval}`);
      }

      const payload = await request(`/api/datasets/${encodeURIComponent(dataset.id)}`);
      if (!payload?.ok || !Array.isArray(payload.data)) {
        throw new Error('Contrato do dataset inválido');
      }
      return payload.data;
    }
  };
}