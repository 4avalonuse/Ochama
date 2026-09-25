import { createDrawingTransform } from '../render/transform.js';
import { createPlotGeometry } from '../../chart/plot-geometry.js';
import { getDrawingTool } from '../core/drawing-registry.js';

function pointFromEvent(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function createTransform(viewport, canvas) {
  return createDrawingTransform({
    viewport,
    plot: createPlotGeometry(canvas.clientWidth, canvas.clientHeight)
  });
}

export function createDrawingInteraction({
  canvas,
  viewport,
  drawingManager,
  draw,
  onChanged = null
}) {
  let activeTool = 'line';
  let draftStart = null;
  let selectedId = null;
  let moving = null;

  function setTool(type) {
    if (!getDrawingTool(type)) return false;
    activeTool = type;
    draftStart = null;
    moving = null;
    selectedId = null;
    return true;
  }

  function selectAt(point) {
    const transform = createTransform(viewport, canvas);
    const drawings = drawingManager.getDrawings();
    for (let i = drawings.length - 1; i >= 0; i -= 1) {
      const drawing = drawings[i];
      const descriptor = getDrawingTool(drawing.type);
      if (descriptor?.hitTest?.(point, drawing, transform)) return drawing;
    }
    return null;
  }

  function drawingDown(event) {
    const point = pointFromEvent(event, canvas);
    const transform = createTransform(viewport, canvas);
    const market = transform.screenToMarket(point);
    if (!market) return;

    if (activeTool !== 'line') return;

    draftStart = market;
    selectedId = null;
  }

  function drawingMove() {
    if (!draftStart) return;
    draw();
  }

  function drawingUp(event) {
    if (!draftStart) return;
    const point = pointFromEvent(event, canvas);
    const transform = createTransform(viewport, canvas);
    const end = transform.screenToMarket(point);
    const start = draftStart;
    draftStart = null;
    if (!end) return;

    const descriptor = getDrawingTool(activeTool);
    const drawing = descriptor?.tool?.().create?.(start, end);
    if (!drawing) return;

    drawingManager.add(drawing);
    selectedId = drawing.id;
    draw();
    onChanged?.();
  }

  function selectionDown(event) {
    const point = pointFromEvent(event, canvas);
    const drawing = selectAt(point);
    selectedId = drawing?.id || null;
    if (!drawing) {
      moving = null;
      draw();
      return;
    }

    const descriptor = getDrawingTool(drawing.type);
    if (!descriptor?.move) return;

    moving = {
      id: drawing.id,
      type: drawing.type,
      last: point
    };
  }

  function selectionMove(event) {
    if (!moving) return;
    const point = pointFromEvent(event, canvas);
    const dx = point.x - moving.last.x;
    const dy = point.y - moving.last.y;
    if (!dx && !dy) return;

    const drawing = drawingManager.getDrawings().find(item => item.id === moving.id);
    const descriptor = drawing ? getDrawingTool(drawing.type) : null;
    const transform = createTransform(viewport, canvas);

    if (drawing && descriptor?.move) {
      const next = descriptor.move(drawing, { dx, dy }, transform);
      if (next) {
        drawingManager.replace(drawing.id, next);
        moving.last = point;
        draw();
      }
    }
  }

  function selectionUp() {
    if (moving) onChanged?.();
    moving = null;
  }

  return {
    setTool,
    getTool: () => activeTool,
    getSelectedId: () => selectedId,
    handlers: {
      onDrawingDown: drawingDown,
      onDrawingMove: drawingMove,
      onDrawingUp: drawingUp,
      onSelectionDown: selectionDown,
      onSelectionMove: selectionMove,
      onSelectionUp: selectionUp
    }
  };
}
