import { normalizeScaleType, toScaleValue, fromScaleValue } from '../viewport/scale.js';
import { createPlotGeometry } from './plot-geometry.js';
import { createDrawingTransform } from '../drawing/render/transform.js';
import { createDrawingRenderer } from '../drawing/render/drawing-renderer.js';
import { listStudies } from '../studies/study-registry.js';
import '../studies/index.js';

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

function formatDateLabel(timestamp, span) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return '';
  if (span <= 2 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' }) + ' ' +
      date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  if (span <= 120 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function drawGrid(ctx, width, height, plot, yMin, yMax, scaleType, xMin, xMax) {
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

  const xSpan = xMax - xMin;
  if (Number.isFinite(xMin) && Number.isFinite(xMax) && xSpan > 0) {
    ctx.fillStyle = '#8b95a3';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.strokeStyle = '#304052';
    ctx.lineWidth = 1;

    const axisY = plot.top + plot.height;
    ctx.beginPath();
    ctx.moveTo(plot.left, axisY);
    ctx.lineTo(plot.left + plot.width, axisY);
    ctx.stroke();

    // Fundo temporal: a unidade visual acompanha o zoom.
    // Longe = ano, médio = mês, perto = semana.
    const DAY = 24 * 60 * 60 * 1000;
    const MONTH = 30 * DAY;
    const YEAR = 365 * DAY;
    const unit = xSpan > 2 * YEAR ? 'year' : xSpan > 120 * DAY ? 'month' : 'week';

    const startDate = new Date(xMin);
    let cursor;
    if (unit === 'year') cursor = new Date(startDate.getFullYear(), 0, 1);
    else if (unit === 'month') cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    else {
      cursor = new Date(startDate);
      cursor.setHours(0, 0, 0, 0);
      cursor.setDate(cursor.getDate() - cursor.getDay());
    }

    ctx.save();
    ctx.globalAlpha = 0.16;
    let bandIndex = 0;
    while (cursor.getTime() < xMax) {
      const nextCursor = new Date(cursor);
      if (unit === 'year') nextCursor.setFullYear(nextCursor.getFullYear() + 1);
      else if (unit === 'month') nextCursor.setMonth(nextCursor.getMonth() + 1);
      else nextCursor.setDate(nextCursor.getDate() + 7);

      const bandStart = Math.max(xMin, cursor.getTime());
      const bandEnd = Math.min(xMax, nextCursor.getTime());
      if (bandEnd > bandStart) {
        const left = plot.left + ((bandStart - xMin) / xSpan) * plot.width;
        const right = plot.left + ((bandEnd - xMin) / xSpan) * plot.width;
        const hue = unit === 'year'
          ? 208 + (bandIndex % 2) * 12
          : unit === 'month'
            ? 214 + (bandIndex % 2) * 10
            : 220 + (bandIndex % 2) * 8;
        ctx.fillStyle = `hsla(${hue}, 35%, 34%, .42)`;
        ctx.fillRect(left, plot.top, Math.max(1, right - left), plot.height);
      }
      cursor = nextCursor;
      bandIndex += 1;
    }
    ctx.restore();

    const zoomPhase = Math.log10(Math.max(1, xSpan)) * 37.5;
    const hue = ((zoomPhase % 28) + 28) % 28 + 205;
    const paddingX = 5;
    const labelHeight = 17;
    const candidates = [];

    for (let i = 0; i <= 6; i += 1) {
      const ratio = i / 6;
      const x = plot.left + plot.width * ratio;
      const timestamp = xMin + xSpan * ratio;
      const label = formatDateLabel(timestamp, xSpan);
      if (!label) continue;

      ctx.textAlign = 'center';
      const metrics = ctx.measureText(label);
      const labelWidth = metrics.width + paddingX * 2;
      let labelLeft = x - labelWidth / 2;
      if (i === 0) labelLeft = x;
      if (i === 6) labelLeft = x - labelWidth;

      candidates.push({ i, x, label, labelLeft, labelWidth });
    }

    // Evita sobreposição: em janelas de 1 minuto os textos ficam longos
    // e o eixo passa a mostrar apenas o que cabe de verdade.
    const selected = [];
    const gap = 8;
    candidates.forEach(candidate => {
      const right = candidate.labelLeft + candidate.labelWidth;
      const previous = selected.at(-1);
      if (previous && candidate.labelLeft < previous.right + gap) return;
      selected.push({ ...candidate, right });
    });

    // Mantém as extremidades legíveis quando existe espaço para elas.
    if (candidates.length && selected.length === 1 && candidates.length > 1) {
      const last = candidates.at(-1);
      const lastRight = last.labelLeft + last.labelWidth;
      if (last.labelLeft >= selected[0].right + gap || selected[0].i === 0) {
        selected.push({ ...last, right:lastRight });
      }
    }

    candidates.forEach(({ x }) => {
      ctx.beginPath();
      ctx.moveTo(x, axisY);
      ctx.lineTo(x, axisY + 4);
      ctx.stroke();
    });

    selected.forEach(({ i, x, label, labelLeft, labelWidth }) => {
      ctx.textAlign = i === 0 ? 'left' : i === 6 ? 'right' : 'center';

      ctx.fillStyle = `hsla(${hue}, 32%, 28%, .62)`;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(labelLeft, axisY + 4, labelWidth, labelHeight, 5);
      } else {
        ctx.rect(labelLeft, axisY + 4, labelWidth, labelHeight);
      }
      ctx.fill();

      ctx.fillStyle = '#9aa6b5';
      ctx.fillText(label, x, axisY + 7);
    });
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
function studyId(item) {
  return item.study || (item.type === 'sma' || item.type === 'ema' ? 'moving-average' : null);
}

function getPaneStudies(studies) {
  return listStudies()
    .filter(study => study.placement === 'pane')
    .map(study => ({ study, configs: studies.filter(item => studyId(item) === study.id && item.visible !== false) }))
    .filter(item => item.configs.length);
}

function createPanePlot(width, top, height, mainPlot, state) {
  return {
    left: mainPlot.left,
    top,
    width: mainPlot.width,
    height,
    xMin: state.x.min,
    xMax: state.x.max
  };
}

function drawStudies(ctx, candles, state, plot, studies) {
  if (!studies.length) return;

  const context = {
    candles,
    state,
    plot,
    toScaleValue
  };

  listStudies().forEach(study => {
    if (study.placement !== 'overlay') return;
    const configs = studies.filter(item => studyId(item) === study.id && item.visible !== false);
    if (!configs.length) return;
    study.render(ctx, { ...context, studies: configs, config: configs[0] });
  });
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

export function createChart(host, candles, viewport, drawingManager = null, options = {}) {
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
  let movingAverages = [];
  let studyConfigs = [];
  let paneRatio = 0.25;
  let paneControls = null;
  let paneDragCleanup = null;

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

    const paneStudies = getPaneStudies(studyConfigs);
    const paneGap = paneStudies.length ? 12 : 0;
    const paneHeight = paneStudies.length
      ? Math.min(height * 0.45, Math.max(110, height * paneRatio))
      : 0;
    const mainHeight = paneStudies.length ? Math.max(1, height - paneHeight - paneGap) : height;
    const plot = createPlotGeometry(width, mainHeight);

    if (!paneStudies.length) {
      paneControls?.remove();
      paneControls = null;
      paneDragCleanup?.();
      paneDragCleanup = null;
    } else if (!paneControls) {
      paneControls = document.createElement('div');
      paneControls.className = 'study-pane-controls';
      paneControls.innerHTML = '<div class="study-pane-header"></div><div class="study-pane-resize" role="separator" aria-label="Redimensionar painel de estudo" title="Arraste para redimensionar"><span></span></div><button type="button" class="study-pane-close" aria-label="Fechar painel" title="Fechar painel">×</button>';
      host.appendChild(paneControls);

      const paneStudy = paneStudies[0]?.study;

      paneControls.querySelector('.study-pane-close')?.addEventListener('click', () => {
        studyConfigs = studyConfigs.filter(item => studyId(item) !== paneStudy?.id);
        paneControls?.remove();
        paneControls = null;
        paneDragCleanup?.();
        paneDragCleanup = null;
        options.onPaneClose?.(paneStudy?.id);
        options.onPaneChange?.(studyConfigs);
        draw();
      });

      const handle = paneControls.querySelector('.study-pane-resize');
      const onPointerDown = event => {
        event.preventDefault();
        event.stopPropagation();
        const startY = event.clientY;
        const startRatio = paneRatio;

        const onPointerMove = moveEvent => {
          moveEvent.preventDefault();
          const delta = startY - moveEvent.clientY;
          const nextHeight = (height * startRatio) + delta;
          paneRatio = Math.max(0.15, Math.min(0.45, nextHeight / Math.max(height, 1)));
          draw();
        };

        const onPointerUp = () => {
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove, { passive: false });
        window.addEventListener('pointerup', onPointerUp, { once: true });
      };

      handle?.addEventListener('pointerdown', onPointerDown);
      paneDragCleanup = () => handle?.removeEventListener('pointerdown', onPointerDown);
    }

    drawGrid(ctx, width, height, plot, state.y.min, state.y.max, normalizeScaleType(state.yScaleType), state.x.min, state.x.max);
    if (chartType === 'line') drawLine(ctx, candles, state, plot);
    else drawCandles(ctx, candles, state, plot);
    drawStudies(ctx, candles, state, plot, [...movingAverages, ...studyConfigs]);

    if (paneStudies.length) {
      const paneTop = mainHeight + paneGap;
      if (paneControls) paneControls.style.top = mainHeight + 'px';
      const paneHeaderHeight = 28;
      const panePlotTop = paneTop + paneHeaderHeight;
      const panePlotHeight = Math.max(1, paneHeight - paneHeaderHeight);
      paneStudies.forEach(({ study, configs }) => {
        study.render(ctx, {
          candles,
          state,
          plot: createPanePlot(width, panePlotTop, panePlotHeight, plot, state),
          config: configs[0],
          configs,
          toScaleValue
        });
      });
    }

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

  function setStudies(next) {
    studyConfigs = Array.isArray(next) ? next.map(item => ({ ...item })) : [];
    draw();
  }

  function setMovingAverages(next) {
    movingAverages = Array.isArray(next) ? next.map(item => ({ ...item })) : [];
    draw();
  }


  function getDrawingPlot() {
    const width = host.clientWidth;
    const height = host.clientHeight;
    const paneStudies = getPaneStudies(studyConfigs);
    const paneGap = paneStudies.length ? 12 : 0;
    const paneHeight = paneStudies.length
      ? Math.min(height * 0.45, Math.max(110, height * paneRatio))
      : 0;
    const mainHeight = paneStudies.length ? Math.max(1, height - paneHeight - paneGap) : height;
    return createPlotGeometry(width, mainHeight);
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
    getDrawingPlot,
    setChartType,
    setMovingAverages,
    setStudies,
    setPaneRatio(nextRatio) {
      paneRatio = Math.max(0.15, Math.min(0.45, Number(nextRatio) || 0.25));
      draw();
    },
    destroy() {
      paneDragCleanup?.();
      paneControls?.remove();
      observer.disconnect();
      canvas.remove();
    }
  };
}