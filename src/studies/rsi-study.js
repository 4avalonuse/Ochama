import { registerStudy, STUDY_PLACEMENTS } from './study-registry.js';

function finite(value) {
  return Number.isFinite(value);
}

function calculateRsi(candles, period = 14) {
  const safePeriod = Math.max(2, Math.floor(Number(period) || 14));
  const values = candles.map(c => c.close);
  const result = new Array(values.length).fill(null);
  if (values.length <= safePeriod) return result;

  let gain = 0;
  let loss = 0;

  for (let i = 1; i <= safePeriod; i += 1) {
    const change = values[i] - values[i - 1];
    if (change >= 0) gain += change;
    else loss -= change;
  }

  gain /= safePeriod;
  loss /= safePeriod;

  const toRsi = () => {
    if (loss === 0) return gain === 0 ? 50 : 100;
    const rs = gain / loss;
    return 100 - (100 / (1 + rs));
  };

  result[safePeriod] = toRsi();

  for (let i = safePeriod + 1; i < values.length; i += 1) {
    const change = values[i] - values[i - 1];
    const currentGain = change > 0 ? change : 0;
    const currentLoss = change < 0 ? -change : 0;

    gain = ((gain * (safePeriod - 1)) + currentGain) / safePeriod;
    loss = ((loss * (safePeriod - 1)) + currentLoss) / safePeriod;
    result[i] = toRsi();
  }

  return result;
}

function render(ctx, { candles, plot, config = {} }) {
  if (!candles?.length || !plot) return;

  const period = Math.max(2, Math.floor(Number(config.period) || 14));
  const levelLow = Math.max(0, Math.min(100, Number(config.levelLow) || 30));
  const levelMid = Math.max(0, Math.min(100, Number(config.levelMid) || 50));
  const levelHigh = Math.max(0, Math.min(100, Number(config.levelHigh) || 70));
  const lineColor = config.color || '#dbe4ee';
  const values = calculateRsi(candles, period);
  const visible = candles
    .map((candle, index) => ({ candle, value: values[index] }))
    .filter(item =>
      item.candle.timestamp >= plot.xMin &&
      item.candle.timestamp <= plot.xMax &&
      finite(item.value)
    );

  if (!visible.length) return;

  const xSpan = plot.xMax - plot.xMin || 1;
  const valueToY = value => plot.top + (1 - (value / 100)) * plot.height;

  ctx.save();
  ctx.strokeStyle = '#384555';
  ctx.lineWidth = 1;

  [levelLow, levelMid, levelHigh].forEach(level => {
    const y = valueToY(level);
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.left + plot.width, y);
    ctx.stroke();
  });

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  visible.forEach(({ candle, value }, index) => {
    const x = plot.left + ((candle.timestamp - plot.xMin) / xSpan) * plot.width;
    const y = valueToY(value);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  ctx.fillStyle = '#8b95a3';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  [100, levelHigh, levelMid, levelLow, 0].forEach(level => {
    const y = valueToY(level);
    ctx.fillText(String(level), plot.left + plot.width - 4, y);
  });

  const latest = visible.at(-1)?.value;
  if (finite(latest)) {
    ctx.textAlign = 'left';
    ctx.fillStyle = lineColor;
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText(`RSI ${period} · ${latest.toFixed(1)}`, plot.left + 6, plot.top + 10);
  }

  ctx.restore();
}

registerStudy({
  id: 'rsi',
  name: 'RSI',
  placement: STUDY_PLACEMENTS.PANE,
  render
});
