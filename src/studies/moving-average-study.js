import { registerStudy } from './study-registry.js';
import { calculateMovingAverage } from '../indicators/moving-average.js';

function finite(value) {
  return Number.isFinite(value);
}

function yRatio(value, min, max, scaleType, toScaleValue) {
  const a = toScaleValue(min, scaleType);
  const b = toScaleValue(max, scaleType);
  const v = toScaleValue(value, scaleType);
  if (![a, b, v].every(finite) || !(b > a)) return NaN;
  return (v - a) / (b - a);
}

function render(ctx, { candles, state, plot, studies, toScaleValue }) {
  const visible = candles.filter(c => c.timestamp >= state.x.min && c.timestamp <= state.x.max);
  if (!visible.length || !studies.length) return;

  const palette = ['#f59e0b','#a78bfa','#22d3ee','#fb7185','#4ade80','#f472b6'];
  const xSpan = state.x.max - state.x.min || 1;

  ctx.save();
  ctx.lineWidth = 1.7;
  ctx.lineJoin = 'round';

  studies.forEach((config, index) => {
    if (config.visible === false) return;

    const calculated = calculateMovingAverage(candles, config);
    const color = /^#[0-9a-fA-F]{6}$/.test(config.color || '')
      ? config.color
      : palette[index % palette.length];

    let started = false;
    ctx.strokeStyle = color;
    ctx.beginPath();

    candles.forEach((candle, i) => {
      const value = calculated.values[i];
      if (!finite(value) || candle.timestamp < state.x.min || candle.timestamp > state.x.max) return;

      const ratio = yRatio(value, state.y.min, state.y.max, state.yScaleType, toScaleValue);
      if (!finite(ratio)) return;

      const x = plot.left + ((candle.timestamp - state.x.min) / xSpan) * plot.width;
      const y = plot.top + (1 - ratio) * plot.height;

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    });

    if (started) ctx.stroke();
  });

  ctx.restore();
}

registerStudy({
  id: 'moving-average',
  name: 'Moving Average',
  render
});
