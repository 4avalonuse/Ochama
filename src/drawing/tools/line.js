import { registerDrawingTool } from '../core/drawing-registry.js';

export function lineTool() {
  return {
    type: 'line',
    defaults: {},
    create(start, end) {
      return { id: crypto.randomUUID(), type: 'line', start: { ...start }, end: { ...end } };
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

  context.save();
  context.strokeStyle = '#60a5fa';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
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
  return endpoint(point, drawing, transform);
}

export function lineHitTest(point, drawing, transform, tolerance = 8) {
  const start = transform.marketToScreen(drawing.start);
  const end = transform.marketToScreen(drawing.end);
  if (!start || !end) return false;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq
    ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq))
    : 0;
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy)) <= tolerance;
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
