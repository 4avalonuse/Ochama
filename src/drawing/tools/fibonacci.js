import { registerDrawingTool } from '../core/drawing-registry.js';
import { fromScaleValue, normalizeScaleType, toScaleValue } from '../../viewport/scale.js';
import { distancePointToSegment } from '../render/geometry.js';

export const FIBONACCI_LEVELS = Object.freeze([
  { value: 0, label: '0%' },
  { value: 0.236, label: '23.6%' },
  { value: 0.382, label: '38.2%' },
  { value: 0.5, label: '50%' },
  { value: 0.618, label: '61.8%' },
  { value: 0.786, label: '78.6%' },
  { value: 1, label: '100%' }
]);

export function fibonacciTool() {
  return {
    type: 'fibonacci',
    defaults: { levels: FIBONACCI_LEVELS.map(level => level.value) },
    create(start, end, scaleType = 'linear', color = '#60a5fa') {
      return {
        id: crypto.randomUUID(),
        type: 'fibonacci',
        scaleType: normalizeScaleType(scaleType),
        color,
        start: { ...start },
        end: { ...end },
        levels: FIBONACCI_LEVELS.map(level => level.value)
      };
    }
  };
}

function levelsFor(drawing) {
  const allowed = new Set(
    Array.isArray(drawing.levels)
      ? drawing.levels.map(Number).filter(Number.isFinite)
      : FIBONACCI_LEVELS.map(level => level.value)
  );
  return FIBONACCI_LEVELS.filter(level => allowed.has(level.value));
}

function levelPrice(drawing, level) {
  const scaleType = normalizeScaleType(drawing.scaleType);
  const start = toScaleValue(drawing.start.price, scaleType);
  const end = toScaleValue(drawing.end.price, scaleType);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return NaN;
  return fromScaleValue(start + (end - start) * level, scaleType);
}

function screenSegments(drawing, transform) {
  const start = transform.marketToScreen(drawing.start);
  const end = transform.marketToScreen(drawing.end);
  if (!start || !end) return [];
  const levels = levelsFor(drawing);
  return levels.map(level => {
    const price = levelPrice(drawing, level.value);
    if (!Number.isFinite(price)) return null;
    const left = transform.marketToScreen({ timestamp: drawing.start.timestamp, price });
    const right = transform.marketToScreen({ timestamp: drawing.end.timestamp, price });
    if (!left || !right) return null;
    return { ...level, price, left, right };
  }).filter(Boolean);
}

export function fibonacciRenderer(context, drawing, transform, options = {}) {
  const start = transform.marketToScreen(drawing.start);
  const end = transform.marketToScreen(drawing.end);
  const segments = screenSegments(drawing, transform);
  if (!start || !end || !segments.length) return;

  context.save();
  context.lineWidth = options.selected ? 2.2 : 1.2;
  context.font = '10px sans-serif';
  context.textBaseline = 'middle';

  for (const segment of segments) {
    context.strokeStyle = drawing.color || '#60a5fa';
    context.setLineDash(segment.value === 0.5 ? [5, 4] : []);
    context.globalAlpha = options.selected ? 0.9 : 0.72;
    context.beginPath();
    context.moveTo(segment.left.x, segment.left.y);
    context.lineTo(segment.right.x, segment.right.y);
    context.stroke();

    const label = segment.label;
    const labelX = Math.min(segment.right.x + 6, (transform.plotRight ?? context.canvas.width) - 42);
    context.globalAlpha = options.selected ? 1 : 0.82;
    context.fillStyle = drawing.color || '#60a5fa';
    context.fillText(label, Math.max(segment.left.x + 3, labelX), segment.left.y);
  }

  context.setLineDash([]);
  context.globalAlpha = options.selected ? 1 : 0.9;
  context.strokeStyle = drawing.color || '#60a5fa';
  context.lineWidth = options.selected ? 1.5 : 1;
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();

  if (options.selected) {
    context.fillStyle = drawing.color || '#60a5fa';
    for (const point of [start, end]) {
      context.beginPath();
      context.arc(point.x, point.y, 7, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#ffffff';
      context.lineWidth = 2;
      context.stroke();
    }
  }

  context.restore();
}

export function fibonacciHitTestPart(point, drawing, transform) {
  const start = transform.marketToScreen(drawing.start);
  const end = transform.marketToScreen(drawing.end);
  if (!start || !end) return null;
  if (Math.hypot(point.x - start.x, point.y - start.y) <= 11) return 'start';
  if (Math.hypot(point.x - end.x, point.y - end.y) <= 11) return 'end';
  return null;
}

export function fibonacciHitTest(point, drawing, transform, tolerance = 8) {
  for (const segment of screenSegments(drawing, transform)) {
    if (distancePointToSegment(point, segment.left, segment.right) <= tolerance) return true;
  }
  return distancePointToSegment(point,
    transform.marketToScreen(drawing.start),
    transform.marketToScreen(drawing.end)
  ) <= tolerance;
}

export function fibonacciMove(drawing, delta, transform, part = 'body') {
  if (part === 'start' || part === 'end') {
    const target = transform.marketToScreen(drawing[part]);
    if (!target) return null;
    const next = transform.screenToMarket({
      x: target.x + delta.dx,
      y: target.y + delta.dy
    });
    return next ? { ...drawing, [part]: next } : null;
  }

  const start = transform.marketToScreen(drawing.start);
  const end = transform.marketToScreen(drawing.end);
  if (!start || !end) return null;

  const nextStart = transform.screenToMarket({
    x: start.x + delta.dx,
    y: start.y + delta.dy
  });
  const nextEnd = transform.screenToMarket({
    x: end.x + delta.dx,
    y: end.y + delta.dy
  });
  if (!nextStart || !nextEnd) return null;

  return { ...drawing, start: nextStart, end: nextEnd };
}

registerDrawingTool({
  type: 'fibonacci',
  name: 'Fibonacci',
  tool: fibonacciTool,
  renderer: fibonacciRenderer,
  hitTest: fibonacciHitTest,
  hitTestPart: fibonacciHitTestPart,
  move: fibonacciMove,
  defaults: {}
});
