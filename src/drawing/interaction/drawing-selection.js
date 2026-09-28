import { createDrawingTransform } from '../render/transform.js';
import { createPlotGeometry } from '../../chart/plot-geometry.js';
import { getDrawingTool } from '../core/drawing-registry.js';

export function createDrawingSelection({
  canvas,
  viewport,
  drawingManager,
  draw,
  drawSelection = null,
  getTextEditor = () => null,
  onChanged = null,
  getPlot = null
}) {
  let selectedId = null;
  let moving = null;
  let movementRecorded = false;
  let lastTextTap = { time: 0, x: 0, y: 0 };

  function pointFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function createTransform() {
    const plot = getPlot?.() || createPlotGeometry(canvas.clientWidth, canvas.clientHeight);
    return createDrawingTransform({ viewport, plot });
  }

  function sync() {
    drawSelection?.(selectedId);
  }

  function selectAt(point) {
    const transform = createTransform();
    const drawings = drawingManager.getDrawings();

    for (let i = drawings.length - 1; i >= 0; i -= 1) {
      const drawing = drawings[i];
      const descriptor = getDrawingTool(drawing.type);
      const part = descriptor?.hitTestPart?.(point, drawing, transform);
      if (part) return { drawing, part };
      if (descriptor?.hitTest?.(point, drawing, transform)) {
        return { drawing, part: 'body' };
      }
    }

    return null;
  }

  function onDown(event) {
    const point = pointFromEvent(event);
    const hit = selectAt(point);
    const now = performance.now();
    const isDoubleTextTap = Boolean(
      hit?.drawing?.type === 'text' &&
      now - lastTextTap.time < 380 &&
      Math.hypot(point.x - lastTextTap.x, point.y - lastTextTap.y) < 18
    );

    lastTextTap = { time: now, x: point.x, y: point.y };
    selectedId = hit?.drawing?.id || null;
    sync();

    if (isDoubleTextTap) {
      const textDrawing = hit.drawing;
      Promise.resolve(getTextEditor()?.(textDrawing.text || '')).then(value => {
        if (value == null || !drawingManager.getDrawings().some(item => item.id === textDrawing.id)) return;
        drawingManager.replace(textDrawing.id, { ...textDrawing, text: value }, true);
        selectedId = textDrawing.id;
        sync();
        draw();
        onChanged?.();
      });
      return;
    }

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

  function onMove(event) {
    if (!moving) return;

    const point = pointFromEvent(event);
    const dx = point.x - moving.last.x;
    const dy = point.y - moving.last.y;
    if (!dx && !dy) return;

    const drawing = drawingManager.getDrawings().find(item => item.id === moving.id);
    const descriptor = drawing ? getDrawingTool(drawing.type) : null;
    const transform = createTransform();

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

  function onUp() {
    if (moving) onChanged?.();
    moving = null;
    movementRecorded = false;
  }

  return {
    onDown,
    onMove,
    onUp,
    getSelectedId: () => selectedId,
    setSelectedId(id) {
      selectedId = id || null;
      sync();
    },
    deleteSelected() {
      if (!selectedId) return false;
      drawingManager.remove(selectedId);
      selectedId = null;
      sync();
      draw();
      onChanged?.();
      return true;
    },
    clearAll() {
      const cleared = drawingManager.clear();
      if (!cleared) return false;
      selectedId = null;
      sync();
      moving = null;
      movementRecorded = false;
      draw();
      onChanged?.();
      return true;
    }
  };
}
