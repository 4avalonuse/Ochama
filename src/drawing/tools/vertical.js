import { registerDrawingTool } from '../core/drawing-registry.js';

export function verticalTool() {
  return {
    type: 'vertical',
    defaults: {},
    create(point, _unused = null, _scaleType = 'linear', color = '#60a5fa') {
      return { id: crypto.randomUUID(), type: 'vertical', point: { ...point }, color };
    }
  };
}

export function verticalRenderer(context, drawing, transform, options = {}) {
  const point = transform.marketToScreen(drawing.point);
  if (!point) return;
  context.save();
  context.strokeStyle = drawing.color || '#60a5fa';
  context.lineWidth = options.selected ? 3 : 1.5;
  context.beginPath();
  context.moveTo(point.x, transform.plotTop ?? 0);
  context.lineTo(point.x, transform.plotBottom ?? context.canvas.height);
  context.stroke();
  if (options.selected) {
    context.fillStyle = drawing.color || '#60a5fa';
    context.beginPath();
    context.arc(point.x, point.y, 7, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#ffffff';
    context.lineWidth = 2;
    context.stroke();
  }
  context.restore();
}

export function verticalHitTest(point, drawing, transform, tolerance = 7) {
  const target = transform.marketToScreen(drawing.point);
  return Boolean(target && Math.abs(point.x - target.x) <= tolerance);
}

export function verticalMove(drawing, delta, transform) {
  const point = transform.marketToScreen(drawing.point);
  if (!point) return null;
  const next = transform.screenToMarket({ x: point.x + delta.dx, y: point.y });
  return next ? { ...drawing, point: next } : null;
}

registerDrawingTool({
  type: 'vertical',
  name: 'Vertical',
  tool: verticalTool,
  renderer: verticalRenderer,
  hitTest: verticalHitTest,
  move: verticalMove,
  defaults: {}
});
