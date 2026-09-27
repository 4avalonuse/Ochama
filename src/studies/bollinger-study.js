import { registerStudy } from './study-registry.js';

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

function calculateBands(candles, period, multiplier, source) {
  const middle = new Array(candles.length).fill(null);
  const upper = new Array(candles.length).fill(null);
  const lower = new Array(candles.length).fill(null);
  const safePeriod = Math.max(2, Math.min(200, Math.floor(Number(period) || 20)));
  const safeMultiplier = Math.max(0.1, Math.min(10, Number(multiplier) || 2));
  const values = candles.map(candle => sourceValue(candle, source));

  for (let i = safePeriod - 1; i < values.length; i += 1) {
    const window = values.slice(i - safePeriod + 1, i + 1);
    if (!window.every(finite)) continue;
    const mean = window.reduce((sum, value) => sum + value, 0) / safePeriod;
    const variance = window.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / safePeriod;
    const deviation = Math.sqrt(Math.max(0, variance));
    middle[i] = mean;
    upper[i] = mean + safeMultiplier * deviation;
    lower[i] = mean - safeMultiplier * deviation;
  }

  return { middle, upper, lower };
}

function yRatio(value, min, max, scaleType, toScaleValue) {
  const a = toScaleValue(min, scaleType);
  const b = toScaleValue(max, scaleType);
  const v = toScaleValue(value, scaleType);
  if (![a, b, v].every(finite) || !(b > a)) return NaN;
  return (v - a) / (b - a);
}

function render(ctx, { candles, state, plot, config = {}, toScaleValue }) {
  if (!candles?.length || !plot) return;

  const period = Math.max(2, Math.min(200, Math.floor(Number(config.period) || 20)));
  const multiplier = Math.max(0.1, Math.min(10, Number(config.multiplier) || 2));
  const source = ['open','high','low','close','hl2','hlc3','ohlc4'].includes(config.source) ? config.source : 'close';
  const upperColor = /^#[0-9a-fA-F]{6}$/.test(config.upperColor || '') ? config.upperColor : '#60a5fa';
  const middleColor = /^#[0-9a-fA-F]{6}$/.test(config.middleColor || '') ? config.middleColor : '#f59e0b';
  const lowerColor = /^#[0-9a-fA-F]{6}$/.test(config.lowerColor || '') ? config.lowerColor : '#60a5fa';
  const fillColor = /^#[0-9a-fA-F]{6}$/.test(config.fillColor || '') ? config.fillColor : '#60a5fa';
  const showMiddle = config.showMiddle !== false;
  const showFill = config.showFill !== false;

  const bands = calculateBands(candles, period, multiplier, source);
  const visible = candles.map((candle, index) => ({
    candle,
    upper: bands.upper[index],
    middle: bands.middle[index],
    lower: bands.lower[index]
  })).filter(item =>
    item.candle.timestamp >= state.x.min &&
    item.candle.timestamp <= state.x.max &&
    [item.upper, item.middle, item.lower].some(finite)
  );
  if (!visible.length) return;

  const xSpan = state.x.max - state.x.min || 1;
  const point = item => {
    const x = plot.left + ((item.candle.timestamp - state.x.min) / xSpan) * plot.width;
    const upperRatio = yRatio(item.upper, state.y.min, state.y.max, state.yScaleType, toScaleValue);
    const middleRatio = yRatio(item.middle, state.y.min, state.y.max, state.yScaleType, toScaleValue);
    const lowerRatio = yRatio(item.lower, state.y.min, state.y.max, state.yScaleType, toScaleValue);
    return {
      x,
      upperY: finite(upperRatio) ? plot.top + (1 - upperRatio) * plot.height : NaN,
      middleY: finite(middleRatio) ? plot.top + (1 - middleRatio) * plot.height : NaN,
      lowerY: finite(lowerRatio) ? plot.top + (1 - lowerRatio) * plot.height : NaN
    };
  };

  ctx.save();

  if (showFill) {
    ctx.fillStyle = fillColor;
    ctx.globalAlpha = 0.08;
    ctx.beginPath();
    let started = false;
    visible.forEach(item => {
      const p = point(item);
      if (!finite(p.upperY)) return;
      if (!started) { ctx.moveTo(p.x, p.upperY); started = true; }
      else ctx.lineTo(p.x, p.upperY);
    });
    for (let i = visible.length - 1; i >= 0; i -= 1) {
      const p = point(visible[i]);
      if (finite(p.lowerY)) ctx.lineTo(p.x, p.lowerY);
    }
    if (started) { ctx.closePath(); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  const drawLine = (key, color, width = 1.35) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let started = false;
    visible.forEach(item => {
      const p = point(item);
      const y = p[key];
      if (!finite(y)) return;
      if (!started) { ctx.moveTo(p.x, y); started = true; }
      else ctx.lineTo(p.x, y);
    });
    if (started) ctx.stroke();
  };

  drawLine('upperY', upperColor);
  if (showMiddle) drawLine('middleY', middleColor, 1.5);
  drawLine('lowerY', lowerColor);

  const latest = visible.at(-1);
  const label = [
    'BB ' + period + ' · ' + multiplier,
    finite(latest?.middle) ? latest.middle.toLocaleString('en-US', { maximumFractionDigits: 2 }) : ''
  ].filter(Boolean).join(' · ');

  ctx.fillStyle = '#8b95a3';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(label, plot.left + 6, plot.top + 6);

  ctx.restore();
}

registerStudy({
  id: 'bollinger',
  name: 'Bollinger Bands',
  render
});
