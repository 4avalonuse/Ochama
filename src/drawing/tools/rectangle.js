import { registerDrawingTool } from '../core/drawing-registry.js';
import { distancePointToSegment } from '../render/geometry.js';

const RECTANGLE_SEGMENTS = 120;

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

function interpolate(a, b, t) {
  return {
    timestamp: a.timestamp + (b.timestamp - a.timestamp) * t,
    price: a.price + (b.price - a.price) * t
  };
}

function rectangleMarketCorners(drawing) {
  const start = drawing.start;
  const end = drawing.end;
  if (!Number.isFinite(start?.timestamp) || !Number.isFinite(start?.price) ||
      !Number.isFinite(end?.timestamp) || !Number.isFinite(end?.price)) {
    return null;
  }

  const leftTime = Math.min(start.timestamp, end.timestamp);
  const rightTime = Math.max(start.timestamp, end.timestamp);
  const bottomPrice = Math.min(start.price, end.price);
  const topPrice = Math.max(start.price, end.price);

  return {
    start,
    end,
    market: [
      { timestamp: leftTime, price: topPrice },
      { timestamp: rightTime, price: topPrice },
      { timestamp: rightTime, price: bottomPrice },
      { timestamp: leftTime, price: bottomPrice }
    ]
  };
}

function edgePoints(a, b, transform) {
  const points = [];
  for (let i = 0; i <= RECTANGLE_SEGMENTS; i += 1) {
    const screen = transform.marketToScreen(interpolate(a, b, i / RECTANGLE_SEGMENTS));
    if (screen) points.push(screen);
  }
  return points;
}

function rectanglePoints(drawing, transform) {
  const corners = rectangleMarketCorners(drawing);
  if (!corners) return null;

  const edges = [
    edgePoints(corners.market[0], corners.market[1], transform),
    edgePoints(corners.market[1], corners.market[2], transform),
    edgePoints(corners.market[2], corners.market[3], transform),
    edgePoints(corners.market[3], corners.market[0], transform)
  ];

  if (edges.some(edge => edge.length < 2)) return null;

  return { ...corners, edges };
}

function screenCorners(drawing, transform) {
  const data = rectanglePoints(drawing, transform);
  if (!data) return null;

  const start = transform.marketToScreen(drawing.start);
  const end = transform.marketToScreen(drawing.end);
  if (!start || !end) return null;

  const corners = data.market.map(point => transform.marketToScreen(point));
  if (corners.some(point => !point)) return null;

  return { ...data, start, end, corners };
}

export function rectangleRenderer(context, drawing, transform, options = {}) {
  const data = rectanglePoints(drawing, transform);
  if (!data) return;

  const color = drawing.color || '#60a5fa';
  context.save();

  context.fillStyle = color;
  context.globalAlpha = options.selected ? 0.16 : 0.08;
  context.beginPath();
  data.edges[0].forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  for (let edgeIndex = 1; edgeIndex < data.edges.length; edgeIndex += 1) {
    for (const point of data.edges[edgeIndex]) context.lineTo(point.x, point.y);
  }
  context.closePath();
  context.fill();

  context.globalAlpha = options.selected ? 1 : 0.82;
  context.strokeStyle = color;
  context.lineWidth = options.selected ? 2.5 : 1.5;
  context.beginPath();
  data.edges.forEach(edge => {
    edge.forEach((point, index) => {
      if (edge === data.edges[0] && index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
  });
  context.closePath();
  context.stroke();

  if (options.selected) {
    context.fillStyle = color;
    context.globalAlpha = 1;
    for (const point of data.corners) {
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
  const data = rectanglePoints(drawing, transform);
  if (!data) return false;

  for (const edge of data.edges) {
    for (let i = 1; i < edge.length; i += 1) {
      if (distancePointToSegment(point, edge[i - 1], edge[i]) <= tolerance) return true;
    }
  }

  const box = screenCorners(drawing, transform);
  if (!box) return false;

  const xs = box.corners.map(item => item.x);
  const ys = box.corners.map(item => item.y);
  return point.x >= Math.min(...xs) && point.x <= Math.max(...xs) &&
    point.y >= Math.min(...ys) && point.y <= Math.max(...ys);
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
