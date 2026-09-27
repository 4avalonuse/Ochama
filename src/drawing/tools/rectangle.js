import { registerDrawingTool } from '../core/drawing-registry.js';
import { distancePointToSegment } from '../render/geometry.js';

export function rectangleTool() {
  return {
    type: 'rectangle',
    defaults: {},
    create(start, end, scaleType = 'linear', color = '#60a5fa') {
      return {
        id: crypto.randomUUID(),
        type: 'rectangle',
        scaleType,
        color,
        start: { ...start },
        end: { ...end }
      };
    }
  };
}

function screenCorners(drawing, transform) {
  const start = transform.marketToScreen(drawing.start);
  const end = transform.marketToScreen(drawing.end);
  if (!start || !end) return null;

  const left = Math.min(start.x, end.x);
  const right = Math.max(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const bottom = Math.max(start.y, end.y);

  return {
    start,
    end,
    left,
    right,
    top,
    bottom,
    corners: [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
      { x: left, y: bottom }
    ]
  };
}

export function rectangleRenderer(context, drawing, transform, options = {}) {
  const box = screenCorners(drawing, transform);
  if (!box) return;

  const width = box.right - box.left;
  const height = box.bottom - box.top;
  if (width < 1 || height < 1) return;

  context.save();
  context.fillStyle = drawing.color || '#60a5fa';
  context.globalAlpha = options.selected ? 0.16 : 0.08;
  context.fillRect(box.left, box.top, width, height);

  context.globalAlpha = options.selected ? 1 : 0.82;
  context.strokeStyle = drawing.color || '#60a5fa';
  context.lineWidth = options.selected ? 2.5 : 1.5;
  context.strokeRect(box.left, box.top, width, height);

  if (options.selected) {
    context.fillStyle = drawing.color || '#60a5fa';
    context.globalAlpha = 1;
    for (const point of box.corners) {
      context.beginPath();
      context.arc(point.x, point.y, 5, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#ffffff';
      context.lineWidth = 1.5;
      context.stroke();
    }
  }

  context.restore();
}

export function rectangleHitTestPart(point, drawing, transform) {
  const box = screenCorners(drawing, transform);
  if (!box) return null;

  const corners = [
    ['start', box.start],
    ['end', box.end]
  ];

  for (const [part, target] of corners) {
    if (Math.hypot(point.x - target.x, point.y - target.y) <= 11) return part;
  }

  return null;
}

export function rectangleHitTest(point, drawing, transform, tolerance = 8) {
  const box = screenCorners(drawing, transform);
  if (!box) return false;

  const edges = [
    [{ x: box.left, y: box.top }, { x: box.right, y: box.top }],
    [{ x: box.right, y: box.top }, { x: box.right, y: box.bottom }],
    [{ x: box.right, y: box.bottom }, { x: box.left, y: box.bottom }],
    [{ x: box.left, y: box.bottom }, { x: box.left, y: box.top }]
  ];

  if (edges.some(([a, b]) => distancePointToSegment(point, a, b) <= tolerance)) return true;

  return point.x >= box.left && point.x <= box.right &&
    point.y >= box.top && point.y <= box.bottom;
}

export function rectangleMove(drawing, delta, transform, part = 'body') {
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
  type: 'rectangle',
  name: 'Retângulo',
  tool: rectangleTool,
  renderer: rectangleRenderer,
  hitTest: rectangleHitTest,
  hitTestPart: rectangleHitTestPart,
  move: rectangleMove,
  defaults: {}
});
