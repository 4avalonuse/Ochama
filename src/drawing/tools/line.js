import { registerDrawingTool } from '../core/drawing-registry.js';
import { toScaleValue, fromScaleValue, normalizeScaleType } from '../../viewport/scale.js';

export function lineTool() {
  return {
    type: 'line',
    defaults: {},
    create(start, end, scaleType = 'linear') {
      return {
        id: crypto.randomUUID(),
        type: 'line',
        scaleType: normalizeScaleType(scaleType),
        start: { ...start },
        end: { ...end }
      };
    }
  };
}

function endpoint(point, drawing, transform, tolerance = 11) {
  const start = transform.marketToScreen(drawing.start);
  const end = transform.marketToScreen(drawing.end);
  if (!start || !end) return null;
  if (Math.hypot(point.x - start.x, point.y - start.y) <= tolerance) return 'start';
  if (Math.hypot(point.x - end.x, point.y - end.y) <= tolerance) return 'end';
  return null;
}

export function lineRenderer(context, drawing, transform) {
  const start = transform.marketToScreen(drawing.start);
  const end = transform.marketToScreen(drawing.end);
  if (!start || !end) return;

  const scaleType = normalizeScaleType(drawing.scaleType);
  const segments = 40;
  context.save();
  context.strokeStyle = '#60a5fa';
  context.lineWidth = 2;
  context.beginPath();

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const scaledStart = toScaleValue(drawing.start.price, scaleType);
    const scaledEnd = toScaleValue(drawing.end.price, scaleType);
    const scaledPrice = scaledStart + (scaledEnd - scaledStart) * t;
    const price = fromScaleValue(scaledPrice, scaleType);
    const timestamp = drawing.start.timestamp + (drawing.end.timestamp - drawing.start.timestamp) * t;
    const screen = transform.marketToScreen({ timestamp, price });
    if (!screen) continue;
    if (i === 0) context.moveTo(screen.x, screen.y);
    else context.lineTo(screen.x, screen.y);
  }
  context.stroke();

  context.fillStyle = '#60a5fa';
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
  const scaleType = normalizeScaleType(drawing.scaleType);
  const segments = 40;
  let previous = null;

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const scaledStart = toScaleValue(drawing.start.price, scaleType);
    const scaledEnd = toScaleValue(drawing.end.price, scaleType);
    const price = fromScaleValue(scaledStart + (scaledEnd - scaledStart) * t, scaleType);
    const timestamp = drawing.start.timestamp + (drawing.end.timestamp - drawing.start.timestamp) * t;
    const current = transform.marketToScreen({ timestamp, price });
    if (previous && current) {
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      const lengthSq = dx * dx + dy * dy;
      const u = lengthSq
        ? Math.max(0, Math.min(1, ((point.x - previous.x) * dx + (point.y - previous.y) * dy) / lengthSq))
        : 0;
      if (Math.hypot(point.x - (previous.x + u * dx), point.y - (previous.y + u * dy)) <= tolerance) return true;
    }
    previous = current;
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
