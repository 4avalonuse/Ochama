import { registerDrawingTool } from '../core/drawing-registry.js';

export function horizontalTool() {
  return {
    type: 'horizontal',
    defaults: {},
    create(point, _unused = null, _scaleType = 'linear', color = '#60a5fa') {
      return { id: crypto.randomUUID(), type: 'horizontal', point: { ...point }, color };
    }
  };
}

export function horizontalRenderer(context, drawing, transform) {
  const point = transform.marketToScreen(drawing.point);
  if (!point) return;
  context.save();
  context.strokeStyle = drawing.color || '#60a5fa';
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(transform.plotLeft ?? 0, point.y);
  context.lineTo(transform.plotRight ?? context.canvas.width, point.y);
  context.stroke();
  context.restore();
}

export function horizontalHitTest(point, drawing, transform, tolerance = 7) {
  const target = transform.marketToScreen(drawing.point);
  return Boolean(target && Math.abs(point.y - target.y) <= tolerance);
}

export function horizontalMove(drawing, delta, transform) {
  const point = transform.marketToScreen(drawing.point);
  if (!point) return null;
  const next = transform.screenToMarket({ x: point.x, y: point.y + delta.dy });
  return next ? { ...drawing, point: next } : null;
}

registerDrawingTool({
  type: 'horizontal',
  name: 'Horizontal',
  tool: horizontalTool,
  renderer: horizontalRenderer,
  hitTest: horizontalHitTest,
  move: horizontalMove,
  defaults: {}
});
