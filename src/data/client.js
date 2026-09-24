export function createDataClient(baseUrl) {
  const root = String(baseUrl).replace(/\/$/, '');

  return {
    async loadCandles({ provider, symbol, interval }) {
      const params = new URLSearchParams({ provider, symbol, interval });
      const response = await fetch(`${root}/candles?${params}`);
      if (!response.ok) {
        throw new Error(`Data API HTTP ${response.status}`);
      }
      const payload = await response.json();
      if (!payload?.data || !Array.isArray(payload.data)) {
        throw new Error('Data API: resposta de candles inválida');
      }
      return payload.data;
    }
  };
}
