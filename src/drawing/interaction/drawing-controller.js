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
  drawPreview = null,
  onChanged = null,
  onComplete = null
}) {
  let activeTool = 'line';
  let draftStart = null;
  let selectedId = null;
  let moving = null;
  let movementRecorded = false;

  function setTool(type) {
    if (!getDrawingTool(type)) return false;
    activeTool = type;
    draftStart = null;
    moving = null;
    movementRecorded = false;
    selectedId = null;
    drawPreview?.(null);
    return true;
  }

  function selectAt(point) {
    const transform = createTransform(viewport, canvas);
    const drawings = drawingManager.getDrawings();
    for (let i = drawings.length - 1; i >= 0; i -= 1) {
      const drawing = drawings[i];
      const descriptor = getDrawingTool(drawing.type);
      const part = descriptor?.hitTestPart?.(point, drawing, transform);
      if (part) return { drawing, part };
      if (descriptor?.hitTest?.(point, drawing, transform)) return { drawing, part: 'body' };
    }
    return null;
  }

  function drawingDown(event) {
    const point = pointFromEvent(event, canvas);
    const transform = createTransform(viewport, canvas);
    const market = transform.screenToMarket(point);
    if (!market) return;

    draftStart = market;
    const descriptor = getDrawingTool(activeTool);
    const preview = descriptor?.tool?.().create?.(market, market);
    if (preview) drawPreview?.(preview);
  }

  function drawingMove(event) {
    if (!draftStart) return;
    const point = pointFromEvent(event, canvas);
    const transform = createTransform(viewport, canvas);
    const market = transform.screenToMarket(point);
    if (!market) return;

    const descriptor = getDrawingTool(activeTool);
    const preview = descriptor?.tool?.().create?.(draftStart, market);
    if (preview) drawPreview?.(preview);
  }

  function drawingUp(event) {
    if (!draftStart) return;
    const point = pointFromEvent(event, canvas);
    const transform = createTransform(viewport, canvas);
    const end = transform.screenToMarket(point);
    const start = draftStart;
    draftStart = null;
    drawPreview?.(null);
    if (!end) return;

    const descriptor = getDrawingTool(activeTool);
    const drawing = descriptor?.tool?.().create?.(start, end);
    if (!drawing) return;

    drawingManager.add(drawing);
    selectedId = drawing.id;
    draw();
    onChanged?.();
    onComplete?.();
  }

  function selectionDown(event) {
    const point = pointFromEvent(event, canvas);
    const hit = selectAt(point);
    selectedId = hit?.drawing?.id || null;
    if (!hit?.drawing) {
      moving = null;
      draw();
      return;
    }

    const descriptor = getDrawingTool(hit.drawing.type);
    if (!descriptor?.move) return;

    moving = {
      id: hit.drawing.id,
      type: hit.drawing.type,
      part: hit.part || 'body',
      last: point
    };
    movementRecorded = false;
    draw();
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
      const next = descriptor.move(drawing, { dx, dy }, transform, moving.part);
      if (next) {
        drawingManager.replace(drawing.id, next, !movementRecorded);
        movementRecorded = true;
        moving.last = point;
        draw();
      }
    }
  }

  function selectionUp() {
    if (moving) onChanged?.();
    moving = null;
    movementRecorded = false;
  }

  return {
    setTool,
    getTool: () => activeTool,
    getSelectedId: () => selectedId,
    deleteSelected() {
      if (!selectedId) return false;
      drawingManager.remove(selectedId);
      selectedId = null;
      draw();
      onChanged?.();
      return true;
    },
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
