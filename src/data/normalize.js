function number(value, name) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`Candle inválido: ${name}`);
  return n;
}

function timestamp(value) {
  let t = number(value, 'timestamp');

  // A Data API pode entregar Unix time em segundos ou milissegundos.
  // O contrato interno do Ochama é sempre milissegundos.
  if (Math.abs(t) < 1e12) t *= 1000;

  const date = new Date(t);
  if (!Number.isFinite(date.getTime())) {
    throw new Error('Candle inválido: timestamp');
  }

  return t;
}

export function normalizeCandles(rows) {
  if (!Array.isArray(rows)) throw new TypeError('Candles precisam ser uma lista');

  return rows.map((row, index) => {
    const candle = {
      // Aceita o contrato canônico futuro e o contrato legado do OChart (t/o/h/l/c/v).
      timestamp: timestamp(row.timestamp ?? row.t),
      open: number(row.open ?? row.o, 'open'),
      high: number(row.high ?? row.h, 'high'),
      low: number(row.low ?? row.l, 'low'),
      close: number(row.close ?? row.c, 'close'),
      volume: number(row.volume ?? row.v ?? 0, 'volume')
    };

    if (candle.high < candle.low || candle.high < candle.open || candle.high < candle.close ||
        candle.low > candle.open || candle.low > candle.close) {
      throw new Error(`Candle OHLC inválido no índice ${index}`);
    }
    return candle;
  });
}
