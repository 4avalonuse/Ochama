import { registerStudy, STUDY_PLACEMENTS } from './study-registry.js';

function finite(value) { return Number.isFinite(value); }

function sourceValue(candle, source) {
  switch (source) {
    case 'open': return candle.open;
    case 'high': return candle.high;
    case 'low': return candle.low;
    case 'hl2': return (candle.high + candle.low) / 2;
    case 'hlc3': return (candle.high + candle.low + candle.close) / 3;
    case 'ohlc4': return (candle.open + candle.high + candle.low + candle.close) / 4;
    default: return candle.close;
  }
}

function calculateEma(values, period) {
  const result = new Array(values.length).fill(null);
  const safePeriod = Math.max(2, Math.floor(Number(period) || 12));
  if (values.length < safePeriod) return result;

  const seed = values.slice(0, safePeriod);
  if (!seed.every(finite)) return result;

  let ema = seed.reduce((sum, value) => sum + value, 0) / safePeriod;
  result[safePeriod - 1] = ema;
  const alpha = 2 / (safePeriod + 1);

  for (let i = safePeriod; i < values.length; i += 1) {
    if (!finite(values[i])) continue;
    ema = (values[i] * alpha) + (ema * (1 - alpha));
    result[i] = ema;
  }

  return result;
}

function calculateMacd(candles, fastPeriod, slowPeriod, signalPeriod, source) {
  const values = candles.map(candle => sourceValue(candle, source));
  const fast = calculateEma(values, fastPeriod);
  const slow = calculateEma(values, slowPeriod);
  const macd = new Array(values.length).fill(null);

  for (let i = 0; i < values.length; i += 1) {
    if (finite(fast[i]) && finite(slow[i])) macd[i] = fast[i] - slow[i];
  }

  const firstMacdIndex = macd.findIndex(finite);
  const signal = new Array(values.length).fill(null);

  if (firstMacdIndex >= 0) {
    const macdSeries = macd.slice(firstMacdIndex);
    const signalSeries = calculateEma(macdSeries, signalPeriod);

    signalSeries.forEach((value, index) => {
      if (finite(value)) signal[firstMacdIndex + index] = value;
    });
  }

  const histogram = macd.map((value, index) =>
    finite(value) && finite(signal[index]) ? value - signal[index] : null
  );

  return { macd, signal, histogram };
}

function render(ctx, { candles, plot, config = {} }) {
  if (!candles?.length || !plot) return;

  const fastPeriod = Math.max(2, Math.min(200, Math.floor(Number(config.fastPeriod) || 12)));
  const slowPeriod = Math.max(fastPeriod + 1, Math.min(300, Math.floor(Number(config.slowPeriod) || 26)));
  const signalPeriod = Math.max(2, Math.min(100, Math.floor(Number(config.signalPeriod) || 9)));
  const source = ['open','high','low','close','hl2','hlc3','ohlc4'].includes(config.source) ? config.source : 'close';
  const macdColor = config.macdColor || '#dbe4ee';
  const signalColor = config.signalColor || '#f59e0b';
  const upColor = config.upColor || '#4ade80';
  const downColor = config.downColor || '#f871ee';

  const { macd, signal, histogram } = calculateMacd(
    candles,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    source
  );

  const visible = candles.map((candle, index) => ({
    candle,
    macd: macd[index],
    signal: signal[index],
    histogram: histogram[index]
  })).filter(item =>
    item.candle.timestamp >= plot.xMin &&
    item.candle.timestamp <= plot.xMax &&
    (finite(item.macd) || finite(item.signal) || finite(item.histogram))
  );

  if (!visible.length) return;

  const values = visible.flatMap(item =>
    [item.macd, item.signal, item.histogram].filter(finite)
  );

  let maxAbs = Math.max(...values.map(value => Math.abs(value)), 0);
  if (!(maxAbs > 0)) maxAbs = 1;

  const zeroY = plot.top + plot.height / 2;
  const valueToY = value => zeroY - (value / maxAbs) * (plot.height * 0.43);
  const xSpan = plot.xMax - plot.xMin || 1;
  const step = plot.width / Math.max(visible.length, 1);
  const barWidth = Math.max(1, Math.min(10, step * 0.68));

  ctx.save();

  ctx.strokeStyle = '#384555';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(plot.left, zeroY);
  ctx.lineTo(plot.left + plot.width, zeroY);
  ctx.stroke();

  visible.forEach(({ candle, histogram: value }) => {
    if (!finite(value)) return;

    const x = plot.left + ((candle.timestamp - plot.xMin) / xSpan) * plot.width;
    const y = valueToY(value);
    const height = Math.max(1, Math.abs(y - zeroY));

    ctx.fillStyle = value >= 0 ? upColor : downColor;
    ctx.fillRect(x - barWidth / 2, Math.min(y, zeroY), barWidth, height);
  });

  const drawLine = (key, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    let started = false;

    visible.forEach(item => {
      const value = item[key];
      if (!finite(value)) return;

      const x = plot.left + ((item.candle.timestamp - plot.xMin) / xSpan) * plot.width;
      const y = valueToY(value);

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    });

    if (started) ctx.stroke();
  };

  drawLine('macd', macdColor);
  drawLine('signal', signalColor);

  const latest = visible.at(-1);
  const label = [
    'MACD ' + fastPeriod + '/' + slowPeriod + '/' + signalPeriod,
    finite(latest?.macd) ? 'M ' + latest.macd.toFixed(4) : '',
    finite(latest?.signal) ? 'S ' + latest.signal.toFixed(4) : ''
  ].filter(Boolean).join(' · ');

  ctx.fillStyle = '#8b95a3';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(maxAbs.toFixed(4), plot.left + plot.width - 4, plot.top + 8);
  ctx.fillText('0', plot.left + plot.width - 4, zeroY);
  ctx.fillText((-maxAbs).toFixed(4), plot.left + plot.width - 4, plot.top + plot.height - 8);

  ctx.textAlign = 'left';
  ctx.fillStyle = macdColor;
  ctx.fillText(label, plot.left + 6, plot.top + 10);

  ctx.restore();
}

registerStudy({
  id: 'macd',
  name: 'MACD',
  placement: STUDY_PLACEMENTS.PANE,
  render
});
