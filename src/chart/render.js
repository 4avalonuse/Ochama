import { normalizeScaleType, toScaleValue, fromScaleValue } from '../viewport/scale.js';
import { createPlotGeometry } from './plot-geometry.js';
import { createDrawingTransform } from '../drawing/render/transform.js';
import { createDrawingRenderer } from '../drawing/render/drawing-renderer.js';

function finite(value) {
  return Number.isFinite(value);
}

function formatPrice(value) {
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 1) return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return value.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

function yRatio(value, min, max, scaleType) {
  const a = toScaleValue(min, scaleType);
  const b = toScaleValue(max, scaleType);
  const v = toScaleValue(value, scaleType);
  if (![a, b, v].every(Number.isFinite) || !(b > a)) return NaN;
  return (v - a) / (b - a);
}

function drawGrid(ctx, width, height, plot, yMin, yMax, scaleType) {
  ctx.save();
  ctx.strokeStyle = '#202832';
  ctx.lineWidth = 1;

  for (let i = 0; i <= 5; i += 1) {
    const y = plot.top + (plot.height * i) / 5;
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.left + plot.width, y);
    ctx.stroke();
  }

  for (let i = 0; i <= 6; i += 1) {
    const x = plot.left + (plot.width * i) / 6;
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.top + plot.height);
    ctx.stroke();
  }

  ctx.fillStyle = '#8b95a3';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const minScaled = toScaleValue(yMin, scaleType);
  const maxScaled = toScaleValue(yMax, scaleType);
  for (let i = 0; i <= 5; i += 1) {
    const scaled = maxScaled - ((maxScaled - minScaled) * i) / 5;
    const value = fromScaleValue(scaled, scaleType);
    const y = plot.top + (plot.height * i) / 5;
    ctx.fillText(formatPrice(value), plot.left + plot.width + 8, y);
  }

  ctx.restore();
}

function drawCandles(ctx, candles, state, plot) {
  const visible = candles.filter(c => c.timestamp >= state.x.min && c.timestamp <= state.x.max);
  if (!visible.length) return;

  const step = plot.width / Math.max(visible.length, 1);
  const bodyWidth = Math.max(2, Math.min(10, step * 0.62));

  ctx.save();
  ctx.lineWidth = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  visible.forEach(candle => {
    const highRatio = yRatio(candle.high, state.y.min, state.y.max, state.yScaleType);
    const lowRatio = yRatio(candle.low, state.y.min, state.y.max, state.yScaleType);
    const openRatio = yRatio(candle.open, state.y.min, state.y.max, state.yScaleType);
    const closeRatio = yRatio(candle.close, state.y.min, state.y.max, state.yScaleType);
    if (![highRatio, lowRatio, openRatio, closeRatio].every(Number.isFinite)) return;

    const xSpan = state.x.max - state.x.min || 1;
    const x = plot.left + ((candle.timestamp - state.x.min) / xSpan) * plot.width;
    const yHigh = plot.top + (1 - highRatio) * plot.height;
    const yLow = plot.top + (1 - lowRatio) * plot.height;
    const yOpen = plot.top + (1 - openRatio) * plot.height;
    const yClose = plot.top + (1 - closeRatio) * plot.height;
    const rising = candle.close >= candle.open;
    const top = Math.min(yOpen, yClose);
    const bodyHeight = Math.max(1, Math.abs(yClose - yOpen));

    ctx.strokeStyle = rising ? '#4ade80' : '#f87171';
    ctx.fillStyle = rising ? '#4ade80' : '#f87171';

    ctx.beginPath();
    ctx.moveTo(x, yHigh);
    ctx.lineTo(x, yLow);
    ctx.stroke();
    ctx.fillRect(x - bodyWidth / 2, top, bodyWidth, bodyHeight);
  });

  ctx.restore();
}
function drawLine(ctx, candles, state, plot) {
  const visible = candles.filter(c => c.timestamp >= state.x.min && c.timestamp <= state.x.max);
  if (visible.length < 2) return;

  const xSpan = state.x.max - state.x.min || 1;
  ctx.save();
  ctx.strokeStyle = '#dbe4ee';
  ctx.lineWidth = 2;
  ctx.beginPath();

  let started = false;
  visible.forEach(candle => {
    const ratio = yRatio(candle.close, state.y.min, state.y.max, state.yScaleType);
    if (!Number.isFinite(ratio)) return;
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
  ctx.restore();
}

export function createChart(host, candles, viewport, drawingManager = null) {
  const canvas = document.createElement('canvas');
  canvas.className = 'chart-canvas';
  canvas.setAttribute('aria-label', 'Gráfico de candles BTC-USD');
  host.prepend(canvas);

  const ctx = canvas.getContext('2d');
  const drawingRenderer = createDrawingRenderer();
  if (!ctx) throw new Error('Canvas 2D indisponível');
  let drawingPreview = null;
  let selectedDrawingId = null;
  let chartType = 'candle';

  function resize() {
    const rect = host.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    draw();
  }

  function draw() {
    const width = host.clientWidth;
    const height = host.clientHeight;
    const state = viewport.getState();

    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (!candles.length || !finite(state.y.min) || !finite(state.y.max) || state.y.max <= state.y.min) return;
    if (state.yScaleType === 'logarithmic' && state.y.min <= 0) return;

    const plot = createPlotGeometry(width, height);

    drawGrid(ctx, width, height, plot, state.y.min, state.y.max, normalizeScaleType(state.yScaleType));
    if (chartType === 'line') drawLine(ctx, candles, state, plot);
    else drawCandles(ctx, candles, state, plot);

    if (drawingManager) {
      const transform = createDrawingTransform({ viewport, plot });
      drawingRenderer.render(ctx, drawingManager.getDrawings(), transform, selectedDrawingId);
      if (drawingPreview) drawingRenderer.render(ctx, [drawingPreview], transform);
    }
  }

  function setChartType(type) {
    chartType = type === 'line' ? 'line' : 'candle';
    draw();
  }

  function setSelectedDrawingId(id) {
    selectedDrawingId = id || null;
    draw();
  }

  function setDrawingPreview(drawing) {
    drawingPreview = drawing || null;
    draw();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  return {
    canvas,
    draw,
    setDrawingPreview,
    setSelectedDrawingId,
    setChartType,
    destroy() {
      observer.disconnect();
      canvas.remove();
    }
  };
}