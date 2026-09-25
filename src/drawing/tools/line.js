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
  context.restore();
}

export function lineHitTest(point, drawing, transform, tolerance = 6) {
  const start = transform.marketToScreen(drawing.start);
  const end = transform.marketToScreen(drawing.end);
  if (!start || !end) return false;
  const dx = end.x - start.x, dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq)) : 0;
  return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy)) <= tolerance;
}

registerDrawingTool({ type: 'line', name: 'Linha', tool: lineTool, renderer: lineRenderer, hitTest: lineHitTest, defaults: {} });
