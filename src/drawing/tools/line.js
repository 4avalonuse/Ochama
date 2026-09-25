import { registerDrawingTool } from '../core/drawing-registry.js';
import { toScaleValue, fromScaleValue, normalizeScaleType } from '../../viewport/scale.js';

const LINE_SEGMENTS = 120;

export function lineTool() {
  return {
    type: 'line',
    defaults: {},
    create(start, end, scaleType = 'linear', color = '#60a5fa') {
      return {
        id: crypto.randomUUID(),
        type: 'line',
        scaleType: normalizeScaleType(scaleType),
        color,
        start: { ...start },
        end: { ...end }
      };
    }
  };
}

function linePoints(drawing, transform) {
  const scaleType = normalizeScaleType(drawing.scaleType);
  const scaledStart = toScaleValue(drawing.start.price, scaleType);
  const scaledEnd = toScaleValue(drawing.end.price, scaleType);
  if (!Number.isFinite(scaledStart) || !Number.isFinite(scaledEnd)) return [];

  const points = [];
  for (let i = 0; i <= LINE_SEGMENTS; i += 1) {
    const t = i / LINE_SEGMENTS;
    const scaledPrice = scaledStart + (scaledEnd - scaledStart) * t;
    const price = fromScaleValue(scaledPrice, scaleType);
    const timestamp = drawing.start.timestamp + (drawing.end.timestamp - drawing.start.timestamp) * t;
    const screen = transform.marketToScreen({ timestamp, price });
    if (screen) points.push(screen);
  }
  return points;
}

export function lineRenderer(context, drawing, transform) {
  const start = transform.marketToScreen(drawing.start);
  const end = transform.marketToScreen(drawing.end);
  const points = linePoints(drawing, transform);
  if (!start || !end || points.length < 2) return;

  context.save();
  context.strokeStyle = drawing.color || '#60a5fa';
  context.lineWidth = 2;
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.stroke();

  context.fillStyle = drawing.color || '#60a5fa';
  for (const point of [start, end]) {
    context.beginPath();
    context.arc(point.x, point.y, 4, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

export function lineHitTestPart(point, drawing, transform) {
  const start = transform.marketToScreen(drawing.start);
  const end = transform.marketToScreen(drawing.end);
  if (!start || !end) return null;
  if (Math.hypot(point.x - start.x, point.y - start.y) <= 11) return 'start';
  if (Math.hypot(point.x - end.x, point.y - end.y) <= 11) return 'end';
  return null;
}

export function lineHitTest(point, drawing, transform, tolerance = 8) {
  const points = linePoints(drawing, transform);
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const current = points[i];
    const dx = current.x - previous.x;
    const dy = current.y - previous.y;
    const lengthSq = dx * dx + dy * dy;
    const u = lengthSq
      ? Math.max(0, Math.min(1, ((point.x - previous.x) * dx + (point.y - previous.y) * dy) / lengthSq))
      : 0;
    const closestX = previous.x + u * dx;
    const closestY = previous.y + u * dy;
    if (Math.hypot(point.x - closestX, point.y - closestY) <= tolerance) return true;
  }
  return false;
}

export function lineMove(drawing, delta, transform, part = 'body') {
  if (part === 'start' || part === 'end') {
    const target = transform.marketToScreen(drawing[part]);
    if (!target) return null;
    const next = transform.screenToMarket({
      x: target.x + delta.dx,
      y: target.y + delta.dy
    });
    if (!next) return null;
    return { ...drawing, [part]: next };
  }

  const start = transform.marketToScreen(drawing.start);
  const end = transform.marketToScreen(drawing.end);
  if (!start || !end) return null;

  const nextStart = transform.screenToMarket({ x: start.x + delta.dx, y: start.y + delta.dy });
  const nextEnd = transform.screenToMarket({ x: end.x + delta.dx, y: end.y + delta.dy });
  if (!nextStart || !nextEnd) return null;
  return { ...drawing, start: nextStart, end: nextEnd };
}

registerDrawingTool({
  type: 'line',
  name: 'Linha',
  tool: lineTool,
  renderer: lineRenderer,
  hitTest: lineHitTest,
  hitTestPart: lineHitTestPart,
  move: lineMove,
  defaults: {}
});
