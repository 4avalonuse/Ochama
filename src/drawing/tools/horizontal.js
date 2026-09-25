import { registerDrawingTool } from '../core/drawing-registry.js';

export function horizontalTool() {
  return {
    type: 'horizontal',
    defaults: {},
    create(point) {
      return { id: crypto.randomUUID(), type: 'horizontal', point: { ...point } };
    }
  };
}

export function horizontalRenderer(context, drawing, transform) {
  const point = transform.marketToScreen(drawing.point);
  if (!point) return;
  context.save();
  context.strokeStyle = '#60a5fa';
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(0, point.y);
  context.lineTo(transform.plotRight ?? context.canvas.width, point.y);
  context.stroke();
  context.restore();
}

export function horizontalHitTest(point, drawing, transform, tolerance = 6) {
  const target = transform.marketToScreen(drawing.point);
  return Boolean(target && Math.abs(point.y - target.y) <= tolerance);
}

registerDrawingTool({ type: 'horizontal', name: 'Horizontal', tool: horizontalTool, renderer: horizontalRenderer, hitTest: horizontalHitTest, defaults: {} });
