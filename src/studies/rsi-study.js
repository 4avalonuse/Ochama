import { registerStudy, STUDY_PLACEMENTS } from './study-registry.js';

function calculateRsi(candles, period = 14) {
  const p = Math.max(2, Math.round(Number(period) || 14));
  const values = new Array(candles.length).fill(null);
  if (candles.length <= p) return values;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= p; i += 1) {
    const change = candles[i].close - candles[i - 1].close;
    if (change >= 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / p;
  let avgLoss = losses / p;
  values[p] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

  for (let i = p + 1; i < candles.length; i += 1) {
    const change = candles[i].close - candles[i - 1].close;
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    avgGain = ((avgGain * (p - 1)) + gain) / p;
    avgLoss = ((avgLoss * (p - 1)) + loss) / p;
    values[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  }

  return values;
}

function render(ctx, { candles, state, plot, config }) {
  if (!candles.length || !plot?.height) return;

  const period = config.period ?? 14;
  const values = calculateRsi(candles, period);
  const visible = candles
    .map((candle, index) => ({ candle, value: values[index] }))
    .filter(item =>
      item.value != null &&
      item.candle.timestamp >= state.x.min &&
      item.candle.timestamp <= state.x.max
    );

  ctx.save();

  [30, 50, 70].forEach(level => {
    const y = plot.top + (1 - level / 100) * plot.height;
    ctx.strokeStyle = level === 50 ? '#27364a' : '#34465b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.left + plot.width, y);
    ctx.stroke();

    ctx.fillStyle = '#718095';
    ctx.font = '9px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(level), plot.left + plot.width + 8, y);
  });

  const xSpan = state.x.max - state.x.min || 1;
  ctx.strokeStyle = '#dbe4ee';
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  let started = false;
  visible.forEach(({ candle, value }) => {
    const x = plot.left + ((candle.timestamp - state.x.min) / xSpan) * plot.width;
    const y = plot.top + (1 - value / 100) * plot.height;
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  });

  if (started) ctx.stroke();

  ctx.fillStyle = '#8b95a3';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`RSI ${Math.max(2, Math.round(Number(period) || 14))}`, plot.left, plot.top - 14);

  ctx.restore();
}

registerStudy({
  id: 'rsi',
  name: 'RSI',
  placement: STUDY_PLACEMENTS.PANE,
  render
});
