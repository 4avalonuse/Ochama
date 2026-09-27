import { registerStudy, STUDY_PLACEMENTS } from './study-registry.js';

function finite(value) { return Number.isFinite(value); }

function calculateAverage(values, period, type) {
  const result = new Array(values.length).fill(null);
  const safePeriod = Math.max(2, Math.floor(Number(period) || 20));
  if (type === 'ema') {
    const alpha = 2 / (safePeriod + 1);
    let average = null;
    values.forEach((value, index) => {
      if (!finite(value) || index < safePeriod - 1) return;
      if (average === null) {
        const seed = values.slice(index - safePeriod + 1, index + 1);
        if (!seed.every(finite)) return;
        average = seed.reduce((sum, item) => sum + item, 0) / safePeriod;
      } else average = (value * alpha) + (average * (1 - alpha));
      result[index] = average;
    });
    return result;
  }
  let sum = 0; const queue = [];
  values.forEach((value, index) => {
    queue.push(value); if (finite(value)) sum += value;
    if (queue.length > safePeriod) { const removed = queue.shift(); if (finite(removed)) sum -= removed; }
    if (queue.length === safePeriod && queue.every(finite)) result[index] = sum / safePeriod;
  });
  return result;
}

function render(ctx, { candles, plot, config = {} }) {
  if (!candles?.length || !plot) return;
  const upColor = config.upColor || '#4ade80';
  const downColor = config.downColor || '#f87171';
  const showAverage = config.showAverage !== false;
  const averagePeriod = Math.max(2, Math.min(200, Math.floor(Number(config.averagePeriod) || 20)));
  const averageType = config.averageType === 'ema' ? 'ema' : 'sma';
  const visible = candles.filter(c => c.timestamp >= plot.xMin && c.timestamp <= plot.xMax);
  if (!visible.length) return;
  const maxVolume = Math.max(...visible.map(c => Number(c.volume) || 0), 0);
  if (!(maxVolume > 0)) return;
  const xSpan = plot.xMax - plot.xMin || 1;
  const step = plot.width / Math.max(visible.length, 1);
  const barWidth = Math.max(1, Math.min(12, step * 0.68));
  const topPad = 14, bottomPad = 16, barHeight = Math.max(1, plot.height - topPad - bottomPad);

  ctx.save();
  visible.forEach(candle => {
    const volume = Math.max(0, Number(candle.volume) || 0);
    const x = plot.left + ((candle.timestamp - plot.xMin) / xSpan) * plot.width;
    const height = (volume / maxVolume) * barHeight;
    ctx.fillStyle = candle.close >= candle.open ? upColor : downColor;
    ctx.fillRect(x - barWidth / 2, plot.top + plot.height - bottomPad - height, barWidth, height);
  });

  if (showAverage) {
    const values = candles.map(c => Math.max(0, Number(c.volume) || 0));
    const averages = calculateAverage(values, averagePeriod, averageType);
    ctx.strokeStyle = config.averageColor || '#f59e0b';
    ctx.lineWidth = 1.5; ctx.beginPath();
    let started = false;
    visible.forEach(candle => {
      const index = candles.indexOf(candle), average = averages[index];
      if (!finite(average)) return;
      const x = plot.left + ((candle.timestamp - plot.xMin) / xSpan) * plot.width;
      const y = plot.top + plot.height - bottomPad - ((average / maxVolume) * barHeight);
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    });
    if (started) ctx.stroke();
  }

  ctx.fillStyle = '#8b95a3';
  ctx.font = '10px system-ui, sans-serif';
  ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.fillText('VOL' + (showAverage ? ' · ' + averageType.toUpperCase() + ' ' + averagePeriod : ''), plot.left + plot.width - 4, plot.top + 4);
  ctx.restore();
}

registerStudy({ id: 'volume', name: 'Volume', placement: STUDY_PLACEMENTS.PANE, render });
