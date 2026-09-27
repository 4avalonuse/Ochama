import { registerDrawingTool } from '../core/drawing-registry.js';
const REFERENCE_COLOR = '#ef4444';

export function referenceTool() {
  return {
    type: 'reference',
    defaults: {},
    singlePoint: true,
    create(point, _unused = null, scaleType = 'linear', color = REFERENCE_COLOR, options = {}) {
      return {
        id: crypto.randomUUID(),
        type: 'reference',
        scaleType,
        color: color || REFERENCE_COLOR,
        point: { ...point },
        context: options.context ? { ...options.context } : null
      };
    }
  };
}

function formatPrice(value) {
  if (!Number.isFinite(value)) return '';
  return Number(value).toLocaleString('en-US', {
    maximumFractionDigits: value >= 100 ? 2 : 6
  });
}

export function referenceRenderer(context, drawing, transform, options = {}) {
  const point = transform.marketToScreen(drawing.point);
  if (!point) return;

  const color = drawing.color || REFERENCE_COLOR;
  const width = context.canvas.width;
  const height = context.canvas.height;

  context.save();

  context.strokeStyle = color;
  context.lineWidth = options.selected ? 2 : 1.5;
  context.globalAlpha = options.selected ? 1 : 0.86;

  context.beginPath();
  context.moveTo(0, point.y);
  context.lineTo(width, point.y);
  context.stroke();

  context.setLineDash([7, 6]);
  context.globalAlpha = options.selected ? 0.9 : 0.55;
  context.beginPath();
  context.moveTo(point.x, 0);
  context.lineTo(point.x, height);
  context.stroke();
  context.setLineDash([]);

  context.globalAlpha = 1;
  context.fillStyle = color;
  context.beginPath();
  context.arc(point.x, point.y, options.selected ? 7 : 5, 0, Math.PI * 2);
  context.fill();

  if (options.selected) {
    context.strokeStyle = '#ffffff';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(point.x, point.y, 7, 0, Math.PI * 2);
    context.stroke();
  }

  const label = formatPrice(drawing.point.price);
  if (label) {
    context.font = '700 11px sans-serif';
    const paddingX = 7;
    const boxHeight = 22;
    const textWidth = context.measureText(label).width;
    const boxWidth = textWidth + paddingX * 2;
    const boxX = Math.max(4, width - boxWidth - 4);
    const boxY = Math.max(4, Math.min(height - boxHeight - 4, point.y - boxHeight / 2));

    context.fillStyle = color;
    context.globalAlpha = 0.94;
    context.beginPath();
    context.roundRect(boxX, boxY, boxWidth, boxHeight, 5);
    context.fill();

    context.fillStyle = '#ffffff';
    context.globalAlpha = 1;
    context.textBaseline = 'middle';
    context.fillText(label, boxX + paddingX, boxY + boxHeight / 2);
  }

  context.restore();
}

export function referenceHitTestPart(point, drawing, transform) {
  const target = transform.marketToScreen(drawing.point);
  if (!target) return null;
  return Math.hypot(point.x - target.x, point.y - target.y) <= 11 ? 'point' : null;
}

export function referenceHitTest(point, drawing, transform, tolerance = 8) {
  const target = transform.marketToScreen(drawing.point);
  if (!target) return false;

  if (Math.abs(point.y - target.y) <= tolerance) return true;
  return Math.abs(point.x - target.x) <= tolerance;
}

export function referenceMove(drawing, delta, transform) {
  const point = transform.marketToScreen(drawing.point);
  if (!point) return null;

  const next = transform.screenToMarket({
    x: point.x + delta.dx,
    y: point.y + delta.dy
  });

  return next ? { ...drawing, point: next } : null;
}

registerDrawingTool({
  type: 'reference',
  name: 'Referência',
  tool: referenceTool,
  renderer: referenceRenderer,
  hitTest: referenceHitTest,
  hitTestPart: referenceHitTestPart,
  move: referenceMove,
  defaults: {}
});
